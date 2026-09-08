import { describe, expect, it, vi } from "vitest";
import {
  SANDBOX_BASE_URL,
  resolveSandboxConfig,
  sandboxUrl,
} from "../../supabase/functions/_shared/tremendous/config";
import { externalIdFor, validateObligation } from "../../supabase/functions/_shared/tremendous/obligation";
import { buildOrderPayload } from "../../supabase/functions/_shared/tremendous/order-payload";
import {
  browserSafeOutcome,
  createSandboxOrder,
  type TransportRequest,
  type TransportResult,
  type TremendousTransport,
  type AttemptStore,
} from "../../supabase/functions/_shared/tremendous/order-client";
import {
  handleWebhookDelivery,
  verifyWebhookSignature,
  type DeduplicationStore,
  type EvidenceStore,
  type RewardEvidence,
} from "../../supabase/functions/_shared/tremendous/webhook";
import { redact, safeErrorMessage } from "../../supabase/functions/_shared/tremendous/redact";
import type {
  ActorContext,
  ConnectionContext,
  RewardObligation,
  SourceRecordContext,
} from "../../supabase/functions/_shared/tremendous/types";

// These tests exercise the real modules in
// supabase/functions/_shared/tremendous/. All provider traffic is a fixture and
// an injected transport: no sandbox or production API was ever called, and no
// recipient exists. Business logic is imported, never re-implemented here.

const RAW_CONFIG = {
  enabled: true,
  environment: "sandbox",
  baseUrl: SANDBOX_BASE_URL,
  credentialKind: "api_key" as const,
  credential: "TEST_fixture-key-not-real",
  campaignId: "CAMPAIGN_APPROVED_FIXTURE",
  businessId: "biz-fixture-1",
  connectionId: "conn-fixture-1",
};

function config() { return { ...RAW_CONFIG }; }

function attemptStore(): AttemptStore {
  const fingerprints = new Map<string, string>();
  return { claim: async ({externalId, fingerprint}) => {
    const prior = fingerprints.get(externalId);
    if (prior && prior !== fingerprint) return "conflict";
    fingerprints.set(externalId, fingerprint);
    return prior ? "same" : "new";
  }};
}

function issue(candidate: RewardObligation, raw: typeof RAW_CONFIG, transport: TremendousTransport, attempts = attemptStore()) {
  return createSandboxOrder(candidate, raw, context(), attempts, transport);
}

const obligation = (over: Partial<RewardObligation> = {}): RewardObligation => ({
  obligationId: "0b6dd21c-7c1f-4d0b-9c9e-2f4f0d0f5a11",
  snapshotVersion: 1,
  sourceKind: "closed_job",
  sourceId: "job-fixture-1",
  businessId: "biz-fixture-1",
  connectionId: "conn-fixture-1",
  programId: "CAMPAIGN_APPROVED_FIXTURE",
  recipientEmail: "referrer.fixture@example.test",
  recipientName: "Fixture Referrer",
  amountMinorUnits: 2500,
  currency: "USD",
  approval: { approvedByUserId: "owner-fixture-1", approvedAt: "2026-09-01T10:00:00Z" },
  ...over,
});

const actor = (over: Partial<ActorContext> = {}): ActorContext => ({
  actorUserId: "owner-fixture-1",
  actorBusinessId: "biz-fixture-1",
  isBusinessOwner: true,
  ...over,
});

const source = (over: Partial<SourceRecordContext> = {}): SourceRecordContext => ({
  sourceKind: "closed_job",
  sourceId: "job-fixture-1",
  businessId: "biz-fixture-1",
  isClosed: true,
  ...over,
});

const connection = (over: Partial<ConnectionContext> = {}): ConnectionContext => ({
  connectionId: "conn-fixture-1",
  businessId: "biz-fixture-1",
  status: "approved",
  approvedProgramIds: ["CAMPAIGN_APPROVED_FIXTURE"],
  ...over,
});

const context = () => ({ actor: actor(), source: source(), connection: connection() });

function recordingTransport(results: TransportResult[] | (() => Promise<TransportResult>)) {
  const requests: TransportRequest[] = [];
  const queue = Array.isArray(results) ? [...results] : null;
  const transport: TremendousTransport = {
    send: async (request) => {
      requests.push(request);
      if (!queue) return await (results as () => Promise<TransportResult>)();
      const next = queue.shift();
      if (!next) throw new Error("no fixture response queued");
      return next;
    },
  };
  return { transport, requests };
}

