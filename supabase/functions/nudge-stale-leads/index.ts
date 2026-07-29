// Stale-lead nudges to the BUSINESS OWNER. Never to the referred lead.
//
// Two independent tiers, each at-most-once via its own timestamp column:
//   fast  - still status='new' after ~1 hour  -> leads.fast_nudge_sent_at
//   slow  - still status='new' after 24 hours -> leads.stale_nudge_sent_at
//
// Runs on pg_cron every 15 minutes with the x-cron-secret header.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { appUrl, RESEND_FROM_ADDRESS, RESEND_REPLY_TO } from "../_shared/app-config.ts";
import { sendEmailViaGateway } from "../_shared/resend-gateway.ts";
import { checkCronAuth } from "../_shared/cron-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const esc = (s: string) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const firstName = (full: string) =>
  (full || "").trim().split(/\s+/)[0] || "there";

type Tier = "fast" | "slow";
const TIER_COLUMN: Record<Tier, string> = {
  fast: "fast_nudge_sent_at",
  slow: "stale_nudge_sent_at",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Cron-only function. Requires x-cron-secret or a service-role JWT.
  const cronAuth = checkCronAuth(req);
  if (!cronAuth.ok) {
    return new Response(
      JSON.stringify({ error: "unauthorized", reason: cronAuth.reason }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  try {
    // Optional: allow single-lead invocation for testing.
    let onlyLeadId: string | null = null;
    if (req.method === "POST") {
      try {
        const body = await req.json();
        if (body?.lead_id) onlyLeadId = String(body.lead_id);
      } catch {
        // no body is fine
      }
    }

    const select =
      "id, business_id, lead_name, lead_phone, lead_need, referrer_name, lead_source, created_at";
    const now = Date.now();
    const queue: Array<{ lead: any; tier: Tier }> = [];

    if (onlyLeadId) {
      const { data } = await supabase.from("leads").select(select).eq("id", onlyLeadId).limit(1);
      if (data?.[0]) queue.push({ lead: data[0], tier: "fast" });
    } else {
      const tiers: Array<{ tier: Tier; cutoffMs: number }> = [
        { tier: "slow", cutoffMs: 24 * 60 * 60 * 1000 },
        { tier: "fast", cutoffMs: 60 * 60 * 1000 },
      ];
      const claimedIds = new Set<string>();
      for (const { tier, cutoffMs } of tiers) {
        const { data, error } = await supabase
          .from("leads")
          .select(select)
          .eq("status", "new")
          .is(TIER_COLUMN[tier], null)
          .lt("created_at", new Date(now - cutoffMs).toISOString())
          .limit(200);
        if (error) throw error;
        for (const lead of data ?? []) {
          // One email per lead per run: the 24h tier wins if both are due.
          if (claimedIds.has(lead.id)) continue;
          claimedIds.add(lead.id);
          queue.push({ lead, tier });
        }
      }
    }

    const results: Array<{ lead_id: string; tier: Tier; status: string; detail?: string }> = [];

    for (const { lead, tier } of queue) {
      const stampColumn = TIER_COLUMN[tier];
      // Look up business + owner email, honoring notification preferences.
      const [{ data: bizRows }, { data: settingsRows }] = await Promise.all([
        supabase
          .from("businesses")
          .select("id, name, user_id, business_email")
          .eq("id", lead.business_id)
          .limit(1),
        supabase
          .from("notification_settings")
          .select("email_notifications_enabled, notification_email")
          .eq("business_id", lead.business_id)
          .limit(1),
      ]);
      const biz = bizRows?.[0];
      const settings = settingsRows?.[0];
      if (!biz) {
        results.push({ lead_id: lead.id, tier, status: "skipped", detail: "business missing" });
        continue;
      }
      if (settings && settings.email_notifications_enabled === false) {
        // Still mark so we don't re-scan this lead every run.
        await supabase
          .from("leads")
          .update({ [stampColumn]: new Date().toISOString() })
          .eq("id", lead.id);
        results.push({ lead_id: lead.id, tier, status: "skipped", detail: "notifications disabled" });
        continue;
      }

      let toEmail: string | null =
        settings?.notification_email || biz.business_email || null;
      if (!toEmail && biz.user_id) {
        const { data: owner } = await supabase.auth.admin.getUserById(biz.user_id);
        toEmail = owner?.user?.email ?? null;
      }
      if (!toEmail) {
        results.push({ lead_id: lead.id, tier, status: "skipped", detail: "no owner email" });
        continue;
      }

      const dashboardUrl = appUrl("/dashboard");
      const subject =
        tier === "fast"
          ? "Your referral lead is still unworked"
          : "You have a referral lead waiting";
      const source = (lead.lead_source || "your referral page").replace(/_/g, " ");
      const first = firstName(lead.lead_name);
      const ageLine =
        tier === "fast"
          ? "came in about an hour ago and is still marked New. Replying inside the first hour is the single biggest lever on closing a referral."
          : `came in through ${esc(source)} and is still marked New after 24 hours. Fast responses close more referral jobs.`;
      // Device-native one-tap actions. The owner's own phone sends these, so
      // there is no platform-originated SMS here.
      const smsBody = encodeURIComponent(
        `Hi ${first}, ${lead.referrer_name} passed your details along about ${lead.lead_need}. Is now a good time?`,
      );
      const telHref = `tel:${String(lead.lead_phone || "").replace(/[^\d+]/g, "")}`;
      const smsHref = `sms:${String(lead.lead_phone || "").replace(/[^\d+]/g, "")}?&body=${smsBody}`;
      const html = `<!doctype html><html><body style="margin:0;padding:0;background:#f6f7f9;font-family:-apple-system,BlinkMacSystemFont,'Inter',Segoe UI,Roboto,sans-serif;color:#0f172a">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px">
    <div style="font-size:13px;color:#15803d;font-weight:600;letter-spacing:.04em;text-transform:uppercase">Revvin</div>
    <h1 style="margin:8px 0 6px;font-size:22px;line-height:1.3">${esc(subject)}</h1>
    <p style="margin:0 0 18px;color:#475569;font-size:14px">${esc(first)} ${ageLine}</p>
    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:20px;margin-bottom:20px">
      <div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.06em;font-weight:600;margin-bottom:8px">The lead</div>
      <div style="font-size:16px;font-weight:600">${esc(lead.lead_name)}</div>
      <div style="font-size:14px;color:#334155;margin-top:4px">${esc(lead.lead_phone || "")}</div>
      <div style="font-size:13px;color:#64748b;margin-top:6px">Received ${new Date(lead.created_at).toLocaleDateString()}</div>
      ${lead.lead_phone ? `<div style="margin-top:14px">
        <a href="${smsHref}" style="display:inline-block;background:#15803d;color:#fff;text-decoration:none;padding:10px 18px;border-radius:10px;font-weight:600;font-size:13px;margin-right:8px">Text them now</a>
        <a href="${telHref}" style="display:inline-block;border:1px solid #cbd5e1;color:#0f172a;text-decoration:none;padding:10px 18px;border-radius:10px;font-weight:600;font-size:13px">Call now</a>
      </div>` : ""}
    </div>
    <a href="${dashboardUrl}" style="display:inline-block;background:#15803d;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600;font-size:14px">Open lead inbox</a>
    <p style="margin:28px 0 0;font-size:12px;color:#94a3b8">You get this once per lead per reminder. Update the status in your inbox to stop future reminders for this one.</p>
  </div>
</body></html>`;

      const idempotencyKey = `${tier}-nudge-${lead.id}`;

      const send = await sendEmailViaGateway({
        from: RESEND_FROM_ADDRESS,
        to: toEmail,
        reply_to: RESEND_REPLY_TO,
        subject,
        html,
        idempotencyKey,
      });

      await supabase.from("email_send_log").insert({
        message_id: idempotencyKey,
        template_name: tier === "fast" ? "fast-lead-nudge" : "stale-lead-nudge",
        recipient_email: toEmail,
        status: send.success ? "sent" : "failed",
        error_message: send.success ? null : send.error?.slice(0, 500),
        metadata: { business_id: biz.id, lead_id: lead.id },
      });

      // Only stamp on success. A failed send leaves the row eligible for retry
      // on the next run, which is the honest behavior for a "at most once"
      // reminder: if Resend rejected it, the owner has not been notified.
      if (send.success) {
        await supabase
          .from("leads")
          .update({ [stampColumn]: new Date().toISOString() })
          .eq("id", lead.id)
          .is(stampColumn, null);
      }

      results.push({
        lead_id: lead.id,
        tier,
        status: send.success ? "sent" : "failed",
        detail: send.success ? undefined : send.error,
      });
    }

    return new Response(
      JSON.stringify({ ok: true, scanned: queue.length, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[nudge-stale-leads] error", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});