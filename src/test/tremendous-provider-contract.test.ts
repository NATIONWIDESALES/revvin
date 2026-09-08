import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { handleWebhookDelivery, parseWebhookEvent, type RewardEvidence } from "../../supabase/functions/_shared/tremendous/webhook";

// Fixtures follow https://developers.tremendous.com/docs/webhooks-1.
// Signing is independent of the implementation under test. No provider call.
const secret = "contract-fixture-not-a-real-signing-key";
const signature = (raw: string) => `sha256=${createHmac("sha256", secret).update(raw).digest("hex")}`;
function envelope(index: number, event = "REWARDS.DELIVERY.SUCCEEDED", at = "2026-09-08T10:00:00Z", type = "rewards") {
  return JSON.stringify({
    uuid: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
    created_utc: at, event,
    payload: { resource: { id: type === "orders" ? "ORDER_FIXTURE" : "REWARD_FIXTURE", type }, meta: {} },
  });
}
function harness() {
  const seen = new Set<string>();
  const records = new Map<string, RewardEvidence>();
  let writes = 0;
  const deps = {
    secret,
    dedupe: { seen: async (id: string) => seen.has(id), record: async (id: string) => { seen.add(id); } },
    evidence: {
      get: async (id: string) => records.get(id) ?? null,
      apply: async (id: string, value: RewardEvidence) => { writes++; records.set(id, value); },
    },
  };
  return {
    records, writes: () => writes,
    send: (rawBody: string, signatureHeader = signature(rawBody)) => handleWebhookDelivery({ rawBody, signatureHeader }, deps),
  };
}

describe("documented provider webhook contract", () => {
  it("accepts uuid/created_utc/resource envelope and updates the referenced reward once", async () => {
    const h = harness();
    const body = envelope(1);
    expect(await h.send(body)).toMatchObject({ kind: "applied", projected: { rewardId: "REWARD_FIXTURE" } });
    expect(await h.send(body)).toMatchObject({ kind: "duplicate_ignored" });
    expect(h.writes()).toBe(1);
  });
  it("rejects the former invented id/created_at/reward envelope", () => {
    const body = JSON.stringify({ id: "00000000-0000-4000-8000-000000000001", created_at: "2026-09-08T10:00:00Z", event: "REWARDS.DELIVERY.SUCCEEDED", payload: { reward: { id: "REWARD_FIXTURE" } } });
    expect(parseWebhookEvent(body).ok).toBe(false);
  });
  it("does not treat an order reference as a reward or use unrelated metadata IDs", async () => {
    const h = harness();
    expect(await h.send(envelope(2, "ORDERS.CREATED", undefined, "orders"))).toMatchObject({ kind: "needs_reconciliation" });
    expect(await h.send(envelope(3, "REWARDS.DELIVERY.SUCCEEDED", undefined, "orders"))).toMatchObject({ kind: "needs_reconciliation" });
    expect(h.writes()).toBe(0);
  });
  it("keeps fraud review outstanding after a later successful email delivery", async () => {
    const h = harness();
    await h.send(envelope(4, "REWARDS.FLAGGED", "2026-09-08T09:00:00Z"));
    expect(await h.send(envelope(5))).toMatchObject({ kind: "needs_reconciliation" });
    expect(h.records.get("REWARD_FIXTURE")).toMatchObject({ state: "reward_flagged", requiresReconciliation: true, delivery: { state: "delivery_succeeded" }, adverse: { state: "reward_flagged" } });
  });
  it("preserves delayed fraud evidence even after a newer delivery event", async () => {
    const h = harness();
    await h.send(envelope(6));
    expect(await h.send(envelope(7, "REWARDS.FLAGGED", "2026-09-08T09:00:00Z"))).toMatchObject({ kind: "needs_reconciliation" });
    expect(h.records.get("REWARD_FIXTURE")).toMatchObject({ requiresReconciliation: true, delivery: { state: "delivery_succeeded" }, adverse: { state: "reward_flagged" } });
  });
  it("keeps cancellation outstanding after a later successful delivery", async () => {
    const h = harness();
    await h.send(envelope(8, "REWARDS.CANCELED", "2026-09-08T09:00:00Z"));
    await h.send(envelope(9));
    expect(h.records.get("REWARD_FIXTURE")).toMatchObject({ state: "reward_canceled", requiresReconciliation: true });
  });
  it("reconciles contradictory events with the same timestamp rather than guessing order", async () => {
    const h = harness();
    await h.send(envelope(10));
    expect(await h.send(envelope(11, "REWARDS.DELIVERY.FAILED"))).toMatchObject({ kind: "needs_reconciliation" });
  });
  it("refuses a changed body after independent raw-byte signing", async () => {
    const h = harness();
    const body = envelope(12);
    expect(await h.send(`${body}\n`, signature(body))).toMatchObject({ kind: "rejected" });
    expect(h.writes()).toBe(0);
  });
  it("requires reconciliation for unsupported fraud-release events", async () => {
    const h = harness();
    expect(await h.send(envelope(13, "FRAUD_REVIEWS.RELEASED"))).toMatchObject({ kind: "needs_reconciliation" });
    expect(h.writes()).toBe(0);
  });
});
