import { describe, it, expect } from "vitest";
import {
  contactEligibility,
  channelAllowed,
  loadSuppression,
  type SuppressionSnapshot,
} from "@/lib/contactEligibility";

const empty = (): SuppressionSnapshot => ({
  emails: new Set(),
  phones: new Set(),
  allChannels: new Set(),
  globalEmailsChecked: true,
});

const contact = (over: Partial<{ status: string; email: string | null; phone: string | null }> = {}) => ({
  status: "pending",
  email: "jane@example.com",
  phone: "555-123-4567",
  ...over,
});

describe("contact eligibility", () => {
  it("blocks everything for an opted-out contact", () => {
    const e = contactEligibility(contact({ status: "opted_out" }), empty());
    expect(e.optedOut).toBe(true);
    expect(e.canPrepare).toBe(false);
    for (const ch of ["sms", "email", "share"] as const) {
      expect(channelAllowed(e, ch)).toBe(false);
    }
  });

  it("blocks everything when the suppression list could not be read (fail closed)", () => {
    const e = contactEligibility(contact(), null);
    expect(e.canPrepare).toBe(false);
    expect(e.unknown).toBe(true);
    expect(e.reason).toMatch(/could not check/i);
  });

  it("keeps text allowed when only the email address is suppressed", () => {
    const snap = empty();
    snap.emails.add("jane@example.com");
    const e = contactEligibility(contact(), snap);
    expect(channelAllowed(e, "email")).toBe(false);
    expect(channelAllowed(e, "sms")).toBe(true);
    expect(channelAllowed(e, "share")).toBe(true);
    expect(e.optedOut).toBe(false);
  });

  it("keeps email allowed when only the phone number is suppressed", () => {
    const snap = empty();
    snap.phones.add("5551234567");
    const e = contactEligibility(contact(), snap);
    expect(channelAllowed(e, "sms")).toBe(false);
    expect(channelAllowed(e, "email")).toBe(true);
  });

  it("blocks copy and share once every recorded channel is suppressed", () => {
    const snap = empty();
    snap.emails.add("jane@example.com");
    snap.phones.add("5551234567");
    const e = contactEligibility(contact(), snap);
    expect(e.canPrepare).toBe(false);
    expect(channelAllowed(e, "share")).toBe(false);
  });

  it("blocks every channel for a scope of all", () => {
    const snap = empty();
    snap.allChannels.add("jane@example.com");
    const e = contactEligibility(contact(), snap);
    expect(e.optedOut).toBe(true);
    expect(e.canPrepare).toBe(false);
  });

  it("does not offer a channel the contact has no address for", () => {
    const e = contactEligibility(contact({ phone: null }), empty());
    expect(channelAllowed(e, "sms")).toBe(false);
    expect(channelAllowed(e, "email")).toBe(true);
  });
});

describe("loadSuppression", () => {
  const client = (contactsResult: any, rpcResult: any = { data: [], error: null }) => ({
    from: () => ({
      select: () => ({ eq: async () => contactsResult }),
    }),
    rpc: async () => rpcResult,
  });

  it("fails closed when the per-business list errors", async () => {
    const r = await loadSuppression(client({ data: null, error: { message: "denied" } }) as any, "b1");
    expect(r.snapshot).toBeNull();
    expect(r.error).toBeTruthy();
  });

  it("records scope per channel", async () => {
    const r = await loadSuppression(
      client({
        data: [
          { contact_type: "email", contact_value: "Jane@Example.com" },
          { contact_type: "phone", contact_value: "(555) 123-4567" },
          { contact_type: "all", contact_value: "gone@example.com" },
        ],
        error: null,
      }) as any,
      "b1",
    );
    expect(r.snapshot!.emails.has("jane@example.com")).toBe(true);
    expect(r.snapshot!.phones.has("5551234567")).toBe(true);
    expect(r.snapshot!.allChannels.has("gone@example.com")).toBe(true);
  });

  it("degrades with a warning, not a block, when the global list is unavailable", async () => {
    const r = await loadSuppression(
      client({ data: [], error: null }, { data: null, error: { message: "no function" } }) as any,
      "b1",
    );
    expect(r.snapshot).not.toBeNull();
    expect(r.snapshot!.globalEmailsChecked).toBe(false);
    expect(r.warning).toBeTruthy();
    expect(r.error).toBeUndefined();
  });
});
