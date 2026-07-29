ALTER TABLE public.referral_triggers ADD COLUMN IF NOT EXISTS technician_name text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS fast_nudge_sent_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_referral_triggers_due
  ON public.referral_triggers (status, scheduled_send_at);

GRANT SELECT, INSERT, UPDATE ON public.referral_triggers TO authenticated;
GRANT ALL ON public.referral_triggers TO service_role;

DROP POLICY IF EXISTS "Business owners create own triggers" ON public.referral_triggers;
CREATE POLICY "Business owners create own triggers"
ON public.referral_triggers FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.businesses b
  WHERE b.id = referral_triggers.business_id AND b.user_id = auth.uid()
));

DROP POLICY IF EXISTS "Business owners update own triggers" ON public.referral_triggers;
CREATE POLICY "Business owners update own triggers"
ON public.referral_triggers FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.businesses b
  WHERE b.id = referral_triggers.business_id AND b.user_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.businesses b
  WHERE b.id = referral_triggers.business_id AND b.user_id = auth.uid()
));