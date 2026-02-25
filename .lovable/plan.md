

# Plan: Production-Ready Revvin -- No Stripe, Manual Payouts, Multi-Tenant, Full RBAC

## Summary

This plan transforms Revvin from a prototype with wallet/escrow/Stripe dependencies into a production-ready, multi-tenant referral marketplace with manual payout operations, server-enforced access control, audit logging, duplicate prevention, in-app notifications, and regulated category gating. Every change below serves one of the 10 goals in the user's specification.

---

## Technical Details

### Phase 1: Database Migrations

A single migration covering all new tables + schema changes:

**New tables:**

1. **`organizations`** -- Multi-tenant anchor entity
   - `id uuid PK`, `name text NOT NULL`, `logo_url text`, `website text`, `industry text`, `description text`, `city text`, `state text`, `country text DEFAULT 'US'`, `verified boolean DEFAULT false`, `created_at timestamptz DEFAULT now()`, `updated_at timestamptz DEFAULT now()`
   - This replaces the current `businesses` table's role as the tenancy anchor. We keep `businesses` as-is but add an `organization_id` FK to it, OR we rename businesses to organizations. **Decision: rename `businesses` to avoid breaking too much. Instead, add `organization_id uuid REFERENCES organizations(id)` to `businesses`, `offers`, and `referrals`.** Actually -- to minimize migration complexity and maximize alignment, the simplest approach: **treat `businesses` as the Organization**. Each business IS the org. No new table needed. The existing `businesses` table already has `user_id`, `name`, `logo_url`, `industry`, `city`, `state`, etc. RLS already scopes by `user_id`. We just need to ensure `offers.business_id` and `referrals.business_id` FK properly, and add the new columns/tables below.

   **Final decision: `businesses` IS the org. No separate `organizations` table.** The `businesses` table already enforces tenant isolation via RLS (`user_id = auth.uid()`). Offers and referrals are scoped by `business_id`.

2. **`payouts`** -- Manual payout tracking for admin
   - `id uuid PK DEFAULT gen_random_uuid()`
   - `referral_id uuid NOT NULL` (FK to referrals)
   - `business_id uuid NOT NULL` (FK to businesses -- the org)
   - `referrer_id uuid NOT NULL`
   - `amount numeric NOT NULL`
   - `platform_fee numeric NOT NULL DEFAULT 0`
   - `currency text NOT NULL DEFAULT 'USD'`
   - `status text NOT NULL DEFAULT 'ready'` -- ready, processing, paid, failed, canceled
   - `method text` -- 'tremendous', 'manual', 'interac', 'ach', etc.
   - `provider_reference text` -- external ID from Tremendous or other
   - `paid_at timestamptz`
   - `processed_by uuid` -- admin user who processed
   - `notes text`
   - `created_at timestamptz DEFAULT now()`
   - `updated_at timestamptz DEFAULT now()`
   - RLS: admin can SELECT/UPDATE all; referrers can SELECT own (`referrer_id = auth.uid()`); business owners can SELECT for their business

3. **`audit_log`** -- Immutable event log
   - `id uuid PK DEFAULT gen_random_uuid()`
   - `referral_id uuid` -- nullable, for non-referral events
   - `actor_id uuid NOT NULL`
   - `event_type text NOT NULL` -- 'referral_submitted', 'referral_accepted', 'referral_declined', 'referral_won', 'referral_lost', 'referral_voided', 'payout_created', 'payout_processing', 'payout_paid', 'payout_failed', 'business_verified', 'offer_published', 'offer_paused', etc.
   - `payload jsonb` -- optional metadata (notes, old/new status, etc.)
   - `created_at timestamptz DEFAULT now()`
   - RLS: admin can SELECT all; business can SELECT where referral belongs to them; referrer can SELECT where referral belongs to them. INSERT via security definer function only.

4. **`notifications`** -- In-app notification system
   - `id uuid PK DEFAULT gen_random_uuid()`
   - `user_id uuid NOT NULL`
   - `title text NOT NULL`
   - `body text`
   - `type text NOT NULL` -- 'referral_submitted', 'referral_accepted', 'referral_declined', 'referral_won', 'referral_lost', 'payout_ready', etc.
   - `read boolean DEFAULT false`
   - `referral_id uuid` -- optional link
   - `created_at timestamptz DEFAULT now()`
   - RLS: users can SELECT/UPDATE own (`user_id = auth.uid()`). INSERT via security definer function.

5. **`referrer_payout_preferences`** -- Store-only payout info
   - `id uuid PK DEFAULT gen_random_uuid()`
   - `user_id uuid NOT NULL UNIQUE`
   - `method text` -- 'interac', 'ach', 'eft'
   - `email text` -- payout email
   - `notes text`
   - `created_at timestamptz DEFAULT now()`
   - `updated_at timestamptz DEFAULT now()`
   - RLS: users can CRUD own

