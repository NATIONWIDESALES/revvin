
-- ============================================
-- BATCH 1: Integrations + Campaigns Schema
-- ============================================

-- 1. Extend businesses with integration + trigger columns
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS stripe_connected_account_id text,
  ADD COLUMN IF NOT EXISTS stripe_connect_status text DEFAULT 'disconnected',
  ADD COLUMN IF NOT EXISTS jobber_account_id text,
  ADD COLUMN IF NOT EXISTS jobber_refresh_token_encrypted text,
  ADD COLUMN IF NOT EXISTS jobber_access_token_encrypted text,
  ADD COLUMN IF NOT EXISTS jobber_token_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS jobber_integration_status text DEFAULT 'disconnected',
  ADD COLUMN IF NOT EXISTS trigger_delay_hours integer NOT NULL DEFAULT 24,
  ADD COLUMN IF NOT EXISTS trigger_email_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS trigger_sms_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS trigger_template_email text,
  ADD COLUMN IF NOT EXISTS trigger_template_sms text,
  ADD COLUMN IF NOT EXISTS launch_package_status text DEFAULT 'none';

CREATE INDEX IF NOT EXISTS idx_businesses_stripe_connect ON public.businesses(stripe_connected_account_id);
CREATE INDEX IF NOT EXISTS idx_businesses_jobber ON public.businesses(jobber_account_id);

-- 2. referral_triggers
CREATE TABLE IF NOT EXISTS public.referral_triggers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  source text NOT NULL CHECK (source IN ('stripe','jobber','manual')),
  source_event_id text,
  customer_first_name text,
  customer_email text,
  customer_phone text,
  amount_paid numeric,
  service_description text,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','sent','failed','suppressed','duplicate')),
  channel text CHECK (channel IN ('email','sms')),
  scheduled_send_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  sent_at timestamptz,
  failure_reason text,
  attempts integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, source, source_event_id)
);
CREATE INDEX IF NOT EXISTS idx_triggers_queue ON public.referral_triggers(status, scheduled_send_at) WHERE status = 'queued';
CREATE INDEX IF NOT EXISTS idx_triggers_business ON public.referral_triggers(business_id, created_at DESC);

ALTER TABLE public.referral_triggers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Business owners view own triggers" ON public.referral_triggers FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = referral_triggers.business_id AND b.user_id = auth.uid()));
CREATE POLICY "Admins view all triggers" ON public.referral_triggers FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 3. campaign_templates (seeded later)
CREATE TABLE IF NOT EXISTS public.campaign_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  channel text NOT NULL CHECK (channel IN ('email','sms')),
  subject text,
  body text NOT NULL,
  is_system boolean NOT NULL DEFAULT true,
  business_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.campaign_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone view system templates" ON public.campaign_templates FOR SELECT USING (is_system = true);
CREATE POLICY "Business owners view own templates" ON public.campaign_templates FOR SELECT
  USING (business_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = campaign_templates.business_id AND b.user_id = auth.uid()));
CREATE POLICY "Business owners manage own templates" ON public.campaign_templates FOR ALL
  USING (business_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = campaign_templates.business_id AND b.user_id = auth.uid()))
  WITH CHECK (business_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = campaign_templates.business_id AND b.user_id = auth.uid()));

-- 4. campaign_contacts (one row per contact uploaded by a business)
CREATE TABLE IF NOT EXISTS public.campaign_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  first_name text,
  last_name text,
  email text,
  phone text,
  consent_confirmed_at timestamptz,
  opted_out boolean NOT NULL DEFAULT false,
  opted_out_at timestamptz,
  source text DEFAULT 'csv_upload',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_contact_email ON public.campaign_contacts(business_id, lower(email)) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_contact_phone ON public.campaign_contacts(business_id, phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_business ON public.campaign_contacts(business_id, opted_out);

ALTER TABLE public.campaign_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Business owners manage own contacts" ON public.campaign_contacts FOR ALL
  USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = campaign_contacts.business_id AND b.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = campaign_contacts.business_id AND b.user_id = auth.uid()));
