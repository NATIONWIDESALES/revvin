-- ============= REWARDS LEDGER =============
CREATE TABLE IF NOT EXISTS public.rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL UNIQUE REFERENCES public.leads(id) ON DELETE CASCADE,
  referrer_name text,
  referrer_contact text,
  amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid')),
  created_at timestamptz NOT NULL DEFAULT now(),
  marked_paid_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_rewards_business_status ON public.rewards(business_id, status, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rewards TO authenticated;
GRANT ALL ON public.rewards TO service_role;

ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners manage own rewards"
  ON public.rewards FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = rewards.business_id AND b.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = rewards.business_id AND b.user_id = auth.uid()));

CREATE POLICY "Admins view all rewards"
  ON public.rewards FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ============= AUTO-CREATE REWARD ON CLOSED_WON =============
CREATE OR REPLACE FUNCTION public.fn_autocreate_reward_on_won()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _amount numeric := 0;
  _raw text;
BEGIN
  IF NEW.status = 'closed_won' AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    IF EXISTS (SELECT 1 FROM public.rewards WHERE lead_id = NEW.id) THEN
      RETURN NEW;
    END IF;

    SELECT offer_amount INTO _raw FROM public.businesses WHERE id = NEW.business_id;
    IF _raw IS NOT NULL THEN
      BEGIN
        _amount := (regexp_replace(_raw, '[^0-9.]', '', 'g'))::numeric;
      EXCEPTION WHEN OTHERS THEN
        _amount := 0;
      END;
    END IF;

    INSERT INTO public.rewards (business_id, lead_id, referrer_name, referrer_contact, amount)
    VALUES (
      NEW.business_id,
      NEW.id,
      NEW.referrer_name,
      COALESCE(NEW.referrer_email, NEW.referrer_phone),
      COALESCE(_amount, 0)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_autocreate_reward_on_won ON public.leads;
CREATE TRIGGER trg_autocreate_reward_on_won
  AFTER UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.fn_autocreate_reward_on_won();

-- ============= STATUS TOKEN ON LEADS =============
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS status_token uuid;

UPDATE public.leads SET status_token = gen_random_uuid() WHERE status_token IS NULL;

ALTER TABLE public.leads ALTER COLUMN status_token SET NOT NULL;
ALTER TABLE public.leads ALTER COLUMN status_token SET DEFAULT gen_random_uuid();

CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_status_token ON public.leads(status_token);

-- ============= PUBLIC REFERRER STATUS FUNCTION =============
-- Returns only referrer-safe fields keyed strictly by the exact token.
-- No customer PII, no contact details, no job value.
CREATE OR REPLACE FUNCTION public.fn_get_referral_status(p_token uuid)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _lead public.leads%ROWTYPE;
  _biz_name text;
  _stage text;
  _reward_status text := NULL;
  _reward_amount numeric := NULL;
BEGIN
  SELECT * INTO _lead FROM public.leads WHERE status_token = p_token LIMIT 1;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT name INTO _biz_name FROM public.businesses WHERE id = _lead.business_id;

  _stage := CASE _lead.status
    WHEN 'new' THEN 'Received'
    WHEN 'contacted' THEN 'Received'
    WHEN 'in_progress' THEN 'In progress'
    WHEN 'closed_won' THEN 'Job closed'
    WHEN 'closed_lost' THEN 'Closed'
    WHEN 'invalid' THEN 'Closed'
    ELSE 'Received'
  END;

  SELECT
    CASE WHEN status = 'paid' THEN 'Reward paid' ELSE 'Reward pending' END,
    amount
  INTO _reward_status, _reward_amount
  FROM public.rewards WHERE lead_id = _lead.id LIMIT 1;

  RETURN json_build_object(
    'business_name', _biz_name,
    'submitted_at', _lead.created_at,
    'stage', _stage,
    'reward_status', _reward_status,
    'reward_amount', _reward_amount
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_get_referral_status(uuid) TO anon, authenticated;

-- Backfill: create pending rewards for leads already in closed_won that lack a row
INSERT INTO public.rewards (business_id, lead_id, referrer_name, referrer_contact, amount)
SELECT
  l.business_id,
  l.id,
  l.referrer_name,
  COALESCE(l.referrer_email, l.referrer_phone),
  COALESCE(NULLIF(regexp_replace(COALESCE(b.offer_amount,''), '[^0-9.]', '', 'g'), '')::numeric, 0)
FROM public.leads l
JOIN public.businesses b ON b.id = l.business_id
WHERE l.status = 'closed_won'
  AND NOT EXISTS (SELECT 1 FROM public.rewards r WHERE r.lead_id = l.id);