**Schema changes to existing tables:**

- **`referrals`**: Add columns:
  - `payout_snapshot numeric` -- frozen payout at time of acceptance
  - `payout_type_snapshot text` -- frozen payout type
  - `void_reason text` -- if voided
  - Add `void` to valid status values (currently no enum constraint, just text)
  
- **`offers`**: Add column:
  - `restricted boolean DEFAULT false` -- admin-set flag for regulated categories
  - `approval_status text DEFAULT 'approved'` -- 'pending_approval', 'approved', 'rejected'

**Database functions:**

- `fn_create_audit_entry(referral_id uuid, actor_id uuid, event_type text, payload jsonb)` -- SECURITY DEFINER, inserts into audit_log
- `fn_create_notification(user_id uuid, title text, body text, type text, referral_id uuid)` -- SECURITY DEFINER, inserts into notifications
- `fn_check_duplicate_referral(p_offer_id uuid, p_business_id uuid, p_email text, p_phone text, p_window_days int DEFAULT 90)` -- returns boolean, checks for existing referral within window

**Restricted categories list** stored as a simple check in the offer creation flow. Categories like 'Finance', 'Insurance', 'Legal', 'Medical' will trigger `approval_status = 'pending_approval'` instead of going live immediately.

### Phase 2: Remove Stripe + Wallet Completely

**Delete files:**
- `supabase/functions/create-wallet-checkout/index.ts`
- `src/contexts/WalletContext.tsx`
- `src/components/AddFundsModal.tsx`
- `src/pages/PaymentSuccess.tsx`

**Edit files to remove wallet/Stripe references:**

- **`src/App.tsx`**: Remove `WalletProvider` wrapper, remove `PaymentSuccess` route import/route
- **`src/pages/dashboard/BusinessDashboard.tsx`**: Remove `useWallet` import, remove entire wallet section (lines ~201-251), remove `AddFundsModal`, remove `canCoverPayout`/`reserveFunds`/`releasePayout`/`refundReserve` calls from accept/won/lost handlers. Replace with: accept just updates status + creates audit entry + creates notification; won creates payout record; lost just updates status
- **`src/pages/dashboard/CreateOffer.tsx`**: Remove `useWallet` import, remove step 4 wallet content, replace with informational step: "You set the payout amount. When a deal closes, Revvin verifies and handles payout to the referrer." Change step labels from 5 to 4 steps (merge/remove wallet step). Remove `fundSecured` variable and `handleAddFunds`.
- **`src/components/BoostOfferPanel.tsx`**: Remove "Stripe-ready" text
- **`src/components/PayoutMethodSetup.tsx`**: Remove "Powered by Stripe" text, update to save to `referrer_payout_preferences` table
- **`src/pages/ForBusinesses.tsx`**: Remove "Powered by Stripe" line, replace "Fund Your Wallet" step with "Set Your Payout", replace escrow language
- **`src/pages/ForReferrers.tsx`**: Remove "Powered by Stripe" line, remove "Funds Secured" trust item, replace escrow language
- **`src/types/offer.ts`**: Remove `WalletTransaction`, `WalletState` interfaces, remove `fundSecured` from `Offer`

### Phase 3: Truthful Product Language

Global find-and-replace across all files:

| Old language | New language |
|---|---|
| "escrow", "escrowed", "escrow protected" | "verified close" or remove |
| "funds reserved", "Funds Secured" | "Verified Business" or remove badge |
| "pre-funded wallet", "wallet" (as product feature) | remove or "payout amount" |
| "locked funds" | remove |
| "Reserved (Escrow)" | "Accepted" |
| "Closed — Paid" | "Closed / Won" |

**Specific file changes:**

- **`src/pages/TrustCenter.tsx`**: Complete rewrite of the "How Funds Secured Works" section. Replace wallet/escrow flow with:
  1. Business publishes offer with payout amount
  2. Referrer submits lead
  3. Business accepts, reviews, works the deal
  4. Deal closes → Revvin verifies → payout processed
  
  Add early access statement: "During early access, payouts are processed by Revvin after a verified close."

- **`src/pages/Index.tsx`**: 
  - Update scenario #4 (escrow language) to truthful payout language
  - Remove "Escrow Protected" from trust badges, replace with "Verified Payouts"
  - Update 3-step explainer step 1 from "Business Funds Wallet" to "Business Posts Offer"
  - Update step 3 from "Funds Reserved → Close → Payout" to "Accept → Work Deal → Close → Payout"

