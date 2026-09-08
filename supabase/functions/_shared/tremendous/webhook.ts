// Webhook verification, schema validation and narrow event projection.
//
// IMPORTANT: this module is UNREGISTERED. No webhook endpoint exists, no
// webhook has been created with the provider, and nothing can reach this code
// yet. Deduplication and evidence storage are INJECTED interfaces; the in-memory
// fake used by the tests demonstrates the logic only. Before this can be
// connected, the following are prerequisites and are NOT provided here:
//   - durable, atomic event processing (single transaction per event)
//   - an outbox / delivery attempt ledger
//   - tenant binding (connection -> business) resolved server-side
//   - server authentication and request-level authorization
//
// Signature scheme (verified against the provider docs): the header
// `Tremendous-Webhook-Signature` carries `sha256=` followed by the HMAC-SHA256
// of the RAW request body in hex. Re-serializing the body breaks verification.

import { redact } from "./redact.ts";

export const SIGNATURE_HEADER = "Tremendous-Webhook-Signature";
const SIGNATURE_PREFIX = "sha256=";

export interface DeduplicationStore {
  /** True when this event UUID has already been fully processed. */
  seen(eventId: string): Promise<boolean>;
  /** Record the event UUID as processed. */
  record(eventId: string): Promise<void>;
}

export interface RewardEvidence {
  /** Provider `created_at` of the newest event already applied. */
  observedAt: string;
  state: ProjectedState;
  /** Delivery and adverse evidence are independent; an email cannot clear fraud. */
  delivery?: { state: "delivery_succeeded" | "delivery_failed"; observedAt: string };
  adverse?: { state: "reward_canceled" | "reward_flagged"; observedAt: string };
  requiresReconciliation?: boolean;
}

export interface EvidenceStore {
  get(rewardId: string): Promise<RewardEvidence | null>;
  apply(rewardId: string, evidence: RewardEvidence): Promise<void>;
}

export type ProjectedState =
  | "order_created"
  | "order_approved"
  | "order_canceled"
  | "order_failed"
  | "delivery_succeeded"
  | "delivery_failed"
  | "reward_canceled"
  | "reward_flagged";

export interface WebhookEvent {
  id: string;
  created_at: string;
  event: string;
  payload: Record<string, unknown>;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** HMAC-SHA256 over the raw body, compared in constant time. */
export async function verifyWebhookSignature(input: {
  rawBody: string;
  signatureHeader: string | null | undefined;
  secret: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const header = (input.signatureHeader ?? "").trim();
  if (!header.startsWith(SIGNATURE_PREFIX)) {
    return { ok: false, message: "Webhook signature header was missing or malformed." };
  }
  const received = header.slice(SIGNATURE_PREFIX.length).toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(received)) {
    return { ok: false, message: "Webhook signature was not a valid hex digest." };
  }
  if (!input.secret) {
    return { ok: false, message: "No webhook signing key was supplied." };
  }

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(input.secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const expected = toHex(await crypto.subtle.sign("HMAC", key, encoder.encode(input.rawBody)));

  return constantTimeEqual(expected, received)
    ? { ok: true }
    : { ok: false, message: "Webhook signature did not match the raw request body." };
}

/** Validate the envelope schema. Never trusts unvalidated shapes. */
export function parseWebhookEvent(rawBody: string): { ok: true; value: WebhookEvent } | { ok: false; message: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return { ok: false, message: "Webhook body was not valid JSON." };
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ok: false, message: "Webhook body was not an object." };
  }
  const body = parsed as Record<string, unknown>;
  if (typeof body.uuid !== "string" || !UUID.test(body.uuid)) {
    return { ok: false, message: "Webhook event ID was missing or not a UUID." };
  }
  if (typeof body.created_utc !== "string" || Number.isNaN(Date.parse(body.created_utc))) {
    return { ok: false, message: "Webhook event timestamp was missing or invalid." };
  }
  if (typeof body.event !== "string" || body.event.length === 0) {
    return { ok: false, message: "Webhook event name was missing." };
  }
  const payload = body.payload;
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { ok: false, message: "Webhook payload was missing or malformed." };
  }
  const resource = (payload as Record<string, unknown>).resource;
  if (!resource || typeof resource !== "object" || Array.isArray(resource) ||
      typeof (resource as Record<string, unknown>).id !== "string" ||
      !/^[A-Za-z0-9_-]{3,64}$/.test((resource as Record<string, unknown>).id as string) ||
      typeof (resource as Record<string, unknown>).type !== "string") {
    return { ok: false, message: "Webhook resource reference was missing or malformed." };
  }
  // Normalize the provider's documented uuid/created_utc envelope internally.
  return { ok: true, value: { id: body.uuid, created_at: body.created_utc, event: body.event, payload: payload as Record<string, unknown> } };
}

