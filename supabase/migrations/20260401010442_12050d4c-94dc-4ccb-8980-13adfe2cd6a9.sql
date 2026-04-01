DROP VIEW IF EXISTS public.offers_public;

CREATE VIEW public.offers_public
WITH (security_invoker = true)
AS
SELECT
  id, business_id, title, description, category, payout, payout_type,
  location, country, currency, deal_size_min, deal_size_max, close_time_days,
  remote_eligible, featured, qualification_criteria, status, approval_status,
  deposit_status, deposit_amount, deposit_currency, deposit_paid_at,
  max_payout_cap, platform_fee_rate, restricted, created_at, updated_at
FROM public.offers;

GRANT SELECT ON public.offers_public TO anon, authenticated;