- **`src/pages/HowItWorks.tsx`**: Update any escrow/wallet references in step descriptions

- **`src/components/ReferralWizard.tsx`**: Remove `fundSecured` badge display (line 213-218)

- **`src/pages/OfferDetail.tsx`**: Remove `fundSecured` badge, remove "Funds Secured — this payout is backed by the business's pre-funded Revvin Wallet" text (line 256-260), update `fundSecured: false` removal since the field won't exist

- **`src/components/OfferCard.tsx`**: Remove `fundSecured` badge rendering

- **`src/hooks/useDbOffers.ts`**: Remove `fundSecured` field from offer mapping

- **`src/lib/offerUtils.ts`**: Remove `fundSecuredScore` from `calculateOfferScore` (was 30 points). Redistribute: verification 30, payout 30, speed 25, close time 15.

- **`src/components/OfferScoreBadge.tsx`**: Update import from `@/data/mockOffers` to `@/lib/offerUtils`, remove "Funds Secured" row from tooltip

- **`src/pages/dashboard/ReferrerDashboard.tsx`**: Change "Funds Reserved" status label to "Accepted", remove "Reserved (Escrowed)" stat, simplify earnings display

### Phase 4: Business Dashboard Refactor (No Wallet, Payout Records)

**`src/pages/dashboard/BusinessDashboard.tsx`**:

- Remove wallet section entirely
- `handleAccept`: just update status to "accepted", snapshot payout terms onto referral (`payout_snapshot`, `payout_type_snapshot`), create audit log entry, create notification for referrer
- `handleWon`: update status to "won", INSERT into `payouts` table with status "ready", create audit log entry, create notification for referrer + admin
- `handleLost`: update status to "lost", create audit log entry, create notification for referrer
- Remove `canCoverPayout` checks
- Update status labels: "Accepted (Reserved)" → "Accepted"
- Update toast messages to remove escrow language
- Add "void" capability with reason

### Phase 5: Admin Dashboard Refactor (Real Data, Payout Queue, Audit Log)

**`src/pages/dashboard/AdminDashboard.tsx`**:

- Remove `mockDisputes` and `mockAuditLog` -- replace with real DB queries
- **Payout Queue tab**: Query `payouts` table, show status pipeline (ready → processing → paid/failed/canceled). For each payout:
  - Show referral details, amount, referrer name
  - Actions: "Start Processing" (→ processing), "Mark Paid" (prompt for method + provider reference + timestamp), "Mark Failed", "Cancel"
  - Each action inserts audit log entry
- **Audit Log tab**: Query `audit_log` table, show real events with actor, event type, timestamp, payload
- **Disputes tab**: Keep the UI structure but wire to real data when disputes table is added (for now, show empty state "No disputes" instead of mock data)
- **Verification tab**: Actually persist `verified` status to DB when admin clicks Verify (currently only updates local state)
- **Offer Management**: Actually persist status changes, check for restricted categories needing approval

### Phase 6: Referrer Dashboard Updates

**`src/pages/dashboard/ReferrerDashboard.tsx`**:

- Remove "Reserved (Escrowed)" stat, replace with "Accepted" stat
- Show payout status from `payouts` table: pending → processing → paid
- Remove wallet-related imports
- Update `PayoutMethodSetup` to save to `referrer_payout_preferences` table

### Phase 7: Duplicate Prevention (Server-Side)

- Create `fn_check_duplicate_referral` database function
- **`src/components/ReferralWizard.tsx`**: Before inserting referral, call the duplicate check function via RPC. If duplicate found, show error: "This person has already been referred for this offer."
- The function checks: within same `business_id` + `offer_id`, matching `customer_email` OR `customer_phone`, within 90 days, where status is NOT 'declined' or 'void'

### Phase 8: Audit Logging

- Create `fn_create_audit_entry` security definer function
- Call it from every status change in BusinessDashboard, AdminDashboard
- ReferralWizard calls it on submission
- Admin payout actions call it

### Phase 9: In-App Notifications

**New component: `src/components/NotificationBell.tsx`**
- Bell icon in Navbar with unread count badge
- Dropdown showing recent notifications
- Click marks as read
- Query `notifications` table for current user

**`src/components/Navbar.tsx`**: Add NotificationBell for authenticated users

**Notification triggers** (called via `fn_create_notification`):
- Business: "New referral submitted for [offer title]"
- Referrer: "Your referral to [business] was accepted/declined/won/lost"
- Admin: "Payout ready for review: $X for [referrer name]"

### Phase 10: Regulated Categories Gating

