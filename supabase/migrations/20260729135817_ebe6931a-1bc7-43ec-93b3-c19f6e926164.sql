ALTER TABLE public.referral_triggers DROP CONSTRAINT IF EXISTS referral_triggers_status_check;
ALTER TABLE public.referral_triggers ADD CONSTRAINT referral_triggers_status_check
  CHECK (status IN ('queued','scheduled','sending','sent','failed','suppressed','duplicate','canceled'));