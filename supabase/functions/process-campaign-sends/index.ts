// Reactivation campaign reconciler.
//
// This function no longer sends email. There is exactly one sender for campaign
// mail: send-campaign enqueues each message into the campaign_emails queue with
// the business's own From, Reply-To and postal footer, and process-email-queue
// is the only thing that hands a message to the provider. Two senders meant a
// recipient could get the same campaign twice, once without the postal address
// the law requires, so the direct send path was removed.
//
// What is left here, and only here:
//   - recount campaign counters from campaign_sends
//   - close a campaign out once nothing is pending or sending
//   - fail rows that never made it out of the queue within 24 hours
//
// It never touches a row the queue worker could still be handling: only rows
// older than the queue's own 24 hour TTL are failed, and no row is ever moved
// into 'sending' or 'sent' here.
//
// Referral launch follow-ups also run here (day 4 and day 10), through the same
// campaign_emails queue, so no second sender or schedule exists.
//
// Cron only.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.97.0";
import { checkCronAuth } from "../_shared/cron-auth.ts";
import { isSuppressed } from "../_shared/outreach.ts";
import { queueLaunchEmail } from "../_shared/launch-send.ts";
import { followupDue, followupEligible, LAUNCH_FOLLOWUPS } from "../_shared/referral-launch.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

