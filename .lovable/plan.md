

## Root Cause & Fix: "Database error saving new user"

### Root Cause (confirmed from auth logs)

The auth error log shows:

```
ERROR: schema "net" does not exist (SQLSTATE 3F000)
```

The chain of events:

1. User submits signup form → Supabase creates `auth.users` row
2. `on_auth_user_created` trigger fires `handle_new_user()` → inserts into `profiles`, `user_roles`, and (for businesses) `businesses`
3. The INSERT into `businesses` fires the `on_business_insert_notify` trigger
4. That trigger calls `net.http_post()` — the `pg_net` extension is **not available** in Lovable Cloud
5. The entire transaction aborts → auth user creation rolls back → "Database error saving new user"

**Referrer signups are unaffected** because the `handle_new_user` trigger doesn't insert into `businesses` for referrers, so the broken trigger never fires.

---

### Fix Plan

#### 1. Drop the broken trigger (Migration)

Create a migration that drops the `on_business_insert_notify` trigger and the `notify_business_signup_webhook` function. These use `pg_net` which doesn't exist in Lovable Cloud.

```sql
DROP TRIGGER IF EXISTS on_business_insert_notify ON public.businesses;
DROP FUNCTION IF EXISTS public.notify_business_signup_webhook();
```

#### 2. Move business signup notification to client-side (Auth.tsx)

After a successful business signup, fire-and-forget invoke the `notify-business-signup` edge function from the client. This preserves the admin notification email without depending on `pg_net`.

In `Auth.tsx`, after the `signUp` call succeeds and the role is `business`, add:

```typescript
// Fire-and-forget notification to admin
supabase.functions.invoke("notify-business-signup", {
  body: {
    type: "INSERT",
    table: "businesses",
    record: {
      user_id: data.user?.id,
      name: businessName || fullName + "'s Business",
      industry,
      city: serviceArea,
      phone: businessPhone,
    },
  },
}).catch(() => {}); // non-blocking
```

#### 3. Harden error handling in Auth.tsx

- Wrap the signup flow in better try/catch with specific error messages
- If Supabase returns a 500-class error mentioning "Database error", show a user-friendly message: "Something went wrong creating your account. Please try again or contact support."
- Add console.error logging for debugging

#### 4. Add retry/recovery for edge cases

- If a user's auth record was created but the trigger failed mid-transaction (shouldn't happen anymore after the fix since the transaction would have rolled back), add a check: on login, if user has no profile, create one from their metadata. This is a safety net.

In `AuthContext.tsx`, after `fetchRole`, check if profile exists. If not, upsert from user metadata.

---

### Files Changed

| File | Change |
|------|--------|
| New migration | `DROP TRIGGER on_business_insert_notify`; `DROP FUNCTION notify_business_signup_webhook` |
| `src/pages/Auth.tsx` | Add client-side edge function call for business signup notification; improve error messages |
| `src/contexts/AuthContext.tsx` | Add profile existence check on login as safety net |

### What stays the same
- `handle_new_user()` trigger function (still works correctly once the broken downstream trigger is removed)
- `notify-business-signup` edge function code (unchanged, just invoked from client instead of DB trigger)
- All RLS policies, table schemas, referrer flow

### Remaining risks to flag
- The `notify-business-signup` edge function sends from `updates@updates.revvin.co` via Resend — verify this domain is still verified in Resend
- The client-side notification call means if the user closes the browser immediately after signup, the admin email won't fire (acceptable trade-off vs. blocking signups)

