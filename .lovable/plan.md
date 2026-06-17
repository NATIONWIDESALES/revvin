## Investigation report — referrer account association

This is a read-only report. No schema or code changes are proposed; a follow-up plan can be written once you confirm direction.

---

### 1. Tables, columns, and how a referral/lead is stored today

There are **two separate tables** and **two separate submission paths**. They are not unified.

**`public.leads`** — used by the public branded referral page (`/r/:slug`).
Captures the referrer as **free-text only**, not as a user id.

| column | type | nullable | default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| business_id | uuid | no | — |
| referrer_name | text | **no** | — |
| referrer_email | text | **no** | — |
| referrer_phone | text | yes | — |
| lead_name | text | no | — |
| lead_phone | text | no | — |
| lead_email | text | yes | — |
| lead_need | text | no | — |
| relationship_to_lead | text | yes | — |
| consent_given | bool | no | false |
| lead_source | text | yes | `'public_page'` |
| status | text | no | `'new'` |
| notes | text | yes | — |
| deal_value | numeric | yes | — |
| created_at / updated_at | timestamptz | no | now() |

No `referrer_user_id` column. No FK to `auth.users`.

**`public.referrals`** — used by the in-app offer wizard (`ReferralWizard`).
Requires a logged-in user; the user id is stored as `referrer_id`.

| column | type | nullable | default |
|---|---|---|---|
| id | uuid | no | gen_random_uuid() |
| offer_id | uuid | **no** | — |
| referrer_id | uuid | **no** | — (= `auth.uid()`) |
| business_id | uuid | **no** | — |
| customer_name | text | no | — |
| customer_email | text | yes | — |
| customer_phone | text | yes | — |
| notes | text | yes | — |
| file_url | text | yes | — |
| status | text | no | `'submitted'` |
| payout_amount / payout_snapshot / payout_type_snapshot | numeric/text | yes | — |
| payout_status | text | no | `'pending'` |
| payment_status | text | no | `'not_due'` |
| payment_marked_at / flagged_unpaid_at | timestamptz | yes | — |
| void_reason | text | yes | — |
| deal_value | numeric | yes | — |
| created_at / updated_at | timestamptz | no | now() |

**No declared FKs exist** on either table (`information_schema` returns 0 foreign-key constraints for `referrals` and `leads`). `referrer_id` and `business_id` are uuid columns by convention only.

---

### 2. Submission handlers (file:line that inserts the row)

- **Public branded page** → inserts into `leads`:
  `src/pages/PublicReferralPage.tsx:72-89` — `.from("leads").insert({ business_id, referrer_name, referrer_email, referrer_phone, lead_*, consent_given:true, lead_source:"public_page", status:"new" })`.
  Auth is **not required**; no `referrer_id` field is set.

- **Offer detail wizard (auth-gated)** → inserts into `referrals`:
  `src/components/ReferralWizard.tsx:179-193` — `.from("referrals").insert({ referrer_id: user.id, offer_id, business_id, customer_*, notes, file_url, payout_amount })`.
  Wizard is gated at Step 0 by auth (per project memory).

---

### 3. Lifecycle / status values

**`leads.status`** (free-text column, default `'new'`). Values observed in `BusinessDashboard.tsx` updates around `:238`: `new → contacted → qualified → closed_won → closed_lost`. Set by:
- Insert default in `PublicReferralPage.tsx:86`
- Business dashboard status dropdown (`BusinessDashboard.tsx:238`)
- ROI summing uses `'closed_won'` (`fn_get_business_roi`, `RoiSummaryCard.tsx:42-43`)

**`referrals.status`** (free-text, default `'submitted'`). Values observed: `submitted → won / lost / declined / void`. Set by:
- Insert default in `ReferralWizard.tsx:181` (effectively `'submitted'` via column default)
- Business dashboard at `BusinessDashboard.tsx:390, 402`
- Admin dashboard at `AdminDashboard.tsx:153`
- DB function `process_deal_won_transaction` (migration `20260429182000`) flips to `'won'` + `payout_status='approved'`
- Badge qualification reads `status='won'` (`award_badge_if_qualified`)
- Duplicate-prevention RPC excludes `('declined','void')`

