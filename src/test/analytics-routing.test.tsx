import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, useNavigate } from "react-router-dom";

const fake = vi.hoisted(() => ({ track: vi.fn(), user: null as null | { id: string }, loading: false }));
vi.mock("@/lib/track", () => ({ track: fake.track }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: fake.user, loading: fake.loading }) }));
import Analytics from "@/components/Analytics";
import MetaPixel from "@/components/MetaPixel";

function Navigation() {
  const navigate = useNavigate();
  return <>
    <button onClick={() => navigate("/r/status/PRIVATE_RECEIPT")}>Private</button>
    <button onClick={() => navigate("/pricing?token=PRIVATE")}>Token</button>
    <button onClick={() => navigate("/sample")}>Demo</button>
    <button onClick={() => navigate("/pricing?utm_source=ugc")}>Campaign</button>
  </>;
}
function mount(path = "/pricing") {
  return render(<MemoryRouter initialEntries={[path]}><Analytics /><MetaPixel /><Navigation /></MemoryRouter>);
}
beforeEach(() => {
  fake.track.mockClear(); fake.user = null; fake.loading = false;
  vi.stubGlobal("location", new URL("https://revvin.co/pricing"));
  vi.stubGlobal("fetch", vi.fn(() => { throw new Error("NETWORK FORBIDDEN"); }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("actual analytics components on public-to-private SPA transitions", () => {
  it("records one public pageview, blocks private/token navigations, keeps a demo pageview and injects no SDK", () => {
    mount();
    expect(fake.track.mock.calls).toEqual([["page_viewed"]]);
    fireEvent.click(screen.getByRole("button", { name: "Campaign" }));
    expect(fake.track).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Private" }));
    fireEvent.click(screen.getByRole("button", { name: "Token" }));
    expect(fake.track).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Demo" }));
    expect(fake.track).toHaveBeenCalledTimes(2);
    expect(document.querySelector('script[src*="plausible"],script[src*="facebook"]')).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });
  it("does not measure a direct private visit, logged-in customer/admin or unresolved session", () => {
    const view = mount("/r/status/PRIVATE_RECEIPT");
    expect(fake.track).not.toHaveBeenCalled();
    view.unmount();
    fake.user = { id: "SYNTHETIC_SIGNED_IN" };
    const signedIn = mount();
    expect(fake.track).not.toHaveBeenCalled();
    signedIn.unmount();
    fake.user = null; fake.loading = true;
    mount();
    expect(fake.track).not.toHaveBeenCalled();
  });
});
