

## Remaining Work — Prioritized

Based on the security scan, codebase review, and the previous fixes already applied, here's what still needs attention:

### Critical Security Fixes (from scan)

**1. Privilege escalation: Users can self-assign admin role**
The `user_roles` table has an INSERT policy `Users can insert own roles` that lets any authenticated user insert `admin` as their role. This must be locked down immediately.
- **Fix:** Drop the current INSERT policy. Replace with one that only allows inserting `referrer` or `business` roles (not `admin`). Or restrict inserts to a SECURITY DEFINER function only.

**2. Profiles table leaks personal data to all authenticated users**
The `Authenticated profiles viewable` SELECT policy exposes full_name, phone, city to every logged-in user.
- **Fix:** Restrict to: users can see their own profile, OR admins can see all, OR business owners can see profiles of referrers who submitted referrals to them.

### Functional Gaps (non-payment)

**3. Hardcoded currency/country on DB offers**
`useDbOffers.ts` lines 33-34 hardcode `currency: "USD"` and `country: "US"`. The offers table lacks `currency` and `country` columns, making the Browse page country filter non-functional for real data.
- **Fix:** Add `currency` (default `'USD'`) and `country` (default `'US'`) columns to the `offers` table. Populate from the business's location during offer creation. Update `useDbOffers.ts` and `CreateOffer.tsx` to read/write these fields.

**4. Business phone exposure (low severity)**
The scan flags that business phone numbers are visible to unauthenticated users. This is likely intentional for a marketplace but worth acknowledging.
- **Fix:** Mark as accepted risk, or restrict phone visibility to authenticated users only via a tighter RLS policy.

**5. Referral customer data exposure (low severity)**
Customer email/phone accessible to both referrer and business owner. This is by design for the referral workflow.
- **Fix:** Mark as accepted risk per the product's privacy policy.

### Implementation Order

| # | Fix | Risk | Effort |
|---|-----|------|--------|
| 1 | Lock down user_roles INSERT | **Critical** | Small — 1 migration |
| 2 | Restrict profiles SELECT | **High** | Small — 1 migration |
| 3 | Add country/currency to offers | Medium | Medium — migration + 2 file edits |
| 4-5 | Acknowledge business phone + referral data | Low | Dismiss in scan |

### Technical Details

**Migration 1 — user_roles INSERT policy:**
```sql
DROP POLICY "Users can insert own roles" ON public.user_roles;
CREATE POLICY "Users can insert non-admin roles"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND role IN ('referrer'::app_role, 'business'::app_role)
);
```

**Migration 2 — profiles SELECT policy:**
```sql
DROP POLICY "Authenticated profiles viewable" ON public.profiles;
CREATE POLICY "Users view own profile"
ON public.profiles FOR SELECT TO authenticated
USING (auth.uid() = user_id);
-- Keep existing admin policy as-is
```

**Migration 3 — offers country/currency columns:**
```sql
ALTER TABLE public.offers
  ADD COLUMN IF NOT EXISTS country text NOT NULL DEFAULT 'US',
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'USD';
```
Then update `useDbOffers.ts` to use `o.currency` and `o.country` instead of hardcoded values, and update `CreateOffer.tsx` to let businesses set country/currency.

