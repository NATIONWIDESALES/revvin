

## Fix 5 Platform Issues

### Issue 1: AdminDashboard Offers tab always empty
**Root cause**: DB stores `approval_status = 'pending_approval'` but the Offers tab filters by `=== "pending"` (lines 90, 316, 318, 325, 335, 341).

**Fix** in `AdminDashboard.tsx`:
- Line 90: `offers.filter(o => o.approval_status === "pending")` → `"pending_approval"`
- Line 316: same filter fix
- Line 318, 325, 335, 341: all `"pending"` comparisons → `"pending_approval"`

---

### Issue 2: totalReferrers / totalBusinesses always 0
**Root cause**: `usePlatformStats.ts` can't query `user_roles` (RLS blocks non-admin reads of other users' roles). AdminDashboard also queries `user_roles` but admins have RLS access so it works there.

For the public-facing `usePlatformStats`, the fix is to count from tables that are publicly readable:
- `totalBusinesses` = count from `businesses` table (already queried, already has public SELECT for approved)
- `totalReferrers` = count from `profiles` minus `businesses` count (rough proxy), OR use a DB function

**Chosen approach**: Use `businesses.length` for totalBusinesses (already available). For totalReferrers, count `profiles` and subtract business count as an approximation. This avoids needing RLS changes on `user_roles`.

**Fix** in `usePlatformStats.ts`:
- Add profiles count query: `supabase.from("profiles").select("id", { count: "exact", head: true })`
- `totalReferrers = (profilesCount - businesses.length)` (clamped to 0)
- `totalBusinesses = businesses.length`

Wait — profiles RLS only allows users to view their own profile. So anonymous/non-admin users can't count profiles either.

Better approach: Create a **security definer DB function** `fn_platform_counts()` that returns `{businesses: int, referrers: int}` by querying `user_roles` internally, bypassing RLS.

**Fix**:
1. Migration: Create `fn_platform_counts()` security definer function
2. Update `usePlatformStats.ts` to call `supabase.rpc("fn_platform_counts")` instead of querying `user_roles`

Also fix `AdminDashboard.tsx` line 82-83 — these work for admins since they have RLS access to `user_roles`, so no change needed there.

---

### Issue 3: "Newest" sort broken — parseInt on UUID
**Root cause**: `Browse.tsx` line 74: `parseInt(b.id.replace(/\D/g, ""))` on UUIDs produces unreliable numbers.

**Fix** in `Browse.tsx` line 74 and `useDbOffers.ts`:
- Add `createdAt` field to the Offer mapping in `useDbOffers.ts` (from `o.created_at`)
- Sort by `createdAt` timestamp: `new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()`
- Update `types/offer.ts` to include optional `createdAt?: string`

---

### Issue 4: PayoutMethodSetup — remove component
Per the instruction to remove payment buttons/redemption that don't relate to Stripe or Tremendous: the PayoutMethodSetup component offers ACH/Interac/EFT options that are not wired to any actual payout dispatch and aren't part of Stripe or Tremendous.

**Fix**:
- Remove `PayoutMethodSetup` import and usage from `ReferrerDashboard.tsx` (line 17, 168)
- Delete `src/components/PayoutMethodSetup.tsx`

---

### Issue 5: Platform revenue stat uses hardcoded 10%
**Root cause**: `AdminDashboard.tsx` line 85: `* 0.1` hardcoded instead of using each offer's `platform_fee_rate`.

**Fix** in `AdminDashboard.tsx`:
- Join offers data to get `platform_fee_rate` per referral
- Line 85: For each won referral, look up the associated offer's `platform_fee_rate` (already available via `offers` join on referrals query): `(r.payout_amount ?? r.offers?.payout ?? 0) * (r.offers?.platform_fee_rate ?? 0.25)`
- Need to add `platform_fee_rate` to the offers select in the referrals query (line 62)

Actually, referrals already join `offers(title, payout, payout_type)` — just add `platform_fee_rate` to the select.

---

### Files Changed

| File | Change |
|------|--------|
| `src/pages/dashboard/AdminDashboard.tsx` | Fix `"pending"` → `"pending_approval"` (6 places); add `platform_fee_rate` to referrals→offers select; use dynamic fee rate for revenue calc |
| `src/hooks/usePlatformStats.ts` | Use `fn_platform_counts` RPC for referrer/business counts |
| `src/pages/Browse.tsx` | Fix newest sort to use `createdAt` timestamp |
| `src/hooks/useDbOffers.ts` | Add `createdAt` to offer mapping |
| `src/types/offer.ts` | Add optional `createdAt` field |
| `src/pages/dashboard/ReferrerDashboard.tsx` | Remove PayoutMethodSetup usage |
| `src/components/PayoutMethodSetup.tsx` | Delete file |
| Migration | Create `fn_platform_counts()` security definer function |

