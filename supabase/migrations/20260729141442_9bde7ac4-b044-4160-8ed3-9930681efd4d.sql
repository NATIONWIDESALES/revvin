ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS google_review_url text;

ALTER TABLE public.referral_contacts ADD COLUMN IF NOT EXISTS last_job_at timestamptz;

ALTER TABLE public.referral_triggers
  ADD COLUMN IF NOT EXISTS review_request_status text NOT NULL DEFAULT 'off',
  ADD COLUMN IF NOT EXISTS review_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS review_failure_reason text,
  ADD COLUMN IF NOT EXISTS satisfaction_token uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS satisfaction_signal text,
  ADD COLUMN IF NOT EXISTS satisfaction_at timestamptz,
  ADD COLUMN IF NOT EXISTS referral_requires_positive_signal boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS referral_triggers_satisfaction_token_key
  ON public.referral_triggers (satisfaction_token);

ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS segment_key text,
  ADD COLUMN IF NOT EXISTS segment_label text,
  ADD COLUMN IF NOT EXISTS last_batch_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS campaign_sends_campaign_contact_key
  ON public.campaign_sends (campaign_id, contact_id)
  WHERE contact_id IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaigns TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_contacts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_templates TO authenticated;
GRANT SELECT ON public.campaign_sends TO authenticated;
GRANT ALL ON public.campaigns TO service_role;
GRANT ALL ON public.campaign_contacts TO service_role;
GRANT ALL ON public.campaign_sends TO service_role;
GRANT ALL ON public.campaign_templates TO service_role;

CREATE OR REPLACE FUNCTION public.fn_record_satisfaction(p_token uuid, p_happy boolean)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _row public.referral_triggers%ROWTYPE;
  _biz RECORD;
  _signal text;
BEGIN
  SELECT * INTO _row FROM public.referral_triggers WHERE satisfaction_token = p_token LIMIT 1;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  _signal := CASE WHEN p_happy THEN 'happy' ELSE 'unhappy' END;

  -- First answer wins. Nobody can flip an existing signal.
  UPDATE public.referral_triggers
     SET satisfaction_signal = _signal,
         satisfaction_at = now()
   WHERE id = _row.id
     AND satisfaction_signal IS NULL;

  SELECT name, slug, google_review_url
    INTO _biz
    FROM public.businesses
   WHERE id = _row.business_id;

  RETURN json_build_object(
    'business_name', _biz.name,
    'slug', _biz.slug,
    'google_review_url', _biz.google_review_url,
    'first_name', _row.customer_first_name,
    'signal', COALESCE(_row.satisfaction_signal, _signal)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_record_satisfaction(uuid, boolean) TO anon, authenticated;