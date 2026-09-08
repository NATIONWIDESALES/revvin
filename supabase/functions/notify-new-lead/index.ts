import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { appUrl, RESEND_FROM_ADDRESS, RESEND_REPLY_TO } from "../_shared/app-config.ts";
import { sendEmailViaGateway } from "../_shared/resend-gateway.ts";

/**
 * Owner notification worker.
 *
 * This used to be called by the visitor's browser right after a referral was
 * submitted, and it claimed `owner_notified_at` BEFORE attempting delivery. A
 * closed tab or a provider error therefore lost the email permanently, and a
 * retry was skipped as "already notified".
 *
 * Now the submit RPC commits a durable `notification_jobs` row in the SAME
 * transaction as the lead, deduped on (lead_id, event). This function is a
 * service-role-only worker that drains due jobs:
 *   claim (attempt counted, backoff set) -> send -> record outcome.
 * 'sent' is written only with provider evidence (a message id or an explicit
 * success), so a failure stays retryable. Recipients are resolved here from the
 * owner's own settings; a caller can never choose who gets the email.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_JOBS_PER_RUN = 25;

const esc = (s: string) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

function parseJwtClaims(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const payload = parts[1]
      .replaceAll("-", "+")
      .replaceAll("_", "/")
      .padEnd(Math.ceil(parts[1].length / 4) * 4, "=");
    return JSON.parse(atob(payload)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

type Job = {
  id: string;
  business_id: string;
  lead_id: string | null;
  event: string;
  attempts: number;
};

type Outcome =
  | { outcome: "sent"; messageId: string | null }
  | { outcome: "retry"; error: string }
  | { outcome: "failed"; error: string };

function buildHtml(biz: Record<string, any>, lead: Record<string, any>): string {
  const dashboardUrl = appUrl("/dashboard");
  const leadNumber = String(lead.lead_phone || "").replace(/[^\d+]/g, "");
  const smsBody = encodeURIComponent(
    `Hi ${String(lead.lead_name || "").split(" ")[0]}, ${lead.referrer_name} passed your details along about ${lead.lead_need}. Is now a good time?`,
  );
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f6f7f9;font-family:-apple-system,BlinkMacSystemFont,'Inter',Segoe UI,Roboto,sans-serif;color:#0f172a">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px">
    <div style="font-size:13px;color:#15803d;font-weight:600;letter-spacing:.04em;text-transform:uppercase">Revvin</div>
    <h1 style="margin:8px 0 6px;font-size:22px;line-height:1.3">New referral for ${esc(biz.name)}</h1>
    <p style="margin:0 0 20px;color:#475569;font-size:14px">Someone just sent you a warm lead. Reach out today while it's hot.</p>
    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:20px;margin-bottom:16px">
      <div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.06em;font-weight:600;margin-bottom:10px">The lead</div>
      <div style="font-size:16px;font-weight:600">${esc(lead.lead_name)}</div>
      <div style="font-size:14px;color:#334155;margin-top:4px">${esc(lead.lead_phone)}${lead.lead_email ? ` · ${esc(lead.lead_email)}` : ""}</div>
      <div style="font-size:14px;color:#334155;margin-top:12px;white-space:pre-wrap">${esc(lead.lead_need)}</div>
      ${leadNumber ? `<div style="margin-top:16px">
        <a href="sms:${leadNumber}?&body=${smsBody}" style="display:inline-block;background:#15803d;color:#fff;text-decoration:none;padding:10px 18px;border-radius:10px;font-weight:600;font-size:13px;margin-right:8px">Text them now</a>
        <a href="tel:${leadNumber}" style="display:inline-block;border:1px solid #cbd5e1;color:#0f172a;text-decoration:none;padding:10px 18px;border-radius:10px;font-weight:600;font-size:13px">Call now</a>
      </div>` : ""}
    </div>
    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:20px;margin-bottom:24px">
      <div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.06em;font-weight:600;margin-bottom:10px">Referred by</div>
      <div style="font-size:15px;font-weight:600">${esc(lead.referrer_name)}</div>
      <div style="font-size:14px;color:#334155;margin-top:4px">${esc(lead.referrer_email)}${lead.referrer_phone ? ` · ${esc(lead.referrer_phone)}` : ""}</div>
      ${lead.relationship_to_lead ? `<div style="font-size:13px;color:#64748b;margin-top:8px">Relationship: ${esc(lead.relationship_to_lead)}</div>` : ""}
    </div>
    <a href="${dashboardUrl}" style="display:inline-block;background:#15803d;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600;font-size:14px">Open dashboard</a>
    <p style="margin:28px 0 0;font-size:12px;color:#94a3b8">Reminder: once the deal closes, pay your referrer directly — Revvin doesn't take a cut of the payout.</p>
  </div>
</body></html>`;
}

async function runJob(supabase: SupabaseClient<any, any, any>, job: Job): Promise<Outcome> {
  if (!job.lead_id) return { outcome: "failed", error: "job has no lead" };

  const { data: leads, error: leadErr } = await supabase
    .from("leads")
    .select("*")
    .eq("id", job.lead_id)
    .limit(1);
  if (leadErr) return { outcome: "retry", error: `lead read failed: ${leadErr.message}` };
  const lead = leads?.[0];
  if (!lead) return { outcome: "failed", error: "lead no longer exists" };

  const { data: bizRows, error: bizErr } = await supabase
    .from("businesses")
    .select("id, name, user_id, business_email, is_demo")
    .eq("id", job.business_id)
    .limit(1);
  if (bizErr) return { outcome: "retry", error: `business read failed: ${bizErr.message}` };
  const biz = bizRows?.[0];
  if (!biz) return { outcome: "failed", error: "business no longer exists" };

  // Demo accounts never trigger a real send, and are excluded from commercial totals.
  if (biz.is_demo === true) return { outcome: "failed", error: "demo business, not sent" };

  const { data: settingsRows } = await supabase
    .from("notification_settings")
    .select("email_notifications_enabled, email_on_new_lead, notification_email")
    .eq("business_id", biz.id)
    .limit(1);
  const settings = settingsRows?.[0];

  // In-app notification is independent of the email preference and is idempotent
  // in effect: the worker only reaches here for a job it exclusively claimed.
  if (biz.user_id) {
    await supabase.from("notifications").insert({
      user_id: biz.user_id,
      title: `New referral: ${lead.lead_name}`,
      body: `Referred by ${lead.referrer_name}. Reach out today while it's hot.`,
      type: "referral_submitted",
    } as any);
  }

  if (settings?.email_notifications_enabled === false) {
    return { outcome: "failed", error: "owner turned email notifications off" };
  }
  if (settings?.email_on_new_lead === false) {
    return { outcome: "failed", error: "owner turned new-lead email off" };
  }

  let toEmail: string | null = settings?.notification_email || biz.business_email || null;
  if (!toEmail && biz.user_id) {
    const { data: ownerData } = await supabase.auth.admin.getUserById(biz.user_id);
    toEmail = ownerData?.user?.email || null;
  }
  if (!toEmail) return { outcome: "failed", error: "no recipient on file for this business" };

  // Provider-side idempotency: the same key for every retry of this lead, so a
  // retry after an ambiguous failure cannot deliver a second copy.
  const idempotencyKey = `new-lead-${lead.id}`;
  const result = await sendEmailViaGateway({
    from: RESEND_FROM_ADDRESS,
    to: toEmail,
    reply_to: lead.referrer_email || RESEND_REPLY_TO,
    subject: `New referral for ${biz.name}: ${lead.lead_name}`,
    html: buildHtml(biz, lead),
    idempotencyKey,
  });

  await supabase.from("email_send_log").insert({
    message_id: result.id ?? idempotencyKey,
    template_name: "new-lead",
    recipient_email: toEmail,
    status: result.success ? "sent" : "failed",
    error_message: result.success ? null : String(result.error ?? "").slice(0, 500),
    metadata: { business_id: biz.id, lead_id: lead.id, attempt: job.attempts },
  } as any);

  if (!result.success) {
    return { outcome: "retry", error: String(result.error ?? "send failed").slice(0, 500) };
  }

  // Only now is the lead recorded as notified: after provider evidence.
  await supabase
    .from("leads")
    .update({ owner_notified_at: new Date().toISOString() })
    .eq("id", lead.id)
    .is("owner_notified_at", null);

  return { outcome: "sent", messageId: result.id ?? idempotencyKey };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Service-role only. Visitors do not call this any more.
  const authHeader = req.headers.get("Authorization") ?? "";
  const claims = authHeader.startsWith("Bearer ")
    ? parseJwtClaims(authHeader.slice("Bearer ".length).trim())
    : null;
  if (claims?.role !== "service_role") {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase: SupabaseClient<any, any, any> = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  try {
    const { data: jobs, error: claimErr } = await supabase.rpc("fn_claim_notification_jobs", {
      p_limit: MAX_JOBS_PER_RUN,
    } as any);
    if (claimErr) throw claimErr;

    const results: Record<string, number> = { sent: 0, retry: 0, failed: 0 };
    for (const job of ((jobs ?? []) as Job[])) {
      let outcome: Outcome;
      try {
        outcome = await runJob(supabase, job);
      } catch (err) {
        outcome = { outcome: "retry", error: String((err as Error)?.message ?? err).slice(0, 500) };
      }
      results[outcome.outcome] += 1;
      const { error: finErr } = await supabase.rpc("fn_finish_notification_job", {
        p_job_id: job.id,
        p_outcome: outcome.outcome,
        p_provider_message_id: outcome.outcome === "sent" ? outcome.messageId : null,
        p_error: outcome.outcome === "sent" ? null : outcome.error,
      } as any);
      // A lost outcome write is safe: the job stays claimed with a due
      // next_attempt_at and is retried, and the provider idempotency key stops a
      // duplicate email.
      if (finErr) console.error("[notify-new-lead] outcome write failed", job.id, finErr);
    }

    return new Response(JSON.stringify({ ok: true, claimed: (jobs ?? []).length, ...results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[notify-new-lead] worker error", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
