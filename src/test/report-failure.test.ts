import { beforeEach, describe, expect, it, vi } from "vitest";
import { reportFailure } from "@/lib/reportFailure";
const h = vi.hoisted(() => ({ load: vi.fn(), rpc: vi.fn(), demo: false }));
vi.mock("@/lib/supabaseLazy", () => ({ loadSupabase: h.load }));
beforeEach(() => {
  vi.unstubAllEnvs(); h.demo = false; h.rpc.mockReset(); h.load.mockReset();
  h.load.mockResolvedValue({ auth: { getSession: async () => ({ data: { session: { user: { id: "owner" } } } }) },
    from: () => ({ select: () => ({ eq: () => ({ limit: async () => ({ data: [{ is_demo: h.demo }], error: null }) }) }) }), rpc: h.rpc });
});
const flush = async () => { for (let i=0;i<8;i++) await Promise.resolve(); };
describe("reportFailure safety", () => {
  it("does nothing in tests by default", () => {
    reportFailure("image_upload", { error: new Error("failed") }); expect(h.load).not.toHaveBeenCalled();
  });
  it("never throws or rejects when the network fails", async () => {
    vi.stubEnv("MODE", "production"); h.load.mockRejectedValue(new Error("offline"));
    expect(() => reportFailure("image_upload")).not.toThrow(); await flush();
    expect(h.load).toHaveBeenCalledOnce();
    h.load.mockResolvedValue({ auth: { getSession: async () => ({ data: { session: null } }) }, rpc: h.rpc });
    h.rpc.mockRejectedValue(new Error("offline")); reportFailure("render_crash"); await flush();
    expect(h.rpc).toHaveBeenCalledOnce();
  });
  it("skips the demo account both explicitly and from the owner's row", async () => {
    vi.stubEnv("MODE", "production"); reportFailure("image_upload", { is_demo: true }); expect(h.load).not.toHaveBeenCalled();
    h.demo=true; reportFailure("image_upload"); await flush(); expect(h.rpc).not.toHaveBeenCalled();
  });
  it("sends only bounded message/code and strips query strings and secrets", async () => {
    vi.stubEnv("MODE", "production");
    history.replaceState(null, "", "/dashboard?token=private");
    reportFailure("image_upload", { error: { message: 'Storage denied token=secret owner@example.test "form" ' + 'x'.repeat(400), code: "403", password: "never" } });
    await flush();
    const data = h.rpc.mock.calls[0][1];
    expect(data.p_message.length).toBe(300); expect(data.p_message).not.toMatch(/secret|owner@example|"form"|never/);
    expect(data.p_route).toBe("/dashboard"); expect(data.p_code).toBe("403");
  });
});