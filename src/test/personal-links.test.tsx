import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { readFileSync, readdirSync } from "node:fs";

const h = vi.hoisted(() => ({ rpc: vi.fn(), valid: new Map<string, string>() }));
const BIZ = { id: "b1", name: "Summit Roofing", slug: "summit-roofing", category: "Roofing", offer_amount: "$250", testimonials: null };
const chain = (data: unknown) => {
  const c: Record<string, unknown> = {};
  for (const k of ["select", "eq", "order"]) c[k] = () => c;
  c.limit = async () => ({ data });
  return c;
};
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => chain([BIZ]),
    auth: { getSession: async () => ({ data: { session: null } }) },
    rpc: async (fn: string, args: Record<string, unknown>) => {
      h.rpc(fn, args);
      if (fn === "fn_resolve_referrer") {
        const name = h.valid.get(`${args.p_slug}:${args.p_token}`);
        return { data: name ? { first_name: name, has_email: true } : null, error: null };
      }
      if (fn === "fn_submit_public_referral") {
        return { data: { lead_id: "l1", status_token: "s1", business_name: BIZ.name, replay: false, referrer_token: "MyOwnTokenMyOwnToken0001" }, error: null };
      }
      return { data: null, error: null };
    },
  },
}));
vi.mock("@/lib/track", () => ({ track: vi.fn() }));
vi.mock("@/components/pwa/AddToHomeScreen", () => ({ default: ({ line }: { line: string }) => <p>{line}</p> }));
vi.mock("@/lib/pageManifest", () => ({ applyPageManifest: () => undefined }));
vi.mock("@/components/SEOHead", () => ({ default: () => null }));

import PublicReferralPage from "@/pages/PublicReferralPage";
import { activeRef, recallRef, rememberRef, REF_TTL_MS, referrerShareText } from "@/lib/referrerLink";
import { contactLink } from "@/components/dashboard/CustomersTab";

const TOKEN = "AbCdEfGhIjKlMnOpQrStUv12";
const page = (url: string) =>
  render(<MemoryRouter initialEntries={[url]}><Routes><Route path="/r/:slug" element={<PublicReferralPage />} /></Routes></MemoryRouter>);

const migrations = readdirSync("drizzle/migrations").filter((f) => f.endsWith(".sql")).map((f) => readFileSync(`drizzle/migrations/${f}`, "utf8")).join("\n");

beforeEach(() => { localStorage.clear(); sessionStorage.clear(); h.rpc.mockReset(); h.valid.clear(); });

describe("personal link attribution", () => {
  it("credits the referrer from ?ref and still does after a reload without it", async () => {
    h.valid.set(`summit-roofing:${TOKEN}`, "Jane");
    const first = page(`/r/summit-roofing?ref=${TOKEN}`);
    expect((await screen.findByTestId("referring-as")).textContent).toContain("Referring as Jane.");
    expect(screen.queryByText("Your name")).toBeNull();
    first.unmount();
    page("/r/summit-roofing"); // reload, plain link
    expect((await screen.findByTestId("referring-as")).textContent).toContain("Jane");
  });

  it("sends the token with the submission and shows the referrer's own link", async () => {
    h.valid.set(`summit-roofing:${TOKEN}`, "Jane");
    page(`/r/summit-roofing?ref=${TOKEN}`);
    await screen.findByTestId("referring-as");
    const inputs = screen.getAllByRole("textbox");
    fireEvent.change(inputs[0], { target: { value: "Lead Person" } });
    fireEvent.change(screen.getAllByRole("textbox")[1] ?? inputs[1], { target: { value: "5550001111" } });
    const ta = document.querySelector("textarea")!;
    fireEvent.change(ta, { target: { value: "needs a roof" } });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.submit(ta.closest("form")!);
    await screen.findByText("Thanks. Summit Roofing will reach out to them.");
    const call = h.rpc.mock.calls.find(([fn]) => fn === "fn_submit_public_referral")!;
    expect(call[1].p_ref_token).toBe(TOKEN);
    expect((screen.getByLabelText("Your personal link") as HTMLInputElement).value).toMatch(/\/r\/summit-roofing\?ref=MyOwnTokenMyOwnToken0001$/);
    expect(screen.getByText("Save this page to your home screen so you can refer Summit Roofing again in one tap.")).toBeTruthy();
  });

  it("ignores an unknown or other-business token and forgets it", async () => {
    h.valid.set(`other-biz:${TOKEN}`, "Jane");
    page(`/r/summit-roofing?ref=${TOKEN}`);
    await screen.findByText("Your name");
    await waitFor(() => expect(recallRef("summit-roofing")).toBeNull());
    expect(screen.queryByTestId("referring-as")).toBeNull();
  });

  it("'Not you?' clears the remembered link", async () => {
    h.valid.set(`summit-roofing:${TOKEN}`, "Jane");
    page(`/r/summit-roofing?ref=${TOKEN}`);
    fireEvent.click(await screen.findByRole("button", { name: "Not you?" }));
    expect(await screen.findByText("Your name")).toBeTruthy();
    expect(recallRef("summit-roofing")).toBeNull();
  });

  it("remembers per page for 60 days, then expires; rejects malformed tokens", () => {
    rememberRef("a", TOKEN, 0);
    expect(recallRef("a", REF_TTL_MS - 1)).toBe(TOKEN);
    expect(recallRef("b", 1)).toBeNull();
    expect(recallRef("a", REF_TTL_MS + 1)).toBeNull();
    expect(activeRef("a", "?ref=short", 0)).toBeNull();
  });

  it("builds the share text", () => {
    expect(referrerShareText("Summit Roofing", "Roofing", "https://revvin.co/r/s?ref=x")).toBe(
      "I use Summit Roofing. If you need roofing work, use my link: https://revvin.co/r/s?ref=x. I may get a thank-you reward if you book.",
    );
  });
});

describe("database contract", () => {
  it("the token lookup returns only a first name and whether an email exists", () => {
    const fn = migrations.slice(migrations.indexOf("FUNCTION public.fn_resolve_referrer"), migrations.indexOf("GRANT EXECUTE ON FUNCTION public.fn_resolve_referrer"));
    expect(fn).toContain("json_build_object('first_name', split_part(btrim(_r.name), ' ', 1), 'has_email', _r.email IS NOT NULL)");
    expect(fn).not.toMatch(/'email'|'phone'|'token'/);
  });
  it("anon has no access to the referrers table", () => {
    expect(migrations).toContain("REVOKE ALL ON public.referrers FROM anon;");
    expect(migrations).not.toMatch(/ON public\.referrers[\s\S]{0,80}TO anon/);
  });
  it("/me reads only the signed-in, confirmed email", () => {
    const fn = migrations.slice(migrations.indexOf("FUNCTION public.fn_my_referrals"));
    expect(fn).toContain("WHERE u.id = auth.uid() AND u.email_confirmed_at IS NOT NULL");
    expect(fn).toContain("WHERE lower(r.email) = _email");
  });
  it("every new customer row, including bulk imports, gets a referrer", () => {
    expect(migrations).toMatch(/BEFORE INSERT ON public\.referral_contacts\s+FOR EACH ROW EXECUTE FUNCTION public\.fn_contact_assign_referrer/);
  });
  it("customer asks use that customer's personal link", () => {
    expect(contactLink("https://revvin.co/r/s", { referrers: { token: TOKEN } })).toBe(`https://revvin.co/r/s?ref=${TOKEN}`);
    expect(contactLink("https://revvin.co/r/s", { referrers: null })).toBe("https://revvin.co/r/s");
  });
});
