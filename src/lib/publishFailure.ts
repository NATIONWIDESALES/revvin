export const PUBLISH_FAILURE_REASONS = [
  "not_signed_in", "no_business", "disabled", "missing_slug", "missing_name",
  "missing_reward", "guard_rejected", "network", "unknown",
] as const;
export type PublishFailureReason = typeof PUBLISH_FAILURE_REASONS[number];

const SAFE_MESSAGES: Record<string, PublishFailureReason> = {
  "You need to be signed in.": "not_signed_in",
  "No business found on this account.": "no_business",
  "This account is disabled. Email info@revvin.co and we will sort it out.": "disabled",
  "Choose your page link before publishing.": "missing_slug",
  "Add your business name before publishing.": "missing_name",
  "Add the reward you pay before publishing.": "missing_reward",
};
export function publishFailure(error: unknown): { reason: PublishFailureReason; safeMessage?: string } {
  const value = error && typeof error === "object" ? error as { message?: unknown; code?: unknown } : {};
  const message = typeof value.message === "string" ? value.message : "";
  const known = Object.prototype.hasOwnProperty.call(SAFE_MESSAGES, message) ? SAFE_MESSAGES[message] : undefined;
  if (known) return { reason: known, safeMessage: message };
  if (/failed to fetch|networkerror|network request failed|load failed|timeout/i.test(message)) return { reason: "network" };
  if (/jwt|not authenticated|session.*expired/i.test(message) || value.code === "PGRST301") return { reason: "not_signed_in" };
  if (value.code === "42501" || /Only admins|Only a super admin|managed by the server|row.level security|permission denied|append-only|set server side/i.test(message)) return { reason: "guard_rejected" };
  return { reason: "unknown" };
}