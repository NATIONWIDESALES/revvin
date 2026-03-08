

## Investigation: Limited Functionality and Missing Code Components

After reviewing the full codebase, here are the gaps identified (excluding payments/Stripe/rewards which are being handled separately):

### Issues Found

**1. Referrer Dispute is client-only (no DB persistence)**
In `ReferrerDashboard.tsx` line 86-89, `handleDispute` only updates local state — it never writes to the database. The dispute status is lost on refresh.

**2. Referrer "Nudge" button is fake**
In `ReferrerDashboard.tsx` line 182, clicking "Nudge" only shows a toast — no notification is sent to the business owner. It's purely cosmetic.

**3. Invite Business Modal doesn't actually send anything**
`InviteBusinessModal.tsx` line 18-21: `handleSend` just sets `sent = true` — no email, no DB record, nothing. Pure UI theater.

**4. PayoutMethodSetup is entirely local state**
The payout method selection in `PayoutMethodSetup.tsx` uses `useState` only. The `referrer_payout_preferences` table exists in the DB but is never read or written to. Selection is lost on refresh.

**5. File upload in ReferralWizard is non-functional**
`ReferralWizard.tsx` line 289-298 shows a file upload area but there's no `onChange` handler, no file storage logic, and `file_url` on referrals is never populated.

**6. Referrer signup step 2 data (location, industry familiarity) is discarded**
In `Auth.tsx`, the referrer step 2 collects `location` and `industryFamiliarity` but neither value is included in the `metadata` object passed to `signUp` (lines 68-74 only handle business role metadata).

**7. Hardcoded currency/country on DB offers**
`useDbOffers.ts` and `OfferDetail.tsx` hardcode `currency: "USD"` and `country: "US"` for all offers. The offers table has `deposit_currency` but no general `currency`/`country` columns, making the country filter on Browse essentially non-functional with real data.

**8. Duplicate referral check exists in DB but is never called**
The function `fn_check_duplicate_referral` exists but `ReferralWizard.tsx` never invokes it before inserting, so duplicate referrals can be submitted freely.

### Proposed Fixes (in priority order)

**Fix 1: Persist PayoutMethodSetup to DB** — Read/write `referrer_payout_preferences` table. Small, self-contained.

**Fix 2: Persist referrer signup metadata** — Add `location` and `industryFamiliarity` to the signup metadata so it flows into the profile via the trigger.

**Fix 3: Wire up duplicate referral check** — Call `fn_check_duplicate_referral` RPC before inserting in ReferralWizard, show a warning if duplicate detected.

**Fix 4: Persist dispute to DB** — Update the referral status to `"disputed"` in the database (not just local state) and create an audit log entry + notification.

**Fix 5: Wire up Nudge to send a notification** — Use `fn_create_notification` to notify the business owner when a referrer nudges.

**Fix 6: Wire up Invite Business Modal** — Store the invite in a simple table or send an email via the existing Resend integration.

**Fix 7: Add `country` and `currency` columns to offers table** — Populate from business location or let business select during offer creation, then use real values in browse/detail.

**Fix 8: File upload in ReferralWizard** — Wire to a storage bucket and save the URL to `file_url`.

Fixes 1-5 are low-risk, high-value, and won't break existing functionality. Fixes 6-8 are medium effort. All avoid touching payment/reward flows.

