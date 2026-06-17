
## Funnel trace — why 0 offers exist (read-only investigation)

Tracing a brand-new business signup end to end against live DB state (11 businesses, 1 with `subscription_status='active'`, 0 offers, 0 leads, 0 referrals).

---

### 1. Signup → checkout → onboarding → dashboard sequence

| Step | File | What happens |
|---|---|---|
| Signup | `src/pages/Signup.tsx:67` | `supabase.auth.signUp({ ... emailRedirectTo: '/welcome', data: { role: 'business', business_name }})` |
| DB trigger | `handle_new_user()` (db function) | Creates `profiles`, inserts `user_roles(role='business')`, inserts `businesses(account_status='approved')`. New businesses are **auto-approved**, no admin gate. |
| Auto checkout | `src/pages/Signup.tsx:49-54` | If session exists, immediately calls edge function `create-business-checkout` and redirects to Stripe. |
| Email confirm path | `src/pages/Signup.tsx:71` | `emailRedirectTo: '/welcome'` — confirm link lands on Onboarding, not Signup. |
| Onboarding guard | `src/pages/Onboarding.tsx:66-86` | **If `subscription_status` not in `[active, trialing, paid, past_due]` AND not returning from `?checkout=success`, force-redirects back to Stripe checkout.** Business never sees the wizard until paid. |
| Onboarding finalize | `src/pages/Onboarding.tsx:140-153` | Sets `slug` + `is_published=true` on businesses row. |
| Dashboard guard | `src/pages/dashboard/BusinessDashboard.tsx:146-154` | **If `!biz.slug || !biz.is_published` → renders "Finish setting up your referral page" screen with a single CTA back to `/welcome`. No tabs, no offer-creation entry, no anything.** |

#### Guards that block publishing an offer

- **Stripe subscription**: `Onboarding.tsx:66-86` forces unpaid users back to Stripe before they can even reach step 1 of the wizard.
- **Onboarding completion**: `BusinessDashboard.tsx:146` requires both `slug` and `is_published=true`.
- **`is_published` is set in two places**:
  - `Onboarding.tsx:145` (`finalize()` — sets `is_published: true` on the businesses row).
  - `stripe-business-webhook` → `checkout.session.completed` handler at `supabase/functions/stripe-business-webhook/index.ts:150` (`is_published: publishedStatuses.has(status)`).
- **Email verification**: not gated in app code; default Supabase auth behaviour. `Signup.tsx:90` shows a "Check your email" toast when `!data.session`.
- **`account_status='approved'`**: auto-set by `handle_new_user()`. **No admin approval gate** for businesses — only `suspended` blocks publishing (`CreateOffer.tsx:116`).

---

### 2. CreateOffer.tsx submit handler analysis

**`buildInsertData()`** (`src/pages/dashboard/CreateOffer.tsx:118-143`) sends:

```
business_id, title, description, category, payout, payout_type='flat',
location, country, currency, deal_size_min, deal_size_max, close_time_days,
remote_eligible, qualification_criteria
```

Plus, depending on path:
- `handleSaveDraft` (`:149-153`): adds `status='draft'`, `approval_status='approved'`
- `handlePublishOffer` (`:184-188`): adds `status='active'`, `approval_status='approved'` (or `'pending_approval'` for restricted categories)

**Offers table schema** (from `information_schema.columns`):

- Required (NOT NULL): `business_id`, `title`, `category`, `payout` (default 0), `payout_type` (default `'flat'`), `status` (default `'active'`), `country` (default `'US'`), `currency` (default `'USD'`), `is_sample` (default `false`).
- All other columns nullable or defaulted.

The insert payload satisfies every NOT NULL column. **No missing-column failure.**

**INSERT RLS policy** (`offers`):

```sql
"Business owners manage offers" — INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM businesses
          WHERE businesses.id = offers.business_id
            AND businesses.user_id = auth.uid())
  OR has_role(auth.uid(), 'admin')
)
```

Client sends `business_id = businessId` resolved from `businesses` by `user_id = user.id` at `:53-58`. **Policy will pass.** No RLS issue blocking inserts.

**Conclusion**: The submit handler itself is fine. An authenticated business owner who reaches `/dashboard/create-offer` and clicks Publish will successfully insert.

---

### 3. Marketplace visibility requirements

**Public SELECT policy on `offers`**:

```sql
status = 'active'
AND approval_status = 'approved'
AND EXISTS (SELECT 1 FROM businesses b
            WHERE b.id = offers.business_id
              AND b.account_status <> 'suspended'
              AND b.marketplace_listed = true)
```

`useDbOffers` (`src/hooks/useDbOffers.ts:16`) additionally filters `.eq("status","active")`.

**`marketplace_listed`** defaults to `true` (verified). **`is_published` is NOT part of the offers SELECT policy** — only required for the dashboard guard, not for marketplace visibility.

So a published offer (status active, approval approved) from any non-suspended business would render. The fact that 0 offers exist is the only reason the marketplace is empty — not a visibility filter.

---

### 4. Is the Stripe / subscription flow itself broken?

Live DB: 11 businesses, only `Test` (`subscription_status='active'`, `sub_1TcH7iBjSMQJWZ8iyjqOewCo`) ever paid. 10 of 11 have `stripe_customer_id = NULL`. The "Test" business also has `is_published=true` and `KS Real Estate` does too (but with no Stripe IDs — likely manually toggled).

