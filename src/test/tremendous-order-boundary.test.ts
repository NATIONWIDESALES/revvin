import { describe, expect, it, vi } from "vitest";
import { SANDBOX_BASE_URL, type RawSandboxConfig } from "../../supabase/functions/_shared/tremendous/config";
import { createSandboxOrder, type AttemptStore, type TransportRequest, type TremendousTransport } from "../../supabase/functions/_shared/tremendous/order-client";
import { externalIdFor, type ObligationContext } from "../../supabase/functions/_shared/tremendous/obligation";
import type { RewardObligation } from "../../supabase/functions/_shared/tremendous/types";

// These are isolated contract checks, not calls to Tremendous or proof of
// durable storage. Calling the issuing function directly tests its own gates.
function fixture() {
  const obligation: RewardObligation = {
    obligationId: "obligation-fixture-123", snapshotVersion: 1,
    sourceKind: "closed_job", sourceId: "job-1", businessId: "business-1",
    connectionId: "connection-1", programId: "CAMPAIGN_1",
    recipientEmail: "referrer@example.test", recipientName: "Fixture Referrer",
    amountMinorUnits: 50000, currency: "USD",
    approval: { approvedByUserId: "owner-1", approvedAt: "2026-09-08T12:00:00Z" },
  };
  const config: RawSandboxConfig = {
    enabled: true, environment: "sandbox", baseUrl: SANDBOX_BASE_URL,
    credentialKind: "oauth_access_token", credential: "opaque-fixture-only",
    businessId: "business-1", connectionId: "connection-1", campaignId: "CAMPAIGN_1",
  };
  const context: ObligationContext = {
    actor: { actorUserId: "owner-1", actorBusinessId: "business-1", isBusinessOwner: true },
    source: { sourceKind: "closed_job", sourceId: "job-1", businessId: "business-1", isClosed: true },
    connection: { businessId: "business-1", connectionId: "connection-1", status: "approved", approvedProgramIds: ["CAMPAIGN_1"] },
  };
  const map = new Map<string, string>();
  const attempts: AttemptStore = { claim: vi.fn(async ({ externalId, fingerprint }) => {
    if (map.has(externalId)) return map.get(externalId) === fingerprint ? "same" : "conflict";
    map.set(externalId, fingerprint);
    return "new";
  }) };
  const transport: TremendousTransport = { send: vi.fn(async (request: TransportRequest) => {
    const payload = JSON.parse(request.body!);
    return { kind: "response" as const, status: 200, json: { order: {
      id: "ORDER_1", status: "EXECUTED", external_id: payload.external_id,
      rewards: [{ id: "REWARD_1", order_id: "ORDER_1", campaign_id: payload.reward.campaign_id,
        value: payload.reward.value, recipient: payload.reward.recipient, delivery: payload.reward.delivery }],
    } } };
  }) };
  const issue = () => createSandboxOrder(obligation, config, context, attempts, transport);
  return { obligation, config, context, attempts, transport, issue };
}

