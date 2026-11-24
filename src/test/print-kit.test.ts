// @vitest-environment node
import { describe, it, expect } from "vitest";
import { PDFDocument } from "pdf-lib";
import { unzipSync, strFromU8 } from "fflate";
import { PRINT_ASSETS } from "@/lib/printAssets";
import { renderAssetPdf, renderKit, kitZip, qrMatrix } from "@/lib/printPdf";
import { printSpecsText } from "@/lib/printKit";
import {
  businessDecision, PRINT_KIT_PIECES, printFileName, printKitEmail, rateLimitDecision, sanitizeNote,
  validKitFolder, validPrintShopEmail,
} from "../../supabase/functions/_shared/print-kit";

const biz = { name: "QA Test Plumbing", offer_amount: "$100", offer_trigger: "the job is done", headline: "Know someone with a leak?", offer_fine_print: "One reward per new customer.", phone: "6045550101", brand_color: "#1d4ed8" };
const url = "https://revvin.co/r/qa-test-plumbing";

describe("print PDFs", () => {
  for (const asset of PRINT_ASSETS) {
    it(`${asset.id} page is exactly ${asset.widthIn} x ${asset.heightIn} in`, async () => {
      const doc = await PDFDocument.load(await renderAssetPdf(asset, biz, url));
      expect(doc.getPageCount()).toBe(1);
      const { width, height } = doc.getPage(0).getSize();
      expect(width).toBeCloseTo(asset.widthIn * 72, 6);
      expect(height).toBeCloseTo(asset.heightIn * 72, 6);
    });
  }
  it("QR encodes the referral URL at error correction H", () => {
    const m = qrMatrix(url);
    expect(m.length).toBeGreaterThanOrEqual(21);
    expect(m.every((row) => row.length === m.length)).toBe(true);
  });
  it("survives a missing reward and non-Latin characters", async () => {
    const bytes = await renderAssetPdf(PRINT_ASSETS[2], { name: "Café \u4e2d Plumbing", offer_amount: "" }, url);
    expect(bytes.byteLength).toBeGreaterThan(1000);
  });
});

describe("kit zip", () => {
  it("holds the five PDFs named {slug}-{asset}.pdf and print-specs.txt", async () => {
    const files = await renderKit(PRINT_ASSETS, biz, url, "qa-test-plumbing");
    const zip = unzipSync(kitZip(files, PRINT_ASSETS, "qa-test-plumbing"));
    expect(Object.keys(zip).sort()).toEqual([...PRINT_ASSETS.map((a) => `qa-test-plumbing-${a.id}.pdf`), "print-specs.txt"].sort());
    const specs = strFromU8(zip["print-specs.txt"]);
    for (const a of PRINT_ASSETS) {
      expect(specs).toContain(`Finished size: ${a.widthIn} x ${a.heightIn} inches`);
      expect(specs).toContain(`QR code: ${a.qrIn} x ${a.qrIn} inches`);
      expect(specs).toContain(a.where);
    }
    expect(specs.match(/full color, one side/g)).toHaveLength(5);
    expect(specs).not.toMatch(/\$|gsm|stock|quantity/i);
  });
  it("specs text has no em dashes", () => expect(printSpecsText(PRINT_ASSETS, "x")).not.toContain("\u2014"));
});

describe("send-print-kit rules", () => {
  it("server piece list matches the print pack", () => {
    expect(PRINT_KIT_PIECES.map((p) => [p.id, p.widthIn, p.heightIn])).toEqual(PRINT_ASSETS.map((a) => [a.id, a.widthIn, a.heightIn]));
  });
  it("allows 5 a day and 20 in 30 days", () => {
    expect(rateLimitDecision(4, 19)).toBeNull();
    expect(rateLimitDecision(5, 5)).toBe("rate_limited_day");
    expect(rateLimitDecision(0, 20)).toBe("rate_limited_month");
  });
  it("only the owner of an active, non-demo business may send", () => {
    expect(businessDecision({ user_id: "u1" }, "u1")).toBeNull();
    expect(businessDecision({ user_id: "u1" }, "u2")).toBe("business_not_found");
    expect(businessDecision(null, "u1")).toBe("business_not_found");
    expect(businessDecision({ user_id: "u1", is_disabled: true }, "u1")).toBe("business_disabled");
    expect(businessDecision({ user_id: "u1", is_demo: true }, "u1")).toBe("demo_account");
  });
  it("note is plain text, linkless, capped at 300", () => {
    expect(sanitizeNote("<b>Hi</b> see https://evil.example/x and www.bad.com or shop.com/path ok")).toBe("Hi see and or ok");
    expect(sanitizeNote("a".repeat(400))).toHaveLength(300);
    expect(sanitizeNote("<script>alert(1)</script>")).toBe("alert(1)");
  });
  it("validates recipient and folder shape", () => {
    expect(validPrintShopEmail("orders@printshop.ca")).toBe(true);
    expect(validPrintShopEmail("not an email")).toBe(false);
    expect(validPrintShopEmail("x@example.com")).toBe(false);
    const id = "11111111-2222-3333-4444-555555555555";
    expect(validKitFolder(`${id}/${"a".repeat(32)}`, id)).toBe(true);
    expect(validKitFolder(`${id}/${"a".repeat(32)}`, "other")).toBe(false);
    expect(validKitFolder(`${id}/../x`, id)).toBe(false);
  });
  it("email escapes the note and names the business", () => {
    const e = printKitEmail({ businessName: "Ace & Sons", note: "<i>2 of each</i>", links: PRINT_KIT_PIECES.map((p) => ({ id: p.id, url: `https://x.test/${p.id}` })), address: null });
    expect(e.subject).toBe("Print files from Ace & Sons");
    expect(e.html).toContain("Ace &amp; Sons would like these printed.");
    expect(e.html).toContain("&lt;i&gt;2 of each&lt;/i&gt;");
    expect(e.html).toContain("Reply to this email to reach Ace &amp; Sons.");
    expect(e.html).toContain("Sent with Revvin (revvin.co)");
    expect(e.html.match(/Download PDF/g)).toHaveLength(5);
    expect(printFileName("ace", "yard-sign")).toBe("ace-yard-sign.pdf");
  });
});
