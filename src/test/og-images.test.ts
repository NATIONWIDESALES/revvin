import { describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { ogFileName, ogKind, ogUrl, writeOgImages } from "../../plugins/og";

describe("Open Graph image build", () => {
  it("names one file per route and maps paths to chip labels", () => {
    expect(ogFileName("/")).toBe("home.png");
    expect(ogFileName("/guides/referral-text-templates")).toBe("guides--referral-text-templates.png");
    expect(ogKind("/compare/referralwise")).toBe("Compare");
    expect(ogKind("/guides/x")).toBe("Guide");
    expect(ogKind("/r/some-business")).toBe("Referral reward");
    expect(ogUrl("https://revvin.co", "/pricing")).toBe("https://revvin.co/og/pricing.png");
  });

  it("writes a PNG per card and reports which paths were written", async () => {
    const dist = fs.mkdtempSync(path.join(os.tmpdir(), "revvin-og-"));
    const cards = [
      { path: "/", title: "Revvin | Free referral program for home-service businesses", kind: "Revvin" },
      { path: "/pricing", title: "Pricing | Revvin", kind: "Pricing" },
    ];
    const result = await writeOgImages(dist, cards);
    expect(result.failed).toEqual([]);
    expect(result.written).toEqual(["/", "/pricing"]);
    for (const card of cards) {
      const file = path.join(dist, "og", ogFileName(card.path));
      expect(fs.existsSync(file)).toBe(true);
      // PNG magic bytes: a real image, not an empty or error file.
      expect(fs.readFileSync(file).subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]))).toBe(true);
    }
    fs.rmSync(dist, { recursive: true, force: true });
  }, 60000);
});
