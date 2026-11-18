import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { SALE_END_ISO } from "@/config/pricing";
import SignupOfferNote from "@/components/signup/SignupOfferNote";

const serve = (server_now: string, sale_live: boolean) => vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ sale_live, sale_end: SALE_END_ISO, server_now }))));
const show = async (path: string) => { render(<MemoryRouter initialEntries={[path]}><SignupOfferNote /></MemoryRouter>); await act(async () => { await new Promise((r) => setTimeout(r, 30)); }); };
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("signup Black Friday offer note", () => {
  it("renders with offer=bf2026 during the sale, with exact prices", async () => {
    serve("2026-11-18T22:00:00Z", true);
    await show("/signup?offer=bf2026");
    expect(screen.getByText(/Revvin Pro 30% off monthly \(\$67\.90\/mo\), 40% off yearly \(\$582\/yr\)/)).toBeTruthy();
    expect(screen.getByText(/claim it on the billing step\. Ends Nov 30\./)).toBeTruthy();
  });
  it("does not render without the param", async () => {
    serve("2026-11-18T22:00:00Z", true);
    await show("/signup");
    expect(screen.queryByLabelText("Early Black Friday offer")).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });
  it("does not render after the end date", async () => {
    serve("2026-12-01T07:00:00Z", true);
    await show("/signup?offer=bf2026");
    expect(screen.queryByLabelText("Early Black Friday offer")).toBeNull();
  });
});
