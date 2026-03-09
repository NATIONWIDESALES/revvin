

## Plan: Auto-notify admin when a business signs up

### Approach

Create a new edge function `notify-business-signup` that is triggered by a Supabase database webhook on INSERT to the `businesses` table. When a new business row is created, the function sends an HTML email via Resend to `info@revvin.co` with the business details and a direct link to the Super Admin CRM (`/__sa`).

### Changes

**1. New edge function: `supabase/functions/notify-business-signup/index.ts`**
- Triggered by a database webhook (no JWT required)
- Receives the webhook payload containing the new `businesses` row
- Uses `SUPABASE_SERVICE_ROLE_KEY` to look up the business owner's email and profile name from auth
- Sends a styled HTML email via Resend from `Revvin <updates@updates.revvin.co>` to `info@revvin.co`
- Email includes: business name, owner name/email, industry, service area, phone, signup timestamp
- CTA button links to `https://revvin.lovable.app/__sa` (Super Admin CRM)
- Logs the notification to `notifications_log` table for audit

**2. Database webhook migration**
- Create a Supabase database webhook on `INSERT` to `businesses` table that calls the `notify-business-signup` function
- This ensures the notification fires automatically from the `handle_new_user` trigger's insert into `businesses`

**3. Update `supabase/config.toml`** (if needed)
- Add `[functions.notify-business-signup]` with `verify_jwt = false` since it's called by a database webhook

### Email content outline
- Subject: "New Business Signup: {business_name}"
- Body: greeting, business details table (name, owner email, industry, city, phone), approve CTA linking to `/__sa`
- Footer note about pending approval

### No frontend changes required
The automation is entirely backend. The existing Super Admin CRM already has the approval workflow.