const STATE_BY_EVENT: Record<string, ProjectedState> = {
  "ORDERS.CREATED": "order_created",
  "ORDERS.APPROVED": "order_approved",
  "ORDERS.CANCELED": "order_canceled",
  "ORDERS.FAILED": "order_failed",
  "REWARDS.DELIVERY.SUCCEEDED": "delivery_succeeded",
  "REWARDS.DELIVERY.FAILED": "delivery_failed",
  "REWARDS.CANCELED": "reward_canceled",
  "REWARDS.FLAGGED": "reward_flagged",
};

/**
 * Events that describe money/fraud outcomes we refuse to interpret optimistically.
 * We never fabricate a redeemed or cashed-out state: the provider does not tell us
 * that here, so these require reconciliation.
 */
const RECONCILE_STATES: ProjectedState[] = ["order_failed", "order_canceled", "reward_canceled", "reward_flagged"];

export interface ProjectedEvent {
  eventId: string;
  observedAt: string;
  state: ProjectedState;
  orderId: string | null;
  rewardId: string | null;
  requiresReconciliation: boolean;
}

export function projectWebhookEvent(
  event: WebhookEvent,
): { ok: true; value: ProjectedEvent } | { ok: false; reason: "unknown_event"; requiresReconciliation: true; message: string } {
  const state = STATE_BY_EVENT[event.event];
  if (!state) {
    return {
      ok: false,
      reason: "unknown_event",
      requiresReconciliation: true,
      message: `Unrecognized provider event requires reconciliation: ${redact(event.event)}`,
    };
  }
  // The provider sends payload.resource, not fabricated payload.reward/order objects.
  const resource = event.payload.resource as { id?: unknown; type?: unknown } | undefined;
  const rewardId = event.event.startsWith("REWARDS.") && resource?.type === "rewards" &&
    typeof resource.id === "string" ? resource.id : null;
  const orderId = event.event.startsWith("ORDERS.") && resource?.type === "orders" &&
    typeof resource.id === "string" ? resource.id : null;
  // Order events cannot safely be projected into a reward without an authoritative
  // order-to-reward lookup. Leave that work to the future reconciliation handler.

  return {
    ok: true,
    value: {
      eventId: event.id,
      observedAt: event.created_at,
      state,
      orderId,
      rewardId,
      requiresReconciliation: RECONCILE_STATES.includes(state) || (!rewardId && !orderId),
    },
  };
}

export type WebhookHandlerResult =
  | { kind: "applied"; projected: ProjectedEvent }
  | { kind: "duplicate_ignored"; eventId: string }
  | { kind: "stale_ignored"; eventId: string; message: string }
  | { kind: "needs_reconciliation"; eventId: string | null; message: string }
  | { kind: "rejected"; message: string };

export interface WebhookHandlerDeps {
  secret: string;
  dedupe: DeduplicationStore;
  evidence: EvidenceStore;
}

/**
 * Verify, validate, project and apply a single webhook delivery.
 * Sequential duplicate events cause no repeated side effect. Delivery evidence
 * stays separate from adverse evidence, including late fraud/cancellation.
 * Before registration, a durable wrapper MUST commit deduplication, evidence
 * and reconciliation queue writes in one transaction; these interfaces alone
 * do not provide concurrency or crash safety.
 */
