// Pure rules for "Email my kit to a print shop". No Deno or browser APIs, so
// the dashboard and the send-print-kit function share them and they are unit
// tested from the app's test suite.
import { undeliverableEmail } from "./referral-launch.ts";

/** Same pieces, ids and finished sizes as src/lib/printAssets.ts (a test keeps them equal). */
export const PRINT_KIT_PIECES = [
  { id: "yard-sign", name: "Yard sign", widthIn: 24, heightIn: 18 },
  { id: "door-hanger", name: "Door hanger", widthIn: 4.25, heightIn: 11 },
  { id: "invoice-insert", name: "Invoice insert / flyer", widthIn: 8.5, heightIn: 11 },
  { id: "card-back", name: "Business card back", widthIn: 3.5, heightIn: 2 },
  { id: "truck-magnet", name: "Truck magnet / decal", widthIn: 12, heightIn: 12 },
] as const;

export const PRINT_KIT_BUCKET = "print-kits";
export const PRINT_KIT_LIMIT_DAY = 5;
export const PRINT_KIT_LIMIT_MONTH = 20;
export const PRINT_KIT_NOTE_MAX = 300;
export const PRINT_KIT_LINK_DAYS = 30;

export const printFileName = (slug: string, assetId: string) => `${slug}-${assetId}.pdf`;

/** {business_id}/{32 hex chars}, the only folder shape the function accepts. */
export function validKitFolder(folder: unknown, businessId: string): folder is string {
  if (typeof folder !== "string") return false;
  const [biz, random, ...rest] = folder.split("/");
  return rest.length === 0 && biz === businessId && /^[a-f0-9]{32}$/.test(random ?? "");
}

const EMAIL_RE = /^[^\s@<>()",;:]+@[^\s@<>()",;:]+\.[a-z]{2,}$/i;
export function validPrintShopEmail(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const email = value.trim().toLowerCase();
  return email.length <= 254 && EMAIL_RE.test(email) && !undeliverableEmail(email);
}

/**
 * Plain text only: tags removed, anything that looks like a link or a bare
 * domain removed, whitespace collapsed, capped at 300 characters.
 */
export function sanitizeNote(raw: unknown): string {
  return String(raw ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/[<>]/g, " ")
    .replace(/\b(?:https?:\/\/|ftp:\/\/|www\.)\S*/gi, " ")
    .replace(/\b[\w-]+(?:\.[\w-]+)*\.(?:com|net|org|co|io|ca|us|ae|info|biz|me|app|dev|xyz|link|ly|gl|to)(?:\/\S*)?\b/gi, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .trim()
    .slice(0, PRINT_KIT_NOTE_MAX);
}

export type PrintKitRefusal =
  | "unauthorized" | "business_not_found" | "business_disabled" | "demo_account" | "invalid_recipient"
  | "recipient_suppressed" | "rate_limited_day" | "rate_limited_month" | "invalid_folder" | "files_missing";

export function rateLimitDecision(sendsLastDay: number, sendsLast30Days: number): PrintKitRefusal | null {
  if (sendsLastDay >= PRINT_KIT_LIMIT_DAY) return "rate_limited_day";
  if (sendsLast30Days >= PRINT_KIT_LIMIT_MONTH) return "rate_limited_month";
  return null;
}

/** Ownership and account checks, in the order the function applies them. */
export function businessDecision(
  business: { user_id: string; is_disabled?: boolean | null; is_demo?: boolean | null } | null,
  userId: string,
): PrintKitRefusal | null {
  if (!business || business.user_id !== userId) return "business_not_found";
  if (business.is_disabled) return "business_disabled";
  if (business.is_demo) return "demo_account";
  return null;
}

export const REFUSAL_STATUS: Record<PrintKitRefusal, number> = {
  unauthorized: 401, business_not_found: 404, business_disabled: 403, demo_account: 403, invalid_recipient: 400,
  recipient_suppressed: 422, rate_limited_day: 429, rate_limited_month: 429, invalid_folder: 400, files_missing: 422,
};

const esc = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const size = (w: number, h: number) => `${w} by ${h} inches`;

export function printKitEmail(args: {
  businessName: string;
  note: string;
  links: Array<{ id: string; url: string }>;
  address: string | null;
}): { subject: string; html: string; text: string } {
  const name = args.businessName.trim() || "A Revvin business";
  const pieces = PRINT_KIT_PIECES.map((p) => ({ ...p, url: args.links.find((l) => l.id === p.id)?.url ?? "" })).filter((p) => p.url);
  const subject = `Print files from ${name}`.slice(0, 200);
  const li = pieces.map((p) => `<li style="margin:0 0 8px">${esc(p.name)}, ${esc(size(p.widthIn, p.heightIn))}, full color, one side: <a href="${esc(p.url)}">Download PDF</a></li>`).join("");
  const note = args.note ? `<p style="margin:0 0 14px;padding:12px;background:#f1f5f9;border-radius:8px;white-space:pre-wrap">${esc(args.note)}</p>` : "";
  const addr = args.address ? `<p style="margin:0 0 4px;color:#64748b;font-size:12px">${esc(name)}, ${esc(args.address)}</p>` : "";
  const html = `<div style="font-family:Arial,sans-serif;color:#0f172a;font-size:14px;line-height:1.6;max-width:560px">`
    + `<p style="margin:0 0 14px">${esc(name)} would like these printed.</p>`
    + `<ul style="margin:0 0 14px;padding-left:18px">${li}</ul>`
    + `<p style="margin:0 0 14px;color:#64748b;font-size:12px">Links work for ${PRINT_KIT_LINK_DAYS} days.</p>`
    + note
    + `<p style="margin:0 0 18px">Reply to this email to reach ${esc(name)}.</p>`
    + addr
    + `<p style="margin:0;color:#64748b;font-size:12px">Sent with Revvin (revvin.co)</p></div>`;
  const text = [
    `${name} would like these printed.`, "",
    ...pieces.map((p) => `${p.name}, ${size(p.widthIn, p.heightIn)}, full color, one side: ${p.url}`), "",
    `Links work for ${PRINT_KIT_LINK_DAYS} days.`,
    ...(args.note ? ["", args.note] : []), "",
    `Reply to this email to reach ${name}.`,
    ...(args.address ? [`${name}, ${args.address}`] : []),
    "Sent with Revvin (revvin.co)",
  ].join("\n");
  return { subject, html, text };
}
