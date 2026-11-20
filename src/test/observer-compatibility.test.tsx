import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("reduced-feature browser observers", () => {
  it("supplies a working size observer for the demo slider", async () => {
    vi.stubGlobal("ResizeObserver", undefined);
    vi.resetModules();
    const { Slider } = await import("@/components/ui/slider");
    expect(typeof window.ResizeObserver).toBe("function");
    render(<Slider value={[40]} onValueChange={() => {}} />);
    const slider = screen.getByRole("slider");
    expect(slider.getAttribute("aria-valuenow")).toBe("40");
  });

  it("skips optional intersection features when unsupported", async () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    const { default: MobileStartBar } = await import("@/components/marketing/MobileStartBar");
    render(<MemoryRouter><main><h1>Sample</h1><MobileStartBar pathname="/" /></main></MemoryRouter>);
    expect(screen.getByRole("heading")).toBeTruthy();
  });
});