ALTER TABLE public.campaign_sends DROP CONSTRAINT IF EXISTS campaign_sends_status_check;
ALTER TABLE public.campaign_sends ADD CONSTRAINT campaign_sends_status_check
  CHECK (status = ANY (ARRAY['pending','sending','sent','failed','suppressed','bounced','opened','clicked']));