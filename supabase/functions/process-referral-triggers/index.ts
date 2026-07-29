// Auto-ask engine. Claims due referral_triggers rows and sends ONE personalised
// referral ask email per row.
//
// Compliance rules baked in here (do not relax without legal review):
//   - EMAIL ONLY. Revvin never auto-sends SMS. Referral texts are marketing
//     under the TCPA and require prior express written consent, so SMS in this
//     product is device-native only (the owner taps and their own phone sends).
//   - Suppression is checked against suppressed_contacts (per business) and
//     suppressed_emails (platform wide) before every send.
//   - Every send carries a working unsubscribe link backed by unsubscribe_tokens
//     and the handle-unsubscribe function.
//   - Cron-only: guarded with the same x-cron-secret / service-role check as
//     monthly-roi-recap.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { appUrl, RESEND_FROM_ADDRESS, RESEND_REPLY_TO } from "../_shared/app-config.ts";
import { sendEmailViaGateway } from "../_shared/resend-gateway.ts";
import { checkCronAuth } from "../_shared/cron-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const MAX_ATTEMPTS = 3;

const esc = (s: string) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = checkCronAuth(req);
  if (!auth.ok) {
    return new Response(JSON.stringify({ error: "unauthorized", reason: auth.reason }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  try {
    const nowIso = new Date().toISOString();
    const { data: due, error: scanErr } = await supabase
      .from("referral_triggers")
      .select("*")
      .in("status", ["scheduled", "queued"])
      .lte("scheduled_send_at", nowIso)
      .lt("attempts", MAX_ATTEMPTS)
      .order("scheduled_send_at", { ascending: true })
      .limit(100);
    if (scanErr) throw scanErr;

    const results: Array<{ id: string; status: string; detail?: string }> = [];

    for (const row of due ?? []) {
      // Single conditional UPDATE claim: only one concurrent run can move a row
      // out of its scheduled state, so a row can never be sent twice.
      const { data: claimed } = await supabase
        .from("referral_triggers")
        .update({ status: "sending", attempts: (row.attempts ?? 0) + 1 })
        .eq("id", row.id)
        .in("status", ["scheduled", "queued"])
        .select("id");
      if (!claimed?.length) continue;

      const fail = async (reason: string, terminal = true) => {
        await supabase
          .from("referral_triggers")
          .update({
            status: terminal ? "failed" : "scheduled",
            failure_reason: reason.slice(0, 500),
          })
          .eq("id", row.id);
        results.push({ id: row.id, status: terminal ? "failed" : "retry", detail: reason });
      };

      const email = (row.customer_email || "").trim().toLowerCase();
      if (!email) {
        // No email means nothing we may lawfully auto-send. SMS stays device-native.
        await supabase
          .from("referral_triggers")
          .update({ status: "failed", failure_reason: "no_email_sms_is_device_native" })
          .eq("id", row.id);
        results.push({ id: row.id, status: "failed", detail: "no email on record" });
        continue;
      }

      // Suppression: per-business list and platform-wide bounce/complaint list.
      const [{ data: bizSuppressed }, { data: platformSuppressed }] = await Promise.all([
        supabase
          .from("suppressed_contacts")
          .select("id")
          .eq("business_id", row.business_id)
          .eq("contact_type", "email")
          .eq("contact_value", email)
          .limit(1),
        supabase.from("suppressed_emails").select("id").eq("email", email).limit(1),
      ]);
      if (bizSuppressed?.length || platformSuppressed?.length) {
        await supabase
          .from("referral_triggers")
          .update({ status: "suppressed", failure_reason: "recipient_suppressed" })
          .eq("id", row.id);
        results.push({ id: row.id, status: "suppressed" });
        continue;
      }

      const { data: bizRows } = await supabase
        .from("businesses")
        .select("id, name, slug, offer_amount, offer_trigger, is_published, is_disabled, contact_outreach_consent_at")
        .eq("id", row.business_id)
        .limit(1);
      const biz = bizRows?.[0];
      if (!biz) {
        await fail("business_not_found");
        continue;
      }
      if (!biz.contact_outreach_consent_at) {
        await fail("owner_attestation_missing");
        continue;
      }
      if (biz.is_disabled || !biz.is_published) {
        await fail("business_page_not_live");
        continue;
      }

      // Unsubscribe token, one per (business, contact). Reuse if present.
      let token: string | null = null;
      const { data: existingToken } = await supabase
        .from("unsubscribe_tokens")
        .select("token")
        .eq("business_id", biz.id)
        .eq("contact_type", "email")
        .eq("contact_value", email)
        .limit(1);
      token = existingToken?.[0]?.token ?? null;
      if (!token) {
        token = crypto.randomUUID().replace(/-/g, "");
        const { error: tokenErr } = await supabase.from("unsubscribe_tokens").insert({
          token,
          business_id: biz.id,
          contact_type: "email",
          contact_value: email,
        });
        if (tokenErr) {
          await fail(`unsubscribe_token_failed: ${tokenErr.message}`, false);
          continue;
        }
      }

      const unsubscribeUrl =
        `${Deno.env.get("SUPABASE_URL")}/functions/v1/handle-unsubscribe?token=${token}`;
      const referralUrl = appUrl(`/r/${biz.slug ?? ""}`);
      const first = (row.customer_first_name || "").trim() || "there";
      const service = (row.service_description || "").trim();
      const tech = (row.technician_name || "").trim();
      const reward = (biz.offer_amount || "").trim();

      const subject = service
        ? `Know anyone else who needs ${service}?`
        : `Know anyone else who could use ${biz.name}?`;

      const opener = tech
        ? `${esc(tech)} finished up${service ? ` your ${esc(service)}` : ""} for you, and we hope it went well.`
        : `We hope${service ? ` your ${esc(service)}` : " the job"} went well.`;

      const html = `<!doctype html><html><body style="margin:0;padding:0;background:#f6f7f9;font-family:-apple-system,BlinkMacSystemFont,'Inter',Segoe UI,Roboto,sans-serif;color:#0f172a">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px">
    <div style="font-size:13px;color:#15803d;font-weight:600;letter-spacing:.04em;text-transform:uppercase">${esc(biz.name)}</div>
    <h1 style="margin:8px 0 6px;font-size:22px;line-height:1.3">Hi ${esc(first)}, thank you for your business</h1>
    <p style="margin:0 0 18px;color:#475569;font-size:14px">${opener} If you know someone who needs the same kind of work, you can pass them along in a few seconds.${reward ? ` We say thank you with ${esc(reward)} when a referral turns into a job.` : ""}</p>
    <a href="${referralUrl}" style="display:inline-block;background:#15803d;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600;font-size:14px">Refer someone</a>
    <p style="margin:28px 0 0;font-size:12px;color:#94a3b8">You are getting this because you are a customer of ${esc(biz.name)}. <a href="${unsubscribeUrl}" style="color:#64748b">Unsubscribe</a> to stop these messages.</p>
    <p style="margin:8px 0 0;font-size:12px;color:#94a3b8">Sent through Revvin on behalf of ${esc(biz.name)}.</p>
  </div>
</body></html>`;

      const idempotencyKey = `auto-ask-${row.id}`;
      const send = await sendEmailViaGateway({
        from: RESEND_FROM_ADDRESS,
        to: email,
        reply_to: RESEND_REPLY_TO,
        subject,
        html,
        idempotencyKey,
      });

      await supabase.from("email_send_log").insert({
        message_id: idempotencyKey,
        template_name: "auto-ask-referral",
        recipient_email: email,
        status: send.success ? "sent" : "failed",
        error_message: send.success ? null : send.error?.slice(0, 500),
        metadata: { business_id: biz.id, trigger_id: row.id },
      });

      if (send.success) {
        await supabase
          .from("referral_triggers")
          .update({
            status: "sent",
            channel: "email",
            sent_at: new Date().toISOString(),
            failure_reason: null,
          })
          .eq("id", row.id);
        results.push({ id: row.id, status: "sent" });
      } else {
        // Retry until MAX_ATTEMPTS, then stop for good.
        const exhausted = (row.attempts ?? 0) + 1 >= MAX_ATTEMPTS;
        await fail(send.error || "send_failed", exhausted);
      }
    }

    return new Response(
      JSON.stringify({ ok: true, scanned: due?.length ?? 0, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[process-referral-triggers] error", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});