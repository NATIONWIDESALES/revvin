import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
const h = vi.hoisted(() => ({ report: vi.fn(), toast: vi.fn(), submit: vi.fn() }));
vi.mock("@/lib/reportFailure", () => ({ reportFailure: h.report }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: h.toast }) }));
vi.mock("@/lib/referralSubmit", () => ({ submitPublicReferral: h.submit, referralSubmitMessage: () => null }));
vi.mock("@/lib/track", () => ({ track: vi.fn() }));
vi.mock("@/lib/earn", () => ({ businessMetro: async () => null }));
vi.mock("@/lib/ssrData", () => ({ readSsrBusiness: () => null }));
vi.mock("@/lib/pageManifest", () => ({ applyPageManifest: () => () => {} }));
vi.mock("@/components/SEOHead", () => ({ default: () => null }));
vi.mock("@/components/pwa/AddToHomeScreen", () => ({ default: () => null }));
vi.mock("@/lib/supabaseLazy", () => ({ loadSupabase: async () => ({
  from: () => ({ select: () => ({ eq: () => ({ limit: async () => ({ data: [{ id: "business-1", name: "Fixture Roofing", slug: "fixture", offer_amount: "$100", category: "Roofing" }], error: null }) }) }) }),
}) }));
import PublicReferralPage from "@/pages/PublicReferralPage";
afterEach(() => vi.unstubAllGlobals());

describe("referral failure reporting", () => {
  it("reports the existing submit failure branch without collecting any referral form values", async () => {
    vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
    const error = { message: "Storage service unavailable", code: "503" };
    h.submit.mockResolvedValue({ receipt: null, error });
    const { container } = render(<MemoryRouter initialEntries={["/r/fixture"]}><Routes><Route path="/r/:slug" element={<PublicReferralPage />} /></Routes></MemoryRouter>);
    await screen.findByLabelText("Their name");
    fireEvent.change(screen.getByLabelText("Your name"), { target: { value: "Private Referrer" } });
    fireEvent.change(screen.getByLabelText("Your email"), { target: { value: "private@example.test" } });
    fireEvent.change(screen.getByLabelText("Their name"), { target: { value: "Private Customer" } });
    fireEvent.change(screen.getByLabelText("Their phone"), { target: { value: "5551234567" } });
    fireEvent.change(screen.getByLabelText("What do they need?"), { target: { value: "Private need" } });
    fireEvent.click(screen.getByRole("checkbox"));
    const form = container.querySelector("form");
    if (!form) throw new Error("Referral form missing");
    fireEvent.submit(form);
    await waitFor(() => expect(h.report).toHaveBeenCalledWith("referral_submit", { error, business_id: "business-1" }));
    expect(h.report.mock.calls).toHaveLength(1);
    expect(JSON.stringify(h.report.mock.calls)).not.toMatch(/Private Customer|private@example|555123|Private need/);
    expect(h.toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Could not submit" }));
    expect(screen.getByLabelText("Their name")).toHaveValue("Private Customer");
  });
});