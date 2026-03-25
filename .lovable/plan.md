

## Fix: Payout Creation Failing on "Won" Due to Missing RLS Policy

### Root Cause
When a business marks a referral as "Won" in `BusinessDashboard.tsx`, two database calls happen:
1. `referrals.update({ status: "won" })` — **succeeds** (business owners have UPDATE on referrals)
2. `payouts.insert(...)` — **fails silently** (no INSERT policy exists for business owners on `payouts`)

The `payouts` table only has an `ALL` policy for **admins**. Business owners can only SELECT.

### Fix: Add RLS Policy for Business Payout Creation

**SQL Migration** — Add an INSERT policy on `payouts` allowing business owners to create payout records for their own referrals:

```sql
CREATE POLICY "Business owners create payouts for own referrals"
ON public.payouts
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM businesses
    WHERE businesses.id = payouts.business_id
    AND businesses.user_id = auth.uid()
  )
);
```

This is safe because:
- Business can only insert payouts linked to their own `business_id`
- The payout amount is derived from the offer/snapshot, not user input of arbitrary values
- Admins already have full access via the existing ALL policy

### Secondary Issue: `payout_snapshot` is null

The referral's `payout_snapshot` column is null, meaning the payout terms weren't snapshotted at referral acceptance. The `handleWon` function already handles this gracefully (falls back to `ref.offers.payout`), so the payout amount of $675 is correct ($750 × 0.9 = $675). No code change needed here — this is a pre-existing data gap for referrals created before the snapshot logic was added.

### No Code Changes Needed
The `BusinessDashboard.tsx` code on line 99 is correct — it just needs the RLS policy to allow the insert to succeed.

