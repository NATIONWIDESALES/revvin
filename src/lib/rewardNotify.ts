import { supabase } from "@/integrations/supabase/client";

// Fire-and-forget referrer notifications for the payout loop.
//
// Both calls are at-most-once server side (rewards.created_notified_at /
// rewards.paid_notified_at are claimed atomically), so retries and double
// clicks are safe. They never throw: the owner's action must not fail because
// a notification could not be sent.

export async function notifyRewardCreatedForLead(leadId: string) {
  try {
    // trg_autocreate_reward_on_won creates the reward row inside the same
    // transaction as the status update, so it exists by the time we get here.
    const { data } = await supabase
      .from("rewards")
      .select("id")
      .eq("lead_id", leadId)
      .limit(1);
    const rewardId = data?.[0]?.id;
    if (!rewardId) return;
    await supabase.functions.invoke("notify-referrer-reward", {
      body: { reward_id: rewardId, kind: "created" },
    });
  } catch {
    // Silent by design.
  }
}

export async function notifyRewardPaid(rewardId: string) {
  try {
    await supabase.functions.invoke("notify-referrer-reward", {
      body: { reward_id: rewardId, kind: "paid" },
    });
  } catch {
    // Silent by design.
  }
}
