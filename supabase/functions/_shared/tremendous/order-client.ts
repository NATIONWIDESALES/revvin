// Sandbox order adapter.
//
// The HTTP transport is INJECTED. There is no default fetch here, redirects are
// not permitted, and only the sandbox base URL is reachable. A successful HTTP
// status is treated as issuance evidence only: it is never treated as delivery
// to, or redemption by, the recipient.

import { type SandboxConfig, type RawSandboxConfig, resolveSandboxConfig, sandboxUrl } from "./config.ts";
import { buildOrderPayload, type OrderPayload } from "./order-payload.ts";
import { denominationFromMinorUnits, externalIdFor, sha256Hex, validateObligation, type ObligationContext } from "./obligation.ts";
import { redactValue } from "./redact.ts";
import type { RewardObligation } from "./types.ts";

export interface TransportRequest {
  url: string;
  method: "POST" | "GET";
  headers: Record<string, string>;
  body?: string;
  /** Transports must not follow redirects. */
  redirect: "error";
}

export type TransportResult =
  | { kind: "response"; status: number; json: unknown }
  | { kind: "timeout" };

export interface TremendousTransport {
  send(request: TransportRequest): Promise<TransportResult>;
}

/**
 * Required attempt fingerprint gate. A durable implementation must compare and
 * reserve in one transaction. A fake fixture store establishes no deployed
 * concurrency or crash guarantees. Retries of one fingerprint reuse its ID.
 */
export interface AttemptStore {
  claim(attempt: { externalId: string; fingerprint: string }): Promise<"new" | "same" | "conflict">;
}

export interface IssuanceEvidence {
  externalId: string;
  orderId: string;
  rewardId: string;
  /** True when the provider replayed a previously created order (HTTP 201). */
  replay: boolean;
}

export type OrderOutcome =
  | { kind: "issued"; evidence: IssuanceEvidence }
  | { kind: "replayed"; evidence: IssuanceEvidence }
  | { kind: "payload_conflict"; externalId: string; requiresReconciliation: true; message: string }
  | { kind: "insufficient_funds"; externalId: string; requiresFunding: true; message: string }
  | { kind: "reconciliation_required"; externalId: string; reason: "timeout" | "malformed_success" | "provider_error"; status?: number; message: string }
  | { kind: "rejected"; code: string; message: string };

const ID = /^[A-Za-z0-9_-]{3,64}$/;

