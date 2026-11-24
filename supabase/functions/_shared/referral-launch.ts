// Pure rules for the Revvin-sent referral launch campaign. No Deno or browser
// APIs, so the dashboard preview and the edge functions render the same text
// and the rules are unit tested from the app's test suite.

export const LAUNCH_MAX_RECIPIENTS = 500;
export const FOLLOWUP_DAYS = [4, 10] as const;
export const LAUNCH_BUTTON_LABEL = "Refer a friend";

export const LAUNCH_DEFAULT_SUBJECT = "A quick favor, {first_name}";
export const LAUNCH_DEFAULT_BODY =
  "Hi {first_name},\n\nThank you for choosing {business_name}. Most of our work comes from people like you telling a friend or neighbor.\n\nIf you know someone who could use us, send them your personal link below. If it turns into a job, we will send you {reward} as a thank you.\n\nBest,\n{business_name}";

/** Short, different wording for follow-up one (day 4) and two (day 10). */
export const LAUNCH_FOLLOWUPS = [
  {
    subject: "Following up, {first_name}",
    body: "Hi {first_name},\n\nJust a quick follow-up. If a friend or neighbor needs help, your personal link below sends them straight to {business_name}. If it turns into a job, we will send you {reward} as a thank you.\n\nThanks,\n{business_name}",
  },
  {
    subject: "One last note from {business_name}",
    body: "Hi {first_name},\n\nThis is my last note about referrals. If you think of anyone, your personal link is below and it does not expire.\n\nThank you again,\n{business_name}",
  },
] as const;

export interface LaunchTokens { first_name: string; business_name: string; reward: string | null; link?: string }

export const firstNameOf = (name: string | null | undefined) => String(name || "").trim().split(/\s+/)[0] || "there";

/**
 * Fill tokens. When the business has no reward set, every sentence that uses
 * {reward} is removed rather than printing an empty token.
 */
export function renderLaunchText(template: string, tokens: LaunchTokens): string {
  let text = template;
  const reward = String(tokens.reward || "").trim();
  if (!reward) {
    text = text
      .split(/(\n)/)
      .map((line) => line === "\n" ? line : line
        .split(/(?<=[.!?])\s+/)
        .filter((sentence) => !/\{\{?\s*reward\s*\}\}?/i.test(sentence))
        .join(" "))
      .join("")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n");
  }
  return text.replace(/\{\{?\s*(first_name|business_name|reward|link)\s*\}\}?/gi, (_m, key: string) => {
    switch (key.toLowerCase()) {
      case "first_name": return tokens.first_name;
      case "business_name": return tokens.business_name;
      case "reward": return reward;
      default: return tokens.link ?? "";
    }
  }).trim();
}

/** The recipient's own link, the same ?ref= link the manual ask uses, plus an opaque click code. */
export function launchLink(origin: string, slug: string, referrerToken: string, clickToken?: string | null): string {
  const base = `${origin.replace(/\/$/, "")}/r/${encodeURIComponent(slug)}?ref=${encodeURIComponent(referrerToken)}`;
  return clickToken ? `${base}&c=${encodeURIComponent(clickToken)}` : base;
}

export const isClickToken = (value: string | null | undefined) => !!value && /^[a-f0-9]{16}$/.test(value);

export function newClickToken(random: () => Uint8Array): string {
  return Array.from(random()).slice(0, 8).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const UNDELIVERABLE_DOMAINS = new Set(["example.com", "example.net", "example.org", "test.com"]);
export function undeliverableEmail(email: string) {
  const value = email.trim().toLowerCase();
  const [local, domain] = value.split("@");
  if (!local || !domain || !domain.includes(".")) return true;
  if (local === "test" || local.startsWith("test.")) return true;
  if (domain.startsWith("test.") || domain.startsWith("invalid") || domain.endsWith(".invalid")) return true;
  return UNDELIVERABLE_DOMAINS.has(domain);
}

export type SkipReason = "mock_contact" | "no_email" | "opted_out" | "undeliverable_email" | "duplicate_email" | "suppressed" | "over_500_campaign_cap";

export interface AudienceContact { id: string; name?: string | null; email?: string | null; status?: string | null; is_mock?: boolean | null }

/**
 * Everyone with a deliverable email, no date or segment rule, capped at 500.
 * isSuppressed is the server's live suppression check; the browser passes a
 * function that returns false and the server re-checks before queueing.
 */
export async function launchAudience<T extends AudienceContact>(
  contacts: T[],
  isSuppressed: (email: string) => Promise<boolean> | boolean,
  cap = LAUNCH_MAX_RECIPIENTS,
): Promise<{ recipients: Array<T & { email: string }>; reasons: Partial<Record<SkipReason, number>> }> {
  const reasons: Partial<Record<SkipReason, number>> = {};
  const skip = (r: SkipReason) => { reasons[r] = (reasons[r] ?? 0) + 1; };
  const seen = new Set<string>();
  const recipients: Array<T & { email: string }> = [];
  for (const contact of contacts) {
    const email = String(contact.email || "").trim().toLowerCase();
    if (contact.is_mock) { skip("mock_contact"); continue; }
    if (String(contact.status || "").toLowerCase() === "opted_out") { skip("opted_out"); continue; }
    if (!email) { skip("no_email"); continue; }
    if (undeliverableEmail(email)) { skip("undeliverable_email"); continue; }
    if (seen.has(email)) { skip("duplicate_email"); continue; }
    if (await isSuppressed(email)) { skip("suppressed"); continue; }
    seen.add(email);
    if (recipients.length >= cap) { skip("over_500_campaign_cap"); continue; }
    recipients.push({ ...contact, email });
  }
  return { recipients, reasons };
}

/** Free gets exactly one launch ever; Pro (including trial) is limited only by the 500 cap. */
export function launchPlanDecision(plan: string, launchAlreadyClaimed: boolean): { ok: true } | { ok: false; status: 403; code: "free_launch_used" } {
  if (plan === "pro") return { ok: true };
  return launchAlreadyClaimed ? { ok: false, status: 403, code: "free_launch_used" } : { ok: true };
}

/** Which follow-up step (1 or 2) is due now, or null. Each step runs once. */
export function followupDue(
  campaign: { started_at: string; followups_enabled: boolean; followups_done: number },
  now = Date.now(),
): 1 | 2 | null {
  if (!campaign.followups_enabled) return null;
  const started = new Date(campaign.started_at).getTime();
  if (!Number.isFinite(started)) return null;
  const next = campaign.followups_done + 1;
  if (next > FOLLOWUP_DAYS.length) return null;
  return now >= started + FOLLOWUP_DAYS[next - 1] * 86_400_000 ? (next as 1 | 2) : null;
}

export interface FollowupRecipientState {
  firstSendSent: boolean;
  clicked: boolean;
  referred: boolean;
  optedOut: boolean;
  suppressed: boolean;
  stepsAlreadySent: number[];
}

export function followupEligible(step: 1 | 2, r: FollowupRecipientState): boolean {
  return r.firstSendSent && !r.clicked && !r.referred && !r.optedOut && !r.suppressed && !r.stepsAlreadySent.includes(step);
}

export function followupDates(startedAt: string): string[] {
  const started = new Date(startedAt).getTime();
  if (!Number.isFinite(started)) return [];
  return FOLLOWUP_DAYS.map((d) => new Date(started + d * 86_400_000).toISOString());
}
