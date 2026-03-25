

## Parts 4-6: Reserve Funds, CreateOffer Rewrite, Wallet Dashboard

### Part 4: New Edge Function `reserve-offer-funds`

Create `supabase/functions/reserve-offer-funds/index.ts`:

- Auth via JWT, verify caller owns the business that owns the offer
- Fetch offer (must be `status='draft'`), fetch business `pricing_tier`
- Calculate: `fee_rate` = 0.25 (free) or 0.10 (paid), `total_required` = payout * (1 + fee_rate), `platform_fee` = payout * fee_rate
- Fetch `wallet_balances` for user; if `available < total_required` return error with `shortfall`
- If sufficient: use service-role client to atomically update `wallet_balances` (deduct `total_required` from `available`, add payout to `reserved`, add fee to `platform_fees`), insert two `wallet_transactions` (type `reserve` and `fee`), update offer to `status='active'`, `deposit_status='paid'`, `platform_fee_rate=fee_rate`
- Return `{ success, reserved, fee, remaining_balance }`

### Part 5: Rewrite `CreateOffer.tsx`

- **Remove percentage payout**: Delete the flat/percentage toggle, `maxPayoutCap` field, all percentage logic. Hardcode `payout_type: 'flat'`.
- **Remove Step 5** (Deposit & Publish): Change `TOTAL_STEPS` to 4, remove step 5 label, remove deposit polling useEffect, remove `handlePayDeposit`, remove step 5 render block.
- **Step 4 "Publish" button**: On click, call `reserve-offer-funds`. If error with shortfall, show dialog: "You need $X more" with "Top Up Wallet" button navigating to `/dashboard`. If success, toast + navigate to dashboard.
- **Step 2 fee breakdown**: Fetch business `pricing_tier` on mount. Show dynamic breakdown: "Referral Fee: $X | Platform Fee (Y%): $Z | Total Reserved: $W". Add note about upgrading to paid tier.
- **Insert changes**: Set `deposit_status: 'not_required'`, `platform_fee_rate` based on tier. Offer saved as draft; publishing handled by edge function.
- **handleSaveOffer** now saves draft without navigating to step 5. On success, immediately calls `reserve-offer-funds`. If insufficient funds, show modal.

### Part 6: Wallet Section in `BusinessDashboard.tsx`

Insert a new card section between Stats and Offers:

- **Wallet Card**: Shows Available Balance, Reserved, Total Funded, Platform Fees from `wallet_balances` (upsert zeros if not found — done via edge function, display zeros if no row)
- **Top Up button** with suggested amount pills ($100, $250, $500, $1,000) + custom input (min $50). Calls `create-deposit-session` with `{ amount }`, redirects to Stripe.
- **Recent Transactions**: Compact list of last 10 `wallet_transactions` (type, amount, description, date)
- **Success detection**: Check URL param `?topup=success` to refetch balance and show toast.
- **Deposit status cleanup**: Remove old `handlePayDeposit` (per-offer deposit) and old deposit badge logic from offer cards. Replace with wallet-based status.

### Files Changed

| File | Action |
|------|--------|
| `supabase/functions/reserve-offer-funds/index.ts` | New edge function |
| `src/pages/dashboard/CreateOffer.tsx` | Major rewrite (remove % type, remove step 5, add wallet reserve flow) |
| `src/pages/dashboard/BusinessDashboard.tsx` | Add wallet section, remove per-offer deposit logic |

