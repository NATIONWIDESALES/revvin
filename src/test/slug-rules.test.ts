import { describe, it, expect, vi } from "vitest";
import { checkSlug, normalizeSlug, suggestSlug } from "@/lib/slugRules";

describe("slug rules", () => {
  it.each([
    "patriot-plumbing", "patriot-painting", "pilot-plumbing", "hot-pressure-washing",
    "trevino-roofing", "billings-roofing", "accountable-roofing", "secure-home-alarms",
    "security-pros", "pinstripe-painting", "verified-electric", "rewinter-roofing",
    "s3cur3-home-alarms", "billing-roofing", "otp-plumbing", "2fa-roofing",
  ])("accepts legitimate contractor name %s", (slug) => {
    expect(checkSlug(slug)).toEqual({ ok: true });
  });
  it.each([
    "revvin", "rewvin", "revvn", "revvinn", "my-revvin-roofing", "r3vv1n-roofing",
    "revin", "rewin", "revin-roofing", "rewin-roofing", "r3v1n-roofing",
    "official", "verify", "verification", "verified", "secure", "security", "account",
    "billing", "payment", "payments", "password", "refund", "invoice", "stripe",
    "paypal", "wallet", "login", "signin", "2fa", "otp", "secure-billing",
    "revvin-secure", "account-verify", "login-otp", "s3cur3-b1ll1ng", "otp-otp",
  ])("rejects impersonation or phishing name %s", (slug) => {
    expect(checkSlug(slug).reason).toBe("reserved");
  });
  it("retains Patriot Plumbing's name in its suggested link", () => {
    expect(suggestSlug("Patriot Plumbing")).toBe("patriot-plumbing");
  });
  it("regenerates a random fallback rejected by the final rules", () => {
    const random = vi.spyOn(Math, "random")
      .mockReturnValueOnce(parseInt("fuckxx", 36) / 36 ** 6)
      .mockReturnValueOnce(parseInt("x7k2p9", 36) / 36 ** 6);
    try {
      const slug = suggestSlug("revvin fuck");
      expect(slug).toBe("partner-x7k2p9");
      expect(checkSlug(slug).ok).toBe(true);
      expect(random).toHaveBeenCalledTimes(2);
    } finally { random.mockRestore(); }
  });
  it("accepts a normal business slug", () => {
    expect(checkSlug("denver-roofing-co")).toEqual({ ok: true });
    expect(checkSlug("karm-sandhu-real-estate")).toEqual({ ok: true });
  });

  it("rejects reserved routes and infrastructure names", () => {
    expect(checkSlug("admin").reason).toBe("reserved");
    expect(checkSlug("dashboard").reason).toBe("reserved");
  });

  it("rejects brand impersonation and phishing wording", () => {
    expect(checkSlug("revvin-support").reason).toBe("reserved");
    expect(checkSlug("account-verify").reason).toBe("reserved");
    expect(checkSlug("secure-billing").reason).toBe("reserved");
  });

  it("rejects leetspeak and hyphen evasion", () => {
    expect(checkSlug("4dm1n").reason).toBe("reserved");
    expect(checkSlug("r3vv1n").reason).toBe("reserved");
    expect(checkSlug("f-u-c-k").reason).toBe("profanity");
  });

  it("rejects unicode lookalikes", () => {
    expect(checkSlug("rеvvin").reason).toBe("format"); // Cyrillic е
    expect(checkSlug("café-roofing").reason).toBe("format");
  });

  it("allows legitimate names with awkward substrings", () => {
    expect(checkSlug("scunthorpe-plumbing").ok).toBe(true);
    expect(checkSlug("assiniboine-landscaping").ok).toBe(true);
  });

  it("enforces format and numeric rules", () => {
    expect(checkSlug("ab").reason).toBe("format");
    expect(checkSlug("my--biz").reason).toBe("format");
    expect(checkSlug("-lead").reason).toBe("format");
    expect(checkSlug("12345").reason).toBe("numeric");
  });

  it("normalises hyphens and substitutions", () => {
    expect(normalizeSlug("r3vv1n-c0")).toBe("revvinco");
  });

  it("suggests a valid alternative from the business name", () => {
    const s = suggestSlug("Revvin Roofing");
    expect(checkSlug(s).ok).toBe(true);
  });
});
