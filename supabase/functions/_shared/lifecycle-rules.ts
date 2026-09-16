// Pure guardrail logic for lifecycle email. No Deno globals and no remote
// imports live here on purpose: the app's vitest suite imports this file so the
// caps and the promotional-email rules are covered by tests.

export type LifecycleCategory = "setup" | "promo";

export const MAX_PER_24H = 1;
export const MAX_PER_7D = 3;

const HOUR = 3600_000;

/**
 * At most one lifecycle email per business per 24 hours and three per rolling
 * 7 days. Every previously sent lifecycle email counts.
 */
export function withinFrequencyCap(sentAtIso: string[], now: number = Date.now()): boolean {
  let last24 = 0;
  let last7d = 0;
  for (const iso of sentAtIso) {
    const t = new Date(iso).getTime();
    if (Number.isNaN(t)) continue;
    const age = now - t;
    if (age < 0) continue;
    if (age <= 24 * HOUR) last24++;
    if (age <= 7 * 24 * HOUR) last7d++;
  }
  return last24 < MAX_PER_24H && last7d < MAX_PER_7D;
}

export interface PromoGateInput {
  postalAddress: string;
  plan?: string | null;
  subscriptionStatus?: string | null;
  promoOptOut?: boolean | null;
}

const PAYING_STATUSES = new Set(["active", "trialing"]);

/**
 * Promotional email is commercial email. It needs a postal address in the
 * footer, it stops permanently once the business is paying, and it honours its
 * own opt-out flag.
 */
export function promoAllowed(input: PromoGateInput): { allowed: boolean; reason?: string } {
  if (!input.postalAddress.trim()) return { allowed: false, reason: "no_postal_address" };
  if (input.promoOptOut) return { allowed: false, reason: "promo_opted_out" };
  if (String(input.plan ?? "").toLowerCase() === "pro") return { allowed: false, reason: "already_pro" };
  if (PAYING_STATUSES.has(String(input.subscriptionStatus ?? "").toLowerCase())) {
    return { allowed: false, reason: "subscription_active" };
  }
  return { allowed: true };
}

export interface Candidate {
  template: string;
  category: LifecycleCategory;
  data: Record<string, unknown>;
}

/**
 * Picks the single most important email that is still owed. Candidates arrive
 * in priority order; anything already in the ledger is never repeated, and
 * everything else waits for a later run.
 */
export function pickCandidate(
  candidates: Candidate[],
  alreadySent: Iterable<string>,
  promoGate: PromoGateInput,
): Candidate | null {
  const sent = new Set(alreadySent);
  const promo = promoAllowed(promoGate);
  for (const candidate of candidates) {
    if (sent.has(candidate.template)) continue;
    if (candidate.category === "promo" && !promo.allowed) continue;
    return candidate;
  }
  return null;
}

/** Hours between an ISO timestamp and now. Returns Infinity for bad input. */
export function hoursSince(iso: string | null | undefined, now: number = Date.now()): number {
  if (!iso) return Infinity;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return Infinity;
  return (now - t) / HOUR;
}