/** Campaigns reconciled per run. */
const MAX_CAMPAIGNS = 25;
/** Matches the campaign queue TTL in process-email-queue. */
const STUCK_AFTER_HOURS = 24;

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
    const { data: campaigns, error: scanErr } = await supabase
      .from("campaigns")
      .select("id, status, created_at, started_at")
      .in("status", ["scheduled", "sending"])
      .order("created_at", { ascending: true })
      .limit(MAX_CAMPAIGNS);
    if (scanErr) throw scanErr;

    for (const campaign of campaigns ?? []) {
      summary.push({ campaign_id: campaign.id, ...(await reconcile(supabase, campaign)) });
    }

    const followups = await runLaunchFollowups(supabase);

    return new Response(JSON.stringify({ ok: true, reconciled: summary, followups }), {
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
async function reconcile(supabase: any, campaign: any) {
  const startedAt = new Date(campaign.started_at ?? campaign.created_at).getTime();
  const stuckCutoff = Date.now() - STUCK_AFTER_HOURS * 3600_000;
  let failedStuck = 0;

  // Only rows that are already past the queue's TTL. Anything newer still
  // belongs to the queue worker.
  if (Number.isFinite(startedAt) && startedAt < stuckCutoff) {
    const { data: stuck } = await supabase
      .from("campaign_sends")
      .update({ status: "failed", failure_reason: "not_sent_within_24h" })
      .eq("campaign_id", campaign.id)
      .in("status", ["pending", "sending"])
      .select("id");
    failedStuck = stuck?.length ?? 0;
  }

  const counts: Record<string, number> = {};
  for (const status of ["sent", "failed", "suppressed", "pending", "sending"]) {
    const { count } = await supabase
      .from("campaign_sends")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", campaign.id)
      .eq("status", status);
    counts[status] = count ?? 0;
  }

  const inFlight = counts.pending + counts.sending;
  const update: Record<string, unknown> = {
    sent_count: counts.sent,
    failed_count: counts.failed,
    opted_out_count: counts.suppressed,
  };
  if (inFlight === 0) {
    update.status = "sent";
    update.completed_at = new Date().toISOString();
  }

  const { error } = await supabase.from("campaigns").update(update).eq("id", campaign.id);
  if (error) console.error("[process-campaign-sends] counter update failed", { id: campaign.id, error });

  return { in_flight: inFlight, failed_stuck: failedStuck, counts, closed: inFlight === 0 };
}

/** Launch campaigns checked for due follow-ups per run. */
const MAX_FOLLOWUP_CAMPAIGNS = 10;

// deno-lint-ignore no-explicit-any
async function runLaunchFollowups(supabase: any) {
  const out: Array<Record<string, unknown>> = [];
  const { data: campaigns, error } = await supabase
    .from("campaigns")
    .select("id, business_id, started_at, created_at, followups_enabled, followups_done")
    .eq("kind", "referral_launch")
    .eq("followups_enabled", true)
    .lt("followups_done", 2)
    .lt("started_at", new Date(Date.now() - 4 * 86_400_000).toISOString())
    .gt("started_at", new Date(Date.now() - 60 * 86_400_000).toISOString())
    .order("started_at", { ascending: true })
    .limit(MAX_FOLLOWUP_CAMPAIGNS);
  if (error) { console.error("[process-campaign-sends] follow-up scan failed", error); return out; }

  for (const campaign of campaigns ?? []) {
    const step = followupDue({ started_at: campaign.started_at ?? campaign.created_at, followups_enabled: campaign.followups_enabled, followups_done: campaign.followups_done });
    if (!step) continue;
    out.push({ campaign_id: campaign.id, step, ...(await sendFollowupStep(supabase, campaign, step)) });
  }
  return out;
}

// deno-lint-ignore no-explicit-any
async function sendFollowupStep(supabase: any, campaign: any, step: 1 | 2) {
  const { data: businesses } = await supabase
    .from("businesses")
    .select("id, name, slug, is_disabled, is_published, is_demo, street_address, city, postal_code, country, business_email, offer_amount")
    .eq("id", campaign.business_id)
    .limit(1);
  const business = businesses?.[0];
  const ready = business && !business.is_disabled && business.is_published && business.is_demo !== true && business.slug &&
    ["street_address", "city", "postal_code", "country", "business_email"].every((f) => String(business[f] || "").trim());
  if (!ready) return { skipped: "business_not_ready" };

  const { data: rows, error } = await supabase
    .from("campaign_sends")
    .select("contact_id, recipient_email, step, status, clicked_at, referrer_id, referrers(token)")
    .eq("campaign_id", campaign.id)
    .limit(5000);
  if (error) return { error: "send_rows_failed" };

  const people = new Map<string, any>();
  for (const row of rows ?? []) {
    if (!row.contact_id) continue;
    const p = people.get(row.contact_id) ?? { rows: [] as any[] };
    p.rows.push(row);
    people.set(row.contact_id, p);
  }

  const contactIds = [...people.keys()];
  const contactInfo = new Map<string, any>();
  for (let i = 0; i < contactIds.length; i += 200) {
    const { data: cs } = await supabase.from("referral_contacts").select("id, name, status").in("id", contactIds.slice(i, i + 200));
    for (const c of cs ?? []) contactInfo.set(c.id, c);
  }

  const referrerIds = [...new Set((rows ?? []).map((r: any) => r.referrer_id).filter(Boolean))];
  const referred = new Set<string>();
  if (referrerIds.length) {
    const { data: leads } = await supabase.from("leads").select("referrer_id").eq("business_id", business.id)
      .gte("created_at", campaign.created_at).in("referrer_id", referrerIds).limit(5000);
    for (const l of leads ?? []) referred.add(l.referrer_id);
  }

  const template = LAUNCH_FOLLOWUPS[step - 1];
  let queued = 0, skipped = 0;
  for (const [contactId, p] of people) {
    const first = p.rows.find((r: any) => r.step === 0);
    if (!first?.referrers?.token || !first.recipient_email) { skipped++; continue; }
    let suppressed = false;
    try { suppressed = await isSuppressed(supabase, business.id, first.recipient_email); } catch { skipped++; continue; }
    const eligible = followupEligible(step, {
      firstSendSent: first.status === "sent",
      clicked: p.rows.some((r: any) => r.clicked_at),
      referred: referred.has(first.referrer_id),
      optedOut: (contactInfo.has(contactId) ? String(contactInfo.get(contactId).status || "") : "opted_out").toLowerCase() === "opted_out",
      suppressed,
      stepsAlreadySent: p.rows.map((r: any) => r.step),
    });
    if (!eligible) { skipped++; continue; }
    const result = await queueLaunchEmail(supabase, {
      campaignId: campaign.id, step, business,
      recipient: { contact_id: contactId, name: String(contactInfo.get(contactId)?.name || ""), email: first.recipient_email, referrer_id: first.referrer_id, referrer_token: first.referrers.token },
      subjectTemplate: template.subject, bodyTemplate: template.body,
    });
    if (result.ok) queued++; else skipped++;
  }

  // Marked done even when nobody was eligible; the unique step index keeps a
  // rerun from ever sending the same step twice.
  await supabase.from("campaigns").update({ followups_done: step }).eq("id", campaign.id).eq("followups_done", step - 1);
  return { queued, skipped };
}
