
# Revvin — Prompt A + B Merged Execution Plan

This is large. I'm laying out the full scope, the sequence, and one remaining ambiguity. Once you green-light, I'll execute in batches (one workstream per turn, ending each with a checkpoint).

---

## One remaining ambiguity — please confirm

Question 6 was: "Should the new send engine ride on top of your existing Lovable Emails queue (don't introduce a parallel system)?" You answered **no**.

Two ways to read "no":
- **(A)** No, don't ride on it — build a parallel send engine. *(I'd push back: you already have a battle-tested pgmq queue, retries, rate-limit handling, DLQ, suppression table, unsubscribe tokens. Building parallel infra duplicates risk.)*
- **(B)** No, don't introduce a parallel system — reuse the existing queue. *(This is what I'd recommend.)*

**I'll proceed with (B) unless you say otherwise in your next message.** Resend stays as the email provider (already configured); Twilio gets added for SMS; the existing `transactional_emails` pgmq queue handles email scheduling; a new sibling queue `sms_outbound` handles SMS with the same dispatcher pattern.

---

## Sequencing (8 batches)

Each batch is one turn. I'll report back at each checkpoint before continuing.

### Batch 1 — Schema foundation (Prompt A + B tables)
Single migration adding everything downstream needs. Additive only — no existing column touched.

