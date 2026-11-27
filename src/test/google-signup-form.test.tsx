import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
const mocks = vi.hoisted(() => ({ signup: vi.fn(), invoke: vi.fn(), capture: vi.fn(), report: vi.fn(), token: { eligible: true } }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: null, loading: false }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: { signUp: mocks.signup }, functions: { invoke: mocks.invoke } } }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/lib/track", () => ({ track: vi.fn() }));
vi.mock("@/lib/metaRegistration", () => ({ registrationConsent: async () => ({ advertising_allowed: false, country: null }), registrationEventId: () => "reg_fixture", reportRegistration: vi.fn() }));
vi.mock("@/lib/googleAds", () => ({ captureGoogleSignupEligibility: mocks.capture, trackGoogleSignup: mocks.report }));
import SignupForm from "@/components/signup/SignupForm";
const account = "11111111-1111-4111-8111-111111111111";
beforeEach(() => {
  vi.clearAllMocks(); localStorage.clear(); sessionStorage.clear(); window.history.replaceState({}, "", "/signup");
  mocks.capture.mockReturnValue(mocks.token); mocks.report.mockResolvedValue(true); mocks.invoke.mockResolvedValue({ data: {}, error: null });
  mocks.signup.mockResolvedValue({ data: { user: { id: account, identities: [{ id: "fixture" }] }, session: null }, error: null });
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
async function submit(trade = "Not a home-service business") {
  render(<MemoryRouter><SignupForm showStickyMobileBar={false} /></MemoryRouter>);
  fireEvent.change(screen.getByLabelText("Business name"), { target: { value: "Example fixture" } });
  fireEvent.change(screen.getByLabelText("Work email"), { target: { value: "fixture@example.test" } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: "fixture-password" } });
  fireEvent.keyDown(screen.getByRole("combobox", { name: "Your trade" }), { key: "Enter" });
  fireEvent.click(await screen.findByRole("option", { name: trade }));
  const form = document.querySelector("form"); if (!form) throw Error("Missing signup form");
  fireEvent.submit(form);
  await screen.findByText("Check your email");
}
describe("Google signup form handoff", () => {
  it.each(["Roofing", "Not a home-service business"])("reports a successful new account for %s with no contact fields", async trade => {
    await submit(trade);
    expect(mocks.capture.mock.invocationCallOrder[0]).toBeLessThan(mocks.signup.mock.invocationCallOrder[0]);
    await waitFor(() => expect(mocks.report).toHaveBeenCalledExactlyOnceWith(account, trade, mocks.token));
  });
  it("does not report an obfuscated existing-account response", async () => {
    mocks.signup.mockResolvedValue({ data: { user: { id: account, identities: [] }, session: null }, error: null });
    await submit(); expect(mocks.report).not.toHaveBeenCalled();
  });
});