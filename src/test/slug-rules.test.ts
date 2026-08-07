import { describe, it, expect } from "vitest";
import { checkSlug, normalizeSlug, suggestSlug } from "@/lib/slugRules";

describe("slug rules", () => {
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
    expect(checkSlug("penistone-heating").ok).toBe(true);
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
