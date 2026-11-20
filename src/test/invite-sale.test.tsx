import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { SALE_END_ISO } from "@/config/pricing";
import { FREE_CTA_LABEL } from "@/config/planFeatures";
import InviteLanding from "@/pages/InviteLanding";
import SignupOfferNote from "@/components/signup/SignupOfferNote";

const invite = vi.hoisted(() => ({ set: vi.fn((code: string) => code), get: vi.fn(() => "LAUNCH") }));
vi.mock("@/lib/invite", () => ({ setInviteCode: invite.set, getInviteCode: invite.get }));
vi.mock("@/lib/track", () => ({ track: vi.fn() }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: null, userRole: null, loading: false }) }));
vi.mock("@/components/SEOHead", () => ({ default: () => null }));
vi.mock("@/components/signup/SignupForm", () => ({ default: () => <input aria-label="Business name" /> }));
vi.mock("@/components/invite/InviteBanner", () => ({ default: () => null }));
vi.mock("@/components/marketing/PhoneMockup", () => ({ default: () => null }));
vi.mock("@/components/marketing/MockReferralPage", () => ({ default: () => null }));

beforeEach(() => { vi.clearAllMocks(); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const show = (serverNow: string) => {
  vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => new Response(JSON.stringify({ sale_live: true, sale_end: SALE_END_ISO, server_now: serverNow }))));
  render(<MemoryRouter initialEntries={["/i/LAUNCH"]}><Routes>
    <Route path="/i/:code" element={<InviteLanding />} />
    <Route path="/signup" element={<SignupOfferNote />} />
  </Routes></MemoryRouter>);
};

describe("invite landing sale signup", () => {
  it("carries the live offer to signup and leaves invite code capture unchanged", async () => {
    show("2026-11-20T03:47:00Z");
    const cta = await screen.findByRole("link", { name: FREE_CTA_LABEL });
    expect(screen.getByRole("complementary", { name: "Early Black Friday sale" })).toBeTruthy();
    expect(cta.getAttribute("href")).toBe("/signup?offer=bf2026");
    expect(invite.set).toHaveBeenCalledWith("LAUNCH");
    expect(invite.set).toHaveBeenCalledTimes(1);
    fireEvent.click(cta);
    await waitFor(() => expect(screen.getByLabelText("Early Black Friday offer")).toBeTruthy());
    expect(invite.set).toHaveBeenCalledTimes(1);
  });
  it("keeps the original embedded-form button after expiry", async () => {
    show(SALE_END_ISO);
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(screen.getByRole("button", { name: FREE_CTA_LABEL })).toBeTruthy();
    expect(screen.queryByRole("link", { name: FREE_CTA_LABEL })).toBeNull();
    expect(screen.queryByRole("complementary")).toBeNull();
    expect(invite.set).toHaveBeenCalledWith("LAUNCH");
  });
});