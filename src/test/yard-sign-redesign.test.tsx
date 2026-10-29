import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { readFileSync } from "node:fs";

const BIZ = { id: "b1", name: "Summit Roofing", slug: "summit-roofing", category: "Roofing", city: "Langley", offer_amount: "$250", testimonials: null };
const chain = () => {
  const c: Record<string, unknown> = {};
  for (const k of ["select", "eq", "order"]) c[k] = () => c;
  c.limit = async () => ({ data: [BIZ], error: null });
  return c;
};
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => chain(),
    auth: { getSession: async () => ({ data: { session: null } }) },
    rpc: async (fn: string) =>
      fn === "fn_submit_public_referral"
        ? { data: { lead_id: "l1", status_token: "s1", business_name: BIZ.name, replay: false, referrer_token: "NewTokenNewTokenNewTok01" }, error: null }
        : { data: null, error: null },
  },
}));
vi.mock("@/lib/track", () => ({ track: vi.fn() }));
vi.stubGlobal("IntersectionObserver", class { observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } });
vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
vi.mock("@/components/pwa/AddToHomeScreen", () => ({ default: () => null }));
vi.mock("@/lib/pageManifest", () => ({ applyPageManifest: () => undefined }));
vi.mock("@/components/SEOHead", () => ({ default: () => null }));
vi.mock("@/components/marketplace/SimpleQRCode", () => ({ default: () => <div data-testid="qr" /> }));

import Index from "@/pages/Index";
import PublicReferralPage, { tradePhrase } from "@/pages/PublicReferralPage";

describe("homepage redesign", () => {
  it("renders no uppercase tracked eyebrow labels", () => {
    const { container } = render(<MemoryRouter><Index /></MemoryRouter>);
    const eyebrows = [...container.querySelectorAll("[class]")].filter((el) => /uppercase/.test(el.className) && /tracking-\[/.test(el.className));
    expect(eyebrows).toHaveLength(0);
    expect(readFileSync("src/pages/Index.tsx", "utf8")).not.toMatch(/const eyebrow|shimmer-text|hero-aurora|ScrollReveal/);
  });
  it("shows the yard sign with a real QR code and the example caption", () => {
    render(<MemoryRouter><Index /></MemoryRouter>);
    expect(screen.getByTestId("qr")).toBeTruthy();
    expect(screen.getByText("Example sign from the free print pack. Not a real business.")).toBeTruthy();
  });
});

describe("referral page redesign", () => {
  const page = () => render(<MemoryRouter initialEntries={["/r/summit-roofing"]}><Routes><Route path="/r/:slug" element={<PublicReferralPage />} /></Routes></MemoryRouter>);

  it("renders the form, the consent checkbox and then the personal link on success", async () => {
    page();
    expect(await screen.findByRole("heading", { name: "Who should we call?" })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 2, name: /Know someone who needs a roof\?/ })).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Your name"), { target: { value: "Jane" } });
    fireEvent.change(screen.getByLabelText("Your email"), { target: { value: "jane@example.com" } });
    fireEvent.change(screen.getByLabelText("Their name"), { target: { value: "Mike" } });
    fireEvent.change(screen.getByLabelText("Their phone"), { target: { value: "6045550142" } });
    fireEvent.change(screen.getByLabelText("What do they need?"), { target: { value: "Roof leak" } });
    const consent = screen.getByRole("checkbox");
    expect(screen.getByText("They said it's okay to share their details with Summit Roofing.")).toBeTruthy();
    fireEvent.click(consent);
    fireEvent.submit(screen.getByRole("button", { name: "Send referral" }).closest("form")!);
    const link = (await screen.findByLabelText("Your personal link")) as HTMLInputElement;
    expect(link.value).toMatch(/\/r\/summit-roofing\?ref=NewTokenNewTokenNewTok01$/);
  });

  it("maps trades to a phrase and falls back to the business name", () => {
    expect(tradePhrase("HVAC", "Cedar")).toBe("heating or cooling work");
    expect(tradePhrase("Windows & Doors", "X")).toBe("new windows");
    expect(tradePhrase("Real Estate", "Next Property")).toBe("Next Property");
  });
});
