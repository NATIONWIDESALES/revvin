// Internal-only type contracts for the INACTIVE Tremendous sandbox foundation.
//
// Nothing in this folder is wired to a route, a database client, an environment
// variable, or the frontend. Every capability (HTTP transport, deduplication,
// evidence storage) is injected by the caller. There is no default fetch and no
// Deno.env access anywhere in this folder.

/** Currencies this foundation is allowed to handle. Never inferred, never summed. */
export const SUPPORTED_CURRENCIES = ["USD"] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export function isSupportedCurrency(value: unknown): value is SupportedCurrency {
  return typeof value === "string" && (SUPPORTED_CURRENCIES as readonly string[]).includes(value);
}

/** Where a candidate obligation came from. A won job creates a candidate only. */
export type ObligationSourceKind = "closed_job" | "closed_referral";

/**
 * A structured, snapshot-versioned reward obligation.
 *
 * This is deliberately NOT the existing mutable `rewards` row: those are manual
 * records whose amount originates from free text, and they are not an
 * authoritative provider ledger. Amounts here are integer minor units and the
 * currency is explicit. Display strings are never parsed.
 */
export interface RewardObligation {
  /** Stable identifier for the obligation itself. */
  obligationId: string;
  /** Monotonic version of the immutable snapshot this payload was built from. */
  snapshotVersion: number;
  sourceKind: ObligationSourceKind;
  sourceId: string;
  businessId: string;
  /** Approved Tremendous Connect connection funding this obligation. */
  connectionId: string;
  /** Approved program (campaign) binding inside that connection. */
  programId: string;
  /** Recipient email that a human reviewed and approved. */
  recipientEmail: string;
  recipientName: string;
  /** Integer minor units, e.g. 2500 === $25.00. */
  amountMinorUnits: number;
  currency: SupportedCurrency;
  /** Explicit human approval to issue money. `null` means candidate only. */
  approval: ObligationApproval | null;
}

export interface ObligationApproval {
  approvedByUserId: string;
  approvedAt: string;
}

/**
 * Trusted actor context. This must be derived server-side from a verified
 * session. Caller-supplied identifier fields are NOT authentication: production
 * requires real server auth plus immutable obligation storage (see
 * docs/internal/tremendous-sandbox-foundation.md).
 */
export interface ActorContext {
  actorUserId: string;
  actorBusinessId: string;
  isBusinessOwner: boolean;
}

/** The source record as read server-side, used to prove the binding. */
export interface SourceRecordContext {
  sourceKind: ObligationSourceKind;
  sourceId: string;
  businessId: string;
  /** Qualifying job/referral actually closed. */
  isClosed: boolean;
}

export type ConnectionStatus = "pending" | "approved" | "rejected" | "revoked";

/** An approved, business-funded Tremendous Connect connection. */
export interface ConnectionContext {
  connectionId: string;
  businessId: string;
  status: ConnectionStatus;
  /** Programs (campaigns) explicitly approved for this connection. */
  approvedProgramIds: string[];
}

export type ValidationFailureCode =
  | "invalid_context"
  | "actor_not_owner"
  | "actor_business_mismatch"
  | "business_mismatch"
  | "source_mismatch"
  | "source_not_closed"
  | "connection_mismatch"
  | "connection_not_approved"
  | "program_not_approved"
  | "missing_currency"
  | "unsupported_currency"
  | "invalid_amount"
  | "invalid_recipient_email"
  | "invalid_snapshot_version"
  | "invalid_obligation_id"
  | "not_approved_for_issuance";

export type Validated<T> =
  | { ok: true; value: T }
  | { ok: false; code: ValidationFailureCode; message: string };
