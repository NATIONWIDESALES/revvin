

# Fix: Super Admin CRM Not Working

## Root Cause

The edge function `sa-data` uses `anonClient.auth.getClaims(token)` which **does not exist** in the Supabase JS client. This causes the function to throw an error and return 404 for every request, even for the correct email.

## Fix

### 1. `supabase/functions/sa-data/index.ts` — Fix auth validation

Replace the `getClaims` call with `getUser()`, which is the correct Supabase auth method:

```typescript
// BEFORE (broken):
const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
const email = (claimsData.claims as any).email;

// AFTER (correct):
const { data: { user }, error: userError } = await anonClient.auth.getUser(token);
if (userError || !user) return 404;
const email = user.email;
```

This is the only code change needed. The rest of the edge function logic and the `SuperAdminCRM.tsx` component are correct.

### 2. Login Requirement

The user (`sales@nationwidesales.ca`) must be logged in on the same domain they're accessing `/__sa` from. The auth logs show signup happened via `revvin.co`. If you're testing on the preview URL, you need to log in there too at `/auth`.

## File Changes

| File | Change |
|------|--------|
| `supabase/functions/sa-data/index.ts` | Replace `getClaims(token)` with `getUser(token)` |

