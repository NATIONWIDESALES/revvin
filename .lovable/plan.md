

## Plan: Automated Email to Business on New Referral

### Approach

Create a dedicated edge function `notify-new-referral` that receives a referral ID, looks up all related data (business owner email, referrer name, customer details), builds a branded HTML email, and sends it via Resend. The ReferralWizard calls this function fire-and-forget after a successful insert — no UI changes, no blocking.

### Changes

**1. Create `supabase/functions/notify-new-referral/index.ts`**

A new edge function that:
- Accepts `{ referral_id: string }` as POST body
- Uses `SUPABASE_SERVICE_ROLE_KEY` to look up:
  - The referral row (customer_name, customer_email, customer_phone, notes)
  - The business (name, user_id) → then the business owner's email from `auth.users` via admin API
  - The referrer's profile (full_name)
- Skips gracefully if business owner email is missing (logs warning, returns 200)
- Builds a fully inline-styled HTML email matching the spec:
  - From: `Revvin <updates@updates.revvin.co>`
  - Reply-To: `support@revvin.co`
  - Subject: `New referral: [first name of referred person]`
  - Body: branded HTML with the card layout, conditional phone/email/notes fields, CTA button linking to `/dashboard`
- Sends via Resend API using `RESEND_API_KEY`
- Logs to `notifications_log` table for audit
- Returns 200 regardless of email outcome

**2. Update `supabase/config.toml`**

Add:
```toml
[functions.notify-new-referral]
verify_jwt = false
```

**3. Update `src/components/ReferralWizard.tsx`** (minimal change — only inside `handleSubmit`)

After the successful `.insert()` and before showing the success step, add a fire-and-forget call:

```typescript
// Fire-and-forget — don't await, don't block UI
supabase.functions.invoke("notify-new-referral", {
  body: { referral_id: inserted.id },
}).catch((err) => console.error("Notification trigger failed:", err));
```

This is ~3 lines added inside the existing try block. No UI, layout, or routing changes.

### What stays untouched
- No UI component changes beyond the 3-line fire-and-forget call
- No changes to existing `send-notification` edge function
- No database schema changes (reuses existing `notifications_log` table)
- No new routes, dashboards, or pages

