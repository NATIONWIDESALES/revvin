# Pending, unapplied SQL

Nothing in this folder has been applied. Preview and production share one
database, so these statements were written for review rather than run.

## Deployment order

1. **Review and apply `20260908_release_1.sql`** through the migration tool.
   It contains:
   - `leads.closed_at` plus the trigger that sets it when a lead becomes
     `closed_won` (historical rows stay NULL, they are genuinely unknown).
   - `fn_submit_public_referral`, the security-definer function guest referral
     submission now calls. It resolves the business from the slug, requires the
     page to be published and the account healthy, does **not** require a
     subscription, validates consent and input, rate limits, and returns a
     minimal receipt. No public SELECT on `leads` is granted.
   - Removal of the old direct public INSERT policy on `leads`, which also
     removes the subscription requirement that stopped free and cancelled pages
     from receiving referrals.
   - `fn_get_business_roi` rewritten to attribute revenue by close date instead
     of creation date.

2. **Deploy the edge functions.** `stripe-business-webhook` now records a
   `payment_collected` funnel event on a paid invoice. Nothing depends on step 1.

3. **Deploy the frontend.**

## Until step 1 is applied

The public referral form calls `fn_submit_public_referral`, which does not exist
yet, so guest referral submission will fail. This release is not user-facing
ready before that migration runs.
