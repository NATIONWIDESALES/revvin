import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import InstantPreview from "@/components/marketing/InstantPreview";
import { PREVIEW_KEY, previewQuestion, suggestedReward } from "@/lib/instantPreview";

vi.mock("@/lib/track", () => ({ track: vi.fn() }));

function Location() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname}{location.search}</output>;
}

const onPreview = vi.fn();
const mount = (lockedTrade?: string) => render(
  <MemoryRouter initialEntries={[lockedTrade ? `/start/${lockedTrade}` : "/"]}>
    <InstantPreview lockedTrade={lockedTrade} onPreview={onPreview} />
    <Location />
  </MemoryRouter>,
);

describe("instant preview trade choice", () => {
  beforeEach(() => { sessionStorage.clear(); onPreview.mockClear(); });

  it("starts empty without a locked trade and refuses submission", () => {
    mount();
    const select = screen.getByLabelText<HTMLSelectElement>("Trade");
    expect(select.value).toBe("");
    expect(select.required).toBe(true);
    expect(select.options[0].disabled).toBe(true);
    expect(screen.getByLabelText<HTMLInputElement>("Reward per closed job").value).toBe("100");
    fireEvent.change(screen.getByLabelText("Business name"), { target: { value: "Flooring fixture" } });
    expect(select.checkValidity()).toBe(false);
    const form = select.closest("form");
    if (!form) throw new Error("Missing preview form");
    fireEvent.submit(form);
    expect(screen.getByTestId("location").textContent).toBe("/");
    expect(sessionStorage.getItem(PREVIEW_KEY)).toBeNull();
  });

  it("uses the generic preview until a trade is chosen, then navigates with that trade", () => {
    mount();
    fireEvent.change(screen.getByLabelText("Business name"), { target: { value: "Flooring fixture" } });
    expect(onPreview).toHaveBeenLastCalledWith(expect.objectContaining({ q: previewQuestion("", "Flooring fixture") }));
    fireEvent.change(screen.getByLabelText("Trade"), { target: { value: "painting" } });
    expect(screen.getByLabelText<HTMLInputElement>("Reward per closed job").value).toBe(String(suggestedReward("painting")));
    fireEvent.click(screen.getByRole("button", { name: "Make it live, free" }));
    expect(screen.getByTestId("location").textContent).toContain("/signup?");
    expect(screen.getByTestId("location").textContent).toContain("trade=painting");
    const stored = JSON.parse(sessionStorage.getItem(PREVIEW_KEY) || "{}");
    expect(stored.trade).toBe("painting");
  });

  it("preserves locked-trade selection, suggested reward and signup navigation", () => {
    mount("roofing");
    const select = screen.getByLabelText<HTMLSelectElement>("Trade");
    expect(select.value).toBe("roofing");
    expect(select.disabled).toBe(true);
    expect(screen.getByLabelText<HTMLInputElement>("Reward per closed job").value).toBe(String(suggestedReward("roofing")));
    fireEvent.change(screen.getByLabelText("Business name"), { target: { value: "Roofing fixture" } });
    fireEvent.click(screen.getByRole("button", { name: "Make it live, free" }));
    expect(screen.getByTestId("location").textContent).toContain("trade=roofing");
  });
});