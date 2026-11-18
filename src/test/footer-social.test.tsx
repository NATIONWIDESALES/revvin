import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Footer from "@/components/Footer";
import { FACEBOOK_URL, INSTAGRAM_URL } from "@/config/brand";

vi.mock("@/lib/earnLive", () => ({ useEarnLive: () => false }));

const safeExternal = (link: HTMLElement, href: string) => {
  expect(link.getAttribute("href")).toBe(href);
  expect(link.getAttribute("target")).toBe("_blank");
  expect(link.getAttribute("rel")).toBe("noopener noreferrer me");
};

describe("footer social links", () => {
  it("links to Revvin's Instagram with safe external-link attributes", () => {
    render(<MemoryRouter><Footer /></MemoryRouter>);
    safeExternal(screen.getByRole("link", { name: "Revvin on Instagram" }), INSTAGRAM_URL);
  });

  it("links to Revvin's Facebook page with safe external-link attributes", () => {
    render(<MemoryRouter><Footer /></MemoryRouter>);
    safeExternal(screen.getByRole("link", { name: "Revvin on Facebook" }), FACEBOOK_URL);
  });

  it("keeps the Facebook page beside Instagram in the Company column", () => {
    render(<MemoryRouter><Footer /></MemoryRouter>);
    expect(FACEBOOK_URL).toBe("https://www.facebook.com/profile.php?id=61596547626844");
    const company = screen.getByText("Company").parentElement!;
    const hrefs = [...company.querySelectorAll("a")].map((a) => a.getAttribute("href"));
    expect(hrefs.indexOf(INSTAGRAM_URL)).toBeGreaterThanOrEqual(0);
    expect(hrefs.indexOf(FACEBOOK_URL)).toBe(hrefs.indexOf(INSTAGRAM_URL) + 1);
    expect(screen.getByText("Company").closest("div")?.textContent).toContain("Facebook");
  });
});
