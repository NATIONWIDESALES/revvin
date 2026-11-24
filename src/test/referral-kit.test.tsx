import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import * as XLSX from "xlsx";
import { homeLayout, kitSendAction, nextStep, type SetupState } from "@/lib/dashboardHome";
import { excelToCsv, intakeFileKind, planIntake, sendUsMailto, skipLines } from "@/lib/customerIntake";
import { parseCsv } from "@/lib/contactImport";
import { analyticsEventAllowed, safeAnalyticsMeta } from "@/lib/analyticsPrivacy";

vi.mock("@/integrations/supabase/client", () => {
  const chain: any = { select: () => chain, eq: () => chain, order: () => chain, limit: () => Promise.resolve({ data: [] }), then: (r: any) => Promise.resolve({ data: [] }).then(r) };
  return { supabase: { from: () => chain, rpc: () => Promise.resolve({ data: [] }) } };
});
vi.mock("@/components/print/AssetSheet", () => ({ default: () => <div data-testid="asset-sheet" /> }));

import HomeView from "@/components/dashboard/HomeView";

describe("home layout", () => {
  it("no launch and no leads shows the kit", () => expect(homeLayout({ isDemo: false, hasLaunchCampaign: false, leadsCount: 0 })).toBe("kit"));
  it("launch sent shows standard", () => expect(homeLayout({ isDemo: false, hasLaunchCampaign: true, leadsCount: 0 })).toBe("standard"));
  it("has leads shows standard", () => expect(homeLayout({ isDemo: false, hasLaunchCampaign: false, leadsCount: 1 })).toBe("standard"));
  it("demo shows standard", () => expect(homeLayout({ isDemo: true, hasLaunchCampaign: false, leadsCount: 0 })).toBe("standard"));
  it("unknown launch state shows standard", () => expect(homeLayout({ isDemo: false, leadsCount: 0 })).toBe("standard"));
});

describe("kit send button", () => {
  it("zero customers opens intake", () => expect(kitSendAction({ isLive: true, customersTotal: 0 })).toEqual({ label: "Send to my customers", publishFirst: false, target: "intake" }));
  it("some customers opens composer with count", () => expect(kitSendAction({ isLive: true, customersTotal: 7 })).toEqual({ label: "Ask all 7 customers", publishFirst: false, target: "composer" }));
  it("unpublished publishes first", () => {
    expect(kitSendAction({ isLive: false, customersTotal: 0 })).toEqual({ label: "Publish and send to my customers", publishFirst: true, target: "intake" });
    expect(kitSendAction({ isLive: false, customersTotal: 3 }).target).toBe("composer");
  });
  it("old next-step box says Add your customers then Ask all n", () => {
    const s: SetupState = { isLive: true, customersTotal: 0, customersSent: 0, customersPending: 0, qrDownloaded: false, hasReviewLink: false, hasLaunchCampaign: false };
    expect(nextStep(s).button).toBe("Add your customers");
    expect(nextStep({ ...s, customersTotal: 4 }).button).toBe("Ask all 4 customers");
  });
});