CREATE POLICY "Admins view all contacts" ON public.campaign_contacts FOR SELECT USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 5. campaigns
CREATE TABLE IF NOT EXISTS public.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  name text NOT NULL,
  channel text NOT NULL CHECK (channel IN ('email','sms')),
  subject text,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','scheduled','sending','sent','failed','cancelled')),
  scheduled_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  total_recipients integer NOT NULL DEFAULT 0,
  sent_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  opened_count integer NOT NULL DEFAULT 0,
  clicked_count integer NOT NULL DEFAULT 0,
  opted_out_count integer NOT NULL DEFAULT 0,
  consent_confirmed boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_campaigns_business ON public.campaigns(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_campaigns_queue ON public.campaigns(status, scheduled_at) WHERE status IN ('scheduled','sending');

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Business owners manage own campaigns" ON public.campaigns FOR ALL
  USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = campaigns.business_id AND b.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = campaigns.business_id AND b.user_id = auth.uid()));
CREATE POLICY "Admins view all campaigns" ON public.campaigns FOR SELECT USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_campaigns_updated_at BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. campaign_sends (one row per recipient per campaign)
CREATE TABLE IF NOT EXISTS public.campaign_sends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL,
  contact_id uuid,
  business_id uuid NOT NULL,
  recipient_email text,
  recipient_phone text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','failed','suppressed','bounced','opened','clicked')),
  message_id text,
  sent_at timestamptz,
  opened_at timestamptz,
  clicked_at timestamptz,
  failure_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sends_campaign ON public.campaign_sends(campaign_id, status);
CREATE INDEX IF NOT EXISTS idx_sends_message_id ON public.campaign_sends(message_id) WHERE message_id IS NOT NULL;

ALTER TABLE public.campaign_sends ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Business owners view own sends" ON public.campaign_sends FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = campaign_sends.business_id AND b.user_id = auth.uid()));
CREATE POLICY "Admins view all sends" ON public.campaign_sends FOR SELECT USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 7. reward_tiers (tiered referral rewards per offer)
CREATE TABLE IF NOT EXISTS public.reward_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL,
  tier_label text NOT NULL,
  min_referrals integer NOT NULL CHECK (min_referrals >= 0),
  reward_amount numeric NOT NULL CHECK (reward_amount >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (offer_id, min_referrals)
);
CREATE INDEX IF NOT EXISTS idx_reward_tiers_offer ON public.reward_tiers(offer_id, min_referrals DESC);

ALTER TABLE public.reward_tiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public view reward tiers" ON public.reward_tiers FOR SELECT USING (true);
CREATE POLICY "Business owners manage reward tiers" ON public.reward_tiers FOR ALL
  USING (EXISTS (SELECT 1 FROM public.offers o JOIN public.businesses b ON b.id = o.business_id WHERE o.id = reward_tiers.offer_id AND b.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.offers o JOIN public.businesses b ON b.id = o.business_id WHERE o.id = reward_tiers.offer_id AND b.user_id = auth.uid()));

-- 8. seasonal_campaigns (multipliers per offer)
CREATE TABLE IF NOT EXISTS public.seasonal_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL,
  name text NOT NULL,
  multiplier numeric NOT NULL CHECK (multiplier > 0),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at)
);
CREATE INDEX IF NOT EXISTS idx_seasonal_offer_window ON public.seasonal_campaigns(offer_id, starts_at, ends_at) WHERE is_active;

ALTER TABLE public.seasonal_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public view active seasonal" ON public.seasonal_campaigns FOR SELECT USING (is_active);
CREATE POLICY "Business owners manage seasonal" ON public.seasonal_campaigns FOR ALL
  USING (EXISTS (SELECT 1 FROM public.offers o JOIN public.businesses b ON b.id = o.business_id WHERE o.id = seasonal_campaigns.offer_id AND b.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.offers o JOIN public.businesses b ON b.id = o.business_id WHERE o.id = seasonal_campaigns.offer_id AND b.user_id = auth.uid()));