function authHeaders(config: SandboxConfig): Record<string, string> {
  return {
    Authorization: `Bearer ${config.credential}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

/**
 * Single issuing entry point. Runtime configuration, authority and immutable
 * request binding are checked here before the injected transport can run.
 * Context/configuration must be resolved by future authenticated server code;
 * these identifier fields do not provide authentication by themselves.
 */
export async function createSandboxOrder(
  obligation: RewardObligation,
  rawConfig: RawSandboxConfig,
  context: ObligationContext,
  attempts: AttemptStore,
  transport: TremendousTransport,
): Promise<OrderOutcome> {
  const resolved = resolveSandboxConfig(rawConfig);
  if (resolved.ok === false) {
    return { kind: "rejected", code: resolved.code, message: resolved.message };
  }
  const config = resolved.value;
  const validated = validateObligation(obligation, context);
  if (validated.ok === false) {
    return { kind: "rejected", code: validated.code, message: validated.message };
  }
  if (config.businessId !== obligation.businessId || config.connectionId !== obligation.connectionId ||
      config.businessId !== context.connection.businessId || config.connectionId !== context.connection.connectionId ||
      config.campaignId !== obligation.programId) {
    return { kind: "rejected", code: "config_binding_mismatch", message: "Configuration does not match the approved business, connection and program." };
  }
  if (!attempts || typeof attempts.claim !== "function" || !transport || typeof transport.send !== "function") {
    return { kind: "rejected", code: "missing_dependencies", message: "An attempt gate and explicit transport are required." };
  }
  // Copy the approved snapshot before the first await so outside mutation cannot
  // change the payload after validation or while reserving its fingerprint.
  const snapshot: RewardObligation = { ...obligation, approval: obligation.approval ? { ...obligation.approval } : null };
  const externalId = await externalIdFor(snapshot);
  const target = sandboxUrl("orders");
  if (target.ok === false) {
    return { kind: "rejected", code: "invalid_path", message: target.message };
  }
  const payload = await buildOrderPayload(snapshot, config);
  const fingerprint = await sha256Hex(JSON.stringify({
    version: snapshot.snapshotVersion,
    businessId: snapshot.businessId,
    connectionId: snapshot.connectionId,
    sourceKind: snapshot.sourceKind,
    sourceId: snapshot.sourceId,
    approval: {
      approvedByUserId: snapshot.approval!.approvedByUserId,
      approvedAt: snapshot.approval!.approvedAt,
    },
    payload,
  }));
  let claim: "new" | "same" | "conflict";
  try {
    claim = await attempts.claim({ externalId, fingerprint });
  } catch {
    return { kind: "rejected", code: "attempt_gate_unavailable", message: "The reward attempt could not be verified. No provider request was made." };
  }
  if (claim === "conflict") {
    return { kind: "payload_conflict", externalId, requiresReconciliation: true, message: "An earlier attempt used a different approved snapshot. Reconciliation is required." };
  }
  if (claim !== "new" && claim !== "same") {
    return { kind: "rejected", code: "invalid_attempt_gate_result", message: "The reward attempt could not be verified. No provider request was made." };
  }

  let result: TransportResult;
  try {
    result = await transport.send({
      url: target.url,
      method: "POST",
      headers: authHeaders(config),
      body: JSON.stringify(payload),
      redirect: "error",
    });
  } catch {
    // An ambiguous failure must be reconciled with the SAME external_id.
    return {
      kind: "reconciliation_required",
      externalId,
      reason: "timeout",
      message: "Sandbox order result is unknown and must be reconciled.",
    };
  }

  if (result.kind === "timeout") {
    return {
      kind: "reconciliation_required",
      externalId,
      reason: "timeout",
      message: "Sandbox order timed out. Reconcile using the same external ID.",
    };
  }

  if (result.status === 200 || result.status === 201) {
    const verified = verifyOrderResponse(result.json, snapshot, payload);
    if (!verified.ok) {
      return {
        kind: "reconciliation_required",
        externalId,
        reason: "malformed_success",
        status: result.status,
        message: (verified as { message?: string }).message ?? "Provider success response failed verification.",
      };
    }
    const evidence: IssuanceEvidence = { ...verified.value, replay: result.status === 201 };
    return result.status === 201 ? { kind: "replayed", evidence } : { kind: "issued", evidence };
  }

  if (result.status === 409) {
    return {
      kind: "payload_conflict",
      externalId,
      requiresReconciliation: true,
      message: "The provider already holds a different order for this external ID.",
    };
  }

  if (result.status === 402) {
    return {
      kind: "insufficient_funds",
      externalId,
      requiresFunding: true,
      message: "The connected organization's balance is insufficient for this order.",
    };
  }

  return {
    kind: "reconciliation_required",
    externalId,
    reason: "provider_error",
    status: result.status,
    message: "Unexpected provider response. Reconcile using the same external ID.",
  };
}

/** Require valid order/reward IDs and details that match what we asked for. */
export function verifyOrderResponse(
  json: unknown,
  obligation: RewardObligation,
  payload: OrderPayload,
):
  | { ok: true; value: { externalId: string; orderId: string; rewardId: string } }
  | { ok: false; message: string } {
  const order = (json as { order?: Record<string, unknown> } | null)?.order;
  if (!order || typeof order !== "object") {
    return { ok: false, message: "Provider success response contained no order." };
  }
  if (order.status !== "EXECUTED") {
    return { ok: false, message: "Provider order has not been confirmed as executed." };
  }
  const orderId = order.id;
  if (typeof orderId !== "string" || !ID.test(orderId)) {
    return { ok: false, message: "Provider success response contained no valid order ID." };
  }
  if (order.external_id !== payload.external_id) {
    return { ok: false, message: "Provider order external ID did not match the request." };
  }

  const rewards = Array.isArray(order.rewards) ? (order.rewards as Record<string, unknown>[]) : [];
  if (rewards.length !== 1) {
    return { ok: false, message: "Provider order did not contain exactly one reward." };
  }
  const reward = rewards[0] ?? {};
  const rewardId = reward.id;
  if (typeof rewardId !== "string" || !ID.test(rewardId)) {
    return { ok: false, message: "Provider reward ID was missing or invalid." };
  }
  if (reward.order_id !== orderId) {
    return { ok: false, message: "Provider reward was not bound to the expected order." };
  }
  if (reward.campaign_id !== undefined && reward.campaign_id !== payload.reward.campaign_id) {
    return { ok: false, message: "Provider reward campaign did not match the approved program." };
  }
  const value = reward.value as { denomination?: unknown; currency_code?: unknown } | undefined;
  if (!value || value.denomination !== denominationFromMinorUnits(obligation.amountMinorUnits)) {
    return { ok: false, message: "Provider reward amount did not match the approved obligation." };
  }
  if (value.currency_code !== obligation.currency) {
    return { ok: false, message: "Provider reward currency did not match the approved obligation." };
  }
  const recipient = reward.recipient as { email?: unknown } | undefined;
  if (!recipient || recipient.email !== obligation.recipientEmail) {
    return { ok: false, message: "Provider reward recipient did not match the approved obligation." };
  }
  const delivery = reward.delivery as { method?: unknown } | undefined;
  if (!delivery || delivery.method !== "EMAIL") {
    return { ok: false, message: "Provider reward delivery method was not email." };
  }

  return { ok: true, value: { externalId: payload.external_id, orderId, rewardId } };
}

/** Browser-safe projection of an outcome: no credentials, no reward links. */
export function browserSafeOutcome(outcome: OrderOutcome): unknown {
  return redactValue(outcome);
}
