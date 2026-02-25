
-- =============================================
-- PHASE 1: New tables, columns, functions, RLS
-- =============================================

-- 1. Payouts table (manual payout tracking for admin)
CREATE TABLE public.payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id uuid NOT NULL REFERENCES public.referrals(id),
  business_id uuid NOT NULL REFERENCES public.businesses(id),
  referrer_id uuid NOT NULL,
  amount numeric NOT NULL,
  platform_fee numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'ready',
  method text,
  provider_reference text,
  paid_at timestamptz,
  processed_by uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all payouts" ON public.payouts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Referrers view own payouts" ON public.payouts FOR SELECT TO authenticated
  USING (referrer_id = auth.uid());

CREATE POLICY "Business owners view payouts" ON public.payouts FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.businesses WHERE businesses.id = payouts.business_id AND businesses.user_id = auth.uid()));

-- 2. Audit log table (immutable)
CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id uuid,
  actor_id uuid NOT NULL,
  event_type text NOT NULL,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view all audit" ON public.audit_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Business owners view related audit" ON public.audit_log FOR SELECT TO authenticated
  USING (referral_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.referrals r JOIN public.businesses b ON r.business_id = b.id
    WHERE r.id = audit_log.referral_id AND b.user_id = auth.uid()
  ));

CREATE POLICY "Referrers view related audit" ON public.audit_log FOR SELECT TO authenticated
  USING (referral_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.referrals WHERE referrals.id = audit_log.referral_id AND referrals.referrer_id = auth.uid()
  ));

-- 3. Notifications table (in-app)
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  body text,
  type text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  referral_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own notifications" ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- 4. Referrer payout preferences (store-only)
CREATE TABLE public.referrer_payout_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  method text,
  email text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.referrer_payout_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own payout prefs" ON public.referrer_payout_preferences FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 5. Add columns to referrals
ALTER TABLE public.referrals
  ADD COLUMN IF NOT EXISTS payout_snapshot numeric,
  ADD COLUMN IF NOT EXISTS payout_type_snapshot text,
  ADD COLUMN IF NOT EXISTS void_reason text;

-- 6. Add columns to offers
ALTER TABLE public.offers
  ADD COLUMN IF NOT EXISTS restricted boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS approval_status text DEFAULT 'approved';

-- 7. Security definer functions

-- Audit entry creator
CREATE OR REPLACE FUNCTION public.fn_create_audit_entry(
  p_referral_id uuid,
  p_actor_id uuid,
  p_event_type text,
  p_payload jsonb DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_log (referral_id, actor_id, event_type, payload)
  VALUES (p_referral_id, p_actor_id, p_event_type, p_payload);
END;
$$;

-- Notification creator
CREATE OR REPLACE FUNCTION public.fn_create_notification(
  p_user_id uuid,
  p_title text,
  p_body text,
  p_type text,
  p_referral_id uuid DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, body, type, referral_id)
  VALUES (p_user_id, p_title, p_body, p_type, p_referral_id);
END;
$$;

-- Duplicate referral checker
CREATE OR REPLACE FUNCTION public.fn_check_duplicate_referral(
  p_offer_id uuid,
  p_business_id uuid,
  p_email text,
  p_phone text DEFAULT NULL,
  p_window_days int DEFAULT 90
) RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.referrals
    WHERE offer_id = p_offer_id
      AND business_id = p_business_id
      AND status NOT IN ('declined', 'void')
      AND created_at > now() - (p_window_days || ' days')::interval
      AND (
        (p_email IS NOT NULL AND p_email != '' AND customer_email = p_email)
        OR (p_phone IS NOT NULL AND p_phone != '' AND customer_phone = p_phone)
      )
  );
END;
$$;

-- Updated_at trigger for new tables
CREATE TRIGGER set_payouts_updated_at BEFORE UPDATE ON public.payouts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_payout_prefs_updated_at BEFORE UPDATE ON public.referrer_payout_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Update offers RLS to also filter by approval_status for public viewing
DROP POLICY IF EXISTS "Public offers viewable" ON public.offers;
CREATE POLICY "Public offers viewable" ON public.offers FOR SELECT TO authenticated
  USING (
    (status = 'active' AND approval_status = 'approved')
    OR EXISTS (SELECT 1 FROM public.businesses WHERE businesses.id = offers.business_id AND businesses.user_id = auth.uid())
  );
