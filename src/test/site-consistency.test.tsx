import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

vi.mock("@/components/Navbar", () => ({ default: () => <nav data-testid="marketing-navbar" /> }));
vi.mock("@/components/Footer", () => ({ default: () => <footer data-testid="marketing-footer" /> }));
vi.mock("@/components/AppTopBar", () => ({ default: () => <header data-testid="app-topbar" /> }));
vi.mock("@/components/PageTransition", () => ({ default: () => <div>page</div> }));
vi.mock("@/components/ScrollToTopButton", () => ({ default: () => null }));

import Layout, { isAppRoute } from "@/components/Layout";
import { refQuestion } from "@/pages/PublicReferralPage";
import { AUTH_BENEFITS } from "@/components/AuthSplit";

const at = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes><Route path="*" element={<Layout />} /></Routes>
    </MemoryRouter>,
  );

describe("app chrome", () => {
  it("/dashboard does not render the marketing Navbar or Footer", () => {
    at("/dashboard");
    expect(screen.queryByTestId("marketing-navbar")).toBeNull();
    expect(screen.queryByTestId("marketing-footer")).toBeNull();
    expect(screen.getByTestId("app-topbar")).toBeTruthy();
  });
  it("public pages keep the marketing Navbar", () => {
    at("/pricing");
    expect(screen.getByTestId("marketing-navbar")).toBeTruthy();
  });
  it.each(["/dashboard", "/dashboard/settings", "/me", "/welcome", "/partners/dashboard"])("%s is an app route", (p) => {
    expect(isAppRoute(p)).toBe(true);
  });
  it.each(["/", "/partners", "/earn", "/r/x"])("%s is public", (p) => {
    expect(isAppRoute(p)).toBe(false);
  });
});

describe("referral page question", () => {
  it("uses the trade phrase when known", () => {
    expect(refQuestion("Roofing", "Summit")).toBe("Know someone who needs a roof?");
  });
  it("falls back to the business name for trades without a phrase", () => {
    expect(refQuestion("Real Estate", "Next Property")).toBe("Know someone who could use Next Property?");
  });
});

describe("auth panel", () => {
  it("lists the three benefits", () => {
    expect(AUTH_BENEFITS).toEqual([
      "Live in about a minute",
      "Free for your first 100 customers",
      "You pay rewards only when a job closes",
    ]);
  });
});
