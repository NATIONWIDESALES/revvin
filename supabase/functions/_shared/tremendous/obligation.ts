// Validation of a reward obligation and derivation of its stable external ID.
//
// A won/closed job produces a CANDIDATE obligation. Validation here does not
// authorize money movement on its own: an explicit human approval must be
// present on the obligation, and production additionally requires real server
// authentication plus immutable obligation storage.

import {
  type ActorContext,
  type ConnectionContext,
  type RewardObligation,
  type SourceRecordContext,
  type Validated,
  isSupportedCurrency,
} from "./types.ts";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const no = (code: Parameters<typeof invalid>[0], message: string) => invalid(code, message);
function invalid(code: NonNullable<Extract<Validated<never>, { ok: false }>["code"]>, message: string) {
  return { ok: false as const, code, message };
}

export interface ObligationContext {
  actor: ActorContext;
  source: SourceRecordContext;
  connection: ConnectionContext;
}

/**
 * Validate that an obligation is internally coherent and bound to the trusted
 * actor, business, source record and approved connection/program.
 */
export function validateObligation(
  obligation: RewardObligation,
  context: ObligationContext,
): Validated<RewardObligation> {
  const { actor, source, connection } = context;

  if (typeof obligation.obligationId !== "string" || obligation.obligationId.trim().length < 8) {
    return no("invalid_obligation_id", "Obligation is missing a stable identifier.");
  }
  if (!Number.isInteger(obligation.snapshotVersion) || obligation.snapshotVersion < 1) {
    return no("invalid_snapshot_version", "Obligation snapshot version must be a positive integer.");
  }

  if (!actor.isBusinessOwner) {
    return no("actor_not_owner", "Only a business owner may act on a reward obligation.");
  }
  if (actor.actorBusinessId !== obligation.businessId) {
    return no("actor_business_mismatch", "Actor does not belong to the obligation's business.");
  }
  if (source.businessId !== obligation.businessId) {
    return no("business_mismatch", "Source record belongs to a different business.");
  }
  if (source.sourceKind !== obligation.sourceKind || source.sourceId !== obligation.sourceId) {
    return no("source_mismatch", "Obligation source does not match the source record.");
  }
  if (!source.isClosed) {
    return no("source_not_closed", "The qualifying job or referral is not closed.");
  }

  if (connection.businessId !== obligation.businessId || connection.connectionId !== obligation.connectionId) {
    return no("connection_mismatch", "Obligation is not bound to this business connection.");
  }
  if (connection.status !== "approved") {
    return no("connection_not_approved", "The funding connection is not approved.");
  }
  if (!connection.approvedProgramIds.includes(obligation.programId)) {
    return no("program_not_approved", "The reward program is not approved for this connection.");
  }

  if (obligation.currency === undefined || obligation.currency === null || obligation.currency === ("" as never)) {
    return no("missing_currency", "Obligation currency is required and is never inferred.");
  }
  if (!isSupportedCurrency(obligation.currency)) {
    return no("unsupported_currency", "Obligation currency is not supported.");
  }
  if (
    !Number.isInteger(obligation.amountMinorUnits) ||
    obligation.amountMinorUnits <= 0 ||
    obligation.amountMinorUnits > 100_000_00
  ) {
    return no("invalid_amount", "Obligation amount must be a positive integer in minor units.");
  }

  if (typeof obligation.recipientEmail !== "string" || !EMAIL.test(obligation.recipientEmail)) {
    return no("invalid_recipient_email", "A reviewed recipient email is required.");
  }

  if (!obligation.approval || !obligation.approval.approvedByUserId || !obligation.approval.approvedAt) {
    return no("not_approved_for_issuance", "A closed job creates a candidate only. Explicit approval is required.");
  }

  return { ok: true, value: obligation };
}

/**
 * Stable opaque external ID bound to the immutable obligation snapshot.
 * The same obligation + snapshot always produces the same ID, so retries and
 * reconciliation reuse it. A changed snapshot produces a different ID, which is
 * how a conflicting payload surfaces as a provider 409 instead of a silent
 * second payout.
 */
export function externalIdFor(obligation: Pick<RewardObligation, "obligationId" | "snapshotVersion">): string {
  return `revvin-obl-${obligation.obligationId}-v${obligation.snapshotVersion}`;
}

/** Minor units to the provider's decimal denomination. No display parsing. */
export function denominationFromMinorUnits(amountMinorUnits: number): number {
  return Math.round(amountMinorUnits) / 100;
}
