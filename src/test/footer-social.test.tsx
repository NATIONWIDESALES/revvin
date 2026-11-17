import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Footer from "@/components/Footer";

vi.mock("@/lib/earnLive", () => ({ useEarnLive: () => false }));

describe("footer social link", () => {
  it("links to Revvin's Instagram with safe external-link attributes", () => {
    render(<MemoryRouter><Footer /></MemoryRouter>);
    const instagram = screen.getByRole("link", { name: "Revvin on Instagram" });
    expect(instagram.getAttribute("href")).toBe("https://www.instagram.com/revvin.co/");
    expect(instagram.getAttribute("target")).toBe("_blank");
    expect(instagram.getAttribute("rel")).toBe("noopener noreferrer me");
  });
});