// Security monitor. Runs every 15 minutes from pg_cron with the cron secret.
// Emails info@revvin.co only when something is unusual, throttled to one email
// per alert type per 6 hours. Every sent alert is also written to
// security_alerts so admins can see recent alerts in the CRM.
// On Mondays (UTC) it sends one weekly summary instead of staying silent.

import { createClient } from "npm:@supabase/supabase-js@2.97.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2.97.0/cors";
import { checkCronAuth } from "../_shared/cron-auth.ts";
import { sendEmailViaGateway } from "../_shared/resend-gateway.ts";
import { RESEND_FROM_ADDRESS, RESEND_REPLY_TO } from "../_shared/app-config.ts";

const ALERT_EMAIL = "info@revvin.co";
const THROTTLE_HOURS = 6;
const HOUR_MS = 3600_000;

// Same normalization and list as public.fn_offer_is_restricted_category.
const RESTRICTED_CATEGORIES = ["finance", "insurance", "legal", "mortgage", "realestate"];
const isRestricted = (category: string | null) =>
  RESTRICTED_CATEGORIES.includes((category ?? "").toLowerCase().replace(/[^a-z]/g, ""));

interface Alert {
  type: string;
  summary: string;
  details?: Record<string, unknown>;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (!checkCronAuth(req).ok) return json({ error: "Unauthorized" }, 401);

  const db = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const now = Date.now();
  const iso = (msAgo: number) => new Date(now - msAgo).toISOString();
  const alerts: Alert[] = [];

  // More than 20 new signups in an hour.
  const { count: signups } = await db
    .from("businesses")
    .select("id", { count: "exact", head: true })
    .gte("created_at", iso(HOUR_MS));
  if ((signups ?? 0) > 20) {
    alerts.push({
      type: "signups_spike",
      summary: `${signups} new business signups in the last hour (threshold 20).`,
      details: { count: signups },
    });
  }

  // More than 300 outbound emails in an hour.
  const { count: emails } = await db
    .from("email_send_log")
    .select("id", { count: "exact", head: true })
    .gte("created_at", iso(HOUR_MS));
  if ((emails ?? 0) > 300) {
    alerts.push({
      type: "email_spike",
      summary: `${emails} outbound emails in the last hour (threshold 300).`,
      details: { count: emails },
    });
  }

  // More than 50 campaign emails to a single business's contacts in 10 minutes.
  const { data: recentSends } = await db
    .from("campaign_sends")
    .select("business_id")
    .gte("created_at", iso(10 * 60_000))
    .limit(5000);
  const perBusiness = new Map<string, number>();
  for (const row of recentSends ?? []) {
    perBusiness.set(row.business_id, (perBusiness.get(row.business_id) ?? 0) + 1);
  }
  for (const [businessId, count] of perBusiness) {
    if (count > 50) {
      alerts.push({
        type: "business_email_spike",
        summary: `${count} campaign emails for one business in 10 minutes (threshold 50).`,
        details: { business_id: businessId, count },
      });
    }
  }

  // More than 100 rate-limit rejections in an hour.
  const { count: rateLimited } = await db
    .from("security_events")
    .select("id", { count: "exact", head: true })
    .eq("event_type", "rate_limited")
    .gte("created_at", iso(HOUR_MS));
  if ((rateLimited ?? 0) > 100) {
    alerts.push({
      type: "rate_limit_spike",
      summary: `${rateLimited} rate-limit rejections in the last hour (threshold 100).`,
      details: { count: rateLimited },
    });
  }

  // Any change to user_roles (includes new admins) in the last 15 minutes.
  const { data: roleChanges } = await db
    .from("security_events")
    .select("id, details, created_at")
    .eq("event_type", "user_roles_change")
    .gte("created_at", iso(15 * 60_000))
    .limit(20);
  if (roleChanges?.length) {
    alerts.push({
      type: "user_roles_change",
      summary: `${roleChanges.length} user role change(s) in the last 15 minutes.`,
      details: { changes: roleChanges },
    });
  }

  // Webhook endpoint created in the last 15 minutes.
  const { data: hooks } = await db
    .from("webhook_endpoints")
    .select("id, business_id, url, created_at")
    .gte("created_at", iso(15 * 60_000))
    .limit(20);
  if (hooks?.length) {
    alerts.push({
      type: "webhook_endpoint_created",
      summary: `${hooks.length} webhook endpoint(s) created in the last 15 minutes.`,
      details: { endpoints: hooks },
    });
  }

