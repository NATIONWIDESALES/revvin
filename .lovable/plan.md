
# REVVIN.CO v1 — Full Architecture Reset

Confirmed scope: **wipe, pre-launch** (no data migration). **Launch Package stays** as optional $297 add-on at checkout. **All at once** in a single sweep.

## 1. Project memory (first)

Rewrite `mem://index.md` Core + several memory files to reflect:
- Single flat plan: **$49/month, 14-day free trial. No platform fees. No tiers.**
- **Direct payouts**: businesses pay referrers off-platform. No Tremendous, no wallet, no escrow.
- Platform tracks status pipeline only: Submitted → Contacted → Quoted → Closed-Won/Lost → Paid.
- Non-payment flagging by referrers (30-day rule).
- Launch Package $297 remains as optional add-on (existing checkbox keeps working).

Files to delete/rewrite:
- `mem://business/monetization-model` → flat $49/mo, no fees
- `mem://features/wallet-funding-model` → **delete**
- `mem://features/offer-funding-reservation` → **delete**
- `mem://features/referral-payout-logic` → rewrite: direct off-platform
- `mem://features/subscription-tier-sync` → **delete**
- `mem://features/subscription-management-portal` → keep, simplified
- `mem://features/automated-payouts-tremendous` → **delete**
- `mem://features/admin-revenue-reporting` → rewrite: MRR only, no fees
- `mem://business/pricing-visibility-strategy` → rewrite: pricing public
- `mem://style/copy-constraints` → drop "platform fee" / "wallet reservation" terminology

## 2. Database migration

Drop tables (wipe — pre-launch):
- `wallet_balances`, `wallet_transactions`
- `referrer_payout_preferences`
- `tremendous_webhook_log`
- Keep `payouts` table? **No — drop.** Replace with simple `payment_status` column on `referrals`.
- Keep `launch_tasks` (Launch Package add-on stays)

Modify `referrals`:
- Add `payment_status text default 'not_due'` (values: `not_due`, `paid`, `flagged_unpaid`)
- Add `payment_marked_at timestamptz`
- Add `flagged_unpaid_at timestamptz`

Modify `offers`:
- Drop `platform_fee_rate`, `deposit_status`, `deposit_amount`, `deposit_currency`, `stripe_checkout_session_id`, `stripe_payment_intent_id`, `deposit_paid_at`

Modify `businesses`:
- Drop `pricing_tier` (or default everyone to `'pro'`/`'paid'`)
- Keep `stripe_subscription_id`, `subscription_status`

Update `handle_new_user` trigger: remove the `wallet_balances` insert.

## 3. Edge functions — delete

- `create-deposit-session`
- `stripe-deposit-webhook`
- `reserve-offer-funds`
- `release-offer-funds`
- `process-deal-won`
- `process-tremendous-payout`
- `generate-payout-link`
- `tremendous-webhook`
- `create-subscription-session` (tier upgrade flow gone)

Keep + simplify:
- `create-business-checkout` — already correct ($49/mo + optional $297 add-on)
- `check-subscription` — strip PRICE_TO_TIER map, just return `subscribed: true/false` + trial info
- `stripe-business-webhook` — strip tier sync logic, keep subscription status sync
- `customer-portal` — unchanged

## 4. Frontend — code deletion

Delete components:
- `WalletPanel` (if exists), wallet display anywhere in dashboards
- `PayoutPreferences`
- `PlanSelector` (tier upgrade UI)
- `src/lib/pricing.ts` (platform fee helper)
- Wallet recovery in `AuthContext.ensureWallet` → remove

## 5. Frontend — rewrites

**`src/pages/Index.tsx`** — full rewrite per spec:
- New nav: Logo | How it works | Browse Offers | Pricing | Log In | **List your business** (primary, top-right)
- Hero: business-focused, "$49/month. Cancel anytime. No contract. No setup fee."
- Industries strip (existing style)
- **Browse Offers grid above the fold** (6–8 cards, real DB data via `useDbOffers`, fallback to seed)
- How it works (3 cards, business-focused)
- "Everything included for $49/month" 6-card grid
- "Math beats ads" comparison table
- For referrers (smaller section)
- Trust & fairness (4 cards, updated — first submission wins, terms locked, business review, non-payment protection)
- Pricing (single $49 card)
- FAQ — 7 spec questions verbatim
- Footer

**`src/pages/Pricing.tsx`** — single card, $49/mo, 14-day trial.

**`src/pages/dashboard/BusinessDashboard.tsx`** — strip wallet/fees, add `payment_status` column + "Mark as paid" action on Closed-Won referrals.

**`src/pages/dashboard/ReferrerDashboard.tsx`** — strip wallet, change "in your wallet" → "total earned", add "Flag non-payment" button on Closed-Won referrals >30 days old without payment.

**`src/pages/PublicReferralPage.tsx`** — strip wallet/fee/escrow copy.

**`src/pages/Browse.tsx`** — strip fee display, just "$X per closed deal".

**`src/pages/dashboard/CreateOffer.tsx` / `EditOffer.tsx`** — strip deposit + fee fields.

**`src/pages/dashboard/AccountSettings.tsx`** — strip wallet/payout sections.

**`src/pages/dashboard/AdminDashboard.tsx`** — strip wallet/payout queues; revenue reporting becomes MRR.

**`src/pages/SuperAdminCRM.tsx`** — same simplification.

## 6. Tests

Update `src/test/content-guards.test.ts` to also forbid: "wallet", "platform fee", "Tremendous", "escrow", "Starter", "Enterprise" in user-facing copy. Run vitest after.

## 7. Order of execution

1. Update memory index (one write)
2. Submit DB migration (requires user approval)
3. While migration approved: rewrite homepage, pricing, FAQ, public referral page, browse
4. Strip dashboards
5. Delete unused components/lib
6. Delete edge functions (one batch)
7. Simplify check-subscription + stripe-business-webhook
8. Update content-guards test, run vitest
9. Verify build

## Technical notes

- `payments` and `business_id`/`referrer_id` foreign keys: the `payouts` table is dropped, so the FK on `referrals` is unaffected.
- The Launch Package opt-in checkbox in `Signup`/checkout already works — leave as-is.
- `useDbOffers` already returns offers; OfferCard will need a small prop tweak to hide fee.
- Tremendous secrets stay in Supabase (orphaned) — that's fine, no code references them after deletion.

## Out of scope (per spec)

- No mobile app, no API access, no white-label, no team accounts, no escrow.
