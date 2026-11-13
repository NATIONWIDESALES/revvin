import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
const h = vi.hoisted(() => ({ rpc: vi.fn(), toast: vi.fn(), navigate: vi.fn(), published: false, busy: false }));
vi.mock("@/lib/track", () => ({ track: vi.fn() }));
// Deliberately return a new toast function each render, reproducing the retry-loop risk.
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: (...args: unknown[]) => h.toast(...args) }) }));
const client = vi.hoisted(() => ({ rpc: h.rpc, from: () => {
  const q = { select: () => q, eq: () => q, order: () => q, limit: async () => ({ data: [{ is_published: h.published }] }) };
  return q;
} }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: client }));
vi.mock("@/lib/supabaseLazy", () => ({ loadSupabase: async () => client }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "owner" }, loading: false }) }));
vi.mock("react-router-dom", async original => ({ ...await original<typeof import("react-router-dom")>(), useNavigate: () => h.navigate }));
vi.mock("@/components/SEOHead", () => ({ default: () => null }));
vi.mock("@/components/AuthSplit", () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("@/components/signup/SignupForm", () => ({ SIGNUP_SUBHEAD: () => "", default: ({ onBusyChange }: {onBusyChange: (b: boolean) => void}) => {
  // A submitting signup form retains ownership of held-checkout navigation.
  React.useEffect(() => { if (h.busy) onBusyChange(true); }, [onBusyChange]);
  return null;
} }));
import React from "react";
import CampaignsTab from "@/components/dashboard/CampaignsTab";
import Signup from "@/pages/Signup";
import { PRO_COPY } from "@/components/dashboard/ProUpsell";
import { PRO_FEATURES } from "@/config/planFeatures";
beforeEach(() => { h.rpc.mockReset(); h.toast.mockClear(); h.navigate.mockClear(); h.published=false; h.busy=false; });
const campaign = () => <MemoryRouter><CampaignsTab biz={{id:"b",name:"Test",offer_amount:null,business_email:null}} publicUrl="/r/test" isPro /></MemoryRouter>;
it("campaign readiness renders every missing-field input", async () => {
  h.rpc.mockImplementation(async name => ({ data: name === "fn_campaign_readiness" ? [{ready:false,missing:["street_address","city","postal_code","country","business_email"],business_id:"b"}] : [] }));
  render(campaign());
  for (const label of ["Street address","City","Postal code","Country","Reply-to email"]) expect(await screen.findByLabelText(label)).toBeTruthy();
});
it("failed readiness makes one attempt and one toast until Try again is clicked", async () => {
  h.rpc.mockImplementation(async name => name === "fn_campaign_readiness" ? {error:{message:"readiness unavailable"}} : {data:[]});
  const { rerender } = render(campaign());
  await screen.findByRole("button",{name:"Try again"});
  await act(async () => { rerender(campaign()); });
  const attempts = () => h.rpc.mock.calls.filter(([name]) => name === "fn_campaign_readiness").length;
  expect(attempts()).toBe(1); expect(h.toast).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole("button",{name:"Save details"})).toBeNull();
  fireEvent.click(screen.getByRole("button",{name:"Try again"}));
  await waitFor(() => expect(attempts()).toBe(2));
});
it.each([[true,"/dashboard"],[false,"/welcome"]])("signed-in signup published=%s goes to %s", async (published,destination) => {
  h.published=published; render(<MemoryRouter><Signup /></MemoryRouter>);
  await waitFor(() => expect(h.navigate).toHaveBeenCalledWith(destination,{replace:true}));
});
it("submitting signup retains navigation ownership", async () => {
  h.busy=true; render(<MemoryRouter><Signup /></MemoryRouter>);
  await act(async () => {}); expect(h.navigate).not.toHaveBeenCalled();
});
describe("stable upgrade feature lookup", () => {
  it.each(["reporting","branding"] as const)("%s matches its feature", key => {
    const label = key === "reporting" ? "ROI reporting and monthly recap" : "Custom page branding";
    expect(PRO_COPY[key]).toEqual({title:label,body:PRO_FEATURES.find(f => f.label === label)?.description});
  });
  it("customers combines unlimited customers and automatic asks", () => {
    expect(PRO_COPY.customers.title).toBe("Automatic ask after each job");
    expect(PRO_COPY.customers.body).toBe(`${PRO_FEATURES.find(f=>f.label === "Unlimited customers, imported and asked")?.description} ${PRO_FEATURES.find(f=>f.label === "Automatic ask after each job")?.description}`);
  });
});
