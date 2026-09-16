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
// Cron only.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkCronAuth } from "../_shared/cron-auth.ts";

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

    return new Response(JSON.stringify({ ok: true, reconciled: summary }), {
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
