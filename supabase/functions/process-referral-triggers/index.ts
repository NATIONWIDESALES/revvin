// Auto-ask engine. Two passes over referral_triggers:
//   Pass A - review requests. Sent to EVERY customer on a completed job with
//            review requests turned on, with the same public review link for
//            everyone. There is no survey in front of it and no routing based
//            on how the customer feels. Review gating breaks Google's policies
//            and is an FTC deception risk, so it is not implemented here.
//   Pass B - the referral ask. This one MAY be conditioned on the customer
//            independently telling us they were happy (the link in the review
//            email) or the owner marking them happy in the dashboard. Revvin
//            does not read, scrape or infer review ratings and never claims to.
//
// Compliance rules baked in here (do not relax without legal review):
//   - EMAIL ONLY. Revvin never auto-sends SMS. Referral texts are marketing
//     under the TCPA and require prior express written consent, so SMS in this
//     product is device-native only (the owner taps and their own phone sends).
//   - Suppression is checked against suppressed_contacts (per business) and
//     suppressed_emails (platform wide) before every send.
//   - Every send carries a working unsubscribe link backed by unsubscribe_tokens
//     and the handle-unsubscribe function.
//   - The business must have attested to the customer relationship
//     (businesses.contact_outreach_consent_at) before anything goes out.
//   - Cron-only: guarded with the same x-cron-secret / service-role check as
//     monthly-roi-recap.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { appUrl, RESEND_FROM_ADDRESS, RESEND_REPLY_TO } from "../_shared/app-config.ts";
import { sendEmailViaGateway } from "../_shared/resend-gateway.ts";
import { checkCronAuth } from "../_shared/cron-auth.ts";
import { button, emailShell, esc, isSuppressed, unsubscribeUrlFor } from "../_shared/outreach.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const MAX_ATTEMPTS = 3;
/** How long the referral follow-up waits after the review request goes out. */
const FOLLOW_UP_DELAY_HOURS = 48;
/** If a gated ask never gets a positive signal, it is dropped after this. */
const GATED_ASK_EXPIRY_DAYS = 21;

