/**
 * Who may be asked, and on which channel.
 *
 * The dashboard used to render every contact as "Pending" and offer Text,
 * Email, Copy and Share on all of them, then overwrite an opt-out the moment
 * the owner confirmed a send. It also read `referral_contacts.opted_out`, a
 * column that does not exist in the deployed schema, so the check silently
 * evaluated to undefined for every row.
 *
 * The deployed facts this module works from:
 *  - `referral_contacts.status` is text: 'pending' | 'sent' | 'opted_out'.
 *    There is no opted_out boolean column.
 *  - `suppressed_contacts` is per business and records a scope in
 *    `contact_type`: 'email', 'phone' or 'all'. Business owners can read their
 *    own rows, so this lookup works from the browser today.
 *  - `suppressed_emails` is the global bounce and complaint list. Only the
 *    service role can read it, so the browser needs an RPC. Until that RPC is
 *    deployed the global list is reported as UNCHECKED rather than as clean.
 *
 * Scope matters: an email suppression must not silently disable a legitimate
 * phone channel. Only a recorded scope of 'all' blocks every channel.
 */

export type Channel = "sms" | "email" | "share";

export interface SuppressionSnapshot {
  /** Lowercased suppressed email addresses for this business. */
  emails: Set<string>;
  /** Digits-only suppressed phone numbers for this business. */
  phones: Set<string>;
  /** Contacts suppressed on every channel (recorded scope 'all'). */
  allChannels: Set<string>;
  /** False when the global email list could not be consulted. */
  globalEmailsChecked: boolean;
}

export interface SuppressionLookup {
  snapshot: SuppressionSnapshot | null;
  /** Set when the authoritative per-business lookup failed. Fail closed. */
  error?: string;
  /** Set when only the global email list was unavailable. Degraded, not closed. */
  warning?: string;
}

export const digits = (v: string) => v.replace(/\D/g, "");

/** Minimal shape this module needs from a contact row. */
export interface EligibleContact {
  status: string;
  email?: string | null;
  phone?: string | null;
}

export interface Eligibility {
  /** The contact asked not to be contacted, or is fully suppressed. */
  optedOut: boolean;
  /** Channels that must not be offered. */
  blocked: Set<Channel>;
  /** False when nothing may be prepared for this contact at all. */
  canPrepare: boolean;
  /** Short, plain reason shown next to the contact. */
  reason?: string;
  /** True when the reason is "we could not check", not "they opted out". */
  unknown: boolean;
}

const ALL: Channel[] = ["sms", "email", "share"];

/**
 * Pure decision function. Given a contact and a suppression snapshot, decide
 * what may be prepared. A null snapshot means the lookup failed: nothing is
 * prepared, because guessing here means messaging someone who opted out.
 */
export function contactEligibility(
  contact: EligibleContact,
  snapshot: SuppressionSnapshot | null,
): Eligibility {
  if (!snapshot) {
    return {
      optedOut: false,
      blocked: new Set(ALL),
      canPrepare: false,
      reason: "We could not check the do-not-contact list, so sending is paused.",
      unknown: true,
    };
  }

  if (contact.status === "opted_out") {
    return {
      optedOut: true,
      blocked: new Set(ALL),
      canPrepare: false,
      reason: "Opted out. Do not contact.",
      unknown: false,
    };
  }

  const email = contact.email?.trim().toLowerCase() || "";
  const phone = contact.phone ? digits(contact.phone) : "";

  const fullySuppressed =
    (email && snapshot.allChannels.has(email)) || (phone && snapshot.allChannels.has(phone));
  if (fullySuppressed) {
    return {
      optedOut: true,
      blocked: new Set(ALL),
      canPrepare: false,
      reason: "Unsubscribed from all channels. Do not contact.",
      unknown: false,
    };
  }

  const blocked = new Set<Channel>();
  const emailSuppressed = !!email && snapshot.emails.has(email);
  const phoneSuppressed = !!phone && snapshot.phones.has(phone);
  if (emailSuppressed) blocked.add("email");
  if (phoneSuppressed) blocked.add("sms");
  if (!contact.email) blocked.add("email");
  if (!contact.phone) blocked.add("sms");

  // Copy and Share hand the message to any app, so they are only safe while at
  // least one recorded channel for this person is still allowed.
  const anyChannelLeft =
    (!!contact.email && !emailSuppressed) || (!!contact.phone && !phoneSuppressed);
  const noRecordedChannel = !contact.email && !contact.phone;
  if (!anyChannelLeft && !noRecordedChannel) blocked.add("share");

  const canPrepare = !blocked.has("share") || anyChannelLeft || noRecordedChannel;

  let reason: string | undefined;
  if (!canPrepare) reason = "Unsubscribed. Do not contact.";
  else if (emailSuppressed && phoneSuppressed) reason = "Unsubscribed on email and text.";
  else if (emailSuppressed) reason = "Unsubscribed from email. Text is still allowed.";
  else if (phoneSuppressed) reason = "Unsubscribed from text. Email is still allowed.";

  return { optedOut: !canPrepare, blocked, canPrepare, reason, unknown: false };
}

/** True when this exact channel may be offered for this contact. */
export function channelAllowed(e: Eligibility, channel: Channel): boolean {
  return e.canPrepare && !e.blocked.has(channel);
}

interface MinimalClient {
  from: (table: string) => any;
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: any; error: any }>;
}

/**
 * Read the authoritative suppression state for one business.
 *
 * The per-business table is required: if it fails, callers get a null snapshot
 * and every send is disabled. The global email list is best effort, because the
 * RPC that exposes it to an owner ships with the pending migration; until then
 * the snapshot is flagged as unchecked and the UI says so.
 */
export async function loadSuppression(
  client: MinimalClient,
  businessId: string,
): Promise<SuppressionLookup> {
  const emails = new Set<string>();
  const phones = new Set<string>();
  const allChannels = new Set<string>();

  const { data, error } = await client
    .from("suppressed_contacts")
    .select("contact_type, contact_value")
    .eq("business_id", businessId);

  if (error) {
    return { snapshot: null, error: "Could not read your do-not-contact list." };
  }

  for (const row of (data ?? []) as { contact_type: string; contact_value: string }[]) {
    const value = (row.contact_value ?? "").trim();
    if (!value) continue;
    if (row.contact_type === "email") emails.add(value.toLowerCase());
    else if (row.contact_type === "phone") phones.add(digits(value));
    else if (row.contact_type === "all") {
      allChannels.add(value.includes("@") ? value.toLowerCase() : digits(value));
    }
  }

  let globalEmailsChecked = false;
  let warning: string | undefined;
  try {
    const { data: globals, error: rpcError } = await client.rpc("fn_suppressed_emails_for_business", {
      p_business_id: businessId,
    });
    if (rpcError) throw rpcError;
    for (const row of (globals ?? []) as { email: string }[]) {
      if (row?.email) emails.add(row.email.trim().toLowerCase());
    }
    globalEmailsChecked = true;
  } catch {
    warning =
      "Platform-wide unsubscribes could not be checked on this device. Your own do-not-contact list was applied.";
  }

  return {
    snapshot: { emails, phones, allChannels, globalEmailsChecked },
    warning,
  };
}