- Define restricted categories: `['Finance', 'Insurance', 'Legal', 'Medical', 'Mortgage']`
- **`src/pages/dashboard/CreateOffer.tsx`**: When category is restricted, on submit set `approval_status = 'pending_approval'` instead of going live. Show message: "This category requires approval before going live. Our team will review within 1-2 business days."
- **Admin Dashboard**: Show pending approval offers in Verification tab with approve/reject actions
- **`src/hooks/useDbOffers.ts`**: Only show offers where `approval_status = 'approved'` (or add this to the existing `status = 'active'` RLS)

### Phase 11: Password Reset Flow

**New page: `src/pages/ResetPassword.tsx`**
- Shows form to set new password
- Checks for `type=recovery` in URL hash
- Calls `supabase.auth.updateUser({ password })`

**`src/pages/Auth.tsx`**: Add "Forgot password?" link that calls `supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/reset-password' })`

**`src/App.tsx`**: Add route `/reset-password`

### Phase 12: Polish & Hardening

- **`src/pages/Auth.tsx`**: Already has email verification. Add forgot password link.
- **`src/components/ProtectedRoute.tsx`**: Already handles auth + role checks. Good.
- **`src/pages/NotFound.tsx`**: Already exists. Good.
- **Remove fake stats**: `usePlatformStats` already returns zeroes when no data. Update `Index.tsx` "Revenue Influenced" and "Avg Time-to-Close" hardcoded stats in BusinessDashboard to only show when real data exists.
- **Loading/error states**: Already present in most views. Ensure consistency.
- **Mobile responsive**: Audit key pages (done as part of each component edit).

---

## File Change Summary

| Action | File |
|--------|------|
| **Migration** | New tables: `payouts`, `audit_log`, `notifications`, `referrer_payout_preferences`. New columns on `referrals` and `offers`. New DB functions. RLS policies. |
| **Delete** | `supabase/functions/create-wallet-checkout/index.ts` |
| **Delete** | `src/contexts/WalletContext.tsx` |
| **Delete** | `src/components/AddFundsModal.tsx` |
| **Delete** | `src/pages/PaymentSuccess.tsx` |
| **Create** | `src/pages/ResetPassword.tsx` |
| **Create** | `src/components/NotificationBell.tsx` |
| **Edit** | `src/App.tsx` -- remove WalletProvider, PaymentSuccess route, add ResetPassword route |
| **Edit** | `src/types/offer.ts` -- remove WalletState, WalletTransaction, fundSecured |
| **Edit** | `src/pages/dashboard/BusinessDashboard.tsx` -- remove wallet, add payout record creation, audit logging, notifications, truthful language |
| **Edit** | `src/pages/dashboard/AdminDashboard.tsx` -- real payout queue, real audit log, real verification persistence, remove mock data |
| **Edit** | `src/pages/dashboard/ReferrerDashboard.tsx` -- remove escrow language, show payout status from payouts table |
| **Edit** | `src/pages/dashboard/CreateOffer.tsx` -- remove wallet step, add restricted category check, informational payout step |
| **Edit** | `src/pages/TrustCenter.tsx` -- complete rewrite removing escrow claims, add early access statement |
| **Edit** | `src/pages/Index.tsx` -- update scenarios, trust badges, 3-step explainer language |
| **Edit** | `src/pages/HowItWorks.tsx` -- remove escrow/wallet language |
| **Edit** | `src/pages/ForBusinesses.tsx` -- remove Stripe/wallet/escrow language |
| **Edit** | `src/pages/ForReferrers.tsx` -- remove Stripe/escrow language |
| **Edit** | `src/pages/OfferDetail.tsx` -- remove fundSecured, update language |
| **Edit** | `src/pages/Auth.tsx` -- add forgot password link |
| **Edit** | `src/components/Navbar.tsx` -- add NotificationBell |
| **Edit** | `src/components/ReferralWizard.tsx` -- remove fundSecured, add duplicate check |
| **Edit** | `src/components/OfferCard.tsx` -- remove fundSecured badge |
| **Edit** | `src/components/OfferScoreBadge.tsx` -- fix import, remove fundSecured score |
| **Edit** | `src/components/PayoutMethodSetup.tsx` -- persist to DB, remove Stripe reference |
| **Edit** | `src/components/BoostOfferPanel.tsx` -- remove Stripe reference |
| **Edit** | `src/hooks/useDbOffers.ts` -- remove fundSecured field |
| **Edit** | `src/lib/offerUtils.ts` -- update score calculation without fundSecured |
| **Edit** | `src/pages/Privacy.tsx` -- update Stripe reference |
| **Edit** | `src/pages/Terms.tsx` -- update escrow references if any |

**Estimated scope**: ~30 file edits, 1 large migration, 2 new components, 4 file deletions. This is a large change set but each piece is well-defined.

