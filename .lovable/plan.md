

## Soft Reserve Model — Migration Plan

### Summary
Switch from locking funds at publish time to a "credit limit" model. The wallet balance stays untouched until a deal actually closes. "Committed" is calculated on-the-fly from active offers.

---

### 1. Rewrite `reserve-offer-funds` Edge Function

**Current**: Deducts `payout + fee` from `available`, moves to `reserved`/`platform_fees`, inserts `reserve` + `fee` transactions.

**New**: Balance validation only — no wallet mutation.

- Fetch all active offers for this business: `SELECT payout, platform_fee_rate FROM offers WHERE business_id = ? AND status = 'active'`
- Sum `total_committed = Σ (payout × (1 + platform_fee_rate))` across all active offers
- Calculate `new_offer_cost = this_payout × (1 + fee_rate)`
- Check: `wallet.available >= total_committed + new_offer_cost`
- If insufficient → return 402 with `shortfall`, `total_committed`, `new_offer_cost`, `available`
- If sufficient → update offer to `status='active'`, `deposit_status='validated'`, `platform_fee_rate=feeRate`
- No wallet update, no wallet_transactions insert

---

### 2. Rewrite `process-deal-won` Edge Function

**Current**: Moves money from `reserved` to `paid_out`. `platform_fee = 0`.

**New**: Deducts from `available`. Collects fee at close time.

- Calculate `payoutAmt = payout_snapshot` (or offer payout)
- Fetch offer's `platform_fee_rate` → calculate `platformFee = payoutAmt × platform_fee_rate`
- `totalDeduction = payoutAmt + platformFee`
- Guard: `wallet.available >= totalDeduction` → if not, return error "Insufficient wallet balance to process this payout. Please top up your wallet."
- Update `wallet_balances`: `available -= totalDeduction`, `paid_out += payoutAmt`, `platform_fees += platformFee`
- Insert TWO `wallet_transactions`: `type='payout'` for `payoutAmt` and `type='fee'` for `platformFee`
- Create payout record with `platform_fee = platformFee` (not 0 anymore)
- Rest stays same (audit, notification)

---

### 3. Simplify `release-offer-funds` Edge Function

**Current**: Releases reserved funds back to available, inserts release transaction.

**New**: Just change status — no wallet mutation needed.

- Keep auth + ownership check
- Keep active referral check (block if in-progress referrals exist)
- Update offer status to `paused`/`closed`
- Remove all wallet update logic and release transaction insert
- Return `{ success: true }`

---

### 4. Update Wallet UI in `BusinessDashboard.tsx`

**Current wallet card** (lines 360-434): Shows Available, Reserved, Total Funded, Platform Fees.

**New wallet card**:
- **Balance**: `wallet.available` (the real money)
- **Committed**: calculated client-side = `Σ (offer.payout × (1 + offer.platform_fee_rate))` for all active offers
- **Available to Commit**: `Balance - Committed`
- **Total Paid Out**: `wallet.paid_out`
- Add info tooltip next to "Committed": *"This is the total amount your active offers could pay out. Your wallet balance needs to stay above this amount. When a referral closes, the payout + platform fee is deducted from your balance."*
- Remove "Reserved" and "Platform Fees" display boxes
- Transaction labels: remove `reserve` and `release` types from `txTypeLabels` (they won't appear in new transactions)

---

### 5. Update `toggleOfferStatus` in `BusinessDashboard.tsx`

**Current** (lines 216-236): Calls `release-offer-funds` edge function on pause, shows released amount.

**New**: Still call `release-offer-funds` (for the active referral check + status update), but update the success toast to just say "Offer paused" without mentioning released funds. Remove `fetchWallet` call after pause since wallet doesn't change.

For reactivation (paused → active): Need to call `reserve-offer-funds` to re-validate balance before reactivating (same soft check). Update the else branch to invoke the edge function instead of direct status update.

---

### 6. Update `CreateOffer.tsx` (lines 298-330)

- Change "Total Reserved" label to "Total Cost per Referral"
- Change info text (line 328): "When you publish, we'll verify your wallet balance can cover this offer. The actual deduction happens when a referral closes."
- Shortfall dialog message: "You need $X more in your wallet to cover this offer. Your current available-to-commit balance is $Y." with "Top Up Wallet" button (already exists)

---

### Files Changed

| File | Change |
|------|--------|
| `supabase/functions/reserve-offer-funds/index.ts` | Rewrite: validation-only, no wallet mutation |
| `supabase/functions/process-deal-won/index.ts` | Rewrite: deduct from available, collect fee at close |
| `supabase/functions/release-offer-funds/index.ts` | Simplify: status change only, no wallet mutation |
| `src/pages/dashboard/BusinessDashboard.tsx` | Wallet UI: Balance/Committed/Available to Commit/Paid Out + tooltip; update toggleOfferStatus |
| `src/pages/dashboard/CreateOffer.tsx` | Update labels and info text |

### No Changes Needed
- Top-up flow, Stripe webhooks, Tremendous payout, subscription flow, fee rates — all stay the same
- `wallet_balances` table schema stays the same (we just stop using `reserved` for new operations)
- `wallet_transactions` table stays the same

