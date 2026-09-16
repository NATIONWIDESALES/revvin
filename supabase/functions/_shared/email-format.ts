// Pure email formatting helpers. No Deno globals and no remote imports live in
// this file on purpose: it is imported by the app's vitest suite so the merge
// tokens and the legally required postal footer are covered by CI.

export const esc = (s: unknown) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** Postal address block required in the footer of every campaign email. */
export interface SenderAddress {
  street_address: string;
  city: string;
  postal_code: string;
  country: string;
}

/** Fallback sending mailbox when nothing better is configured. */
export const PLATFORM_MAILBOX = "info@revvin.co";

/** Pull the bare mailbox out of "Name <mailbox>" or a plain address. */
export function mailboxOf(address: string, fallback = PLATFORM_MAILBOX): string {
  const match = String(address ?? "").match(/<([^>]+)>/);
  const value = (match?.[1] ?? String(address ?? "")).trim();
  return value.includes("@") ? value : fallback;
}

/**
 * From header for anything Revvin sends to a business's own customers or
 * referrers. The customer sees the business first, and "via Revvin" keeps the
 * shared sending domain honest instead of impersonating the business outright.
 */
export function customerFromAddress(businessName: unknown, platformFrom: string): string {
  const mailbox = mailboxOf(platformFrom);
  const name = String(businessName ?? "").replace(/[<>"]/g, "").trim();
  return name ? `${name} via Revvin <${mailbox}>` : `Revvin <${mailbox}>`;
}

/** What the business's customers see when they hit reply. */
export function customerReplyTo(
  businessEmail?: unknown,
  ownerEmail?: unknown,
  fallback: string = PLATFORM_MAILBOX,
): string {
  for (const candidate of [businessEmail, ownerEmail]) {
    const value = String(candidate ?? "").trim().toLowerCase();
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return value;
  }
  return fallback;
}

/**
 * The business's postal address, but only when every part is on file. A partial
 * address in a footer is worse than the compact footer.
 */
export interface PostalSource {
  street_address?: unknown;
  city?: unknown;
  postal_code?: unknown;
  country?: unknown;
}

export function postalAddressOf(biz: PostalSource | null | undefined): SenderAddress | null {
  if (!biz) return null;
  const values = [biz.street_address, biz.city, biz.postal_code, biz.country].map((v) =>
    String(v ?? "").trim(),
  );
  if (values.some((value) => !value)) return null;
  return {
    street_address: values[0],
    city: values[1],
    postal_code: values[2],
    country: values[3],
  };
}


export function emailFooter(
  businessName: string,
  unsubscribeUrl: string,
  address?: SenderAddress | null,
) {
  // CAN-SPAM and CASL both require a valid physical postal address in
  // commercial email. Campaign mail passes an address; transactional and
  // referral mail keeps the compact footer.
  const postal = address
    ? `<p style="margin:8px 0 0;font-size:12px;color:#94a3b8">${esc(businessName)}, ${esc(address.street_address)}, ${esc(address.city)} ${esc(address.postal_code)}, ${esc(address.country)}</p>`
    : "";
  return `<p style="margin:28px 0 0;font-size:12px;color:#94a3b8">You are getting this because you are a customer of ${esc(businessName)}. <a href="${unsubscribeUrl}" style="color:#64748b">Unsubscribe</a> to stop these messages.</p>
    ${postal}
    <p style="margin:8px 0 0;font-size:12px;color:#94a3b8">Sent through Revvin on behalf of ${esc(businessName)}.</p>`;
}

export function emailShell(
  businessName: string,
  inner: string,
  unsubscribeUrl: string,
  address?: SenderAddress | null,
) {
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f6f7f9;font-family:-apple-system,BlinkMacSystemFont,'Inter',Segoe UI,Roboto,sans-serif;color:#0f172a">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px">
    <div style="font-size:13px;color:#15803d;font-weight:600;letter-spacing:.04em;text-transform:uppercase">${esc(businessName)}</div>
    ${inner}
    ${emailFooter(businessName, unsubscribeUrl, address)}
  </div>
</body></html>`;
}

export function button(href: string, label: string) {
  return `<a href="${href}" style="display:inline-block;background:#15803d;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600;font-size:14px">${esc(label)}</a>`;
}

/**
 * Merge tokens available to campaign and review templates.
 *
 * Accepts both `{token}` and `{{token}}`: the composer emits single braces and
 * older templates use double braces. Unknown tokens render as an empty string
 * rather than leaking the literal placeholder to a customer.
 */
export function renderTokens(
  input: string,
  tokens: Record<string, string>,
  escapeHtml: boolean,
): string {
  return String(input ?? "").replace(
    /\{\{\s*([a-z_]+)\s*\}\}|\{\s*([a-z_]+)\s*\}/gi,
    (_m, doubleKey: string | undefined, singleKey: string | undefined) => {
      const key = (doubleKey ?? singleKey ?? "").toLowerCase();
      const value = tokens[key] ?? "";
      return escapeHtml ? esc(value) : value;
    },
  );
}
