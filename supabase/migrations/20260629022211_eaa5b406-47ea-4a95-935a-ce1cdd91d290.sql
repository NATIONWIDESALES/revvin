
-- 1) Per-send history log. RLS enabled at creation, own-rows-only,
-- mirroring the referral_contacts ownership pattern.
CREATE TABLE IF NOT EXISTS public.referral_contact_sends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES public.referral_contacts(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('sms', 'email', 'share')),
  sent_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.referral_contact_sends IS
  'Records that the business tapped Send for a contact on a channel. Revvin never sends messages, so this is NOT proof of delivery.';
COMMENT ON COLUMN public.referral_contact_sends.channel IS
  'Channel the business chose to hand off to: sms (sms: link), email (mailto:), or share (Web Share / clipboard).';

CREATE INDEX IF NOT EXISTS idx_referral_contact_sends_business
  ON public.referral_contact_sends(business_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_referral_contact_sends_contact
  ON public.referral_contact_sends(contact_id, sent_at DESC);

GRANT SELECT, INSERT, DELETE ON public.referral_contact_sends TO authenticated;
GRANT ALL ON public.referral_contact_sends TO service_role;

ALTER TABLE public.referral_contact_sends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners view own contact sends"
  ON public.referral_contact_sends FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = referral_contact_sends.business_id AND b.user_id = auth.uid()
  ));

CREATE POLICY "Business owners insert own contact sends"
  ON public.referral_contact_sends FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = referral_contact_sends.business_id AND b.user_id = auth.uid()
  ));

CREATE POLICY "Business owners delete own contact sends"
  ON public.referral_contact_sends FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = referral_contact_sends.business_id AND b.user_id = auth.uid()
  ));

-- 2) Consent attestation timestamp for the Invite Customers gate.
-- Owner updates the existing businesses row, so no new policy is needed.
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS contact_outreach_consent_at timestamptz;

COMMENT ON COLUMN public.businesses.contact_outreach_consent_at IS
  'Set when the business owner attests that imported contacts are their own past or current customers. FOUNDER-CONFIRMED TODO: confirm exact attestation wording with counsel.';
