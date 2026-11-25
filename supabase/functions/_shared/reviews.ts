// Pure rules for review requests and quote requests, shared by the edge
// functions and the browser tests. No review gating: every selected contact
// gets the same link to the same form.

export const REVIEW_REQUEST_COOLDOWN_DAYS = 90;
export const FREE_REVIEW_REQUESTS_PER_MONTH = 50;
export const REVIEW_REQUEST_MAX_PER_CALL = 200;
export const REVIEW_BUTTON_LABEL = "Leave a review";

export const reviewSubject = (business: string) => `How did ${business} do?`;
export const reviewBody = (business: string, firstName: string | null) => [
  `${firstName ? `Hi ${firstName}, thanks` : "Thanks"} for choosing ${business}.`,
  `If you have a minute, tell others how it went. Your review appears on ${business}'s Revvin profile.`,
];

/** How many of the requested contacts may be sent this month, or null for no plan cap. */
export function reviewMonthlyAllowance(isPro: boolean, sentThisMonth: number): number | null {
  if (isPro) return null;
  return Math.max(0, FREE_REVIEW_REQUESTS_PER_MONTH - sentThisMonth);
}

export const newReviewToken = (bytes: () => Uint8Array) =>
  Array.from(bytes(), (b) => b.toString(16).padStart(2, "0")).join("");

const EMAIL = /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i;
export interface QuoteInput { slug: string; name: string; email: string; phone: string | null; message: string | null; website: string }
/** Validates a public quote request. `website` is the honeypot and must be empty. */
export function validateQuote(raw: unknown): { ok: true; value: QuoteInput } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object") return { ok: false, error: "invalid_body" };
  const r = raw as Record<string, unknown>;
  const s = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/[\u0000-\u001f]/g, " ").trim().slice(0, max) : "");
  const slug = s(r.slug, 100).toLowerCase();
  const name = s(r.name, 120), email = s(r.email, 254).toLowerCase();
  const phone = s(r.phone, 40) || null;
  const message = typeof r.message === "string" ? r.message.trim().slice(0, 1500) || null : null;
  const website = s(r.website, 200);
  if (website) return { ok: false, error: "spam" };
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return { ok: false, error: "invalid_business" };
  if (!name) return { ok: false, error: "invalid_name" };
  if (!EMAIL.test(email)) return { ok: false, error: "invalid_email" };
  if (typeof r.message === "string" && r.message.trim().length > 1500) return { ok: false, error: "message_too_long" };
  return { ok: true, value: { slug, name, email, phone, message, website } };
}
