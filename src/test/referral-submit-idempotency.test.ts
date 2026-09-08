import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";

/**
 * Request-scoped idempotency for guest referral submission.
 *
 * These tests exercise the client contract and a faithful in-memory model of the
 * SQL function's rules. They do NOT execute SQL: the pending migration has not
 * been applied to Cloud. A separate in-memory PostgreSQL regression harness in
 * Research/backend-regression executes the actual pending SQL on fixtures.
 */

const rpc = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: (...args: unknown[]) => rpc(...args) },
}));

const {
  submitPublicReferral,
  referralRequestId,
  clearReferralRequestId,
  newRequestId,
  referralSubmitMessage,
} = await import("@/lib/referralSubmit");

const input = {
  slug: "summit-roofing",
  referrer_name: "Dana Reyes",
  referrer_email: "dana@example.com",
  lead_name: "Sam Cole",
  lead_phone: "5551230000",
  lead_need: "Roof leak over the porch",
  consent_given: true,
};

describe("request id", () => {
  beforeEach(() => {
    clearReferralRequestId(input.slug);
    sessionStorage.clear();
    rpc.mockReset();
  });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it("generates a high-entropy id the server will accept", () => {
    const ids = new Set(Array.from({ length: 200 }, () => newRequestId()));
    expect(ids.size).toBe(200);
    for (const id of ids) expect(id).toMatch(/^[A-Za-z0-9_-]{24,64}$/);
  });

  it("keeps one id across retries of the same submission", () => {
    const a = referralRequestId("summit-roofing");
    const b = referralRequestId("summit-roofing");
    expect(a).toBe(b);
    clearReferralRequestId("summit-roofing");
    expect(referralRequestId("summit-roofing")).not.toBe(a);
  });

  it("sends the request id and starts a fresh one after success", async () => {
    rpc.mockResolvedValue({
      data: { lead_id: "l1", status_token: "t1", business_name: "Summit", replay: false },
      error: null,
    });
    const held = referralRequestId(input.slug);
    const { receipt } = await submitPublicReferral(input);
    expect(receipt?.status_token).toBe("t1");
    const args = rpc.mock.calls[0][1] as Record<string, unknown>;
    expect(args.p_request_id).toBe(held);
    // Settled, so the next referral is a new submission rather than a replay.
    expect(referralRequestId(input.slug)).not.toBe(held);
  });

  it("never asks the server to look a submission up by contact details", async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    await submitPublicReferral(input);
    const args = rpc.mock.calls[0][1] as Record<string, unknown>;
    expect(Object.keys(args)).not.toContain("p_lookup_email");
    expect(Object.keys(args)).not.toContain("p_lookup_phone");
    expect(Object.keys(args)).not.toContain("p_business_id");
  });

  it("shows one generic message for a payload conflict", () => {
    const generic = referralSubmitMessage({ message: "submission_conflict" });
    expect(generic).toBeTruthy();
    expect(generic).toBe(referralSubmitMessage({ message: "invalid_request_id" }));
    expect(generic).not.toMatch(/already|duplicate|someone|existing/i);
  });

  it("keeps the same request through a failed call when session storage throws", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("storage disabled"); });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("storage disabled"); });
    rpc.mockResolvedValueOnce({ data: null, error: { message: "network unavailable" } });
    rpc.mockResolvedValueOnce({ data: { lead_id: "fixture", status_token: "fixture-token", replay: true }, error: null });
    await submitPublicReferral(input);
    await submitPublicReferral(input);
    expect(rpc.mock.calls[0][1].p_request_id).toBe(rpc.mock.calls[1][1].p_request_id);
    expect(referralRequestId(input.slug)).not.toBe(rpc.mock.calls[1][1].p_request_id);
  });

  it("returns an error without submitting when secure randomness is unavailable", async () => {
    vi.stubGlobal("crypto", undefined);
    const result = await submitPublicReferral(input);
    expect(result.receipt).toBeNull();
    expect(result.error).toBeInstanceOf(Error);
    expect(rpc).not.toHaveBeenCalled();
  });
});

/**
 * Model of fn_submit_public_referral's idempotency rules. Keep in step with
 * db/pending/20260908_release_1.sql.
 */
type Row = { business_id: string; request_id: string; fingerprint: string; lead_id: string };

function makeServer() {
  const subs: Row[] = [];
  const leads = new Map<string, { token: string; referrer: string }>();
  let n = 0;
  const fp = (biz: string, p: Record<string, string>) =>
    [biz, p.referrer_email, p.lead_phone, p.lead_need].join("\u001f");

  return {
    leads,
    submit(biz: string, requestId: string, payload: Record<string, string>) {
      const f = fp(biz, payload);
      const existing = subs.find((s) => s.business_id === biz && s.request_id === requestId);
      if (existing) {
        if (existing.fingerprint !== f) throw new Error("submission_conflict");
        const lead = leads.get(existing.lead_id)!;
        return { lead_id: existing.lead_id, status_token: lead.token, replay: true };
      }
      const leadId = `lead_${++n}`;
      leads.set(leadId, { token: `tok_${leadId}`, referrer: payload.referrer_email });
      subs.push({ business_id: biz, request_id: requestId, fingerprint: f, lead_id: leadId });
      return { lead_id: leadId, status_token: `tok_${leadId}`, replay: false };
    },
  };
}

describe("server idempotency rules (modelled, not executed against SQL)", () => {
  const payload = {
    referrer_email: "dana@example.com",
    lead_phone: "5551230000",
    lead_need: "Roof leak",
  };

  it("replays only the caller's own receipt for the same request and payload", () => {
    const s = makeServer();
    const first = s.submit("biz1", "req-aaaaaaaaaaaaaaaaaaaaaa", payload);
    const retry = s.submit("biz1", "req-aaaaaaaaaaaaaaaaaaaaaa", payload);
    expect(retry.status_token).toBe(first.status_token);
    expect(retry.replay).toBe(true);
  });

  it("fails generically when the same request id carries a changed payload", () => {
    const s = makeServer();
    s.submit("biz1", "req-aaaaaaaaaaaaaaaaaaaaaa", payload);
    expect(() =>
      s.submit("biz1", "req-aaaaaaaaaaaaaaaaaaaaaa", { ...payload, lead_need: "Gutters" }),
    ).toThrowError("submission_conflict");
  });

  it("never discloses another referrer's receipt for the same prospect contact", () => {
    const s = makeServer();
    const mine = s.submit("biz1", "req-aaaaaaaaaaaaaaaaaaaaaa", payload);
    const theirs = s.submit("biz1", "req-bbbbbbbbbbbbbbbbbbbbbb", {
      ...payload,
      referrer_email: "other@example.com",
    });
    expect(theirs.status_token).not.toBe(mine.status_token);
    expect(theirs.replay).toBe(false);
    expect(s.leads.get(theirs.lead_id)!.referrer).toBe("other@example.com");
  });

  it("treats the same request id under a different business as separate", () => {
    const s = makeServer();
    const a = s.submit("biz1", "req-aaaaaaaaaaaaaaaaaaaaaa", payload);
    const b = s.submit("biz2", "req-aaaaaaaaaaaaaaaaaaaaaa", payload);
    expect(b.status_token).not.toBe(a.status_token);
  });
});
