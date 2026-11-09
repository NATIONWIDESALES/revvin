ALTER TABLE public.partners
 ADD COLUMN kind text NOT NULL DEFAULT 'affiliate' CHECK(kind IN ('affiliate','rep')),
 ADD COLUMN user_id uuid UNIQUE,
 ADD COLUMN setup_rate numeric NOT NULL DEFAULT 0.40 CHECK(setup_rate BETWEEN 0 AND 1),
 ADD COLUMN recurring_rate numeric NOT NULL DEFAULT 0.40 CHECK(recurring_rate BETWEEN 0 AND 1),
 ADD COLUMN recurring_months integer CHECK(recurring_months IS NULL OR recurring_months>0);
ALTER TABLE public.partners ADD CONSTRAINT partner_rep_link CHECK((kind='rep' AND user_id IS NOT NULL) OR (kind='affiliate' AND user_id IS NULL));
ALTER TABLE public.partner_commissions ADD COLUMN applied_rate numeric NOT NULL DEFAULT 0.40;
ALTER TABLE public.prospect_pages ADD COLUMN claimed_at timestamptz;
ALTER TABLE public.businesses ADD COLUMN partner_first_paid_at timestamptz, ADD COLUMN partner_last_product text;
CREATE OR REPLACE FUNCTION public.fn_partner_cash_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF (NEW.partner_first_paid_at,NEW.partner_last_product) IS DISTINCT FROM (OLD.partner_first_paid_at,OLD.partner_last_product) AND current_user<>'service_role' THEN RAISE EXCEPTION 'Partner cash history is server managed'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER partner_cash_guard BEFORE UPDATE ON public.businesses FOR EACH ROW EXECUTE FUNCTION public.fn_partner_cash_guard();
CREATE OR REPLACE FUNCTION public.fn_partner_observe_payment(p_customer_id text,p_user_id uuid,p_paid_at timestamptz,p_product text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_catalog AS $$
BEGIN
 IF p_paid_at IS NULL OR p_product NOT IN ('launch_package','pro_monthly','pro_yearly') OR length(coalesce(p_customer_id,''))>255 THEN RAISE EXCEPTION 'invalid_payment'; END IF;
 UPDATE public.businesses SET partner_first_paid_at=least(partner_first_paid_at,p_paid_at),partner_last_product=CASE WHEN p_product<>'launch_package' THEN p_product ELSE partner_last_product END
 WHERE id=(SELECT id FROM public.businesses WHERE stripe_customer_id=p_customer_id OR (p_user_id IS NOT NULL AND user_id=p_user_id) ORDER BY CASE WHEN stripe_customer_id=p_customer_id THEN 0 ELSE 1 END LIMIT 1);
END $$;
ALTER FUNCTION public.fn_partner_observe_payment(text,uuid,timestamptz,text) OWNER TO service_role;
REVOKE ALL ON FUNCTION public.fn_partner_observe_payment(text,uuid,timestamptz,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.fn_partner_observe_payment(text,uuid,timestamptz,text) TO service_role;

CREATE TABLE public.partner_term_versions(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),partner_id uuid NOT NULL REFERENCES public.partners(id),
 effective_at timestamptz NOT NULL,setup_rate numeric NOT NULL,recurring_rate numeric NOT NULL,recurring_months integer,
 created_by uuid,created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(partner_id,effective_at));
GRANT ALL ON public.partner_term_versions TO service_role;
ALTER TABLE public.partner_term_versions ENABLE ROW LEVEL SECURITY;
INSERT INTO public.partner_term_versions(partner_id,effective_at,setup_rate,recurring_rate,recurring_months)
 SELECT id,'-infinity',0.40,0.40,NULL FROM public.partners;

CREATE OR REPLACE FUNCTION public.fn_partner_terms_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_catalog AS $$
BEGIN
 IF TG_OP='INSERT' THEN
  IF NEW.kind='rep' AND (auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin')) THEN RAISE EXCEPTION 'not_authorized'; END IF;
  IF NEW.kind='affiliate' THEN NEW.user_id:=NULL; NEW.setup_rate:=0.40; NEW.recurring_rate:=0.40; NEW.recurring_months:=NULL; END IF;
 ELSE
  IF (NEW.kind,NEW.user_id,NEW.setup_rate,NEW.recurring_rate,NEW.recurring_months) IS DISTINCT FROM
     (OLD.kind,OLD.user_id,OLD.setup_rate,OLD.recurring_rate,OLD.recurring_months)
     AND (auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin')) THEN RAISE EXCEPTION 'not_authorized'; END IF;
 END IF;
 IF NEW.kind='rep' AND NOT public.has_role(NEW.user_id,'sales') THEN RAISE EXCEPTION 'sales_role_required'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER partner_terms_guard BEFORE INSERT OR UPDATE ON public.partners FOR EACH ROW EXECUTE FUNCTION public.fn_partner_terms_guard();
CREATE OR REPLACE FUNCTION public.fn_partner_terms_history() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_catalog AS $$
BEGIN
 IF TG_OP='INSERT' THEN
  INSERT INTO public.partner_term_versions(partner_id,effective_at,setup_rate,recurring_rate,recurring_months,created_by)
   VALUES(NEW.id,'-infinity',NEW.setup_rate,NEW.recurring_rate,NEW.recurring_months,auth.uid());
 ELSIF (NEW.setup_rate,NEW.recurring_rate,NEW.recurring_months) IS DISTINCT FROM (OLD.setup_rate,OLD.recurring_rate,OLD.recurring_months) THEN
  INSERT INTO public.partner_term_versions(partner_id,effective_at,setup_rate,recurring_rate,recurring_months,created_by)
   VALUES(NEW.id,clock_timestamp(),NEW.setup_rate,NEW.recurring_rate,NEW.recurring_months,auth.uid());
  INSERT INTO public.audit_log(actor_id,event_type,payload) VALUES(auth.uid(),'partner_terms_changed',jsonb_build_object('partner_id',NEW.id,'setup_rate',NEW.setup_rate,'recurring_rate',NEW.recurring_rate,'recurring_months',NEW.recurring_months));
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER partner_terms_history AFTER INSERT OR UPDATE ON public.partners FOR EACH ROW EXECUTE FUNCTION public.fn_partner_terms_history();

CREATE OR REPLACE FUNCTION public.fn_admin_rep_partner(p_user_email text,p_name text DEFAULT NULL) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_catalog AS $$
DECLARE u uuid; e text; pid uuid;
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'not_authorized'; END IF;
 IF length(coalesce(p_user_email,'')) NOT BETWEEN 3 AND 254 OR length(coalesce(p_name,''))>120 THEN RAISE EXCEPTION 'invalid_input'; END IF;
 SELECT id,email INTO u,e FROM auth.users WHERE lower(email)=lower(btrim(p_user_email)) LIMIT 1;
 IF u IS NULL THEN RAISE EXCEPTION 'user_not_found'; END IF;
 INSERT INTO public.user_roles(user_id,role) VALUES(u,'sales') ON CONFLICT DO NOTHING;
 INSERT INTO public.partners(name,email,kind,user_id,status,setup_rate,recurring_rate,recurring_months,approved_at,payout_method)
 VALUES(coalesce(nullif(btrim(p_name),''),split_part(e,'@',1)),lower(e),'rep',u,'approved',0.50,0.30,12,now(),'bank') RETURNING id INTO pid;
 INSERT INTO public.audit_log(actor_id,event_type,payload) VALUES(auth.uid(),'rep_partner_created',jsonb_build_object('partner_id',pid,'user_id',u));
 RETURN pid;
END $$;
REVOKE ALL ON FUNCTION public.fn_admin_rep_partner(text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fn_admin_rep_partner(text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.fn_admin_partner_terms(p_partner_id uuid,p_setup_rate numeric,p_recurring_rate numeric,p_recurring_months integer,p_user_email text DEFAULT NULL)
 RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_catalog AS $$
DECLARE p public.partners%ROWTYPE; u uuid; e text;
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'not_authorized'; END IF;
 IF p_setup_rate IS NULL OR p_recurring_rate IS NULL OR p_setup_rate NOT BETWEEN 0 AND 1 OR p_recurring_rate NOT BETWEEN 0 AND 1 OR p_recurring_months<=0 THEN RAISE EXCEPTION 'invalid_terms'; END IF;
 SELECT * INTO p FROM public.partners WHERE id=p_partner_id FOR UPDATE;
 IF p.id IS NULL THEN RAISE EXCEPTION 'not_found'; END IF;
 IF p_user_email IS NOT NULL THEN
  IF p.kind<>'rep' OR length(p_user_email)>254 THEN RAISE EXCEPTION 'invalid_link'; END IF;
  SELECT id,email INTO u,e FROM auth.users WHERE lower(email)=lower(btrim(p_user_email)) LIMIT 1;
  IF u IS NULL THEN RAISE EXCEPTION 'user_not_found'; END IF;
  INSERT INTO public.user_roles(user_id,role) VALUES(u,'sales') ON CONFLICT DO NOTHING;
 ELSE u:=p.user_id; e:=p.email;
 END IF;
 UPDATE public.partners SET setup_rate=p_setup_rate,recurring_rate=p_recurring_rate,recurring_months=p_recurring_months,user_id=u,email=lower(e) WHERE id=p.id;
 IF u IS DISTINCT FROM p.user_id THEN INSERT INTO public.audit_log(actor_id,event_type,payload) VALUES(auth.uid(),'rep_partner_link_changed',jsonb_build_object('partner_id',p.id,'old_user_id',p.user_id,'user_id',u)); END IF;
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.fn_admin_partner_terms(uuid,numeric,numeric,integer,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fn_admin_partner_terms(uuid,numeric,numeric,integer,text) TO authenticated;

-- Service-owned writer preserves the existing invoker attribution trigger exactly.
-- No caller can provide a partner id, owner id or skip the prospect binding.
CREATE OR REPLACE FUNCTION public.fn_attribute_rep_claim(p_prospect_id uuid,p_business_id uuid) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_catalog AS $$
DECLARE p public.prospect_pages%ROWTYPE; b public.businesses%ROWTYPE; rep public.partners%ROWTYPE; owner_email text; rep_email text; typed text; target uuid;
BEGIN
 SELECT * INTO p FROM public.prospect_pages WHERE id=p_prospect_id FOR UPDATE;
 SELECT * INTO b FROM public.businesses WHERE id=p_business_id FOR UPDATE;
 IF auth.uid() IS NULL OR b.user_id IS DISTINCT FROM auth.uid() OR p.claimed_business_id IS DISTINCT FROM b.id OR p.status<>'claimed' OR b.acquisition->>'prospect_code' IS DISTINCT FROM p.code THEN RAISE EXCEPTION 'not_authorized'; END IF;
 IF b.partner_id IS NOT NULL OR coalesce(b.is_demo,false) OR public.fn_offer_is_restricted_category(b.category) OR public.fn_offer_is_restricted_category(b.industry) THEN RETURN false; END IF;
 SELECT * INTO rep FROM public.partners WHERE user_id=p.created_by AND kind='rep' AND status='approved' LIMIT 1;
 IF rep.id IS NULL OR NOT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=rep.user_id AND role='sales') THEN RETURN false; END IF;
 SELECT email INTO owner_email FROM auth.users WHERE id=b.user_id;
 SELECT email INTO rep_email FROM auth.users WHERE id=rep.user_id;
 IF owner_email IS NULL OR rep_email IS NULL OR lower(owner_email)=lower(rep_email) OR lower(owner_email)=lower(rep.email) THEN RETURN false; END IF;
 -- A persisted typed signup code wins, even if its notification raced the claim.
 SELECT raw_user_meta_data->>'partner_typed_code' INTO typed FROM auth.users WHERE id=b.user_id;
 IF nullif(btrim(typed),'') IS NOT NULL THEN
  SELECT id INTO target FROM public.partners WHERE code=lower(btrim(typed)) AND kind='affiliate' AND status='approved' AND lower(email)<>lower(owner_email) LIMIT 1;
  IF target IS NULL THEN RETURN false; END IF;
 ELSE target:=rep.id;
 END IF;
 UPDATE public.businesses SET partner_id=target,partner_attributed_at=now() WHERE id=b.id AND partner_id IS NULL;
 INSERT INTO public.audit_log(actor_id,event_type,payload) VALUES(auth.uid(),CASE WHEN target=rep.id THEN 'rep_attributed' ELSE 'typed_partner_attributed' END,jsonb_build_object('prospect_id',p.id,'partner_id',target,'business_id',b.id));
 RETURN true;
END $$;
ALTER FUNCTION public.fn_attribute_rep_claim(uuid,uuid) OWNER TO service_role;
REVOKE ALL ON FUNCTION public.fn_attribute_rep_claim(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.fn_attribute_rep_claim(uuid,uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.fn_admin_business_partner(p_business_id uuid,p_partner_id uuid,p_note text) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_catalog AS $$
DECLARE old_partner uuid;
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'not_authorized'; END IF;
 IF length(btrim(coalesce(p_note,''))) NOT BETWEEN 1 AND 500 THEN RAISE EXCEPTION 'note_required'; END IF;
 IF p_partner_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.partners WHERE id=p_partner_id AND status='approved') THEN RAISE EXCEPTION 'invalid_partner'; END IF;
 SELECT partner_id INTO old_partner FROM public.businesses WHERE id=p_business_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'not_found'; END IF;
 UPDATE public.businesses SET partner_id=p_partner_id,partner_attributed_at=CASE WHEN p_partner_id IS NOT NULL THEN now() END WHERE id=p_business_id;
 INSERT INTO public.audit_log(actor_id,event_type,payload) VALUES(auth.uid(),'business_partner_changed',jsonb_build_object('business_id',p_business_id,'old_partner_id',old_partner,'partner_id',p_partner_id,'note',p_note));
 RETURN true;
END $$;
ALTER FUNCTION public.fn_admin_business_partner(uuid,uuid,text) OWNER TO service_role;
REVOKE ALL ON FUNCTION public.fn_admin_business_partner(uuid,uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fn_admin_business_partner(uuid,uuid,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.fn_partner_payment_terms(p_partner_id uuid,p_business_id uuid,p_product text,p_paid_at timestamptz) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_catalog AS $$
DECLARE v public.partner_term_versions%ROWTYPE; first_at timestamptz; rate numeric;
BEGIN
 SELECT * INTO v FROM public.partner_term_versions WHERE partner_id=p_partner_id AND effective_at<p_paid_at ORDER BY effective_at DESC LIMIT 1;
 IF v.id IS NULL THEN RAISE EXCEPTION 'terms_not_found'; END IF;
 SELECT min(t) INTO first_at FROM (
  SELECT paid_at t FROM public.stripe_payments WHERE business_id=p_business_id AND collected AND amount_paid_cents>0
  UNION ALL SELECT paid_at FROM public.partner_commissions WHERE business_id=p_business_id AND amount_collected_cents>0
  UNION ALL SELECT partner_first_paid_at FROM public.businesses WHERE id=p_business_id
  UNION ALL SELECT p_paid_at) paid;
 rate:=CASE WHEN p_product='launch_package' THEN v.setup_rate ELSE v.recurring_rate END;
 IF p_product<>'launch_package' AND v.recurring_months IS NOT NULL AND p_paid_at>=first_at+make_interval(months=>v.recurring_months) THEN rate:=0; END IF;
 RETURN jsonb_build_object('rate',rate,'recurring_months',v.recurring_months,'first_paid_at',first_at);
END $$;
REVOKE ALL ON FUNCTION public.fn_partner_payment_terms(uuid,uuid,text,timestamptz) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.fn_partner_payment_terms(uuid,uuid,text,timestamptz) TO service_role;

CREATE OR REPLACE FUNCTION public.fn_partner_commission_terms() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_catalog AS $$
DECLARE t jsonb; r numeric;
BEGIN
 -- Serializes first-payment lookup and terms on commission insert. Existing reversal updates remain unchanged.
 PERFORM 1 FROM public.businesses WHERE id=NEW.business_id FOR UPDATE;
 IF EXISTS(SELECT 1 FROM public.partner_commissions WHERE stripe_object_id=NEW.stripe_object_id) THEN RETURN NULL; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.businesses b JOIN public.partners p ON p.id=b.partner_id WHERE b.id=NEW.business_id AND b.partner_id=NEW.partner_id AND p.status='approved' AND NOT coalesce(b.is_demo,false)) THEN RETURN NULL; END IF;
 t:=public.fn_partner_payment_terms(NEW.partner_id,NEW.business_id,NEW.product,NEW.paid_at); r:=(t->>'rate')::numeric;
 IF r<=0 OR NEW.amount_collected_cents<=0 THEN RETURN NULL; END IF;
 NEW.applied_rate:=r; NEW.commission_cents:=round(NEW.amount_collected_cents*r); RETURN NEW;
END $$;
CREATE TRIGGER partner_commission_terms BEFORE INSERT ON public.partner_commissions FOR EACH ROW EXECUTE FUNCTION public.fn_partner_commission_terms();

CREATE OR REPLACE FUNCTION public.fn_rep_earnings_data(p_partner_id uuid) RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path=public,pg_catalog AS $$
 SELECT jsonb_build_object(
  'partner_id',p.id,'name',p.name,'setup_rate',p.setup_rate,'recurring_rate',p.recurring_rate,'recurring_months',p.recurring_months,
  'sent',(SELECT count(*) FROM public.prospect_pages x WHERE x.created_by=p.user_id AND (x.status IN ('sent','viewed','claimed') OR x.first_viewed_at IS NOT NULL)),
  'viewed',(SELECT count(*) FROM public.prospect_pages x WHERE x.created_by=p.user_id AND x.first_viewed_at IS NOT NULL),
  'claimed',(SELECT count(*) FROM public.prospect_pages x WHERE x.created_by=p.user_id AND x.claimed_business_id IS NOT NULL),
  'paying',(SELECT count(*) FROM public.businesses b WHERE b.partner_id=p.id AND NOT coalesce(b.is_demo,false) AND b.subscription_status IN ('active','past_due','paid') AND EXISTS(SELECT 1 FROM public.stripe_payments s WHERE s.business_id=b.id AND s.collected AND s.amount_paid_cents>0)),
  'paying_month',(SELECT count(DISTINCT b.id) FROM public.businesses b JOIN public.stripe_payments s ON s.business_id=b.id WHERE b.partner_id=p.id AND NOT coalesce(b.is_demo,false) AND s.collected AND s.amount_paid_cents>0 AND s.paid_at>=date_trunc('month',now()) AND s.paid_at<=now()),
  'paying_all_time',(SELECT count(*) FROM public.businesses b WHERE b.partner_id=p.id AND NOT coalesce(b.is_demo,false) AND EXISTS(SELECT 1 FROM public.stripe_payments s WHERE s.business_id=b.id AND s.collected AND s.amount_paid_cents>0)),
  'pending_cents',(SELECT coalesce(sum(commission_cents),0) FROM public.partner_commissions WHERE partner_id=p.id AND status='pending'),
  'payable_cents',greatest(0,(SELECT coalesce(sum(commission_cents),0) FROM public.partner_commissions WHERE partner_id=p.id AND status='payable')+(SELECT coalesce(sum(amount_cents),0) FROM public.partner_adjustments WHERE partner_id=p.id AND payout_id IS NULL)),
  'paid_cents',(SELECT coalesce(sum(amount_cents),0) FROM public.partner_payouts WHERE partner_id=p.id),
  'businesses',coalesce((SELECT jsonb_agg(jsonb_build_object('name',b.name,'claimed_at',(SELECT min(x.claimed_at) FROM public.prospect_pages x WHERE x.claimed_business_id=b.id AND x.created_by=p.user_id),
   'plan',CASE WHEN b.subscription_status IN ('active','past_due','paid') THEN CASE WHEN coalesce(b.partner_last_product,(SELECT c.product FROM public.partner_commissions c WHERE c.business_id=b.id AND c.product IN ('pro_monthly','pro_yearly') ORDER BY c.paid_at DESC LIMIT 1))='pro_yearly' THEN 'Pro yearly' ELSE 'Pro monthly' END WHEN b.pro_trial_ends_at>now() OR b.subscription_status='trialing' THEN 'trial' ELSE 'free' END,
   'earned_cents',(SELECT coalesce(sum(commission_cents),0) FROM public.partner_commissions WHERE partner_id=p.id AND business_id=b.id AND status<>'reversed')) ORDER BY b.partner_attributed_at DESC) FROM public.businesses b WHERE b.partner_id=p.id AND NOT coalesce(b.is_demo,false)),'[]'::jsonb))
 FROM public.partners p WHERE p.id=p_partner_id AND p.kind='rep';
$$;
REVOKE ALL ON FUNCTION public.fn_rep_earnings_data(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.fn_rep_earnings_data(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.fn_my_rep_earnings() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_catalog AS $$
DECLARE pid uuid;
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'sales') THEN RAISE EXCEPTION 'not_authorized'; END IF;
 SELECT id INTO pid FROM public.partners WHERE user_id=auth.uid() AND kind='rep' AND status='approved' LIMIT 1;
 IF pid IS NULL THEN RETURN NULL; END IF;
 RETURN public.fn_rep_earnings_data(pid);
END $$;
REVOKE ALL ON FUNCTION public.fn_my_rep_earnings() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fn_my_rep_earnings() TO authenticated;
CREATE OR REPLACE FUNCTION public.fn_admin_rep_earnings() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_catalog AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'not_authorized'; END IF;
 RETURN coalesce((SELECT jsonb_agg(public.fn_rep_earnings_data(id)) FROM public.partners WHERE kind='rep'),'[]'::jsonb);
END $$;
REVOKE ALL ON FUNCTION public.fn_admin_rep_earnings() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fn_admin_rep_earnings() TO authenticated;
