

# Stripe "Deposit to Publish" Implementation Plan

## Overview

Before a business can publish an offer, they must complete a Stripe payment equal to 1x the referral payout amount. This deposit is verified server-side via webhook — no client-side URL parameter tricks.

For percentage-based payouts: require a "maximum payout cap" field and use that as the deposit basis.

---

## Architecture

```text
Business creates offer (draft)
        │
        ▼
  "Pay Deposit" button
        │
        ▼
  Edge Function: create-deposit-session
  (creates Stripe Checkout Session, amount = 1x payout)
        │
        ▼
  Stripe Checkout (hosted page)
        │
        ▼
  Webhook: stripe-deposit-webhook
  (checkout.session.completed → marks offer deposit as "paid")
        │
        ▼
  UI polls/checks deposit_status from DB
        │
        ▼
  "Publish" button enabled → offer goes active
```

---

## 1. Database Migration

Add columns to the `offers` table:

| Column | Type | Default | Purpose |
|--------|------|---------|---------|
| `deposit_status` | text | `'required'` | `required` / `pending` / `paid` / `failed` |
| `deposit_amount` | numeric | null | Amount charged (in dollars) |
| `deposit_currency` | text | `'USD'` | Currency |
| `stripe_checkout_session_id` | text | null | Stripe session reference |
| `stripe_payment_intent_id` | text | null | Payment intent from webhook |
| `deposit_paid_at` | timestamptz | null | When confirmed |
| `max_payout_cap` | numeric | null | Required for % payouts |

Also set all existing offers' `deposit_status` to `'not_required'` so they remain publishable.

New default for `status` on insert: change to `'draft'` for new offers (existing active offers keep their status).

---

## 2. Edge Function: `create-deposit-session`

- Authenticates user via `getClaims()`
- Validates the user owns the business that owns the offer
- Reads offer payout amount (or `max_payout_cap` for % payouts)
- Creates a Stripe Checkout Session with:
  - `mode: "payment"`
  - `amount` in cents
  - `metadata: { offer_id, business_id }`
  - success/cancel URLs pointing back to dashboard
- Saves `stripe_checkout_session_id` and sets `deposit_status = 'pending'` on the offer
- Returns the checkout URL

Config in `supabase/config.toml`:
```toml
[functions.create-deposit-session]
verify_jwt = false
```

---

## 3. Edge Function: `stripe-deposit-webhook`

- Verifies webhook signature using `STRIPE_WEBHOOK_SECRET`
- Handles `checkout.session.completed` event
- Extracts `offer_id` from session metadata
- Server-side validates amount/currency match expected deposit
- Updates offer: `deposit_status = 'paid'`, stores `stripe_payment_intent_id`, `deposit_paid_at`
- Idempotent: checks if already marked paid before updating

Requires a new secret: `STRIPE_WEBHOOK_SECRET` (user will need to provide this after we create the endpoint URL).

Config in `supabase/config.toml`:
```toml
[functions.stripe-deposit-webhook]
verify_jwt = false
```

---

## 4. Offer Creation Flow Changes (`CreateOffer.tsx`)

### Step modifications:
- Step count goes from 4 to 5: add "Deposit to Publish" as the final step
- For `percentage` payout type: add a required "Maximum Payout Cap ($)" field in step 2
- On form submit (step 4 preview): save offer as `status: 'draft'` with `deposit_status: 'required'`
- Step 5 ("Deposit to Publish"):
  - Shows deposit amount and explanation
  - "Pay Deposit" button calls `create-deposit-session` edge function
  - Redirects to Stripe Checkout
  - On return, polls the offer's `deposit_status` from DB
  - Once `paid`, shows "Publish" button which sets `status: 'active'`

### Messaging:
- "Deposit required to publish"
- "This deposit helps ensure payouts can be processed quickly after verified closes."
- No escrow language anywhere

---

## 5. Business Dashboard Changes (`BusinessDashboard.tsx`)

- Show `deposit_status` badge on draft offers
- For draft offers with `deposit_status: 'required'` or `deposit_status: 'pending'`:
  - Show "Pay Deposit" or "Awaiting Payment" button
  - Disable "Activate" until deposit is paid
- For draft offers with `deposit_status: 'paid'`:
  - Show "Publish" button to set status to active

### Payout editing guard:
- If `deposit_status === 'pending'` (checkout session created but not paid), block payout amount edits
- If payout changes after deposit paid, require a new deposit for the difference (future enhancement — MVP just blocks edits after deposit)

---

## 6. Admin Dashboard Changes (`AdminDashboard.tsx`)

- Add ability for admins to manually mark an offer's `deposit_status` as `'paid'` (override button)
- Show deposit payment info in the offers overview (amount, status, Stripe IDs)

---

## 7. Security

- Edge function authenticates user and validates business ownership before creating session
- Webhook verifies Stripe signature
- Metadata round-trip: `offer_id` in Stripe metadata is validated against DB
- Amount/currency validated server-side on webhook receipt
- RLS: existing offer policies already restrict updates to business owners + admins

---

## 8. Secret Required

`STRIPE_WEBHOOK_SECRET` — will be requested from the user. The webhook URL will be:
`https://olmpplfgzegzqdcznlrp.supabase.co/functions/v1/stripe-deposit-webhook`

The user will need to add this URL in their Stripe Dashboard under Webhooks, listen for `checkout.session.completed`, and copy the signing secret.

---

## Implementation Order

1. Request `STRIPE_WEBHOOK_SECRET` from user
2. Database migration (add columns to offers)
3. Create `stripe-deposit-webhook` edge function
4. Create `create-deposit-session` edge function
5. Update `CreateOffer.tsx` (add step 5, % payout cap, draft save)
6. Update `BusinessDashboard.tsx` (deposit status, publish gating)
7. Update `AdminDashboard.tsx` (override, visibility)

---

## Files Created/Modified

| File | Action |
|------|--------|
| `supabase/functions/create-deposit-session/index.ts` | Create |
| `supabase/functions/stripe-deposit-webhook/index.ts` | Create |
| `src/pages/dashboard/CreateOffer.tsx` | Modify |
| `src/pages/dashboard/BusinessDashboard.tsx` | Modify |
| `src/pages/dashboard/AdminDashboard.tsx` | Modify |
| `supabase/config.toml` | Updated automatically |
| Migration SQL | Via migration tool |

