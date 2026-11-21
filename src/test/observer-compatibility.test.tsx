import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("reduced-feature browser observers", () => {
  it.each([undefined, {}])("installs the global guard before rendering without loading a slider (%s)", async (observer) => {
    vi.stubGlobal("ResizeObserver", observer);
    vi.resetModules();
    const renderApp = vi.fn(() => {
      expect(typeof window.ResizeObserver).toBe("function");
    });
    vi.doMock("react-dom/client", () => ({ createRoot: () => ({ render: renderApp }), hydrateRoot: renderApp }));
    vi.doMock("../App.tsx", () => ({ default: () => null }));
    vi.doMock("../lib/frameProtection", () => ({ blockFramedPage: () => false }));
    vi.doMock("../lib/chunkRecovery", () => ({ installChunkRecovery: () => {} }));
    vi.doMock("../lib/firstTouch", () => ({ captureFirstTouch: () => {} }));
    const root = document.createElement("div");
    root.id = "root";
    document.body.append(root);
    try {
      await import("../main");
      expect(renderApp).toHaveBeenCalledOnce();
      const { ResizeObserver } = await import("@juggle/resize-observer");
      expect(window.ResizeObserver).toBe(ResizeObserver);
    } finally {
      root.remove();
      vi.doUnmock("react-dom/client");
      vi.doUnmock("../App.tsx");
      vi.doUnmock("../lib/frameProtection");
      vi.doUnmock("../lib/chunkRecovery");
      vi.doUnmock("../lib/firstTouch");
      vi.resetModules();
    }
  });

  it("preserves a native observer at application startup", async () => {
    const nativeObserver = vi.fn();
    vi.stubGlobal("ResizeObserver", nativeObserver);
    vi.resetModules();
    vi.doMock("react-dom/client", () => ({ createRoot: () => ({ render: () => {} }), hydrateRoot: () => {} }));
    vi.doMock("../App.tsx", () => ({ default: () => null }));
    try {
      await import("../main");
      expect(window.ResizeObserver).toBe(nativeObserver);
    } finally {
      vi.doUnmock("react-dom/client");
      vi.doUnmock("../App.tsx");
      vi.resetModules();
    }
  });

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