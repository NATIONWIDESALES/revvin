ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'reactivation';
ALTER TABLE public.campaigns ADD CONSTRAINT campaigns_kind_check CHECK (kind IN ('reactivation','referral_launch'));
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS followups_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS followups_done smallint NOT NULL DEFAULT 0;

ALTER TABLE public.campaign_sends ADD COLUMN IF NOT EXISTS step smallint NOT NULL DEFAULT 0;
ALTER TABLE public.campaign_sends ADD CONSTRAINT campaign_sends_step_check CHECK (step BETWEEN 0 AND 2);
ALTER TABLE public.campaign_sends ADD COLUMN IF NOT EXISTS referrer_id uuid REFERENCES public.referrers(id) ON DELETE SET NULL;
ALTER TABLE public.campaign_sends ADD COLUMN IF NOT EXISTS click_token text;
CREATE UNIQUE INDEX IF NOT EXISTS campaign_sends_click_token_key ON public.campaign_sends (click_token) WHERE click_token IS NOT NULL;
-- A launch recipient can never get the same step twice.
CREATE UNIQUE INDEX IF NOT EXISTS campaign_sends_launch_step_once ON public.campaign_sends (campaign_id, contact_id, step) WHERE click_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS campaign_sends_referrer_idx ON public.campaign_sends (referrer_id) WHERE referrer_id IS NOT NULL;

-- Owners may toggle follow-ups but never change a campaign's kind.
CREATE OR REPLACE FUNCTION public.fn_campaign_kind_immutable() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF NEW.kind IS DISTINCT FROM OLD.kind AND coalesce(auth.role(),'') <> 'service_role' THEN RAISE EXCEPTION 'campaign_kind_immutable'; END IF;
 IF TG_OP='UPDATE' AND NEW.followups_done IS DISTINCT FROM OLD.followups_done AND coalesce(auth.role(),'') <> 'service_role' THEN NEW.followups_done := OLD.followups_done; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER trg_campaign_kind_immutable BEFORE UPDATE ON public.campaigns FOR EACH ROW EXECUTE FUNCTION public.fn_campaign_kind_immutable();

CREATE OR REPLACE FUNCTION public.fn_campaign_insert_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF NEW.kind <> 'reactivation' AND coalesce(auth.role(),'') <> 'service_role' THEN RAISE EXCEPTION 'campaign_kind_server_only'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER trg_campaign_insert_guard BEFORE INSERT ON public.campaigns FOR EACH ROW EXECUTE FUNCTION public.fn_campaign_insert_guard();

