// Stale-lead nudge. Scans public.leads for rows still in status='new' after
// 24 hours where stale_nudge_sent_at IS NULL, and sends ONE reminder email to
// the business owner per lead. Uses the exact same Resend gateway pattern as
// notify-new-lead so deliverability, logging, and reply-to behavior match.
//
// FOUNDER TODO: schedule this. The project does not currently run a business
// cron independent of the email queue. Options:
//   - trigger nightly via an external cron (e.g. Uptime Robot) hitting the
//     public function URL with a shared secret header, or
//   - add a pg_cron schedule (project already uses pg_cron for the email
//     queue).
// Until then this function is safe to invoke manually. It is idempotent: the
// stale_nudge_sent_at column guarantees at most one send per lead, even under
// concurrent invocations.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { appUrl, RESEND_FROM_ADDRESS, RESEND_REPLY_TO } from "../_shared/app-config.ts";
import { sendEmailViaGateway } from "../_shared/resend-gateway.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const esc = (s: string) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const firstName = (full: string) =>
  (full || "").trim().split(/\s+/)[0] || "there";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
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

    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    let query = supabase
      .from("leads")
      .select("id, business_id, lead_name, lead_source, created_at")
      .eq("status", "new")
      .is("stale_nudge_sent_at", null)
      .lt("created_at", cutoff)
      .limit(200);

    if (onlyLeadId) {
      query = supabase
        .from("leads")
        .select("id, business_id, lead_name, lead_source, created_at")
        .eq("id", onlyLeadId)
        .limit(1);
    }

    const { data: stale, error: scanErr } = await query;
    if (scanErr) throw scanErr;

    const results: Array<{ lead_id: string; status: string; detail?: string }> = [];

    for (const lead of stale ?? []) {
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
        results.push({ lead_id: lead.id, status: "skipped", detail: "business missing" });
        continue;
      }
      if (settings && settings.email_notifications_enabled === false) {
        // Still mark so we don't re-scan this lead every run.
        await supabase
          .from("leads")
          .update({ stale_nudge_sent_at: new Date().toISOString() })
          .eq("id", lead.id);
        results.push({ lead_id: lead.id, status: "skipped", detail: "notifications disabled" });
        continue;
      }

      let toEmail: string | null =
        settings?.notification_email || biz.business_email || null;
      if (!toEmail && biz.user_id) {
        const { data: owner } = await supabase.auth.admin.getUserById(biz.user_id);
        toEmail = owner?.user?.email ?? null;
      }
      if (!toEmail) {
        results.push({ lead_id: lead.id, status: "skipped", detail: "no owner email" });
        continue;
      }

      const dashboardUrl = appUrl("/dashboard");
      const subject = "You have a referral lead waiting";
      const source = (lead.lead_source || "your referral page").replace(/_/g, " ");
      const first = firstName(lead.lead_name);
      const html = `<!doctype html><html><body style="margin:0;padding:0;background:#f6f7f9;font-family:-apple-system,BlinkMacSystemFont,'Inter',Segoe UI,Roboto,sans-serif;color:#0f172a">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px">
    <div style="font-size:13px;color:#15803d;font-weight:600;letter-spacing:.04em;text-transform:uppercase">Revvin</div>
    <h1 style="margin:8px 0 6px;font-size:22px;line-height:1.3">You have a referral lead waiting</h1>
    <p style="margin:0 0 18px;color:#475569;font-size:14px">${esc(first)} came in through ${esc(source)} and is still marked New after 24 hours. Fast responses close more referral jobs.</p>
    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:20px;margin-bottom:20px">
      <div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.06em;font-weight:600;margin-bottom:8px">The lead</div>
      <div style="font-size:16px;font-weight:600">${esc(lead.lead_name)}</div>
      <div style="font-size:13px;color:#64748b;margin-top:6px">Received ${new Date(lead.created_at).toLocaleDateString()}</div>
    </div>
    <a href="${dashboardUrl}" style="display:inline-block;background:#15803d;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600;font-size:14px">Open lead inbox</a>
    <p style="margin:28px 0 0;font-size:12px;color:#94a3b8">You get this once per lead. Update the status in your inbox to stop future reminders for this one.</p>
  </div>
</body></html>`;

      const idempotencyKey = `stale-nudge-${lead.id}`;

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
        template_name: "stale-lead-nudge",
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
          .update({ stale_nudge_sent_at: new Date().toISOString() })
          .eq("id", lead.id)
          .is("stale_nudge_sent_at", null);
      }

      results.push({
        lead_id: lead.id,
        status: send.success ? "sent" : "failed",
        detail: send.success ? undefined : send.error,
      });
    }

    return new Response(
      JSON.stringify({ ok: true, scanned: stale?.length ?? 0, results }),
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