  // A business in a restricted category publishing in the last 15 minutes.
  const { data: recentPublishes } = await db
    .from("businesses")
    .select("id, name, slug, category")
    .eq("is_published", true)
    .gte("updated_at", iso(15 * 60_000))
    .limit(200);
  const restricted = (recentPublishes ?? []).filter((b) => isRestricted(b.category));
  if (restricted.length) {
    alerts.push({
      type: "restricted_publish",
      summary: `${restricted.length} business(es) in a restricted category published in the last 15 minutes.`,
      details: { businesses: restricted },
    });
  }

  // Throttle: at most one email per alert type per 6 hours. Every alert is
  // recorded even when throttled, so the CRM shows what happened.
  const sent: string[] = [];
  for (const alert of alerts) {
    const { count: recentAlert } = await db
      .from("security_alerts")
      .select("id", { count: "exact", head: true })
      .eq("alert_type", alert.type)
      .gte("sent_at", iso(THROTTLE_HOURS * HOUR_MS));
    if ((recentAlert ?? 0) > 0) continue;

    // Security alerts still go out while outbound email is paused: the pause
    // protects customers, and an incident is exactly when the team needs mail.
    const result = await sendEmailViaGateway({
      from: RESEND_FROM_ADDRESS,
      to: ALERT_EMAIL,
      reply_to: RESEND_REPLY_TO,
      subject: `[Revvin security] ${alert.type}`,
      text: `${alert.summary}\n\n${JSON.stringify(alert.details ?? {}, null, 2)}`,
      allowWhenPaused: true,
    });
    await db.from("security_alerts").insert({
      alert_type: alert.type,
      summary: alert.summary,
      details: { ...(alert.details ?? {}), email_sent: result.success, email_error: result.error ?? null },
    });
    sent.push(alert.type);
  }

  // Weekly Monday summary (UTC), at most one per 6 days.
  let weekly = false;
  if (new Date(now).getUTCDay() === 1) {
    const { count: recentSummary } = await db
      .from("security_alerts")
      .select("id", { count: "exact", head: true })
      .eq("alert_type", "weekly_summary")
      .gte("sent_at", iso(6 * 24 * HOUR_MS));
    if (!recentSummary) {
      const week = iso(7 * 24 * HOUR_MS);
      const [
        { count: weekSignups },
        { count: weekPublishes },
        { count: weekEmails },
        { count: weekRateLimited },
        { data: weekRoleChanges },
        { data: retentionRuns },
      ] = await Promise.all([
        db.from("businesses").select("id", { count: "exact", head: true }).gte("created_at", week),
        db.from("businesses").select("id", { count: "exact", head: true }).eq("is_published", true).gte("updated_at", week),
        db.from("email_send_log").select("id", { count: "exact", head: true }).gte("created_at", week),
        db.from("security_events").select("id", { count: "exact", head: true }).eq("event_type", "rate_limited").gte("created_at", week),
        db.from("security_events").select("id").eq("event_type", "user_roles_change").gte("created_at", week).limit(100),
        db.from("audit_log").select("payload").eq("event_type", "data_retention").gte("created_at", week).limit(100),
      ]);
      const retentionTotals: Record<string, number> = {};
      for (const row of retentionRuns ?? []) {
        for (const [k, v] of Object.entries((row.payload ?? {}) as Record<string, number>)) {
          if (typeof v === "number") retentionTotals[k] = (retentionTotals[k] ?? 0) + v;
        }
      }
      const summary = [
        `Signups this week: ${weekSignups ?? 0}`,
        `Published pages this week: ${weekPublishes ?? 0}`,
        `Outbound emails this week: ${weekEmails ?? 0}`,
        `Rate-limit rejections this week: ${weekRateLimited ?? 0}`,
        `Role changes this week: ${weekRoleChanges?.length ?? 0}`,
        `Retention job totals this week: ${JSON.stringify(retentionTotals)}`,
      ].join("\n");
      const result = await sendEmailViaGateway({
        from: RESEND_FROM_ADDRESS,
        to: ALERT_EMAIL,
        reply_to: RESEND_REPLY_TO,
        subject: "[Revvin security] Weekly summary",
        text: summary,
        allowWhenPaused: true,
      });
      await db.from("security_alerts").insert({
        alert_type: "weekly_summary",
        summary,
        details: { email_sent: result.success, email_error: result.error ?? null },
      });
      weekly = true;
    }
  }

  return json({ ok: true, alerts_found: alerts.length, sent, weekly_summary_sent: weekly });
});