-- Enforce single-active per offer via trigger
CREATE OR REPLACE FUNCTION public.fn_enforce_single_active_seasonal()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.is_active AND EXISTS (
    SELECT 1 FROM public.seasonal_campaigns
    WHERE offer_id = NEW.offer_id
      AND is_active = true
      AND id <> NEW.id
      AND tstzrange(starts_at, ends_at) && tstzrange(NEW.starts_at, NEW.ends_at)
  ) THEN
    RAISE EXCEPTION 'Another active seasonal campaign already overlaps this date range';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_single_active_seasonal
  BEFORE INSERT OR UPDATE ON public.seasonal_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.fn_enforce_single_active_seasonal();

-- 9. launch_tasks ($297 Launch Package workflow)
CREATE TABLE IF NOT EXISTS public.launch_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  package_type text NOT NULL DEFAULT 'launch_297',
  status text NOT NULL DEFAULT 'purchased' CHECK (status IN ('purchased','in_progress','delivered','cancelled')),
  stripe_payment_intent_id text,
  amount_paid numeric NOT NULL DEFAULT 297,
  currency text NOT NULL DEFAULT 'USD',
  assigned_admin_id uuid,
  notes text,
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_launch_status ON public.launch_tasks(status, created_at DESC);

ALTER TABLE public.launch_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Business owners view own launch tasks" ON public.launch_tasks FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = launch_tasks.business_id AND b.user_id = auth.uid()));
CREATE POLICY "Admins manage all launch tasks" ON public.launch_tasks FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_launch_tasks_updated_at BEFORE UPDATE ON public.launch_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 10. suppressed_contacts (per-business opt-outs, cross-source)
CREATE TABLE IF NOT EXISTS public.suppressed_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  contact_value text NOT NULL,
  contact_type text NOT NULL CHECK (contact_type IN ('email','phone')),
  reason text,
  source text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, contact_type, contact_value)
);
CREATE INDEX IF NOT EXISTS idx_suppressed_lookup ON public.suppressed_contacts(business_id, contact_type, contact_value);

ALTER TABLE public.suppressed_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Business owners view own suppressions" ON public.suppressed_contacts FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = suppressed_contacts.business_id AND b.user_id = auth.uid()));
CREATE POLICY "Admins view all suppressions" ON public.suppressed_contacts FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 11. send_log (staging-mode mirror; production sends use email_send_log + new sms_outbound_log)
CREATE TABLE IF NOT EXISTS public.send_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid,
  channel text NOT NULL CHECK (channel IN ('email','sms')),
  recipient text NOT NULL,
  subject text,
  body text,
  context text,
  mode text NOT NULL DEFAULT 'staging' CHECK (mode IN ('staging','production')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_send_log_business ON public.send_log(business_id, created_at DESC);

ALTER TABLE public.send_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view send log" ON public.send_log FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Business owners view own send log" ON public.send_log FOR SELECT
  USING (business_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = send_log.business_id AND b.user_id = auth.uid()));

-- 12. sms_outbound_log (mirrors email_send_log shape for SMS)
CREATE TABLE IF NOT EXISTS public.sms_outbound_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id text,
  recipient_phone text NOT NULL,
  business_id uuid,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  error_message text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sms_log_business ON public.sms_outbound_log(business_id, created_at DESC);

ALTER TABLE public.sms_outbound_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role manages sms log" ON public.sms_outbound_log FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Admins view sms log" ON public.sms_outbound_log FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Business owners view own sms log" ON public.sms_outbound_log FOR SELECT
  USING (business_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = sms_outbound_log.business_id AND b.user_id = auth.uid()));

-- 13. Helper function: check if contact suppressed (used by send engine)
CREATE OR REPLACE FUNCTION public.fn_is_suppressed(p_business_id uuid, p_contact_type text, p_contact_value text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.suppressed_contacts
    WHERE business_id = p_business_id
      AND contact_type = p_contact_type
      AND contact_value = CASE WHEN p_contact_type = 'email' THEN lower(p_contact_value) ELSE p_contact_value END
  );
$$;