**`referrals.payment_status`**: `not_due | paid | flagged_unpaid` (per project memory — business marks paid, referrer can flag unpaid after 30 days).

**`referrals.payout_status`**: `pending | approved | …` (set by `process_deal_won_transaction`).

---

### 4. Existing referrer-side auth / role / dashboard

All three exist already:

- **Role enum**: `public.app_role` includes `'referrer'` (migration `20260219050306`).
- **Role assignment**: `handle_new_user` assigns `'referrer'` to anyone signing up with `role=referrer` or `both` (`20260523040257:25-29`).
- **Dashboard route**: `/dashboard` → `DashboardRouter.tsx:89` renders `ReferrerDashboard`.
- **Referrer dashboard**: `src/pages/dashboard/ReferrerDashboard.tsx:49` already queries `referrals.where(referrer_id = auth.uid())`. Public profile page at `/referrer/:userId` (`ReferrerProfile.tsx:27`) reads the same.

So referrer accounts are already a first-class thing — but **only `referrals` rows are connected to them**. `leads` rows from the public branded page are completely disconnected from any account.

---

### 5. Minimal, non-breaking association path (analysis only — not a proposal to implement yet)

The gap is entirely on the `leads` side. Two question to resolve before designing the change:

a. **Should a referrer's "all my referrals" view aggregate both `referrals` (wizard) and `leads` (public-page submissions), or only `leads`?** Today `ReferrerDashboard` only shows `referrals`.

b. **Should account creation be required, prompted-but-optional, or fully retroactive (claim-by-email after the fact)?**

Assuming "optional account, claim later by email", the smallest schema change would be:

1. Add nullable `referrer_user_id uuid` to `public.leads` (no FK to `auth.users` per Lovable convention — uuid by reference only, like `referrer_id` on `referrals`).
2. Add an index on `(referrer_user_id)` and on `lower(referrer_email)` to support claim/backfill.
3. RLS: extend the existing `leads` SELECT policy so a row is visible to the row's business owner **OR** to `auth.uid() = referrer_user_id`. Keep insert path unchanged (still anon-allowed from `/r/:slug`).
4. Submission path (`PublicReferralPage.tsx:72`): if a session exists at submit time, populate `referrer_user_id = user.id`; otherwise leave null.
5. Backfill/claim mechanism: a SECURITY DEFINER RPC `fn_claim_referrer_leads()` that sets `referrer_user_id = auth.uid()` on all `leads` where `lower(referrer_email) = lower(<verified email of auth.uid()>)` AND `referrer_user_id IS NULL`. Called once on first login after signup (and exposed as a "Claim past referrals" button).
6. Referrer dashboard query: union/`or` filter to fetch both `referrals.referrer_id = uid` and `leads.referrer_user_id = uid`.

What this avoids breaking:
- No existing column is altered; all reads/writes on `leads` keep working.
- Public submission stays anon-allowed (the new column is nullable).
- Business-side dashboard queries on `leads` are unaffected.
- No FK is introduced (matches the existing convention — `referrals.referrer_id` is also a bare uuid).

Open risks to discuss before implementation:
- Email-based claim is trust-on-first-use; a hostile actor who knows someone's email could create an account and claim their historical referrals. Mitigation: only allow claims for the **verified** email of the authenticated user (which Supabase auth provides), and only auto-run claim on the user's first session.
- `leads.referrer_email` is currently NOT NULL — good, so claim is always possible. Case-insensitive match is needed (existing data isn't normalized).

---

### Files referenced

- `src/pages/PublicReferralPage.tsx:48-89` — anon lead insert
- `src/components/ReferralWizard.tsx:179-193` — auth'd referral insert
- `src/pages/dashboard/ReferrerDashboard.tsx:49` — referrer-side query
- `src/pages/dashboard/BusinessDashboard.tsx:115-116, 238, 390-416` — status mutations
- `src/pages/dashboard/DashboardRouter.tsx:89` — referrer dashboard routing
- `src/App.tsx:76,80` — `/referrer/:userId` and `/dashboard` routes
- Migrations: `20260219050306` (role enum), `20260523040257` (handle_new_user), `20260429182000` (process_deal_won)

Tell me which of (a) and (b) above you want, and I'll write an implementation plan.