Possible causes the webhook never fires for new signups:
- `STRIPE_WEBHOOK_SECRET` is set, so signature verification will run (`stripe-business-webhook/index.ts:56-79`). If signing secret doesn't match the actual Stripe endpoint configured for this environment, **every webhook 400s and `is_published`/`subscription_status` are never updated**.
- Users may be bouncing off Stripe checkout (the auto-redirect in `Signup.tsx:51` and `Onboarding.tsx:73-86` is aggressive — there's no "skip for now" path, no way to even see the dashboard without paying).
- `current_period_end` is NULL on the one paid business too — there is no test-data evidence the webhook code path that sets `current_period_end` has ever succeeded for these accounts.

The webhook itself looks correct. The far more likely failure is **users abandoning at the Stripe checkout step** combined with the lack of any fallback path through the funnel.

---

## Root-cause ranking (most → least likely)

### #1 — There is no link to `/dashboard/create-offer` anywhere in the app.

```
$ rg "create-offer|CreateOffer" src/pages src/components
src/pages/dashboard/CreateOffer.tsx:27   (definition)
src/pages/dashboard/CreateOffer.tsx:389  (export)
```

`BusinessDashboard.tsx` exposes tabs `customers / leads / referrals / page / share / account`. **No tab, button, link, or CTA navigates to `/dashboard/create-offer`.** The route exists in `App.tsx:81`, but no UI ever points there. The page is reachable only by typing the URL manually.

This alone explains 0 offers across 11 businesses. Even the one fully-paid business ("Test") never had a UI affordance to create one.

**Min fix**: add a "Create marketplace offer" button on `BusinessDashboard.tsx` (e.g. in the activation checklist around `:165-192`, or as a header action near `:201`) that links to `/dashboard/create-offer`. Decide first whether marketplace offers are even a product surface you want businesses creating — the entire dashboard is organized around the **branded referral page** (`/r/:slug`) flow, not the marketplace `offers` table.

---

### #2 — Pre-publish gate locks 9 of 11 businesses out of their dashboard.

`BusinessDashboard.tsx:146-154` shows only the "Finish setting up your referral page" screen unless `slug` AND `is_published=true`. Onboarding only sets these when:
- the user reaches step 4 of the wizard AND completes it (`Onboarding.tsx:140-153`), AND
- they got past the auto-redirect to Stripe at `Onboarding.tsx:68-86`.

Result in DB: only 2 of 11 (`Test`, `KS Real Estate`) have `is_published=true`. The other 9 have `is_published=false` and would see the lock screen on every dashboard visit.

**Min fix options** (pick one — don't need all):
- Allow access to the dashboard before publish; just gate the "View public page" CTA and the share tools.
- Add a clear "Skip checkout for now" path so users land on the wizard regardless of subscription state.
- Decouple `is_published` from billing entirely for v1 and make it a manual toggle the business owns.

---

### #3 — Onboarding auto-redirect funnels every unpaid user to Stripe with no escape.

`Onboarding.tsx:68-86` invokes `create-business-checkout` and `window.location.href = co.url` if the user is unpaid. There's no "explore first / skip" option. 10 of 11 businesses never came back with `subscription_status` in the paid set, which is consistent with users hitting the Stripe wall and bouncing.

**Min fix**: change the Onboarding effect to show a banner ("Start your subscription to publish your page") with a button instead of an automatic redirect. Let unpaid users at least fill out the wizard and see the dashboard in a read-only state.

---

### #4 — Webhook may not have been wired up at the live endpoint when most signups happened.

Of 11 businesses, only 1 (`Test`, May 29) has `stripe_subscription_id` populated. Both `Test` and `KS Real Estate` have `is_published=true`, but only `Test` has Stripe IDs — `KS Real Estate` was likely toggled by hand or by the `finalize()` path. Other "approved" businesses with no Stripe customer ID strongly suggests they bailed at the Stripe step rather than paid-and-then-webhook-failed.

That said: confirm `STRIPE_WEBHOOK_SECRET` matches the live endpoint and check `edge_function_logs` for `stripe-business-webhook` — a signature mismatch would 400 every event and is the only way a true payment would silently fail to update the row.

**Min fix**: verify endpoint secret, replay any historical Stripe events for the "active" customer base, and add a `checkout.session.completed` log line that always fires before the metadata branch so misconfigurations are obvious in logs.

---

### #5 — `useDbOffers` filters strictly on `status='active'`; drafts never appear even if created.

`src/hooks/useDbOffers.ts:16` — `.eq("status","active")`. Drafts saved via `handleSaveDraft` (`CreateOffer.tsx:151`) would never surface on `/browse`. Not the root cause (0 offers total) but worth knowing once #1–#3 are fixed.

**Min fix**: none required; expected behaviour.

---

## Bottom line

The funnel doesn't break at a single guard — it breaks twice. First the auto-redirect to Stripe blocks 9 of 11 businesses from ever completing onboarding (root causes #2 + #3 + maybe #4). Second, even for the 2 that did complete it, **no UI ever links to the offer-creation page** (root cause #1), so marketplace `offers` remains at 0 by design, not by bug.

Recommend fixing in this order: #1 (add the link), #2 (loosen the dashboard gate), #3 (replace auto-redirect with a banner), then audit #4. No changes made yet.