interface Biz {
  id: string;
  name: string;
  slug: string | null;
  offer_amount: string | null;
  google_review_url: string | null;
  is_published: boolean;
  is_disabled: boolean;
  contact_outreach_consent_at: string | null;
  is_demo: boolean | null;
}

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

  const bizCache = new Map<string, Biz | null>();
  const loadBiz = async (id: string): Promise<Biz | null> => {
    if (bizCache.has(id)) return bizCache.get(id) ?? null;
    const { data } = await supabase
      .from("businesses")
      .select(
        "id, name, slug, offer_amount, google_review_url, is_published, is_disabled, contact_outreach_consent_at, is_demo",
      )
      .eq("id", id)
      .limit(1);
    const biz = (data?.[0] as Biz | undefined) ?? null;
    bizCache.set(id, biz);
    return biz;
  };

  try {
    const nowIso = new Date().toISOString();
    const reviewResults: Array<Record<string, unknown>> = [];
    const referralResults: Array<Record<string, unknown>> = [];

    // ---------- Pass A: review requests ----------
    const { data: reviewDue } = await supabase
      .from("referral_triggers")
      .select("*")
      .eq("review_request_status", "scheduled")
      .lte("scheduled_send_at", nowIso)
      .order("scheduled_send_at", { ascending: true })
      .limit(100);

    for (const row of reviewDue ?? []) {
      // At-most-once: one conditional claim per job row.
      const { data: claimed } = await supabase
        .from("referral_triggers")
        .update({ review_request_status: "sending" })
        .eq("id", row.id)
        .eq("review_request_status", "scheduled")
        .select("id");
      if (!claimed?.length) continue;

      const stop = async (status: string, reason: string) => {
        await supabase
          .from("referral_triggers")
          .update({ review_request_status: status, review_failure_reason: reason.slice(0, 500) })
          .eq("id", row.id);
        reviewResults.push({ id: row.id, status, detail: reason });
      };

      const email = String(row.customer_email || "").trim().toLowerCase();
      if (!email) {
        await stop("failed", "no_email_sms_is_device_native");
        continue;
      }

      const biz = await loadBiz(row.business_id);
      if (!biz) { await stop("failed", "business_not_found"); continue; }
      // Demo accounts are excluded from every scheduled send.
      if (biz.is_demo === true) { await stop("skipped", "demo_business"); continue; }
      if (!biz.contact_outreach_consent_at) { await stop("failed", "owner_attestation_missing"); continue; }
      if (biz.is_disabled || !biz.is_published) { await stop("failed", "business_page_not_live"); continue; }
      if (!biz.google_review_url) { await stop("failed", "no_review_link_on_profile"); continue; }
      if (await isSuppressed(supabase, biz.id, email)) { await stop("suppressed", "recipient_suppressed"); continue; }

      const unsubscribeUrl = await unsubscribeUrlFor(supabase, biz.id, email);
      if (!unsubscribeUrl) { await stop("scheduled", "unsubscribe_token_failed"); continue; }

      const first = String(row.customer_first_name || "").trim() || "there";
      const service = String(row.service_description || "").trim();
      const feedbackBase = appUrl(`/feedback/${row.satisfaction_token}`);

      const inner = `<h1 style="margin:8px 0 6px;font-size:22px;line-height:1.3">Hi ${esc(first)}, how did we do?</h1>
    <p style="margin:0 0 18px;color:#475569;font-size:14px;line-height:1.6">Thank you for choosing ${esc(biz.name)}${service ? ` for your ${esc(service)}` : ""}. If you have a moment, an honest review helps other people in the area decide who to call. Good or bad, we want to hear it.</p>
    <p style="margin:0 0 18px">${button(biz.google_review_url, "Leave a review")}</p>
    <p style="margin:0 0 6px;color:#475569;font-size:14px">You can also just tell us directly:</p>
    <p style="margin:0 0 18px;font-size:14px">
      <a href="${feedbackBase}?happy=1" style="color:#15803d;font-weight:600">I was happy</a>
      &nbsp;&nbsp;·&nbsp;&nbsp;
      <a href="${feedbackBase}?happy=0" style="color:#64748b;font-weight:600">Something was not right</a>
    </p>`;

      const idempotencyKey = `review-request-${row.id}`;
      const send = await sendEmailViaGateway({
        from: RESEND_FROM_ADDRESS,
        to: email,
        reply_to: RESEND_REPLY_TO,
        subject: service ? `How did your ${service} go?` : `How did we do, ${first}?`,
        html: emailShell(biz.name, inner, unsubscribeUrl),
        idempotencyKey,
      });

      await supabase.from("email_send_log").insert({
        message_id: idempotencyKey,
        template_name: "review-request",
        recipient_email: email,
        status: send.success ? "sent" : "failed",
        error_message: send.success ? null : send.error?.slice(0, 500),
        metadata: { business_id: biz.id, trigger_id: row.id },
      });

      if (send.success) {
        await supabase
          .from("referral_triggers")
          .update({
            review_request_status: "sent",
            review_requested_at: new Date().toISOString(),
            review_failure_reason: null,
          })
          .eq("id", row.id);
        reviewResults.push({ id: row.id, status: "sent" });
      } else {
        await stop("failed", send.error || "send_failed");
      }
    }

    // ---------- Pass B: referral asks ----------
    const { data: due, error: scanErr } = await supabase
      .from("referral_triggers")
      .select("*")
      .in("status", ["scheduled", "queued"])
      .lte("scheduled_send_at", nowIso)
      .lt("attempts", MAX_ATTEMPTS)
      .order("scheduled_send_at", { ascending: true })
      .limit(100);
    if (scanErr) throw scanErr;

    for (const row of due ?? []) {
      // Wait for the review request to actually go out first.
      if (["scheduled", "sending"].includes(row.review_request_status)) {
        referralResults.push({ id: row.id, status: "waiting_on_review_request" });
        continue;
      }
      if (row.review_request_status === "sent" && row.review_requested_at) {
        const readyAt =
          new Date(row.review_requested_at).getTime() + FOLLOW_UP_DELAY_HOURS * 3600_000;
        if (Date.now() < readyAt) {
          referralResults.push({ id: row.id, status: "waiting_follow_up_delay" });
          continue;
        }
      }
      // Conditional referral ask: only after a positive signal the customer or
      // the owner actually gave us. We never invent one.
      if (row.referral_requires_positive_signal && row.satisfaction_signal !== "happy") {
        const ageDays = (Date.now() - new Date(row.created_at).getTime()) / 86_400_000;
        if (ageDays > GATED_ASK_EXPIRY_DAYS) {
          await supabase
            .from("referral_triggers")
            .update({ status: "canceled", failure_reason: "no_positive_signal_received" })
            .eq("id", row.id)
            .in("status", ["scheduled", "queued"]);
          referralResults.push({ id: row.id, status: "canceled" });
        } else {
          referralResults.push({ id: row.id, status: "waiting_positive_signal" });
        }
        continue;
      }

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
        referralResults.push({ id: row.id, status: terminal ? "failed" : "retry", detail: reason });
      };

      const email = String(row.customer_email || "").trim().toLowerCase();
      if (!email) {
        // No email means nothing we may lawfully auto-send. SMS stays device-native.
        await supabase
          .from("referral_triggers")
          .update({ status: "failed", failure_reason: "no_email_sms_is_device_native" })
          .eq("id", row.id);
        referralResults.push({ id: row.id, status: "failed", detail: "no email on record" });
        continue;
      }

      if (await isSuppressed(supabase, row.business_id, email)) {
        await supabase
          .from("referral_triggers")
          .update({ status: "suppressed", failure_reason: "recipient_suppressed" })
          .eq("id", row.id);
        referralResults.push({ id: row.id, status: "suppressed" });
        continue;
      }

      const biz = await loadBiz(row.business_id);
      if (!biz) { await fail("business_not_found"); continue; }
      // Demo accounts are excluded from every scheduled send.
      if (biz.is_demo === true) { await fail("demo_business"); continue; }
      if (!biz.contact_outreach_consent_at) { await fail("owner_attestation_missing"); continue; }
      if (biz.is_disabled || !biz.is_published) { await fail("business_page_not_live"); continue; }

      const unsubscribeUrl = await unsubscribeUrlFor(supabase, biz.id, email);
      if (!unsubscribeUrl) { await fail("unsubscribe_token_failed", false); continue; }

      const referralUrl = appUrl(`/r/${biz.slug ?? ""}`);
      const first = String(row.customer_first_name || "").trim() || "there";
      const service = String(row.service_description || "").trim();
      const tech = String(row.technician_name || "").trim();
      const reward = String(biz.offer_amount || "").trim();

      const subject = service
        ? `Know anyone else who needs ${service}?`
        : `Know anyone else who could use ${biz.name}?`;

      const opener = tech
        ? `${esc(tech)} finished up${service ? ` your ${esc(service)}` : ""} for you, and we hope it went well.`
        : `We hope${service ? ` your ${esc(service)}` : " the job"} went well.`;

      const inner = `<h1 style="margin:8px 0 6px;font-size:22px;line-height:1.3">Hi ${esc(first)}, thank you for your business</h1>
    <p style="margin:0 0 18px;color:#475569;font-size:14px">${opener} If you know someone who needs the same kind of work, you can pass them along in a few seconds.${reward ? ` We say thank you with ${esc(reward)} when a referral turns into a job.` : ""}</p>
    ${button(referralUrl, "Refer someone")}`;

      const idempotencyKey = `auto-ask-${row.id}`;
      const send = await sendEmailViaGateway({
        from: RESEND_FROM_ADDRESS,
        to: email,
        reply_to: RESEND_REPLY_TO,
        subject,
        html: emailShell(biz.name, inner, unsubscribeUrl),
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
        referralResults.push({ id: row.id, status: "sent" });
      } else {
        const exhausted = (row.attempts ?? 0) + 1 >= MAX_ATTEMPTS;
        await fail(send.error || "send_failed", exhausted);
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        reviews_scanned: reviewDue?.length ?? 0,
        review_results: reviewResults,
        referrals_scanned: due?.length ?? 0,
        referral_results: referralResults,
      }),
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
