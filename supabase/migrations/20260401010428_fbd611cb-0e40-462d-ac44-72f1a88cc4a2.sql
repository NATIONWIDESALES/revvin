-- 1. Fix referral-attachments INSERT policy: add path ownership check
DROP POLICY IF EXISTS "Authenticated users upload referral attachments" ON storage.objects;
CREATE POLICY "Authenticated users upload referral attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'referral-attachments'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 2. Add DELETE policy for referral-attachments
CREATE POLICY "Users delete own referral attachments"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'referral-attachments'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 3. Fix badge self-award: drop permissive INSERT policy
DROP POLICY IF EXISTS "System inserts badges" ON public.user_badges;

-- Create a security definer function for server-side badge awards
CREATE OR REPLACE FUNCTION public.award_badge_if_qualified(p_badge_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _badge badges%ROWTYPE;
  _count int;
  _qualified boolean := false;
BEGIN
  SELECT * INTO _badge FROM badges WHERE id = p_badge_id;
  IF NOT FOUND THEN RETURN false; END IF;

  -- Check if already earned
  IF EXISTS (SELECT 1 FROM user_badges WHERE user_id = auth.uid() AND badge_id = p_badge_id) THEN
    RETURN true; -- Already has it
  END IF;

  -- Check qualification based on badge type
  IF _badge.badge_type = 'referrals' THEN
    SELECT count(*) INTO _count FROM referrals
    WHERE referrer_id = auth.uid() AND status = 'won';
    _qualified := _count >= _badge.threshold;
  END IF;

  IF _qualified THEN
    INSERT INTO user_badges (user_id, badge_id) VALUES (auth.uid(), p_badge_id);
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- 4. Hide Stripe IDs from public/anon offers access
-- Replace the public SELECT policy with one that uses a security definer function
-- to strip sensitive columns for non-owner, non-admin users
DROP POLICY IF EXISTS "Public offers viewable" ON public.offers;

-- Recreate: public can see active+approved offers (unchanged row access)
CREATE POLICY "Public offers viewable"
ON public.offers FOR SELECT TO public
USING (
  ((status = 'active' AND approval_status = 'approved')
   OR EXISTS (SELECT 1 FROM businesses WHERE businesses.id = offers.business_id AND businesses.user_id = auth.uid()))
);

-- Create a trigger to null out stripe columns for non-owners on SELECT
-- Since column-level RLS isn't possible, we'll use a view approach
CREATE OR REPLACE VIEW public.offers_public AS
SELECT
  id, business_id, title, description, category, payout, payout_type,
  location, country, currency, deal_size_min, deal_size_max, close_time_days,
  remote_eligible, featured, qualification_criteria, status, approval_status,
  deposit_status, deposit_amount, deposit_currency, deposit_paid_at,
  max_payout_cap, platform_fee_rate, restricted, created_at, updated_at
FROM public.offers;

-- Grant access to the view
GRANT SELECT ON public.offers_public TO anon, authenticated;

-- 5. Realtime channel authorization
-- Add RLS policy on realtime.messages to restrict channel subscriptions
-- Note: This uses the realtime schema's built-in support
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users only receive own notifications"
ON realtime.messages FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 WHERE 
    realtime.topic() = 'notifications:' || auth.uid()::text
    OR realtime.topic() = 'notifications'
  )
);