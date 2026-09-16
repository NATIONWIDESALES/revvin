import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { INSTALL_COPY, INSTALL_SURFACES, referrerInstallLine } from "@/config/installCopy";
import { buildBusinessManifest, buildStatusManifest, businessManifestPath, shortAppName } from "@/lib/webManifest";

const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), "utf8");

describe("home screen copy", () => {
  const copy = read("src/config/installCopy.ts");

  it("never uses store or native wording, and no em dashes", () => {
    // The FAQ answer is the one place the words appear, to say the opposite:
    // there is nothing to download from an app store.
    const { faq, ...rest } = INSTALL_COPY;
    const visible = Object.values(rest)
      .flatMap((value) =>
        typeof value === "string" ? [value] : Array.isArray(value) ? value : Object.values(value),
      )
      .join(" ");
    // "no app store needed" is fine; naming a store as a place to get Revvin is not.
    for (const banned of ["download", "App Store", "Google Play", "native app", "\u2014"]) {
      expect(visible).not.toContain(banned);
    }
    expect(visible.toLowerCase()).not.toContain("google play");
    // The comment header is allowed to name the banned words, the exported copy is not.
    expect(copy.split("*/")[1]).not.toContain("\u2014");
  });

  it("keeps the exact required phrases", () => {
    expect(INSTALL_COPY.mainLabel).toBe("Add Revvin to your home screen");
    expect(INSTALL_COPY.supportingLine).toBe("Free, no app store needed. Opens full screen like an app.");
    expect(INSTALL_COPY.androidButton).toBe("Install the Revvin app");
    expect(INSTALL_COPY.iosSteps).toEqual([
      "1. Tap the Share button",
      "2. Scroll and tap Add to Home Screen",
      "3. Tap Add",
    ]);
    expect(referrerInstallLine("Summit Roofing")).toBe(
      "Save this page to your home screen so you can refer Summit Roofing again in one tap.",
    );
  });

  it("shares the email wording with the backend copy file", () => {
    const backend = read("supabase/functions/_shared/install-copy.ts");
    expect(backend).toContain(INSTALL_COPY.emailTip);
    expect(backend).toContain(INSTALL_COPY.leadEmailFooter);
  });
});

describe("per page manifests", () => {
  it("reopens the business referral page, not the dashboard", () => {
    const m = buildBusinessManifest({ slug: "summit-roofing", name: "Summit Roofing Company" });
    expect(m.start_url).toBe("/r/summit-roofing");
    expect(m.scope).toBe("/r/summit-roofing");
    expect(m.id).toBe("/r/summit-roofing");
    expect(m.name).toBe("Refer Summit Roofing Company");
    expect(m.short_name).toBe("Summit Roofi");
    expect(shortAppName("Summit Roofing Company").length).toBeLessThanOrEqual(12);
    expect(m.display).toBe("standalone");
    expect(businessManifestPath("summit-roofing")).toBe("/manifests/r-summit-roofing.webmanifest");
  });

  it("uses the business logo when there is one, and always keeps a fallback icon", () => {
    const withLogo = buildBusinessManifest({ slug: "a", name: "A", logoUrl: "https://cdn.test/logo.png" });
    expect(withLogo.icons[0].src).toBe("https://cdn.test/logo.png");
    expect(withLogo.icons.length).toBeGreaterThan(1);
    const without = buildBusinessManifest({ slug: "a", name: "A" });
    expect(without.icons[0].src).toBe("/icons/icon-192.png");
  });

  it("reopens the referral receipt for the status page", () => {
    const m = buildStatusManifest("/r/status/abc", "Summit Roofing");
    expect(m.start_url).toBe("/r/status/abc");
    expect(m.scope).toBe("/r/status/abc");
  });

  it("is written for every published page at build time", () => {
    const plugin = read("plugins/prerender.ts");
    expect(plugin).toContain("manifests/r-${biz.slug}.webmanifest");
    expect(plugin).toContain('<link rel="manifest"');
  });
});

describe("install surfaces", () => {
  it("hides the prompt once the app runs from the home screen", () => {
    const component = read("src/components/pwa/AddToHomeScreen.tsx");
    expect(component).toContain("const standalone = isStandalone()");
    expect(component).toContain("!standalone &&");
  });

  it("tracks a shown and a clicked event with a fixed surface list", () => {
    const component = read("src/components/pwa/AddToHomeScreen.tsx");
    expect(component).toContain('track("pwa_install_cta_shown"');
    expect(component).toContain('track("pwa_install_cta_clicked"');
    expect(INSTALL_SURFACES).toEqual([
      "welcome_card",
      "checklist",
      "notifications_card",
      "referral_success",
      "referral_status",
      "banner",
    ]);
  });

  it("puts the prompt on the owner and referrer surfaces", () => {
    expect(read("src/components/dashboard/WelcomeLiveCard.tsx")).toContain('surface="welcome_card"');
    expect(read("src/components/pwa/HomeScreenChecklistStep.tsx")).toContain('surface="checklist"');
    expect(read("src/pages/PublicReferralPage.tsx")).toContain('surface="referral_success"');
    expect(read("src/pages/ReferralStatus.tsx")).toContain('surface="referral_status"');
    expect(read("src/components/pwa/PushSettings.tsx")).toContain('surface: "notifications_card"');
  });

  it("shows the install prompt on the referral page only after the referral is sent", () => {
    const page = read("src/pages/PublicReferralPage.tsx");
    const success = page.indexOf('surface="referral_success"');
    const form = page.indexOf("<form onSubmit={submit}");
    expect(success).toBeGreaterThan(0);
    expect(success).toBeLessThan(form);
  });
});
