// Sandbox order adapter.
//
// The HTTP transport is INJECTED. There is no default fetch here, redirects are
// not permitted, and only the sandbox base URL is reachable. A successful HTTP
// status is treated as issuance evidence only: it is never treated as delivery
// to, or redemption by, the recipient.

import { type SandboxConfig, sandboxUrl } from "./config.ts";
import { buildOrderPayload, type OrderPayload } from "./order-payload.ts";
import { denominationFromMinorUnits, externalIdFor } from "./obligation.ts";
import { redactValue, safeErrorMessage } from "./redact.ts";
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
 * Create one email reward order for an already-validated obligation.
 * Callers must run `validateObligation` first; this adapter re-derives the
 * external ID from the immutable snapshot so retries cannot mint a new one.
 */
export async function createSandboxOrder(
  obligation: RewardObligation,
  config: SandboxConfig,
  transport: TremendousTransport,
): Promise<OrderOutcome> {
  const externalId = externalIdFor(obligation);
  const target = sandboxUrl("orders");
  if (!target.ok) {
    return { kind: "rejected", code: "invalid_path", message: target.message };
  }
  const payload = buildOrderPayload(obligation, config);

  let result: TransportResult;
  try {
    result = await transport.send({
      url: target.url,
      method: "POST",
      headers: authHeaders(config),
      body: JSON.stringify(payload),
      redirect: "error",
    });
  } catch (error) {
    // An ambiguous failure must be reconciled with the SAME external_id.
    return {
      kind: "reconciliation_required",
      externalId,
      reason: "timeout",
      message: safeErrorMessage(error, "Sandbox order result is unknown and must be reconciled."),
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
    const verified = verifyOrderResponse(result.json, obligation, payload);
    if (!verified.ok) {
      return {
        kind: "reconciliation_required",
        externalId,
        reason: "malformed_success",
        status: result.status,
        message: verified.message,
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
