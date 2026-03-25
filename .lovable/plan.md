

## Fixes for Webhook & Wallet Verification Gaps

### Concern 1: Missing `invoice.payment_failed` handler

The webhook already handles subscription creation and cancellation correctly. The gap is `invoice.payment_failed` — if a renewal charge fails, the business stays on "paid" until Stripe eventually fires `customer.subscription.deleted` (which could take weeks depending on Stripe retry settings).

**Fix**: Add an `invoice.payment_failed` handler to `stripe-deposit-webhook/index.ts`:
- On `invoice.payment_failed` where `billing_reason === 'subscription_cycle'`:
  - Look up business by `stripe_subscription_id` from the invoice's subscription
  - Update `subscription_status` to `'past_due'`
  - Do NOT revert `pricing_tier` yet (Stripe will retry; only revert on full cancellation)
  - Log to `audit_log` for admin visibility

This is the standard pattern: `past_due` is a warning state, `canceled` (already handled) is the final revert.

### Concern 2: Reserved funds verification in `process-deal-won`

**Fix**: Add a guard in `process-deal-won/index.ts` after fetching the wallet (line 65-69):
- If no wallet exists → throw error "No wallet found"
- If `wallet.reserved < payoutAmt` → throw error with details: `"Insufficient reserved funds: reserved=$X, payout=$Y"`
- Only proceed with the wallet update if the check passes

This prevents creating unbacked payouts. The business would need to top up and re-reserve before closing.

### Files Changed

| File | Change |
|------|--------|
| `supabase/functions/stripe-deposit-webhook/index.ts` | Add `invoice.payment_failed` handler → set `subscription_status='past_due'` |
| `supabase/functions/process-deal-won/index.ts` | Add reserved balance guard before payout creation |

