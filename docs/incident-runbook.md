# Revvin incident runbook

Plain-language steps for when something goes wrong. You do not need to be an
engineer to follow the first three sections. When in doubt, email
info@revvin.co and say what you are seeing.

## The two kill switches (fastest response)

Open the admin CRM, go to the **Security** tab, and use the switches under
"Kill switches". They take effect within about a minute and every change is
recorded with your account.

- **Pause signups**: new account creation is refused. Existing businesses,
  referral pages and dashboards keep working. Use this during a signup attack
  or a spam wave.
- **Pause outbound email**: no email is sent at all. Messages that were
  already queued stay queued and send when you turn the switch back off. Use
  this if emails are going out that should not be.

Turn them back off when the incident is over. The Security tab also shows the
most recent automated alerts so you can see what the monitor caught.

## How to unpublish a page

1. Open the admin CRM and find the business.
2. Set its account status to rejected or suspended, or turn off its published
   flag from the business detail view.
3. The public referral page stops being live immediately. Tell the business
   owner what happened and why.

## How to rotate each secret

Rotate a secret if you think it leaked. After rotating, update the value in
Project Settings, then Secrets, and redeploy the affected functions.

- **Database and API keys (Lovable Cloud)**: these are managed by the
  platform. Ask for a key rotation through the project settings; the anon key
  is public by design and does not need rotation.
- **Resend (email) key**: create a new key in the Resend dashboard, save it as
  the RESEND_API_KEY secret, then revoke the old key in Resend.
- **Stripe webhook secret**: in the Stripe dashboard, roll the webhook signing
  secret, save the new value as the Stripe webhook secret, then remove the old
  one in Stripe. Do this quickly: while they differ, payment events fail.
- **Cron secret**: generate a new random value, save it as the CRON_SECRET
  secret. Scheduled jobs authenticate with the stored server credential, so
  they keep working; only manual callers need the new value.
- **Google Maps key**: create a new key in Google Cloud, restrict it to
  revvin.co, save it, then delete the old key.

## Who to notify after a data breach

If personal information (names, emails, phone numbers, customer lists) may
have been exposed:

- **Canada (PIPEDA)**: if there is a real risk of significant harm, report to
  the Office of the Privacy Commissioner of Canada as soon as feasible, notify
  the affected individuals, and keep a written record of the breach for 24
  months even if you do not report it.
- **United States**: every state has its own breach notice law. Most require
  notifying affected residents without unreasonable delay, and some require
  notifying the state attorney general above a number of affected residents.
  Get legal advice for the specific states involved.
- Write down what happened, when you found it, what data was involved, and
  what you did. This record is required in Canada and good practice everywhere.

## One-page checklist

1. Confirm what is happening (monitor alert email, CRM Security tab, user report).
2. If signups are the problem: turn on Pause signups.
3. If email is the problem: turn on Pause outbound email.
4. If one page is the problem: unpublish it from the CRM.
5. If a secret leaked: rotate it using the steps above.
6. Write down a timeline while it is fresh.
7. If personal data was exposed: follow the breach notification steps above.
8. When it is over: turn the kill switches back off and tell affected users
   what happened in plain language.

## Out-of-band database change, Nov 5 2026

`public.email_queue_dispatch()` and `public.email_queue_wake()` were updated directly in the database, outside migrations, to add the header `x-cron-secret`, read from the vault secret `cron_secret`. The agent migration tool blocks vault references, so this change is not in `drizzle/migrations`. The `process-email-queue` edge function needs that header to pass `checkCronAuth`. Any future migration or email scaffold that redefines either function must keep the header, or every queued email (including password reset and magic links) stops sending with 401 errors.

## Failure alerts

After the frontend is published, existing failure branches report image decoding/upload, logo save, non-validation signup, business creation/setup saves, page publication, public referral submission, lead status/Closed Won, reward mark-paid, customer import, job-done ask scheduling and checkout creation failures, plus caught render crashes. Customer screens and messages do not change. Demo businesses and ordinary test runs do not report.

Open **/__sa**, then **Failures**, for the latest 100 events, newest first. Only admins can read this list, not sales users, business owners or visitors. Times are shown in Pacific time. The private records contain bounded, scrubbed error message/code, route without query/hash, known business/user IDs, build ID and user agent. No file or form payload is collected. Existing funnel analytics remains separate and unchanged.

Each accepted report queues a direct email to info@revvin.co through the existing app-email queue, subject **Revvin failure: [step] for [business or signed-out visitor]**. The body includes the owner email when known and the same-step/business count over the last 24 hours. There is one reservation per step/business in a sliding hour. A Pacific calendar day allows at most 20 emails total: email 20 also says **Alerts paused until midnight Pacific, check the failures list**. Records continue while emails are throttled. Signed-out failures share a single visitor group. Rate limits are 60 records per caller/hour and 3,000 globally/hour.

An email reservation means queued, not delivered. The existing worker normally runs within seconds; pause switches, recipient suppression, network/provider failures and dead-lettering can delay or prevent delivery. Inspect **More > Emails**, `email_send_log` label `failure_alert`, and the existing queue worker if an alert does not arrive. Do not delete suppression entries or resend dead letters blindly. A total network outage can also prevent the browser from recording an event; this is not an out-of-band uptime monitor.

The existing daily retention job inserts a `data_retention` audit entry. A new trigger on that entry removes failure events and alert reservations older than 90 days without changing the job or its existing retention rules.

Rollback: revert the reporting calls, helper and admin list in the frontend and publish that rollback when approved. Archive private records if needed, then run the rollback SQL comment in migration `0032_failure_alerts.sql`: remove the retention trigger, the four new functions and the two private tables. No existing policy, email worker or retention function is changed. Already queued alerts remain subject to the existing email pause/suppression controls; schema rollback does not cancel them.