async function successBody(over: { denomination?: number; currency?: string; email?: string; rewardId?: string } = {}) {
  return {
    order: {
      id: "ORDER_FIXTURE_1",
      status: "EXECUTED",
      external_id: await externalIdFor(obligation()),
      rewards: [
        {
          id: over.rewardId ?? "REWARD_FIXTURE_1",
          order_id: "ORDER_FIXTURE_1",
          value: { denomination: over.denomination ?? 25, currency_code: over.currency ?? "USD" },
          recipient: { name: "Fixture Referrer", email: over.email ?? "referrer.fixture@example.test" },
          delivery: { method: "EMAIL" },
        },
      ],
    },
  };
}

// ---------------------------------------------------------------------------
// Configuration: fail closed before any transport call
// ---------------------------------------------------------------------------

describe("tremendous sandbox config", () => {
  it("is disabled unless explicitly enabled", () => {
    const result = resolveSandboxConfig({ ...RAW_CONFIG, enabled: false });
    expect(result.ok).toBe(false);
    expect(result).toMatchObject({ ok: false, code: "disabled" });

  });

  it("rejects a production environment and a production host", () => {
    expect(resolveSandboxConfig({ ...RAW_CONFIG, environment: "production" })).toMatchObject({
      ok: false,
      code: "non_sandbox_environment",
    });
    expect(
      resolveSandboxConfig({ ...RAW_CONFIG, baseUrl: "https://api.tremendous.com/api/v2/" }),
    ).toMatchObject({ ok: false, code: "non_sandbox_host" });
  });

  it("rejects known production API key prefixes but does not require a prefix for OAuth tokens", () => {
    expect(resolveSandboxConfig({ ...RAW_CONFIG, credential: "PROD_abcdefgh" })).toMatchObject({
      ok: false,
      code: "production_credential_prefix",
    });
    expect(resolveSandboxConfig({ ...RAW_CONFIG, credential: "not-prefixed" })).toMatchObject({
      ok: false,
      code: "invalid_sandbox_api_key_prefix",
    });
    expect(
      resolveSandboxConfig({ ...RAW_CONFIG, credentialKind: "oauth_access_token", credential: "opaque-oauth-token" }),
    ).toMatchObject({ ok: true });
  });

  it("requires an explicitly approved campaign and only the BALANCE funding source", () => {
    expect(resolveSandboxConfig({ ...RAW_CONFIG, campaignId: "" })).toMatchObject({
      ok: false,
      code: "missing_campaign",
    });
    expect(resolveSandboxConfig({ ...RAW_CONFIG, fundingSourceId: "INVOICE" })).toMatchObject({
      ok: false,
      code: "unsupported_funding_source",
    });
  });

  it("allows only sandbox base paths, never arbitrary hosts", () => {
    expect(sandboxUrl("orders")).toEqual({ ok: true, url: `${SANDBOX_BASE_URL}orders` });
    expect(sandboxUrl("https://evil.example.com/orders").ok).toBe(false);
    expect(sandboxUrl("../../admin").ok).toBe(false);
  });

  it("makes zero transport calls when disabled or pointed at production", async () => {
    const { transport, requests } = recordingTransport([]);
    const send = vi.spyOn(transport, "send");
    for (const raw of [
      { ...RAW_CONFIG, enabled: false },
      { ...RAW_CONFIG, environment: "production" },
      { ...RAW_CONFIG, baseUrl: "https://api.tremendous.com/api/v2/" },
    ]) {
      const resolved = resolveSandboxConfig(raw);
      expect(resolved.ok).toBe(false);
      await expect(createSandboxOrder(obligation(), raw, context(), attemptStore(), transport)).resolves.toMatchObject({kind: "rejected"});
    }
    expect(send).not.toHaveBeenCalled();
    expect(requests).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Obligation validation
// ---------------------------------------------------------------------------

describe("reward obligation validation", () => {
  it("accepts a coherent, approved obligation", () => {
    expect(validateObligation(obligation(), context()).ok).toBe(true);
  });

  it("rejects actor, business, source and connection mismatches", () => {
    const cases: Array<[ReturnType<typeof context>, string]> = [
      [{ ...context(), actor: actor({ isBusinessOwner: false }) }, "actor_not_owner"],
      [{ ...context(), actor: actor({ actorBusinessId: "biz-other" }) }, "actor_business_mismatch"],
      [{ ...context(), source: source({ businessId: "biz-other" }) }, "business_mismatch"],
      [{ ...context(), source: source({ sourceId: "job-other" }) }, "source_mismatch"],
      [{ ...context(), source: source({ isClosed: false }) }, "source_not_closed"],
      [{ ...context(), connection: connection({ connectionId: "conn-other" }) }, "connection_mismatch"],
      [{ ...context(), connection: connection({ status: "pending" }) }, "connection_not_approved"],
      [{ ...context(), connection: connection({ approvedProgramIds: ["OTHER"] }) }, "program_not_approved"],
    ];
    for (const [ctx, code] of cases) {
      expect(validateObligation(obligation(), ctx)).toMatchObject({ ok: false, code });
    }
  });

  it("rejects missing currency and invalid amounts", () => {
    expect(validateObligation(obligation({ currency: undefined as never }), context())).toMatchObject({
      ok: false,
      code: "missing_currency",
    });
    expect(validateObligation(obligation({ currency: "CAD" as never }), context())).toMatchObject({
      ok: false,
      code: "unsupported_currency",
    });
    for (const amount of [0, -2500, 25.5, Number.NaN]) {
      expect(validateObligation(obligation({ amountMinorUnits: amount }), context())).toMatchObject({
        ok: false,
        code: "invalid_amount",
      });
    }
  });

  it("treats a closed job without explicit approval as a candidate only", () => {
    expect(validateObligation(obligation({ approval: null }), context())).toMatchObject({
      ok: false,
      code: "not_approved_for_issuance",
    });
  });

  it("keeps one opaque external ID across snapshot changes and separates businesses", async () => {
    expect(await externalIdFor(obligation({snapshotVersion: 2}))).toBe(await externalIdFor(obligation()));
    expect(await externalIdFor(obligation({businessId: "biz-other"}))).not.toBe(await externalIdFor(obligation()));
  });
});

// ---------------------------------------------------------------------------
// Order payload + provider contract
// ---------------------------------------------------------------------------

describe("sandbox order payload and provider contract", () => {
  it("builds one email reward from the approved campaign with minor-unit conversion", async () => {
    const resolved = resolveSandboxConfig(config());
    if (!resolved.ok) throw new Error("fixture configuration failed");
    const payload = await buildOrderPayload(obligation(), resolved.value);
    expect(payload).toEqual({
      external_id: await externalIdFor(obligation()),
      payment: { funding_source_id: "BALANCE" },
      reward: {
        campaign_id: "CAMPAIGN_APPROVED_FIXTURE",
        value: { denomination: 25, currency_code: "USD" },
        recipient: { name: "Fixture Referrer", email: "referrer.fixture@example.test" },
        delivery: { method: "EMAIL" },
      },
    });
  });

  it("treats 200 as issued and 201 as a replay of the same external ID", async () => {
    const created = recordingTransport([{ kind: "response", status: 200, json: await successBody() }]);
    await expect(issue(obligation(), config(), created.transport)).resolves.toMatchObject({
      kind: "issued",
      evidence: { orderId: "ORDER_FIXTURE_1", rewardId: "REWARD_FIXTURE_1", replay: false },
    });
    expect(created.requests[0].url).toBe(`${SANDBOX_BASE_URL}orders`);
    expect(created.requests[0].redirect).toBe("error");

    const replay = recordingTransport([{ kind: "response", status: 201, json: await successBody() }]);
    await expect(issue(obligation(), config(), replay.transport)).resolves.toMatchObject({
      kind: "replayed",
      evidence: { replay: true },
    });
  });

  it("does not accept a malformed success as receipt", async () => {
    const cases = [
      {},
      { order: { id: "ORDER_FIXTURE_1", external_id: "wrong-id", rewards: [] } },
      await successBody({ denomination: 50 }),
      await successBody({ currency: "CAD" }),
      await successBody({ email: "someone.else@example.test" }),
      await successBody({ rewardId: "" }),
    ];
    for (const json of cases) {
      await expect(
        issue(obligation(), config(), recordingTransport([{ kind: "response", status: 200, json }]).transport),
      ).resolves.toMatchObject({ kind: "reconciliation_required", reason: "malformed_success" });
    }
  });

  it("maps 409 to a payload conflict and 402 to insufficient funds", async () => {
    await expect(
      issue(obligation(), config(), recordingTransport([{ kind: "response", status: 409, json: {} }]).transport),
    ).resolves.toMatchObject({ kind: "payload_conflict", requiresReconciliation: true });
    await expect(
      issue(obligation(), config(), recordingTransport([{ kind: "response", status: 402, json: {} }]).transport),
    ).resolves.toMatchObject({ kind: "insufficient_funds", requiresFunding: true });
  });

  it("reconciles a timeout with the same external ID and never mints a new one", async () => {
    const first = recordingTransport([{ kind: "timeout" }]);
    const timedOut = await issue(obligation(), config(), first.transport);
    expect(timedOut).toMatchObject({ kind: "reconciliation_required", reason: "timeout" });

    const externalId = timedOut.kind === "reconciliation_required" ? timedOut.externalId : "";
    const retry = recordingTransport([{ kind: "response", status: 201, json: await successBody() }]);
    const reconciled = await issue(obligation(), config(), retry.transport);
    expect(reconciled).toMatchObject({ kind: "replayed" });
    expect(reconciled.kind === "replayed" && reconciled.evidence.externalId).toBe(externalId);
    expect(JSON.parse(retry.requests[0].body ?? "{}").external_id).toBe(externalId);
  });

  it("reconciles an ambiguous thrown transport failure instead of retrying blindly", async () => {
    const { transport } = recordingTransport(async () => {
      throw new Error("socket hang up while calling Bearer TEST_fixture-key-not-real");
    });
    const outcome = await issue(obligation(), config(), transport);
    expect(outcome).toMatchObject({ kind: "reconciliation_required", reason: "timeout" });
    expect(JSON.stringify(outcome)).not.toContain("TEST_fixture-key-not-real");
  });

  it("keeps credentials and reward links out of browser-safe results", () => {
    const safe = browserSafeOutcome({
      kind: "rejected",
      code: "invalid_path",
      message: "Bearer TEST_fixture-key-not-real failed for https://testflight.tremendous.com/rewards/abc123",
    });
    const serialized = JSON.stringify(safe);
    expect(serialized).not.toContain("TEST_fixture-key-not-real");
    expect(serialized).not.toContain("/rewards/abc123");
    expect(redact("sha256=deadbeefdeadbeef")).toBe("[redacted]");
    const opaqueSecret = "opaque-oauth-credential-with-no-known-prefix";
    const safeMessage = safeErrorMessage(new Error(`Provider failed: ${opaqueSecret} https://arbitrary.example/redeem/private-token`));
    expect(safeMessage).toBe("Tremendous sandbox request failed. The result may require reconciliation.");
    expect(safeMessage).not.toContain(opaqueSecret);
    expect(safeMessage).not.toContain("private-token");
  });
});

// ---------------------------------------------------------------------------
// Webhook verification and projection
// ---------------------------------------------------------------------------

const SECRET = "fixture-webhook-signing-key";

async function sign(rawBody: string, secret = SECRET) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody));
  return `sha256=${Array.from(new Uint8Array(mac)).map((b) => b.toString(16).padStart(2, "0")).join("")}`;
}

// A fake store demonstrates handler logic only. Durable atomic processing, an
// outbox/attempt ledger, tenant binding and server auth are still required.
function fakeStores() {
  const seen = new Set<string>();
  const evidence = new Map<string, RewardEvidence>();
  const applied: Array<{ rewardId: string; evidence: RewardEvidence }> = [];
  const dedupe: DeduplicationStore = {
    seen: async (id) => seen.has(id),
    record: async (id) => void seen.add(id),
  };
  const store: EvidenceStore = {
    get: async (rewardId) => evidence.get(rewardId) ?? null,
    apply: async (rewardId, next) => {
      evidence.set(rewardId, next);
      applied.push({ rewardId, evidence: next });
    },
  };
  return { dedupe, evidence: store, applied, rows: evidence };
}

const event = (over: Record<string, unknown> = {}) =>
  JSON.stringify({
    uuid: "3f1a6b8c-9d2e-4f0a-8b7c-1d2e3f4a5b6c",
    created_utc: "2026-09-05T12:00:00Z",
    event: "REWARDS.DELIVERY.SUCCEEDED",
    payload: { resource: { id: "REWARD_FIXTURE_1", type: "rewards" } },
    ...over,
  });

describe("tremendous webhook handling", () => {
  it("verifies the signature against the raw body only", async () => {
    const rawBody = event();
    const header = await sign(rawBody);
    await expect(verifyWebhookSignature({ rawBody, signatureHeader: header, secret: SECRET })).resolves.toEqual({ ok: true });

    // Re-serializing changes the bytes and must fail.
    const reserialized = JSON.stringify(JSON.parse(rawBody), null, 2);
    expect((await verifyWebhookSignature({ rawBody: reserialized, signatureHeader: header, secret: SECRET })).ok).toBe(false);
  });

  it("rejects missing, malformed and wrong-key signatures", async () => {
    const rawBody = event();
    for (const signatureHeader of [null, "", "md5=abc", "sha256=nothex", `sha256=${"a".repeat(63)}`]) {
      expect((await verifyWebhookSignature({ rawBody, signatureHeader, secret: SECRET })).ok).toBe(false);
    }
    const wrongKey = await sign(rawBody, "another-key");
    expect((await verifyWebhookSignature({ rawBody, signatureHeader: wrongKey, secret: SECRET })).ok).toBe(false);
  });

  it("ignores duplicate deliveries without repeating side effects", async () => {
    const stores = fakeStores();
    const rawBody = event();
    const signatureHeader = await sign(rawBody);
    const deps = { secret: SECRET, dedupe: stores.dedupe, evidence: stores.evidence };

    await expect(handleWebhookDelivery({ rawBody, signatureHeader }, deps)).resolves.toMatchObject({ kind: "applied" });
    await expect(handleWebhookDelivery({ rawBody, signatureHeader }, deps)).resolves.toMatchObject({
      kind: "duplicate_ignored",
    });
    expect(stores.applied).toHaveLength(1);
  });

  it("does not let a delayed event overwrite newer evidence", async () => {
    const stores = fakeStores();
    const deps = { secret: SECRET, dedupe: stores.dedupe, evidence: stores.evidence };

    const newer = event({ uuid: "11111111-1111-4111-8111-111111111111", created_utc: "2026-09-06T12:00:00Z" });
    await handleWebhookDelivery({ rawBody: newer, signatureHeader: await sign(newer) }, deps);

    const delayed = event({
      uuid: "22222222-2222-4222-8222-222222222222",
      created_utc: "2026-09-04T12:00:00Z",
      event: "REWARDS.DELIVERY.FAILED",
    });
    await expect(
      handleWebhookDelivery({ rawBody: delayed, signatureHeader: await sign(delayed) }, deps),
    ).resolves.toMatchObject({ kind: "stale_ignored" });
    expect(stores.rows.get("REWARD_FIXTURE_1")).toEqual({
      observedAt: "2026-09-06T12:00:00Z",
      state: "delivery_succeeded",
      delivery: { observedAt: "2026-09-06T12:00:00Z", state: "delivery_succeeded" },
    });
  });

  it("flags fraud, cancellation and unknown events for reconciliation without fabricating redemption", async () => {
    const deps = () => {
      const stores = fakeStores();
      return { secret: SECRET, dedupe: stores.dedupe, evidence: stores.evidence };
    };
    const flagged = event({ uuid: "33333333-3333-4333-8333-333333333333", event: "REWARDS.FLAGGED" });
    await expect(
      handleWebhookDelivery({ rawBody: flagged, signatureHeader: await sign(flagged) }, deps()),
    ).resolves.toMatchObject({ kind: "needs_reconciliation" });

    const unknown = event({ uuid: "44444444-4444-4444-8444-444444444444", event: "REWARDS.TELEPORTED" });
    const result = await handleWebhookDelivery({ rawBody: unknown, signatureHeader: await sign(unknown) }, deps());
    expect(result).toMatchObject({ kind: "needs_reconciliation" });
    expect(JSON.stringify(result)).not.toMatch(/redeem|cashed/i);
  });

  it("rejects malformed bodies and envelopes", async () => {
    const deps = { secret: SECRET, ...fakeStores() };
    for (const rawBody of [
      "not json",
      "[]",
      JSON.stringify({ id: "not-a-uuid", created_at: "2026-09-05T12:00:00Z", event: "ORDERS.CREATED" }),
      JSON.stringify({ id: "3f1a6b8c-9d2e-4f0a-8b7c-1d2e3f4a5b6c", created_at: "nope", event: "ORDERS.CREATED" }),
      JSON.stringify({ id: "3f1a6b8c-9d2e-4f0a-8b7c-1d2e3f4a5b6c", created_at: "2026-09-05T12:00:00Z" }),
    ]) {
      await expect(
        handleWebhookDelivery({ rawBody, signatureHeader: await sign(rawBody) }, deps),
      ).resolves.toMatchObject({ kind: "rejected" });
    }
  });
});
