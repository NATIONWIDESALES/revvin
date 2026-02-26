

# Plan: Fix Public Offer Links + Business Name in URL

## Root Cause

The migration `20260225222323` recreated the "Public offers viewable" RLS policy with `TO authenticated`, meaning unauthenticated visitors get zero rows back from the offers table. This is why incognito shows "Offer not found."

## Changes

### 1. Database Migration: Fix RLS Policy

Drop and recreate the offers SELECT policy to allow both `anon` and `authenticated` roles:

```sql
DROP POLICY IF EXISTS "Public offers viewable" ON public.offers;
CREATE POLICY "Public offers viewable" ON public.offers
  FOR SELECT
  USING (
    (status = 'active' AND approval_status = 'approved')
    OR EXISTS (
      SELECT 1 FROM public.businesses
      WHERE businesses.id = offers.business_id
      AND businesses.user_id = auth.uid()
    )
  );
```

By omitting `TO authenticated`, it applies to all roles (anon + authenticated), which is the correct behavior for a public marketplace.

### 2. Slug-Based URLs with Business Name

**Route change in `src/App.tsx`:**
- Add route: `/offer/:businessSlug/:id` alongside existing `/offer/:id` (keep old route for backward compat, redirect to new)

**`src/pages/OfferDetail.tsx`:**
- Read both `businessSlug` and `id` from params
- Query remains the same (by UUID `id`)
- If URL is missing businessSlug, redirect to the correct slug URL after loading

**`src/components/ShareOfferLink.tsx`:**
- Accept `businessName` prop, generate slug from it: `business-name` (lowercase, hyphenated)
- URL becomes `/offer/acme-corp/abc123-uuid`

**`src/pages/dashboard/BusinessDashboard.tsx`:**
- `inviteReferrers`: include business name slug in the copied URL

**`src/components/OfferCard.tsx`:**
- Update Link `to` prop to include business slug

**Slug generation:** Simple utility -- `name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')`

### 3. No Other Changes Needed

The `ReferralWizard` already handles the unauthenticated flow correctly (shows Sign Up / Sign In buttons at the consent step). The `OfferDetail` page already renders full offer details without auth checks. Once the RLS is fixed, the entire public flow will work.

## File Changes

| Action | File | Change |
|--------|------|--------|
| Migration | New SQL | Fix offers RLS to allow anon SELECT |
| Edit | `src/App.tsx` | Add `/offer/:businessSlug/:id` route |
| Edit | `src/pages/OfferDetail.tsx` | Read businessSlug param, redirect if missing |
| Edit | `src/components/ShareOfferLink.tsx` | Accept businessName, include slug in URL |
| Edit | `src/pages/dashboard/BusinessDashboard.tsx` | Include business slug in invite link |
| Edit | `src/components/OfferCard.tsx` | Include business slug in card link |
| Edit | `src/lib/utils.ts` | Add `toSlug()` utility |