-- Server-only record that a business has used a referral launch. Deleting a
-- campaign never frees another Free launch.
CREATE TABLE public.referral_launch_claims (
  business_id uuid PRIMARY KEY REFERENCES public.businesses(id) ON DELETE CASCADE,
  campaign_id uuid,
  plan text NOT NULL,
  claimed_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.referral_launch_claims TO service_role;
ALTER TABLE public.referral_launch_claims ENABLE ROW LEVEL SECURITY;

-- First-touch click from a personal link in a launch email. Bots never count.
CREATE OR REPLACE FUNCTION public.fn_campaign_click(p_token text, p_ua text) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_catalog AS $$
BEGIN
 IF p_token IS NULL OR p_token !~ '^[a-f0-9]{16}$' THEN RETURN false; END IF;
 IF public.fn_bot_reason(left(coalesce(p_ua,''),512), NULL) IS NOT NULL THEN RETURN false; END IF;
 UPDATE public.campaign_sends SET clicked_at = now() WHERE click_token = p_token AND clicked_at IS NULL;
 RETURN FOUND;
END $$;
REVOKE ALL ON FUNCTION public.fn_campaign_click(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_campaign_click(text, text) TO anon, authenticated, service_role;

-- Owner-scoped results for one launch campaign.
CREATE OR REPLACE FUNCTION public.fn_launch_campaign_results(p_campaign_id uuid) RETURNS json
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_catalog AS $$
DECLARE c public.campaigns%ROWTYPE; owner_id uuid; result json;
BEGIN
 SELECT * INTO c FROM public.campaigns WHERE id = p_campaign_id AND kind = 'referral_launch';
 IF NOT FOUND THEN RETURN NULL; END IF;
 SELECT user_id INTO owner_id FROM public.businesses WHERE id = c.business_id;
 IF auth.uid() IS DISTINCT FROM owner_id AND NOT public.has_role(auth.uid(), 'admin') AND coalesce(auth.role(),'') <> 'service_role' THEN RAISE EXCEPTION 'not_authorized'; END IF;
 WITH people AS (
   SELECT s.contact_id,
     max(s.recipient_email) AS email,
     max(s.referrer_id::text)::uuid AS referrer_id,
     bool_or(s.step = 0 AND s.status = 'sent') AS sent,
     bool_or(s.step = 0 AND s.status IN ('failed','bounced')) AS failed,
     bool_or(s.step = 0 AND s.status = 'suppressed') AS suppressed,
     min(s.clicked_at) AS clicked_at,
     min(s.sent_at) FILTER (WHERE s.step = 0) AS sent_at,
     max(s.step) FILTER (WHERE s.status = 'sent') AS last_step
   FROM public.campaign_sends s WHERE s.campaign_id = c.id GROUP BY s.contact_id
 ), states AS (
   SELECT p.*, rc.name,
     EXISTS (SELECT 1 FROM public.leads l WHERE l.referrer_id = p.referrer_id AND l.business_id = c.business_id AND l.created_at >= c.created_at) AS referred,
     (coalesce(rc.status,'') = 'opted_out' OR p.suppressed OR EXISTS (SELECT 1 FROM public.suppressed_contacts sc WHERE sc.business_id = c.business_id AND sc.contact_type = 'email' AND sc.contact_value = lower(p.email))) AS opted_out
   FROM people p LEFT JOIN public.referral_contacts rc ON rc.id = p.contact_id
 )
 SELECT json_build_object(
   'campaign_id', c.id,
   'started_at', coalesce(c.started_at, c.created_at),
   'followups_enabled', c.followups_enabled,
   'followups_done', c.followups_done,
   'total', (SELECT count(*) FROM states),
   'sent', (SELECT count(*) FROM states WHERE sent),
   'clicked', (SELECT count(*) FROM states WHERE clicked_at IS NOT NULL),
   'referrals', (SELECT count(*) FROM public.leads l WHERE l.business_id = c.business_id AND l.created_at >= c.created_at AND l.referrer_id IN (SELECT referrer_id FROM states WHERE referrer_id IS NOT NULL)),
   'followup_sends', (SELECT json_object_agg(step, n) FROM (SELECT step, count(*) n FROM public.campaign_sends WHERE campaign_id = c.id AND step > 0 GROUP BY step) f),
   'recipients', coalesce((SELECT json_agg(json_build_object(
       'contact_id', contact_id, 'name', name, 'email', email, 'sent_at', sent_at, 'clicked_at', clicked_at, 'last_step', last_step,
       'state', CASE WHEN referred THEN 'referred' WHEN clicked_at IS NOT NULL THEN 'clicked' WHEN opted_out THEN 'opted_out' WHEN failed THEN 'failed' WHEN sent THEN 'sent' ELSE 'pending' END)
       ORDER BY name) FROM states), '[]'::json)
 ) INTO result;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.fn_launch_campaign_results(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_launch_campaign_results(uuid) TO authenticated, service_role;

-- Free stored-customer limit raised to 500. Pro and demo rules unchanged.
CREATE OR REPLACE FUNCTION public.fn_enforce_free_contact_limit()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_plan text; v_demo boolean; v_count integer;
BEGIN
 SELECT public.fn_effective_plan(id),coalesce(is_demo,false) INTO v_plan,v_demo FROM public.businesses WHERE id=NEW.business_id;
 IF coalesce(v_plan,'free')='pro' OR v_demo THEN RETURN NEW; END IF;
 PERFORM pg_advisory_xact_lock(hashtext('free_contact_limit:' || NEW.business_id::text));
 SELECT count(*) INTO v_count FROM public.referral_contacts WHERE business_id=NEW.business_id;
 IF v_count>=500 THEN RAISE EXCEPTION 'free_contact_limit' USING ERRCODE='P0001'; END IF;
 RETURN NEW;
END $function$;

CREATE OR REPLACE FUNCTION public.fn_contact_ask_allowed(p_business_id uuid, p_contact_id uuid)
 RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE owner_id uuid; rank_number bigint;
BEGIN
 SELECT user_id INTO owner_id FROM public.businesses WHERE id=p_business_id;
 IF auth.uid() IS DISTINCT FROM owner_id AND coalesce(auth.role(),'') <> 'service_role' THEN RAISE EXCEPTION 'not_authorized'; END IF;
 IF public.fn_effective_plan(p_business_id)='pro' THEN RETURN EXISTS(SELECT 1 FROM public.referral_contacts WHERE id=p_contact_id AND business_id=p_business_id); END IF;
 SELECT position INTO rank_number FROM (SELECT id,row_number() OVER (ORDER BY created_at,id) AS position FROM public.referral_contacts WHERE business_id=p_business_id) ranked WHERE id=p_contact_id;
 RETURN coalesce(rank_number<=500,false);
END $function$;