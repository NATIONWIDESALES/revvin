

## Parts 8–11: Wallet Payout, Offer Pause/Close, Public Page Updates, Percentage Cleanup

---

### Part 8: Update `handleWon` in BusinessDashboard.tsx

**Current** (line 184-196): Calculates `referrerPayout = payoutAmt * 0.9`, deducts 10% as platform fee from the referrer's cut.

**New behavior**:
- Referrer gets 100% of `payout_snapshot` (fee already collected at publish time)
- Update `wallet_balances`: deduct `payout_snapshot` from `reserved`, add to `paid_out`
- Insert `wallet_transaction`: `type='payout'`, `amount=payout_snapshot`, `referral_id`
- Create payout record: `amount = payout_snapshot`, `platform_fee = 0`
- Update `referrals`: `payout_amount = payout_snapshot`
- Refetch wallet after update

Since `wallet_balances` has no INSERT/UPDATE RLS for authenticated users, the wallet update must go through a service-role call. Two options:
1. Create an edge function `process-deal-won` that handles the atomic wallet + payout creation
2. Do the payout insert client-side (RLS allows business owners) and wallet update via edge function

**Decision**: Create a new edge function `process-deal-won` to handle the atomic operation (wallet update + payout insert + referral status update). This is cleaner and prevents partial failures.

---

### Part 9: Offer Pause/Close with Fund Release

**Current** `toggleOfferStatus` (line 213-217): Simply flips `active` ↔ `paused` with no wallet logic.

**New behavior**:
- Before pausing/closing, check if offer has referrals in `submitted`, `accepted`, `contacted`, `in_progress`, or `qualified` status → if yes, block and show warning toast
- If no active referrals: release reserved funds back to wallet
- Create edge function `release-offer-funds`:
  - Auth + ownership check
  - Verify no in-progress referrals for this offer
  - Add `payout` back to `wallet_balances.available`, deduct from `reserved`
  - Insert `wallet_transaction`: `type='release'`, `amount=payout`, `offer_id`
  - Update offer status to `paused` or `closed`
  - Platform fee is NOT refunded
- Update `toggleOfferStatus` to call this edge function instead of direct update

---

### Part 10: Public-Facing Page Updates

Update payout language across 5 files:

| File | Change |
|------|--------|
| **TrustCenter.tsx** | Step 4 desc → "referrer receives 100% of the advertised payout. Platform fee is charged separately to the business." Payout examples: CA$600 → referrer gets CA$600, business pays CA$750 (free) or CA$660 (paid). Remove "90/10" references. SEO description update. |
| **HowItWorks.tsx** | Step 05 → "The realtor receives the full $500. The business paid a platform fee on top. Revvin earns from the business, not the referrer." |
| **Index.tsx** | FAQ answer → "A platform fee on each referral offer (25% free tier, 10% paid). The referrer always gets the full advertised amount." Social proof strip: "90/10 payout split" → "100% referrer payout" |
| **ReferralAgreement.tsx** | Section 4 → Remove 90/10 language. "Referrers receive 100% of the advertised referral fee. The platform fee is charged separately to the business at offer publication." |
| **Terms.tsx** | Section 6 → Same update. Remove 90/10 split language. |

---

### Part 11: Percentage Payout Cleanup

Remove all `percentage` payout type UI (keep DB columns):

| File | Change |
|------|--------|
| **OfferCard.tsx** | Line 79: Remove ternary, always use `formatPayout(offer.payout, offer.currency)` |
| **OfferDetail.tsx** | Lines 47, 95-96, 155: Remove `percentage` conditionals, always show flat format |
| **Browse.tsx** | Lines 38, 65, 230-232: Remove `payoutTypeFilter` state, remove "$ Flat" / "% Pct" buttons, remove filter logic |
| **types/offer.ts** | Line 12: Change `payoutType` to just `"flat"` (keep field for compatibility) |
| **CreateOffer.tsx** | Already cleaned in Part 5 |

---

### Files Changed

| File | Action |
|------|--------|
| `supabase/functions/process-deal-won/index.ts` | **New** — atomic wallet debit + payout creation |
| `supabase/functions/release-offer-funds/index.ts` | **New** — release reserved funds on pause/close |
| `src/pages/dashboard/BusinessDashboard.tsx` | Update `handleWon` → call edge function; update `toggleOfferStatus` → call release edge function with active referral check |
| `src/pages/TrustCenter.tsx` | Update payout examples and language |
| `src/pages/HowItWorks.tsx` | Update step 5 description |
| `src/pages/Index.tsx` | Update FAQ and social proof strip |
| `src/pages/ReferralAgreement.tsx` | Update Section 4 |
| `src/pages/Terms.tsx` | Update Section 6 |
| `src/components/OfferCard.tsx` | Remove percentage conditional |
| `src/pages/OfferDetail.tsx` | Remove percentage conditionals |
| `src/pages/Browse.tsx` | Remove percentage filter |
| `src/types/offer.ts` | Simplify payoutType to `"flat"` |

