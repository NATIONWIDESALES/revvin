/**
 * Turns a raw backend error into copy a customer can act on.
 *
 * Postgres, Stripe and storage messages are written for engineers. Showing them
 * verbatim ("new row violates row-level security policy") makes the product look
 * broken and tells the user nothing they can do. Every caught error should go
 * through here: the human sentence is rendered, the real error is logged to the
 * console for us.
 */

type AnyError =
  | { message?: string | null; code?: string | null; details?: string | null; hint?: string | null }
  | Error
  | string
  | null
  | undefined;

const rawOf = (error: AnyError): string => {
  if (!error) return "";
  if (typeof error === "string") return error;
  return (error as { message?: string | null }).message || "";
};

const codeOf = (error: AnyError): string => {
  if (!error || typeof error === "string") return "";
  return String((error as { code?: string | null }).code || "");
};

/** Ordered most specific first. Each entry maps a raw signature to human copy. */
const RULES: Array<{ match: (raw: string, code: string) => boolean; message: string }> = [
  {
    match: (raw, code) =>
      code === "42501" ||
      raw.includes("row-level security") ||
      raw.includes("row level security") ||
      raw.includes("permission denied"),
    message:
      "You do not have permission to do that. If this is your own account, sign out and back in, then try again.",
  },
  {
    match: (raw, code) => code === "23505" || raw.includes("duplicate key") || raw.includes("already exists"),
    message: "That already exists. Try a different value.",
  },
  {
    match: (raw, code) => code === "23503" || raw.includes("violates foreign key"),
    message: "Something this depends on is missing. Reload the page and try again.",
  },
  {
    match: (raw, code) => code === "23502" || raw.includes("null value in column"),
    message: "A required field is missing. Please fill in every field marked required.",
  },
  {
    match: (raw, code) => code === "23514" || raw.includes("violates check constraint"),
    message: "One of those values is not allowed. Please check the form and try again.",
  },
  {
    match: (raw) => raw.includes("jwt") || raw.includes("token is expired") || raw.includes("not authenticated"),
    message: "Your session expired. Please sign in again.",
  },
  {
    match: (raw) => raw.includes("failed to fetch") || raw.includes("networkerror") || raw.includes("network request failed"),
    message: "We could not reach the server. Check your connection and try again.",
  },
  {
    match: (raw) => raw.includes("payload too large") || raw.includes("exceeded the maximum allowed size"),
    message: "That file is too large. Please use a smaller one.",
  },
  {
    match: (raw) => raw.includes("mime type") || raw.includes("invalid_mime_type"),
    message: "That file type is not supported. Please use a PNG, JPG or SVG.",
  },
  {
    match: (raw) => raw.includes("bucket not found") || raw.includes("object not found"),
    message: "The file could not be found. Please try uploading it again.",
  },
  {
    match: (raw) => raw.includes("rate limit") || raw.includes("too many requests"),
    message: "Too many attempts in a row. Please wait a minute and try again.",
  },
  {
    match: (raw) => raw.includes("no such customer") || raw.includes("stripe"),
    message: "There was a problem with billing. Please try again, and contact us if it keeps happening.",
  },
];

/**
 * Messages that are already written for humans and safe to pass through: our own
 * database triggers and edge functions raise these intentionally.
 */
const isAuthoredForHumans = (raw: string) =>
  raw.startsWith("This ") ||
  raw.startsWith("That ") ||
  raw.includes("append-only") ||
  raw.includes("Please ") ||
  raw.includes("already confirmed");

export function friendlyError(error: AnyError, fallback = "Something went wrong. Please try again."): string {
  const original = rawOf(error);
  if (error) console.error("[error]", original || error, error);
  if (!original) return fallback;

  const raw = original.toLowerCase();
  const code = codeOf(error);

  for (const rule of RULES) {
    if (rule.match(raw, code)) return rule.message;
  }

  // Anything short, punctuated and free of engineering jargon is very likely one
  // of our own authored messages, so show it rather than a generic fallback.
  const looksTechnical = /[_{}]|::|relation |column |function |constraint |supabase|postgres|pgrst/i.test(original);
  if (!looksTechnical && original.length <= 140 && isAuthoredForHumans(original)) return original;

  return fallback;
}
