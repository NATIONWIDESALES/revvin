import ipaddr from "npm:ipaddr.js@2.2.0";

export function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] ?? c));
}
export function csvCell(value: unknown): string {
  const text = String(value ?? "");
  return /^[\s]*[=+\-@]/.test(text) ? `'${text}` : text;
}
export function publicAddress(address: string): boolean {
  try {
    const parsed = ipaddr.process(address);
    return parsed.range() === "unicast";
  } catch { return false; }
}
export function webhookUrl(raw: string): URL {
  const url = new URL(raw);
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (url.protocol !== "https:" || url.username || url.password || !host.includes(".") || /(^|\.)(localhost|local|internal|test|invalid)$/.test(host)) throw new Error("Invalid webhook destination");
  if (ipaddr.isValid(host) && !publicAddress(host)) throw new Error("Private webhook destination");
  return url;
}
export async function validateWebhookDns(raw: string): Promise<void> {
  const url = webhookUrl(raw);
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (ipaddr.isValid(host)) return;
  const answers = await Promise.allSettled([Deno.resolveDns(host, "A"), Deno.resolveDns(host, "AAAA")]);
  const addresses = answers.flatMap(answer => answer.status === "fulfilled" ? answer.value : []);
  if (!addresses.length || addresses.some(address => !publicAddress(address))) throw new Error("Unsafe webhook DNS");
}