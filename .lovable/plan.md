

# Implementation Plan: Stripe "Deposit to Publish"

All exploration is complete. I have reviewed every file that needs modification and have the full implementation ready.

## Step 1: Database Migration

Add deposit tracking columns to the `offers` table:
- `deposit_status` (text, default `'required'`)
- `deposit_amount` (numeric, nullable)
- `deposit_currency` (text, default `'USD'`)
- `stripe_checkout_session_id` (text, nullable)
- `stripe_payment_intent_id` (text, nullable)
- `deposit_paid_at` (timestamptz, nullable)
- `max_payout_cap` (numeric, nullable)

All existing offers get `deposit_status = 'not_required'` so they remain publishable. Add admin UPDATE policy.

## Step 2: Edge Function — `create-deposit-session`

Creates a Stripe Checkout Session for the deposit amount (1x payout or 1x `max_payout_cap` for % offers). Authenticates the user, validates business ownership, stores session ID on the offer, sets `deposit_status = 'pending'`.

## Step 3: Edge Function — `stripe-deposit-webhook`

Handles `checkout.session.completed`. Verifies Stripe signature, validates amount/session match, marks `deposit_status = 'paid'`. Idempotent.

**Requires**: `STRIPE_WEBHOOK_SECRET` to be added as a secret.

## Step 4: Update `CreateOffer.tsx`

- Steps go from 4 to 5 (add "Deposit & Publish" as final step)
- Step 2: add "Maximum Payout Cap" field for percentage payouts
- Step 4 (preview submit): saves offer as `status: 'draft'`, `deposit_status: 'required'`
- Step 5: shows deposit amount, "Pay Deposit" button that calls the edge function and redirects to Stripe Checkout, polls `deposit_status`, and enables "Publish" once paid

## Step 5: Update `BusinessDashboard.tsx`

- Show deposit status badges on offers
- Gate Activate/Publish behind `deposit_status === 'paid'`
- "Pay Deposit" button for offers with `deposit_status: 'required'` or `'pending'`
- Block payout editing when deposit is pending

## Step 6: Update `AdminDashboard.tsx`

- Show deposit info (amount, status, Stripe IDs) in offer management
- Add "Override Deposit" button for admins to manually mark deposits as paid

## Files

| File | Action |
|------|--------|
| Migration SQL | Create via migration tool |
| `supabase/functions/create-deposit-session/index.ts` | Create |
| `supabase/functions/stripe-deposit-webhook/index.ts` | Create |
| `src/pages/dashboard/CreateOffer.tsx` | Modify |
| `src/pages/dashboard/BusinessDashboard.tsx` | Modify |
| `src/pages/dashboard/AdminDashboard.tsx` | Modify |

## Secret Needed

`STRIPE_WEBHOOK_SECRET` — the signing secret from the Stripe webhook endpoint configured at:
`https://olmpplfgzegzqdcznlrp.supabase.co/functions/v1/stripe-deposit-webhook`