describe("intake", () => {
  const csv = (n: number) => "name,email\n" + Array.from({ length: n }, (_, i) => `P${i},p${i}@acme.co`).join("\n");
  it("imports up to the Free limit and counts the rest", () => {
    const plan = planIntake(parseCsv(csv(510)), [], 500);
    expect(plan.toAdd).toHaveLength(500);
    expect(plan.skipped.overLimit).toBe(10);
    expect(skipLines(plan.skipped, 500).join(" ")).toContain("10 customers were left out because Free includes 500 customers. Pro removes the limit.");
  });
  it("counts only remaining room when the list already has customers", () => {
    const existing = Array.from({ length: 495 }, (_, i) => ({ email: `x${i}@acme.co` }));
    const plan = planIntake(parseCsv(csv(10)), existing, 5);
    expect(plan.toAdd).toHaveLength(5);
    expect(plan.skipped.overLimit).toBe(5);
  });
  it("never fails the whole file: bad and known rows are skipped", () => {
    const plan = planIntake(parseCsv("name,email\nA,a@acme.co\n,\nB,b@acme.co"), [{ email: "B@acme.co" }], Infinity);
    expect(plan.toAdd.map((r) => r.name)).toEqual(["A"]);
    expect(plan.skipped.alreadyOnList).toBe(1);
  });
  it("Excel first sheet goes through the CSV mapping", async () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["Name", "Email", "Phone"], ["Dana Cole", "dana@acme.co", "604-555-0101"], ["Bad", "", ""]]), "Clients");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["Name"], ["Ignored"]]), "Other");
    const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
    const parsed = parseCsv(await excelToCsv(buf));
    expect(parsed.contacts.map((c) => c.email)).toEqual(["dana@acme.co"]);
    expect(parsed.errors).toHaveLength(1);
  });
  it("recognizes file kinds", () => {
    expect(intakeFileKind("list.CSV")).toBe("csv");
    expect(intakeFileKind("list.xlsx")).toBe("excel");
    expect(intakeFileKind("list.xls")).toBe("excel");
    expect(intakeFileKind("list.pdf")).toBeNull();
  });
  it("send-us mailto names the business", () => {
    const url = sendUsMailto("Ace Plumbing");
    expect(url.startsWith("mailto:info@revvin.co?")).toBe(true);
    expect(decodeURIComponent(url)).toContain("Customer list for Ace Plumbing");
  });
});

describe("kit events", () => {
  const ctx = { path: "/dashboard", traffic: "product" } as const;
  it("allows the five events with fixed meta only", () => {
    for (const e of ["kit_ready_viewed", "kit_send_clicked", "intake_opened", "intake_send_us_clicked", "intake_import_succeeded"]) expect(analyticsEventAllowed(e, ctx as any)).toBe(true);
    expect(safeAnalyticsMeta("intake_opened", ctx as any, { method: "upload" }).method).toBe("upload");
    expect(safeAnalyticsMeta("intake_opened", ctx as any, { method: "dana@x.co" }).method).toBeUndefined();
    expect(safeAnalyticsMeta("intake_import_succeeded", ctx as any, { recipients: "51-200" }).recipients).toBe("51-200");
    expect(safeAnalyticsMeta("intake_import_succeeded", ctx as any, { recipients: "73" }).recipients).toBeUndefined();
  });
});

describe("kit screen", () => {
  const setup: SetupState = { isLive: true, customersTotal: 0, customersSent: 0, customersPending: 0, qrDownloaded: false, hasReviewLink: false, hasLaunchCampaign: false };
  const view = (over: Partial<SetupState> = {}, isDemo = false) => render(
    <MemoryRouter>
      <HomeView businessId="b" businessName="Ace Plumbing" slug="ace" publicUrl="https://revvin.co/r/ace" isPro={false} isDemo={isDemo}
        setup={{ ...setup, ...over }} leads={[]} onGo={() => {}} onPublish={() => {}} onShared={() => {}}
        kit={{ biz: { name: "Ace Plumbing", offer_amount: "$50" }, onPublished: () => {}, renderIntake: () => null }} />
    </MemoryRouter>,
  );
  it("renders heading, three cards and the preview with Dana and the reward", () => {
    view();
    expect(screen.getByText("Ace Plumbing, your referral kit is ready.")).toBeTruthy();
    expect(screen.getByTestId("kit-ask-body").textContent).toContain("Hi Dana");
    expect(screen.getByTestId("kit-ask-body").textContent).toContain("$50");
    expect(screen.queryByTestId("next-step")).toBeNull();
    expect(screen.queryByTestId("free-upsell")).toBeNull();
    expect(screen.getByTestId("kit-send").textContent).toBe("Send to my customers");
  });
  it("unpublished button label", () => { view({ isLive: false }); expect(screen.getByTestId("kit-send").textContent).toBe("Publish and send to my customers"); });
  it("demo keeps the standard home", () => { view({}, true); expect(screen.queryByTestId("kit-ready")).toBeNull(); expect(screen.getByTestId("next-step")).toBeTruthy(); });
});
