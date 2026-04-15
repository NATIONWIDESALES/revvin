-- Fix existing referrals: set payout_amount to 100% of offer payout and populate payout_snapshot
UPDATE public.referrals r
SET payout_amount = o.payout,
    payout_snapshot = o.payout,
    payout_type_snapshot = o.payout_type
FROM public.offers o
WHERE r.offer_id = o.id
  AND (r.payout_amount IS NULL OR r.payout_amount != o.payout);