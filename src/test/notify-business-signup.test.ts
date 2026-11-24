// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { acquisitionSubject } from "../../supabase/functions/_shared/acquisition-notification";

// Execute the real handler with all persistence and email delivery replaced.
async function notification(published: boolean, isPublished: boolean, indexApproved: boolean) {
  let handler: ((req: Request) => Promise<Response>) | undefined;
  const business = { id: "fixture-business", user_id: "fixture-user", name: "Fixture Roofing", category: "Roofing", is_published: isPublished, index_approved: indexApproved, created_at: "2026-11-24T12:00:00Z" };
  const send = vi.fn().mockResolvedValue({ success: true });
  const owner = { id: business.user_id, email: "owner@fixture.invalid", user_metadata: {} };
  const query: Record<string, any> = {};
  for (const method of ["select", "eq", "order", "is", "update"]) query[method] = () => query;
  query.limit = async () => ({ data: [business] });
  query.insert = async () => ({ error: null });
  query.then = (resolve: (value: unknown) => unknown) => Promise.resolve({ data: [{ id: business.id }] }).then(resolve);
  const client = { from: () => query, auth: { getUser: async () => ({ data: { user: owner }, error: null }), admin: { getUserById: async () => ({ data: { user: owner }, error: null }) } } };
  const require = (id: string) => {
    if (id.endsWith("/cors")) return { corsHeaders: {} };
    if (id.includes("supabase-js")) return { createClient: () => client };
    if (id.endsWith("app-config.ts")) return { ADMIN_NOTIFICATION_EMAIL: "info@revvin.co", appUrl: (path: string) => `https://revvin.co${path}`, RESEND_FROM_ADDRESS: "fixture", RESEND_REPLY_TO: "fixture" };
    if (id.endsWith("resend-gateway.ts")) return { sendEmailViaGateway: send };
    if (id.endsWith("lifecycle-email.ts")) return { sendLifecycleEmail: vi.fn() };
    if (id.endsWith("partner-attribution.ts")) return { attributeBusinessToPartner: vi.fn() };
    if (id.endsWith("cron-auth.ts")) return { checkCronAuth: () => ({ ok: true }) };
    if (id.endsWith("acquisition-notification.ts")) return { acquisitionSubject };
    throw new Error(`Unexpected dependency ${id}`);
  };
  const js = ts.transpileModule(readFileSync("supabase/functions/notify-business-signup/index.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  new Function("require", "exports", "Deno", js)(require, {}, { env: { get: () => "fixture-only" }, serve: (fn: typeof handler) => { handler = fn; } });
  if (!handler) throw new Error("Missing handler");
  const response = await handler(new Request("https://fixture.invalid", { method: "POST", headers: { Authorization: "Bearer fixture-only" }, body: JSON.stringify({ record: { id: business.id }, ...(published ? { event: "published" } : {}) }) }));
  expect(response.status).toBe(200);
  expect(send).toHaveBeenCalledTimes(1);
  return send.mock.calls[0][0];
}

describe("internal signup publication state", () => {
  it("new signup with an unpublished page reports registered and not yet published", async () => {
    const email = await notification(false, false, false);
    expect(email.to).toBe("info@revvin.co");
    expect(email.subject).toBe("New signup: Fixture Roofing (Roofing)");
    expect(email.html).toContain("has registered on Revvin. Its page is not yet published.");
  });
  it("new signup with a live page reports registered and live", async () => {
    const email = await notification(false, true, false);
    expect(email.html).toContain("has registered on Revvin. Its page is live.");
  });
  it("publication reports that the page is now live rather than awaiting approval", async () => {
    const email = await notification(true, true, false);
    expect(email.subject).toBe("Published: Fixture Roofing");
    expect(email.html).toContain("The business page is now live.");
    expect(email.html).not.toMatch(/awaiting approval|This business is pending approval/);
  });
  it.each([false, true])("pending search approval is separate from publication (published event %s)", async published => {
    expect((await notification(published, true, false)).html).toContain("Search listing approval pending in super admin");
  });
  it.each([false, true])("approved search listings do not claim approval is pending (published event %s)", async published => {
    expect((await notification(published, true, true)).html).not.toContain("Search listing approval pending in super admin");
  });
});