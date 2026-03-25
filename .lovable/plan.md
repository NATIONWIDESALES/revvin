

## Wallet Model Migration — Part 1

Three parallel changes: database schema, wallet top-up edge function, and webhook handler.

---

### 1. Database Migration

Add columns to `businesses` and `offers`, plus `offer_id` FK on `wallet_transactions`:

```sql
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS pricing_tier text NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'none';

ALTER TABLE public.offers
  ADD COLUMN IF NOT EXISTS platform_fee_rate numeric NOT NULL DEFAULT 0.25;

ALTER TABLE public.wallet_transactions
  ADD COLUMN IF NOT EXISTS offer_id uuid REFERENCES public.offers(id);
```

No new RLS policies needed — `wallet_balances` and `wallet_transactions` are already locked to service-role only for writes.

---

### 2. Replace `create-deposit-session` Edge Function

Rewrite to accept `{ amount }` (minimum $50) instead of `{ offer_id }`:

- Authenticate user via JWT
- Validate amount >= 50
- Create Stripe Checkout session with `mode: "payment"`, line item "Revvin Wallet Top-Up"
- Metadata: `user_id`, `amount` (no offer_id)
- Success/cancel URLs: `/dashboard?topup=success` / `/dashboard?topup=canceled`
- No offers table updates

---

### 3. Replace `stripe-deposit-webhook` Edge Function

Rewrite `checkout.session.completed` handler:

- Read `user_id` and `amount` from session metadata (instead of `offer_id`)
- Upsert `wallet_balances`: increment `available` and `total_funded` by amount
- Insert into `wallet_transactions`: `type='topup'`, `amount`, `description='Stripe top-up'`, `user_id`
- Idempotency: check if a wallet_transaction with matching Stripe session ID already exists (add `stripe_session_id` to description or use payment_intent as dedup key)
- No offers table updates

---

### Files Changed
| File | Action |
|------|--------|
| `supabase/migrations/new.sql` | Schema migration (3 ALTERs) |
| `supabase/functions/create-deposit-session/index.ts` | Full rewrite → wallet top-up |
| `supabase/functions/stripe-deposit-webhook/index.ts` | Full rewrite → wallet credit |