describe("issuing boundary guards", () => {
  it("blocks direct calls with invalid authority, approval, amount or connection before reserving or sending", async () => {
    const changes: Array<(f: ReturnType<typeof fixture>) => void> = [
      f => { f.context.actor.isBusinessOwner = false; },
      f => { f.context.source.businessId = "other-business"; },
      f => { f.context.source.isClosed = false; },
      f => { f.context.connection.status = "revoked"; },
      f => { f.obligation.approval = null; },
      f => { f.obligation.approval!.approvedByUserId = "other-owner"; },
      f => { f.obligation.approval!.approvedAt = "invalid-date"; },
      f => { f.obligation.amountMinorUnits = 100.5; },
      f => { f.obligation.currency = "CAD" as never; },
      f => { f.obligation.recipientName = {} as never; },
      f => { f.config.businessId = "other-business"; },
      f => { f.config.connectionId = "other-connection"; },
      f => { f.config.campaignId = "OTHER_CAMPAIGN"; },
      f => { f.config.enabled = false; },
      f => { f.config.environment = "production"; },
      f => { f.config.baseUrl = "https://api.tremendous.com/api/v2/"; },
      f => { f.config.credential = "PROD_fixture-only"; },
    ];
    for (const change of changes) {
      const f = fixture(); change(f);
      expect(await f.issue()).toMatchObject({ kind: "rejected" });
      expect(f.attempts.claim).not.toHaveBeenCalled();
      expect(f.transport.send).not.toHaveBeenCalled();
    }
  });

  it("keeps one external ID and rejects changed approved snapshots after the first attempt", async () => {
    for (const change of [
      (f: ReturnType<typeof fixture>) => { f.obligation.snapshotVersion++; },
      (f: ReturnType<typeof fixture>) => { f.obligation.amountMinorUnits++; },
      (f: ReturnType<typeof fixture>) => { f.obligation.recipientEmail = "changed@example.test"; },
    ]) {
      const f = fixture();
      const initialId = await externalIdFor(f.obligation);
      expect(await f.issue()).toMatchObject({ kind: "issued" });
      change(f);
      expect(await externalIdFor(f.obligation)).toBe(initialId);
      expect(await f.issue()).toMatchObject({ kind: "payload_conflict", externalId: initialId });
      expect(f.transport.send).toHaveBeenCalledTimes(1);
    }
  });

  it("reuses the request identity for ambiguous retries without exposing thrown secrets", async () => {
    const f = fixture();
    const requests: TransportRequest[] = [];
    f.transport.send = vi.fn(async request => {
      requests.push(request);
      throw new Error("opaque-fixture-only https://reward.example.test/private-redemption");
    });
    const first = await f.issue();
    const second = await f.issue();
    expect(first).toMatchObject({ kind: "reconciliation_required", reason: "timeout" });
    expect(second).toEqual(first);
    expect(requests[0].body).toBe(requests[1].body);
    expect(JSON.stringify(first)).not.toContain("opaque-fixture-only");
    expect(JSON.stringify(first)).not.toContain("private-redemption");
  });

  it("requires a working attempt gate before any provider request", async () => {
    const f = fixture();
    f.attempts.claim = vi.fn(async () => { throw new Error("private storage failure"); });
    expect(await f.issue()).toMatchObject({ kind: "rejected", code: "attempt_gate_unavailable" });
    expect(f.transport.send).not.toHaveBeenCalled();
  });

  it("copies the approved amount and recipient before asynchronous work", async () => {
    const f = fixture();
    const result = f.issue();
    f.obligation.amountMinorUnits = 1;
    f.obligation.recipientEmail = "changed@example.test";
    f.obligation.approval!.approvedByUserId = "other-owner";
    expect(await result).toMatchObject({ kind: "issued" });
    const request = vi.mocked(f.transport.send).mock.calls[0][0];
    const payload = JSON.parse(request.body!);
    expect(payload.reward.value.denomination).toBe(500);
    expect(payload.reward.recipient.email).toBe("referrer@example.test");
  });

  it("requires executed provider status, correct order binding and matching campaign", async () => {
    for (const mutate of [
      (order: any) => { order.status = "PENDING SETTLEMENT"; },
      (order: any) => { order.status = "OPEN"; },
      (order: any) => { order.rewards[0].order_id = "OTHER_ORDER"; },
      (order: any) => { order.rewards[0].campaign_id = "OTHER_CAMPAIGN"; },
    ]) {
      const f = fixture();
      const validSend = f.transport.send;
      f.transport.send = vi.fn(async request => {
        const response = await validSend(request);
        if (response.kind === "response") mutate((response.json as any).order);
        return response;
      });
      expect(await f.issue()).toMatchObject({ kind: "reconciliation_required", reason: "malformed_success" });
    }
  });
});
