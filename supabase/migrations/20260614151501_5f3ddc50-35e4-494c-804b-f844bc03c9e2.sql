
CREATE TABLE IF NOT EXISTS public.referral_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  phone text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent')),
  last_sent_at timestamptz,
  send_channel text CHECK (send_channel IS NULL OR send_channel IN ('sms','email','share')),
  is_mock boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referral_contacts_business ON public.referral_contacts(business_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.referral_contacts TO authenticated;
GRANT ALL ON public.referral_contacts TO service_role;

ALTER TABLE public.referral_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Business owners view own referral_contacts" ON public.referral_contacts;
CREATE POLICY "Business owners view own referral_contacts"
  ON public.referral_contacts FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = referral_contacts.business_id AND b.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Business owners insert own referral_contacts" ON public.referral_contacts;
CREATE POLICY "Business owners insert own referral_contacts"
  ON public.referral_contacts FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = referral_contacts.business_id AND b.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Business owners update own referral_contacts" ON public.referral_contacts;
CREATE POLICY "Business owners update own referral_contacts"
  ON public.referral_contacts FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = referral_contacts.business_id AND b.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Business owners delete own referral_contacts" ON public.referral_contacts;
CREATE POLICY "Business owners delete own referral_contacts"
  ON public.referral_contacts FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = referral_contacts.business_id AND b.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Admins view all referral_contacts" ON public.referral_contacts;
CREATE POLICY "Admins view all referral_contacts"
  ON public.referral_contacts FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP TRIGGER IF EXISTS update_referral_contacts_updated_at ON public.referral_contacts;
CREATE TRIGGER update_referral_contacts_updated_at
BEFORE UPDATE ON public.referral_contacts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
