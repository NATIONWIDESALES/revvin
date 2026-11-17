import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import AdminMfaGate from "@/components/admin/AdminMfaGate";
import { adminMfaAllowed } from "@/lib/adminMfa";
import { blockFramedPage, protectedFramePath } from "@/lib/frameProtection";
const mocks = vi.hoisted(() => ({ listFactors: vi.fn(), getAuthenticatorAssuranceLevel: vi.fn(), loading: false }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "admin" }, userRole: "admin", loading: mocks.loading, session: { access_token: "test" } }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: { mfa: mocks } } }));
beforeEach(() => { cleanup(); vi.clearAllMocks(); mocks.loading = false; });
describe("conditional admin MFA", () => {
  it("auth restoration never mounts private admin content", () => {
    mocks.loading = true;
    mocks.listFactors.mockResolvedValue({ data: { totp: [] }, error: null });
    mocks.getAuthenticatorAssuranceLevel.mockResolvedValue({ data: { currentLevel: "aal1" }, error: null });
    render(<AdminMfaGate><p>Private admin content</p></AdminMfaGate>);
    expect(screen.queryByText("Private admin content")).not.toBeInTheDocument();
  });
  it("no verified factor allows access and offers enrollment", async () => {
    mocks.listFactors.mockResolvedValue({ data: { totp: [] }, error: null });
    mocks.getAuthenticatorAssuranceLevel.mockResolvedValue({ data: { currentLevel: "aal1" }, error: null });
    render(<AdminMfaGate><p>Private admin content</p></AdminMfaGate>);
    await waitFor(() => expect(screen.getByText("Private admin content")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Enroll authenticator" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Turn on two-factor login to protect the admin account" })).toBeInTheDocument();
  });
  it("verified factor blocks AAL1 before mounting private content", async () => {
    mocks.listFactors.mockResolvedValue({ data: { totp: [{ id: "factor", status: "verified" }] }, error: null });
    mocks.getAuthenticatorAssuranceLevel.mockResolvedValue({ data: { currentLevel: "aal1" }, error: null });
    render(<AdminMfaGate><p>Private admin content</p></AdminMfaGate>);
    await screen.findByLabelText("Authenticator code");
    expect(screen.queryByText("Private admin content")).not.toBeInTheDocument();
  });
  it("verified factor allows AAL2", async () => {
    mocks.listFactors.mockResolvedValue({ data: { totp: [{ id: "factor", status: "verified" }] }, error: null });
    mocks.getAuthenticatorAssuranceLevel.mockResolvedValue({ data: { currentLevel: "aal2" }, error: null });
    render(<AdminMfaGate><p>Private admin content</p></AdminMfaGate>);
    await screen.findByText("Private admin content");
  });
  it("errors and pending checks fail closed", () => {
    expect(adminMfaAllowed({ checked: false, required: false, aal: null })).toBe(false);
    expect(adminMfaAllowed({ checked: true, required: false, aal: "aal1", error: true })).toBe(false);
  });
});
describe("pre-render frame protection", () => {
  it.each(["/dashboard", "/__sa", "/auth", "/signup", "/welcome", "/checkout", "/dashboard/checkout", "/r/business", "/r/status/token"])("protects %s", path => {
    expect(protectedFramePath(path)).toBe(true);
    const top = { location: { set href(_value: string) { throw new Error("cross-origin"); } } };
    expect(blockFramedPage(path, { top, self: {}, location: { href: `https://revvin.co${path}` } } as unknown as Window)).toBe(true);
  });
  it("allows top-level pages and public marketing frames", () => {
    const host = {} as Window;
    Object.assign(host, { self: host, top: host });
    expect(blockFramedPage("/dashboard", host)).toBe(false);
    expect(blockFramedPage("/pricing", { top: {}, self: {} } as Window)).toBe(false);
  });
});