

# Plan: Super Admin CRM Dashboard

## Overview

Build a completely separate, hard-coded-email-gated Super Admin CRM at a hidden route (`/__sa`). This is entirely independent from the existing `AdminDashboard` and `DashboardRouter`. Access is restricted to `sales@nationwidesales.ca` only, enforced both client-side (route gate) and server-side (edge function gate).

## Architecture

```text
Client Route: /__sa
   │
   ├─ Check: user authenticated + email === SUPER_ADMIN_EMAIL
   │   ├─ NO  → render generic <NotFound /> (404)
   │   └─ YES → render <SuperAdminCRM />
   │
   └─ Data fetched via Edge Function: /sa-data
       ├─ Validates JWT + email === SUPER_ADMIN_EMAIL
       │   ├─ FAIL → 404 empty response
       │   └─ PASS → queries all businesses, referrals, offers, payouts, profiles, audit_log
       └─ Returns full dataset using service_role key (bypasses RLS)
```

## Security Model

- **Hard-coded constant**: `SUPER_ADMIN_EMAIL = "sales@nationwidesales.ca"` in both the React component AND the edge function
- **No database role check** — purely email-based
- **Route gate**: If user email doesn't match, render `<NotFound />` — identical to a real 404, no "unauthorized" leak
- **Data gate**: Edge function validates JWT, extracts email via `getClaims()`, compares against constant. Returns 404 on mismatch
- **SEO**: `<meta name="robots" content="noindex,nofollow">` on the page. Route excluded from any nav/footer/sitemap. Added to `robots.txt` as `Disallow: /__sa`

## File Changes

### 1. New: `supabase/functions/sa-data/index.ts` — Server-side data endpoint

- Validates `Authorization` header via `getClaims()`
- Extracts `email` from claims, compares to `SUPER_ADMIN_EMAIL`
- On mismatch: returns `{ status: 404 }` with empty body
- On match: uses `SUPABASE_SERVICE_ROLE_KEY` to query all data:
  - `businesses` (all columns)
  - `referrals` with joined `offers(title, payout, payout_type)` and `businesses(name)`
  - `profiles` (all)
  - `payouts` with joined `businesses(name)`
  - `audit_log` (last 200 entries)
  - `user_roles` (all)
- Returns JSON payload with all data
- Supports pagination param `?biz_id=X` for on-demand referral loading per business (lazy load)

### 2. New: `src/pages/SuperAdminCRM.tsx` — The CRM page

**Gate logic (top of component)**:
- Uses `useAuth()` to get `user`
- If `!user` or `user.email?.toLowerCase() !== "sales@nationwidesales.ca"` → render `<NotFound />`
- Sets `<meta name="robots" content="noindex,nofollow">` via effect

**Global filter bar**:
- Search input (filters businesses by name)
- Stage filter dropdown (All, Submitted, Accepted, In Progress, Won, Lost, Void/Declined)
- Quick stat chips: Total Referrals, Pending, Won, Payouts Ready

**Business cards (collapsible, one per business)**:
- Default: all collapsed
- Card header shows: business name, verified badge, active offers count, total referrals, won count, payouts ready count
- On expand: fetches referrals for that business (or uses cached data)
- Inside: referrals grouped by stage in collapsible accordion sections
- Each referral row: customer name, email/phone, referrer name (mapped from profiles), offer title, submitted date, last updated, payout amount, "View Details" button

**Referral detail drawer (Sheet component)**:
- Full referral info (all fields)
- Audit log timeline (filtered to that referral_id)
- Payout status and admin notes
- Inline notes editing (saves via edge function)

### 3. Update: `src/App.tsx` — Add hidden route

- Add `/__sa` route **outside** the `<Layout>` wrapper (no nav/footer shown)
- No `<ProtectedRoute>` wrapper — the component handles its own gate
- Import `SuperAdminCRM` lazily

### 4. Update: `public/robots.txt` — Disallow `/__sa`

- Add `Disallow: /__sa` under the wildcard user-agent

### 5. Update: `supabase/config.toml` — Register edge function

- Add `[functions.sa-data]` with `verify_jwt = false`

## No Database Changes

All required tables exist. The edge function uses the service role key to bypass RLS entirely, so no new policies needed.

## UI Details

- Uses existing shadcn components: `Collapsible`, `Accordion`, `Sheet`, `Badge`, `Input`, `Select`, `Button`
- Framer motion for card expand/collapse animations
- Business cards sorted by referral count (most active first)
- Stage colors reuse the existing `statusConfig` pattern from AdminDashboard
- Mobile-responsive: cards stack vertically, referral rows scroll horizontally