export async function handleWebhookDelivery(
  input: { rawBody: string; signatureHeader: string | null | undefined },
  deps: WebhookHandlerDeps,
): Promise<WebhookHandlerResult> {
  const signature = await verifyWebhookSignature({
    rawBody: input.rawBody,
    signatureHeader: input.signatureHeader,
    secret: deps.secret,
  });
  if (!signature.ok) return { kind: "rejected", message: (signature as { message?: string }).message ?? "Webhook signature verification failed." };

  const parsed = parseWebhookEvent(input.rawBody);
  if (!parsed.ok) return { kind: "rejected", message: (parsed as { message?: string }).message ?? "Webhook body failed validation." };

  if (await deps.dedupe.seen(parsed.value.id)) {
    return { kind: "duplicate_ignored", eventId: parsed.value.id };
  }

  const projected = projectWebhookEvent(parsed.value);
  if (!projected.ok) {
    await deps.dedupe.record(parsed.value.id);
    return { kind: "needs_reconciliation", eventId: parsed.value.id, message: (projected as { message?: string }).message ?? "Event requires reconciliation." };
  }

  const { rewardId } = projected.value;
  if (!rewardId) {
    await deps.dedupe.record(parsed.value.id);
    return {
      kind: "needs_reconciliation",
      eventId: parsed.value.id,
      message: "Event carried no reward reference and must be reconciled.",
    };
  }

  const existing = await deps.evidence.get(rewardId);
  const incoming = projected.value;
  const incomingAt = Date.parse(incoming.observedAt);
  const existingAt = existing ? Date.parse(existing.observedAt) : -Infinity;
  const adverseState = incoming.state === "reward_canceled" || incoming.state === "reward_flagged";
  const deliveryState = incoming.state === "delivery_succeeded" || incoming.state === "delivery_failed";
  const legacyAdverse = existing && (existing.state === "reward_canceled" || existing.state === "reward_flagged")
    ? { state: existing.state as "reward_canceled" | "reward_flagged", observedAt: existing.observedAt }
    : undefined;
  let adverse = existing?.adverse ?? legacyAdverse;
  let delivery = existing?.delivery ?? (existing && (existing.state === "delivery_succeeded" || existing.state === "delivery_failed")
    ? { state: existing.state as "delivery_succeeded" | "delivery_failed", observedAt: existing.observedAt }
    : undefined);
  let needsReconciliation = existing?.requiresReconciliation === true || !!adverse || incoming.requiresReconciliation;

  // Delayed adverse evidence must still be retained. A newer email delivery is
  // never proof that fraud review or cancellation has been resolved.
  if (adverseState) {
    if (!adverse || incomingAt > Date.parse(adverse.observedAt)) {
      adverse = { state: incoming.state as "reward_canceled" | "reward_flagged", observedAt: incoming.observedAt };
    }
    needsReconciliation = true;
  } else if (deliveryState) {
    const deliveryAt = delivery ? Date.parse(delivery.observedAt) : -Infinity;
    if (incomingAt < deliveryAt || (incomingAt === deliveryAt && incoming.state === delivery?.state)) {
      await deps.dedupe.record(parsed.value.id);
      return { kind: "stale_ignored", eventId: parsed.value.id, message: "Out-of-order delivery did not overwrite newer evidence." };
    }
    if (incomingAt === deliveryAt && incoming.state !== delivery?.state) {
      // Equal timestamps do not establish ordering. Preserve and reconcile.
      needsReconciliation = true;
    } else {
      delivery = { state: incoming.state as "delivery_succeeded" | "delivery_failed", observedAt: incoming.observedAt };
    }
  }

  const next: RewardEvidence = {
    observedAt: incomingAt > existingAt ? incoming.observedAt : existing!.observedAt,
    state: adverse?.state ?? delivery?.state ?? incoming.state,
    ...(delivery ? { delivery } : {}),
    ...(adverse ? { adverse } : {}),
    ...(needsReconciliation ? { requiresReconciliation: true } : {}),
  };
  await deps.evidence.apply(rewardId, next);
  await deps.dedupe.record(parsed.value.id);

  if (needsReconciliation) {
    return { kind: "needs_reconciliation", eventId: parsed.value.id, message: "Provider evidence requires reconciliation." };
  }

  return { kind: "applied", projected: projected.value };
}
