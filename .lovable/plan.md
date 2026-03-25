

## Part 7: Subscription Upgrade Flow

### Overview
Add tier badge, upgrade CTA, a new `create-subscription-session` edge function, and extend the existing webhook to handle subscription events.

---

### 1. New Edge Function: `supabase/functions/create-subscription-session/index.ts`

- Auth via JWT (`getUser(token)` pattern per project convention)
- Fetch the caller's business to get `business_id`; verify `pricing_tier === 'free'`
- Create Stripe Checkout session with `mode: 'subscription'`, using price ID from env var `STRIPE_PAID_PLAN_PRICE_ID`
- Metadata: `user_id`, `business_id`
- Success URL: `/dashboard?upgrade=success`, Cancel URL: `/dashboard?upgrade=canceled`
- Return `{ url }` for redirect

**Prerequisite**: A Stripe Price for the $50/mo plan must be created. Will use the Stripe tools to create the product+price and store the price ID as a secret (`STRIPE_PAID_PLAN_PRICE_ID`).

---

### 2. Extend `stripe-deposit-webhook/index.ts`

Add handling for two new event types alongside the existing `checkout.session.completed`:

- **`checkout.session.completed` with `mode === 'subscription'`**: Read `business_id` from metadata. Update `businesses` table: `pricing_tier='paid'`, `stripe_subscription_id` from session.subscription, `subscription_status='active'`.
- **`customer.subscription.deleted`**: Look up the business by `stripe_subscription_id`. Update: `pricing_tier='free'`, `subscription_status='canceled'`.

The existing wallet top-up logic (mode=payment) stays untouched — just gate it with `session.mode === 'payment'`.

---

### 3. Update `BusinessDashboard.tsx`

Add to the header area (next to business name):

- **Tier Badge**: Show `Free (25% fee)` or `Paid (10% fee)` based on `business.pricing_tier`
- **Upgrade CTA card** (only if `pricing_tier === 'free'`): 
  - "Upgrade to Revvin Paid — $50/mo"
  - "Reduce your platform fee from 25% to 10%"
  - "Breakeven at ~3 closed referrals per month"
  - "Upgrade Now" button → calls `create-subscription-session`, redirects to Stripe
- **Detect `?upgrade=success`** URL param: show toast, refetch business data

---

### Files Changed

| File | Action |
|------|--------|
| `supabase/functions/create-subscription-session/index.ts` | New edge function |
| `supabase/functions/stripe-deposit-webhook/index.ts` | Add subscription event handling |
| `src/pages/dashboard/BusinessDashboard.tsx` | Add tier badge + upgrade CTA |

### Secrets Needed
- `STRIPE_PAID_PLAN_PRICE_ID` — will create the Stripe product/price first, then store the ID as a secret