- `businesses` add columns: `stripe_connected_account_id`, `jobber_account_id`, `jobber_refresh_token_encrypted`, `jobber_token_expires_at`, `jobber_integration_status` (`active|needs_reauth|disconnected`), `trigger_delay_hours` (default 24), `trigger_email_enabled` (default true), `trigger_sms_enabled` (default false), `trigger_template_email`, `trigger_template_sms`
- `profiles` add `is_admin boolean default false` (only if not already covered by `user_roles` admin — I'll reuse `has_role(_, 'admin')` rather than add a column)
- New tables: `referral_triggers`, `campaign_contacts`, `campaigns`, `campaign_sends`, `campaign_templates`, `reward_tiers`, `seasonal_campaigns`, `launch_tasks`, `suppressed_contacts`, `send_log` (staging-mode log), `sms_outbound` (pgmq queue created via tool, not migration)
- Full RLS on every table (business owns / admin reads all / service-role writes)
- Trigger to enforce "one active seasonal campaign per offer"
- Unique constraints: `campaign_contacts(business_id, email)`, `campaign_contacts(business_id, phone)`, `suppressed_contacts(business_id, contact_value)`

**Checkpoint:** migration applied, types regenerated, security linter clean.

### Batch 2 — Send engine + compliance (Workstream 4)
- New edge function `enqueue-outbound-message` (server-side, validates rate limits + suppression before enqueuing to either `transactional_emails` or `sms_outbound`)
- New edge function `process-sms-queue` (mirrors `process-email-queue`, drains `sms_outbound` via Twilio gateway connector)
- New edge function `handle-unsubscribe` (one-click + STOP keyword webhook from Twilio)
- New edge function `twilio-inbound-webhook` (catches STOP/HELP)
- `REVVIN_SEND_MODE` secret → when `staging`, sends write to `send_log` table instead of dispatching
- Cron job for `process-sms-queue` (every 30s)
- Twilio connector: `standard_connectors--connect` (will prompt you)

**Checkpoint:** test send (email + SMS) in staging mode, verify `send_log` row, verify unsubscribe flips `suppressed_contacts`.

### Batch 3 — Stripe Connect (Workstream 1) + Jobber (Workstream 2)
- `STRIPE_CONNECT_CLIENT_ID`, `STRIPE_CONNECT_WEBHOOK_SECRET`, `JOBBER_CLIENT_ID`, `JOBBER_CLIENT_SECRET`, `JOBBER_WEBHOOK_SECRET` via `add_secret`
- Edge functions: `stripe-connect-oauth-callback`, `stripe-connect-webhook`, `jobber-oauth-callback`, `jobber-webhook`, `jobber-token-refresh` (daily cron)
- Jobber refresh token stored encrypted (Supabase Vault); decryption only inside edge functions
- Both webhooks insert into `referral_triggers` with dedupe (90-day window) + suppression check + free-tier monthly cap (50)
- "Needs reauth" status flips on refresh failure, sends email via send engine

**Checkpoint:** Stripe Connect OAuth round-trip works in test mode; Jobber code complete but flagged as untested (you don't have sandbox yet).

### Batch 4 — `/dashboard/integrations` page (Workstream 3 + Prompt A surface)
- New route `/dashboard/integrations`
- Stripe Connect card: connect / disconnect / status
- Jobber card: connect / disconnect / status / "Needs reauth" CTA
- Trigger settings panel: channel toggles, delay dropdown, template editor with merge tags `{{first_name}}`, `{{business_name}}`, `{{service}}`, `{{reward}}`, `{{referral_link}}`, test-send button
- All copy in YC-minimalist style, no em dashes, "wallet reservation" / "platform fee" terminology

**Checkpoint:** visual QA at 1380px + 390px.

### Batch 5 — Trigger processor + campaign send engine (Workstream 1D, 4B, 5D)
- Edge function `process-referral-triggers` (cron every 5 min) — picks queued rows past `scheduled_send_at`, renders template, hands off to `enqueue-outbound-message`, retry/backoff 3x
- Edge function `process-campaigns` — drains `campaigns` in `sending` status, fans out to `campaign_sends`, hands off to send engine
- Open-pixel + click-redirect edge function for `campaign_sends` analytics

**Checkpoint:** seed test trigger row in staging, watch it move queued → sent → `send_log`.

### Batch 6 — Campaign UI (Workstream 5 + Prompt A surface) + tiered rewards UI (Workstream 6 + Prompt A surface)
- New routes: `/dashboard/campaigns`, `/dashboard/campaigns/new`, `/dashboard/campaigns/:id`
- CSV upload via `papaparse`, preview, bulk insert with dedupe report
- 3 seeded templates inserted via `supabase--insert`
- Consent checkbox + `consent_confirmed_at` logging
- Free-tier 1-campaign-per-7-days enforced in `process-campaigns` (server-side)
- Reporting: sent / delivered / opened / clicked / opted-out counts
- Tiered rewards editor on Create Offer + Edit Offer pages
- Seasonal campaign editor (start/end/multiplier) with single-active enforcement

**Checkpoint:** campaign end-to-end in staging, tier editor saves correctly.

### Batch 7 — Tiered payout computation (Workstream 6) + Launch Package (Workstream 7 + Prompt A surface)
- Edit `process-deal-won` to call new helper `compute-tiered-payout` (counts won referrals → finds highest matching tier → applies active seasonal multiplier → fallback to offer base reward)
- Referrer submission confirmation: "You'll earn $X if this closes (or $Y during active campaign)"
- Business payout review: breakdown line "base × tier × multiplier = final"
- Seasonal campaign activation notifier (uses send engine)
- Launch Package $297: new Stripe price + checkout button on dashboard, new webhook subscription on existing `stripe-business-webhook` only adds handling for the new price ID (does **not** modify existing logic — additive switch case)
- Admin route `/admin/launch-tasks` gated by `has_role(uid,'admin')`
- 3 automated emails (purchased / in-progress / delivered) via send engine

**Checkpoint:** simulate deal-won with tier match + active campaign, verify payout math; test launch-package checkout.

### Batch 8 — Production readiness + changelog
- Add ROI dashboard data wiring (Prompt A leftover) using existing referral/payout tables — read-only panels
- Public profile polish (Prompt A leftover) — already partially exists at `/referrer/:userId`
- Asset kit + industry playbooks: scaffolded as static MDX-style content pages (defer dynamic editing to a later sprint)
- Manual test pass: opt-out propagation, rate limits, OAuth round-trips
- Final changelog per Prompt B's required deliverable format
- Update `mem://` with new features (integrations, campaigns, tiered rewards, launch package, send engine)

**Checkpoint:** ready to flip `REVVIN_SEND_MODE` to production after you review templates.

---

## Risks and explicit deferrals

- **Jobber:** code will be complete but untested until you provision a Jobber developer app + sandbox account. I'll mark it `needs_sandbox_verification` in the changelog.
- **Asset kit + industry playbooks (Prompt A):** scaffolded as static content only. Full CMS-style editing deferred — not in scope of A+B.
- **ROI dashboard:** built read-only from existing data. Forecasting models deferred.
- **Twilio Geo Permissions + SMS Pumping Protection:** I'll instruct you to enable these in your Twilio console after Batch 2; can't toggle them programmatically.
- **Stripe Connect platform mode:** assuming your Stripe Connect settings are configured (you said yes). If not, OAuth will fail with a clear error.
- **Encrypted refresh tokens:** Supabase Vault doesn't expose programmatic encrypt/decrypt from edge functions in a clean way. I'll use `pgsodium`-based column encryption via a SECURITY DEFINER function instead. Same security guarantee, simpler integration.

---

## Estimated turns

8 batches → 8 turns minimum, likely 10-12 with debugging on integration round-trips. Each batch is a complete, shippable unit — you can stop me after any checkpoint and the app stays in a working state.

---

**Reply with: confirm interpretation of question 6 (A or B) and "go" to start Batch 1.**
