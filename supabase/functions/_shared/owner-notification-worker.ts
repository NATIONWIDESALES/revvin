import { checkCronAuth, type CronCredentials } from "./cron-auth.ts";

// Dependency injection keeps the actual HTTP worker testable without provider
// calls. The production entrypoint supplies the real database and email gateway.
export interface NotificationWorkerDependencies {
  credentials: CronCredentials;
  createClient: () => any;
  sendEmail: (params: Record<string, unknown>) => Promise<{ success: boolean; id?: string; error?: string }>;
  dashboardUrl: string;
  fromAddress: string;
  replyTo: string;
}

type Job = { id: string; business_id: string; lead_id: string | null; event: string; attempts: number; claim_token: string };
type Outcome = { outcome: "sent"; messageId: string } | { outcome: "retry" | "failed"; error: string } | { outcome: "stale" };
const esc = (value: unknown) => String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

function buildHtml(biz: Record<string, any>, lead: Record<string, any>, dashboardUrl: string): string {
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

async function runJob(db: any, job: Job, deps: NotificationWorkerDependencies): Promise<Outcome> {
  if (!job.lead_id) return { outcome: "failed", error: "job has no lead" };
  const { data: leads, error: leadErr } = await db.from("leads").select("*").eq("id", job.lead_id).limit(1);
  if (leadErr) return { outcome: "retry", error: `lead read failed: ${leadErr.message}` };
  const lead = leads?.[0];
  if (!lead) return { outcome: "failed", error: "lead no longer exists" };
  const { data: businesses, error: bizErr } = await db.from("businesses")
    .select("id, name, user_id, business_email, is_demo").eq("id", job.business_id).limit(1);
  if (bizErr) return { outcome: "retry", error: `business read failed: ${bizErr.message}` };
  const biz = businesses?.[0];
  if (!biz) return { outcome: "failed", error: "business no longer exists" };
  if (biz.is_demo === true) return { outcome: "failed", error: "demo business, not sent" };

  // The RPC inserts and marks the in-app notification in one transaction. A
  // retry cannot duplicate it and a stale lease cannot create it.
  const { data: ensured, error: inAppErr } = await db.rpc("fn_ensure_lead_notification", {
    p_job_id: job.id, p_claim_token: job.claim_token,
  });
  if (inAppErr) return { outcome: "retry", error: `in-app notification failed: ${inAppErr.message}` };
  if (ensured !== true) return { outcome: "stale" };

  const { data: settingsRows, error: settingsErr } = await db.from("notification_settings")
    .select("email_notifications_enabled, email_on_new_lead, notification_email").eq("business_id", biz.id).limit(1);
  if (settingsErr) return { outcome: "retry", error: `notification settings read failed: ${settingsErr.message}` };
  const settings = settingsRows?.[0];
  if (settings?.email_notifications_enabled === false || settings?.email_on_new_lead === false) {
    return { outcome: "failed", error: "owner disabled new-lead email; in-app notification recorded" };
  }
  let to = settings?.notification_email || biz.business_email || null;
  if (!to && biz.user_id) {
    const { data, error } = await db.auth.admin.getUserById(biz.user_id);
    if (error) return { outcome: "retry", error: `owner lookup failed: ${error.message}` };
    to = data?.user?.email || null;
  }
  if (!to) return { outcome: "failed", error: "no recipient on file for this business" };

  const idempotencyKey = `new-lead-${job.lead_id}`;
  const result = await deps.sendEmail({
    from: deps.fromAddress, to, reply_to: lead.referrer_email || deps.replyTo,
    subject: `New referral for ${biz.name}: ${lead.lead_name}`,
    html: buildHtml(biz, lead, deps.dashboardUrl), idempotencyKey,
  });
  const messageId = typeof result.id === "string" ? result.id.trim() : "";
  const evidenced = result.success === true && messageId.length > 0;
  // The durable job is the delivery ledger. A failed diagnostic log cannot
  // convert a provider success into a new send; the stable key also survives a
  // lost finish write. owner_notified_at is committed by the finish RPC.
  const { error: logErr } = await db.from("email_send_log").insert({
    message_id: messageId || idempotencyKey, template_name: "new-lead", recipient_email: to,
    status: evidenced ? "sent" : "failed",
    error_message: evidenced ? null : String(result.error || "provider response omitted message id").slice(0, 500),
    metadata: { business_id: biz.id, lead_id: job.lead_id, attempt: job.attempts },
  });
  if (logErr) console.error("[notify-new-lead] diagnostic log failed", logErr.message);
  if (!evidenced) return { outcome: "retry", error: String(result.error || "provider response omitted message id").slice(0, 500) };
  return { outcome: "sent", messageId };
}

export function createNotificationWorker(deps: NotificationWorkerDependencies) {
  return async (req: Request): Promise<Response> => {
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
    // Verify the credential itself before constructing an admin client. Never
    // grant access by trusting the role in an unverified JWT payload.
    if (!checkCronAuth(req, deps.credentials).ok) return json({ error: "Forbidden" }, 403);
    const db = deps.createClient();
    try {
      const { data: jobs, error } = await db.rpc("fn_claim_notification_jobs", { p_limit: 25 });
      if (error) throw error;
      const results: Record<string, number> = { sent: 0, retry: 0, failed: 0, stale: 0, finish_errors: 0 };
      for (const job of (jobs ?? []) as Job[]) {
        if (!job.claim_token) throw new Error("Notification claim returned no lease token; deploy matching SQL before worker");
        let outcome: Outcome;
        try { outcome = await runJob(db, job, deps); }
        catch (err) { outcome = { outcome: "retry", error: String((err as Error)?.message ?? err).slice(0, 500) }; }
        if (outcome.outcome === "stale") { results.stale++; continue; }
        const { data: finished, error: finishErr } = await db.rpc("fn_finish_notification_job", {
          p_job_id: job.id, p_claim_token: job.claim_token, p_outcome: outcome.outcome,
          p_provider_message_id: outcome.outcome === "sent" ? outcome.messageId : null,
          p_error: outcome.outcome === "sent" ? null : outcome.error,
        });
        if (finishErr) {
          results.finish_errors++;
          console.error("[notify-new-lead] outcome write failed", job.id, finishErr.message);
        } else if (finished !== true) results.stale++;
        else results[outcome.outcome]++;
      }
      return json({ ok: results.finish_errors === 0, claimed: (jobs ?? []).length, ...results }, results.finish_errors ? 500 : 200);
    } catch (error) {
      console.error("[notify-new-lead] worker failed", (error as Error)?.message ?? error);
      return json({ error: "Notification processing failed" }, 500);
    }
  };
}
