
-- Extend businesses with V1 fields
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS slug text UNIQUE,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS service_area text,
  ADD COLUMN IF NOT EXISTS business_email text,
  ADD COLUMN IF NOT EXISTS offer_amount text,
  ADD COLUMN IF NOT EXISTS offer_trigger text,
  ADD COLUMN IF NOT EXISTS offer_fine_print text,
  ADD COLUMN IF NOT EXISTS current_period_end timestamptz,
  ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_disabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_customer_id text;

-- Slug format constraint (3-40 chars, lowercase alnum + hyphen)
ALTER TABLE public.businesses
  DROP CONSTRAINT IF EXISTS businesses_slug_format;
ALTER TABLE public.businesses
  ADD CONSTRAINT businesses_slug_format
  CHECK (slug IS NULL OR slug ~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$');

CREATE INDEX IF NOT EXISTS idx_businesses_slug ON public.businesses(slug);
CREATE INDEX IF NOT EXISTS idx_businesses_published ON public.businesses(is_published) WHERE is_published = true;

-- Public anon read for published, paid, non-disabled businesses
DROP POLICY IF EXISTS "V1 public read published businesses" ON public.businesses;
CREATE POLICY "V1 public read published businesses"
  ON public.businesses FOR SELECT
  TO anon
  USING (
    is_published = true
    AND is_disabled = false
    AND subscription_status IN ('active','trialing','paid')
  );

-- ============= LEADS =============
CREATE TABLE IF NOT EXISTS public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  referrer_name text NOT NULL,
  referrer_email text NOT NULL,
  referrer_phone text,
  lead_name text NOT NULL,
  lead_phone text NOT NULL,
  lead_email text,
  lead_need text NOT NULL,
  relationship_to_lead text,
  consent_given boolean NOT NULL DEFAULT false,
  lead_source text DEFAULT 'public_page',
  status text NOT NULL DEFAULT 'new'
    CHECK (status IN ('new','contacted','in_progress','closed_won','closed_lost','invalid')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leads_business ON public.leads(business_id, created_at DESC);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Business owners view own leads" ON public.leads;
CREATE POLICY "Business owners view own leads"
  ON public.leads FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = leads.business_id AND b.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Business owners update own leads" ON public.leads;
CREATE POLICY "Business owners update own leads"
  ON public.leads FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = leads.business_id AND b.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Admins view all leads" ON public.leads;
CREATE POLICY "Admins view all leads"
  ON public.leads FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Public submission: anyone (including anon) can insert a lead for a published, paid, non-disabled business, with consent_given true
DROP POLICY IF EXISTS "Public submit leads to published businesses" ON public.leads;
CREATE POLICY "Public submit leads to published businesses"
  ON public.leads FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    consent_given = true
    AND EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = leads.business_id
        AND b.is_published = true
        AND b.is_disabled = false
        AND b.subscription_status IN ('active','trialing','paid')
    )
  );

CREATE TRIGGER update_leads_updated_at
BEFORE UPDATE ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============= NOTIFICATION SETTINGS =============
CREATE TABLE IF NOT EXISTS public.notification_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL UNIQUE REFERENCES public.businesses(id) ON DELETE CASCADE,
  email_notifications_enabled boolean NOT NULL DEFAULT true,
  sms_notifications_enabled boolean NOT NULL DEFAULT false,
  notification_email text,
  notification_phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Business owners manage notification settings" ON public.notification_settings;
CREATE POLICY "Business owners manage notification settings"
  ON public.notification_settings FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = notification_settings.business_id AND b.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = notification_settings.business_id AND b.user_id = auth.uid()
  ));

CREATE TRIGGER update_notification_settings_updated_at
BEFORE UPDATE ON public.notification_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============= Slug availability helper =============
CREATE OR REPLACE FUNCTION public.fn_slug_available(p_slug text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (SELECT 1 FROM public.businesses WHERE slug = lower(p_slug));
$$;

GRANT EXECUTE ON FUNCTION public.fn_slug_available(text) TO anon, authenticated;
