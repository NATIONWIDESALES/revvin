// Reactivation campaign worker.
//
// Compliance (see _shared/outreach.ts for the full note):
//   - EMAIL ONLY. Campaigns never send SMS from Revvin's infrastructure.
//   - The owner must have attested to the customer relationship. We refuse to
//     send when campaigns.consent_confirmed is false or the business has no
//     contact_outreach_consent_at timestamp.
//   - Suppression is checked per recipient immediately before each send.
//   - Every email carries a working unsubscribe link.
//   - Batched and daily capped so a brand new account cannot blast thousands of
//     people in its first hour and torch the sending domain's reputation.
//   - Cron only.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { appUrl, RESEND_FROM_ADDRESS, RESEND_REPLY_TO } from "../_shared/app-config.ts";
import { sendEmailViaGateway } from "../_shared/resend-gateway.ts";
import { checkCronAuth } from "../_shared/cron-auth.ts";
import { emailShell, esc, isSuppressed, renderTokens, unsubscribeUrlFor } from "../_shared/outreach.ts";
import { inSegment, segmentByKey } from "../_shared/segments.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

/** Recipients attempted per campaign per run. */
const BATCH_SIZE = 40;
/** Hard ceiling on campaign emails per business per rolling 24 hours. */
const DAILY_CAP = 500;
/** Campaigns handled per run. */
const MAX_CAMPAIGNS = 5;

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

  const summary: Array<Record<string, unknown>> = [];

  try {
    const nowIso = new Date().toISOString();
    const { data: campaigns, error: scanErr } = await supabase
      .from("campaigns")
      .select("*")
      .in("status", ["scheduled", "sending"])
      .or(`scheduled_at.is.null,scheduled_at.lte.${nowIso}`)
      .order("scheduled_at", { ascending: true, nullsFirst: true })
      .limit(MAX_CAMPAIGNS);
    if (scanErr) throw scanErr;

    for (const campaign of campaigns ?? []) {
      const result = await runCampaign(supabase, campaign);
      summary.push({ campaign_id: campaign.id, ...result });
    }

    return new Response(JSON.stringify({ ok: true, campaigns: summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[process-campaign-sends] error", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// deno-lint-ignore no-explicit-any
async function runCampaign(supabase: any, campaign: any) {
  const halt = async (reason: string) => {
    await supabase.from("campaigns").update({ status: "failed" }).eq("id", campaign.id);
    return { halted: reason };
  };

  if (campaign.channel && campaign.channel !== "email") {
    // Belt and braces: nothing but email may ever leave Revvin automatically.
    return await halt("channel_not_email");
  }
  if (!campaign.consent_confirmed) return await halt("attestation_missing");

  const { data: bizRows } = await supabase
    .from("businesses")
    .select("id, name, slug, offer_amount, is_published, is_disabled, contact_outreach_consent_at")
    .eq("id", campaign.business_id)
    .limit(1);
  const biz = bizRows?.[0];
  if (!biz) return await halt("business_not_found");
  if (!biz.contact_outreach_consent_at) return await halt("attestation_missing");
  if (biz.is_disabled || !biz.is_published) return await halt("business_page_not_live");

  // Claim: only one run may move a campaign into sending.
  if (campaign.status === "scheduled") {
    const { data: claimed } = await supabase
      .from("campaigns")
      .update({ status: "sending", started_at: campaign.started_at ?? new Date().toISOString() })
      .eq("id", campaign.id)
      .eq("status", "scheduled")
      .select("id");
    if (!claimed?.length) return { skipped: "claimed_elsewhere" };
  }

  // Materialise the recipient set once, on the first run of the campaign.
  const { count: existingSends } = await supabase
    .from("campaign_sends")
    .select("id", { count: "exact", head: true })
    .eq("campaign_id", campaign.id);

  if (!existingSends) {
    const segment = segmentByKey(campaign.segment_key ?? "all");
    if (!segment) return await halt("unknown_segment");

    const { data: contacts } = await supabase
      .from("referral_contacts")
      .select("id, name, email, last_job_at, created_at")
      .eq("business_id", biz.id)
      .not("email", "is", null)
      .limit(5000);

    const seen = new Set<string>();
    const rows = (contacts ?? [])
      .filter((c: any) => inSegment(c, segment))
      .map((c: any) => ({ ...c, email: String(c.email || "").trim().toLowerCase() }))
      .filter((c: any) => {
        if (!c.email || seen.has(c.email)) return false;
        seen.add(c.email);
        return true;
      })
      .map((c: any) => ({
        campaign_id: campaign.id,
        contact_id: c.id,
        business_id: biz.id,
        recipient_email: c.email,
        status: "pending",
      }));

    if (rows.length === 0) {
      await supabase
        .from("campaigns")
        .update({
          status: "sent",
          total_recipients: 0,
          completed_at: new Date().toISOString(),
        })
        .eq("id", campaign.id);
      return { completed: true, total_recipients: 0 };
    }

    // Chunked so a large list does not blow the request size.
    for (let i = 0; i < rows.length; i += 500) {
      await supabase.from("campaign_sends").insert(rows.slice(i, i + 500));
    }
    await supabase
      .from("campaigns")
      .update({ total_recipients: rows.length })
      .eq("id", campaign.id);
  }

  // Rolling 24 hour cap across every campaign this business runs.
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count: sentToday } = await supabase
    .from("campaign_sends")
    .select("id", { count: "exact", head: true })
    .eq("business_id", biz.id)
    .eq("status", "sent")
    .gte("sent_at", since);

  const remainingToday = Math.max(0, DAILY_CAP - (sentToday ?? 0));
  if (remainingToday === 0) return { throttled: "daily_cap_reached", cap: DAILY_CAP };

  const { data: pending } = await supabase
    .from("campaign_sends")
    .select("id, contact_id, recipient_email")
    .eq("campaign_id", campaign.id)
    .eq("status", "pending")
    .limit(Math.min(BATCH_SIZE, remainingToday));

  if (!pending?.length) {
    await finalise(supabase, campaign.id);
    return { completed: true };
  }

  const referralUrl = appUrl(`/r/${biz.slug ?? ""}`);
  let sent = 0;
  let failed = 0;
  let suppressed = 0;

  // Contact names for the first-name token.
  const contactIds = pending.map((p: any) => p.contact_id).filter(Boolean);
  const { data: contactRows } = contactIds.length
    ? await supabase.from("referral_contacts").select("id, name").in("id", contactIds)
    : { data: [] };
  const nameById = new Map<string, string>(
    (contactRows ?? []).map((c: any) => [c.id, String(c.name || "")]),
  );

  for (const row of pending) {
    // Claim this recipient so two overlapping runs cannot double send.
    const { data: claimed } = await supabase
      .from("campaign_sends")
      .update({ status: "sending" })
      .eq("id", row.id)
      .eq("status", "pending")
      .select("id");
    if (!claimed?.length) continue;

    const email = String(row.recipient_email || "").trim().toLowerCase();
    if (!email || (await isSuppressed(supabase, biz.id, email))) {
      suppressed++;
      await supabase
        .from("campaign_sends")
        .update({ status: "suppressed", failure_reason: "recipient_suppressed" })
        .eq("id", row.id);
      continue;
    }

    const unsubscribeUrl = await unsubscribeUrlFor(supabase, biz.id, email);
    if (!unsubscribeUrl) {
      failed++;
      await supabase
        .from("campaign_sends")
        .update({ status: "pending", failure_reason: "unsubscribe_token_failed" })
        .eq("id", row.id);
      continue;
    }

    const fullName = nameById.get(row.contact_id) ?? "";
    const tokens: Record<string, string> = {
      first_name: fullName.trim().split(/\s+/)[0] || "there",
      business_name: biz.name,
      referral_link: referralUrl,
      offer: (biz.offer_amount || "").trim(),
    };

    const subject = renderTokens(campaign.subject || `A note from ${biz.name}`, tokens, false);
    const bodyHtml = renderTokens(campaign.body || "", tokens, true)
      .split(/\n{2,}/)
      .map((p) => `<p style="margin:0 0 14px;color:#475569;font-size:14px;line-height:1.6">${p.replace(/\n/g, "<br />")}</p>`)
      .join("");

    const inner = `<h1 style="margin:8px 0 14px;font-size:22px;line-height:1.3">${esc(subject)}</h1>
    ${bodyHtml}
    <p style="margin:18px 0 0"><a href="${referralUrl}" style="display:inline-block;background:#15803d;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600;font-size:14px">Get in touch</a></p>`;

    const idempotencyKey = `campaign-${campaign.id}-${row.id}`;
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
      template_name: "reactivation-campaign",
      recipient_email: email,
      status: send.success ? "sent" : "failed",
      error_message: send.success ? null : send.error?.slice(0, 500),
      metadata: { business_id: biz.id, campaign_id: campaign.id },
    });

    if (send.success) {
      sent++;
      await supabase
        .from("campaign_sends")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
          message_id: idempotencyKey,
          failure_reason: null,
        })
        .eq("id", row.id);
    } else {
      failed++;
      await supabase
        .from("campaign_sends")
        .update({ status: "failed", failure_reason: (send.error || "send_failed").slice(0, 500) })
        .eq("id", row.id);
    }
  }

  await refreshCounters(supabase, campaign.id);
  await supabase
    .from("campaigns")
    .update({ last_batch_at: new Date().toISOString() })
    .eq("id", campaign.id);
  await finalise(supabase, campaign.id);

  return { sent, failed, suppressed, batch: pending.length };
}

// deno-lint-ignore no-explicit-any
async function refreshCounters(supabase: any, campaignId: string) {
  const counts: Record<string, number> = {};
  for (const status of ["sent", "failed", "suppressed"]) {
    const { count } = await supabase
      .from("campaign_sends")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", campaignId)
      .eq("status", status);
    counts[status] = count ?? 0;
  }
  await supabase
    .from("campaigns")
    .update({
      sent_count: counts.sent,
      failed_count: counts.failed,
      opted_out_count: counts.suppressed,
    })
    .eq("id", campaignId);
}

// deno-lint-ignore no-explicit-any
async function finalise(supabase: any, campaignId: string) {
  const { count } = await supabase
    .from("campaign_sends")
    .select("id", { count: "exact", head: true })
    .eq("campaign_id", campaignId)
    .in("status", ["pending", "sending"]);
  if (!count) {
    await supabase
      .from("campaigns")
      .update({ status: "sent", completed_at: new Date().toISOString() })
      .eq("id", campaignId);
  }
}
