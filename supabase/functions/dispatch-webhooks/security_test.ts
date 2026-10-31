import { csvCell, publicAddress, webhookUrl, validateWebhookDns } from "../_shared/security.ts";

function equal(actual: unknown, expected: unknown) {
  if (actual !== expected) throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}
Deno.test("11: block localhost, private and reserved IP destinations", () => {
  for (const address of ["127.0.0.1", "10.0.0.1", "172.16.1.1", "192.168.1.1", "169.254.169.254", "::1", "::ffff:127.0.0.1", "fc00::1", "fe80::1"]) equal(publicAddress(address), false);
  equal(publicAddress("8.8.8.8"), true);
  for (const url of ["http://example.com", "https://localhost", "https://127.0.0.1", "https://192.168.1.1", "https://user:pass@example.com"]) {
    let blocked = false; try { webhookUrl(url); } catch { blocked = true; } equal(blocked, true);
  }
});
Deno.test("11: DNS validation fails closed on mixed private/public answers", async () => {
  const original = Deno.resolveDns;
  try {
    Deno.resolveDns = (() => Promise.resolve(["8.8.8.8", "127.0.0.1"])) as unknown as typeof Deno.resolveDns;
    let blocked = false; try { await validateWebhookDns("https://example.com/hook"); } catch { blocked = true; } equal(blocked, true);
  } finally { Deno.resolveDns = original; }
});
Deno.test("20: CSV formula prefixes are neutralized", () => {
  for (const value of ["=1+1", "+1", "-2", "@SUM(A1)", "  =cmd"]) equal(csvCell(value), `'${value}`);
  equal(csvCell("Normal business"), "Normal business");
});