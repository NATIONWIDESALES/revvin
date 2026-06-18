import { useEffect, useState } from "react";
import React from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Copy, ExternalLink, Download, Inbox, AlertCircle, Check, Plus, Lock } from "lucide-react";
import QRCodeStyling from "qr-code-styling";
import { useRef } from "react";
import CustomersTab from "@/components/dashboard/CustomersTab";
import ActivationChecklist, { ActivationStep } from "@/components/dashboard/ActivationChecklist";
import RoiSummaryCard from "@/components/dashboard/RoiSummaryCard";

interface Business {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  category: string | null;
  service_area: string | null;
  logo_url: string | null;
  offer_amount: string | null;
  offer_trigger: string | null;
  offer_fine_print: string | null;
  is_published: boolean;
  is_disabled: boolean;
  subscription_status: string | null;
  current_period_end: string | null;
  business_email: string | null;
  phone: string | null;
  stripe_customer_id: string | null;
  launch_package_status: string | null;
  marketplace_listed?: boolean | null;
}

interface Lead {
  id: string;
  created_at: string;
  referrer_name: string;
  referrer_email: string;
  referrer_phone: string | null;
  lead_name: string;
  lead_phone: string;
  lead_email: string | null;
  lead_need: string;
  relationship_to_lead: string | null;
  status: string;
  notes: string | null;
  deal_value?: number | null;
}

interface MarketplaceReferral {
  id: string;
  created_at: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  notes: string | null;
  status: string;
  payment_status: string;
  payout_amount: number | null;
  offers: { title: string } | null;
  deal_value?: number | null;
}

interface OfferRow {
  id: string;
  title: string;
  status: string | null;
  approval_status: string | null;
  payout: number | string | null;
  category: string | null;
  created_at: string;
}

const STATUSES = ["new", "contacted", "in_progress", "closed_won", "closed_lost", "invalid"];
const STATUS_LABEL: Record<string, string> = {
  new: "New", contacted: "Contacted", in_progress: "In Progress",
  closed_won: "Closed Won", closed_lost: "Closed Lost", invalid: "Invalid",
};

const REFERRAL_STATUSES = ["submitted", "contacted", "in_progress", "won", "lost"];
const REFERRAL_STATUS_LABEL: Record<string, string> = {
  submitted: "Submitted", contacted: "Contacted", in_progress: "In Progress",
  won: "Won", lost: "Lost",
};

const BusinessDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [biz, setBiz] = useState<Business | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [marketplaceReferrals, setMarketplaceReferrals] = useState<MarketplaceReferral[]>([]);
  const [offers, setOffers] = useState<OfferRow[]>([]);
  const [contactStats, setContactStats] = useState<{ total: number; sent: number }>({ total: 0, sent: 0 });
  const [qrPrinted, setQrPrinted] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>("customers");
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (user) loadAll(); }, [user]);

  useEffect(() => {
    if (biz?.id) {
      setQrPrinted(localStorage.getItem(`revvin_qr_printed_${biz.id}`) === "1");
    }
  }, [biz?.id]);

  const loadAll = async () => {
    if (!user) return;
    setLoading(true);
    const { data: bizData } = await supabase
      .from("businesses")
      .select("*")
      .eq("user_id", user.id)
      .limit(1);
    const b = (bizData?.[0] as Business) ?? null;
    setBiz(b);
    if (b) {
      const [leadRes, refRes, contactRes, offerRes] = await Promise.all([
        supabase.from("leads").select("*").eq("business_id", b.id).order("created_at", { ascending: false }),
        supabase.from("referrals")
          .select("id, created_at, customer_name, customer_email, customer_phone, notes, status, payment_status, payout_amount, deal_value, offers(title)")
          .eq("business_id", b.id)
          .order("created_at", { ascending: false }),
        (supabase as any).from("referral_contacts").select("id, status").eq("business_id", b.id),
        supabase.from("offers")
          .select("id, title, status, approval_status, payout, category, created_at")
          .eq("business_id", b.id)
          .order("created_at", { ascending: false }),
      ]);
      setLeads((leadRes.data as Lead[]) ?? []);
      setMarketplaceReferrals((refRes.data as any[] as MarketplaceReferral[]) ?? []);
      setOffers((offerRes.data as OfferRow[]) ?? []);
      const cdata = (contactRes as any).data as Array<{ id: string; status: string }> | null;
      setContactStats({
        total: cdata?.length ?? 0,
        sent: (cdata ?? []).filter((c) => c.status === "sent").length,
      });
    }
    setLoading(false);
  };

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (!biz) {
    return (
      <div className="container py-16 text-center">
        <p className="text-muted-foreground">No business found.</p>
      </div>
    );
  }

  // Subscription lock: anything outside active/trialing/past_due is locked out
  // of the full dashboard with a Reactivate screen.
  const subStatus = (biz.subscription_status || "").toLowerCase();
  const subscriptionUnlocked = ["active", "trialing", "past_due"].includes(subStatus);
  if (!subscriptionUnlocked) {
    return <SubscriptionLockScreen biz={biz} />;
  }

  // Not yet onboarded
  if (!biz.slug || !biz.is_published) {
    return (
      <div className="container py-16 max-w-xl text-center">
        <h1 className="text-2xl font-semibold text-foreground">Finish setting up your referral page</h1>
        <p className="mt-2 text-sm text-muted-foreground">You're almost there.</p>
        <Button asChild className="mt-6"><Link to="/welcome">Continue setup</Link></Button>
      </div>
    );
  }

  const publicUrl = `${window.location.origin}/r/${biz.slug}`;

  const goToQr = () => {
    if (!biz) return;
    localStorage.setItem(`revvin_qr_printed_${biz.id}`, "1");
    setQrPrinted(true);
    setActiveTab("share");
  };

  const activationSteps: ActivationStep[] = [
    {
      label: "Add your offer (reward and description)",
      done: !!(biz.offer_amount && biz.offer_trigger),
      href: "/welcome",
      actionLabel: "Add offer",
    },
    {
      label: "Customize your referral page (upload a logo)",
      done: !!biz.logo_url,
      href: "/welcome",
      actionLabel: "Upload logo",
    },
    {
      label: "Create a marketplace offer to attract outside referrers",
      done: offers.length > 0,
      href: "/dashboard/create-offer",
      actionLabel: "Create offer",
    },
    {
      label: "Import your customers",
      done: contactStats.total > 0,
    },
    {
      label: "Send your first batch",
      done: contactStats.sent > 0,
    },
    {
      label: "Print your QR code",
      done: qrPrinted,
      onClick: goToQr,
      actionLabel: "Open QR",
    },
  ];

  return (
    <div className="container py-10 max-w-6xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">{biz.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">Your referral program dashboard</p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild><Link to="/dashboard/create-offer"><Plus className="mr-2 h-3.5 w-3.5" /> Create offer</Link></Button>
          <Button variant="outline" asChild><a href={publicUrl} target="_blank" rel="noopener noreferrer">View public page <ExternalLink className="ml-2 h-3.5 w-3.5" /></a></Button>
        </div>
      </div>

      <ActivationChecklist steps={activationSteps} />

      <RoiSummaryCard businessId={biz.id} />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="customers">Customers {contactStats.total > 0 && <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">{contactStats.total}</span>}</TabsTrigger>
          <TabsTrigger value="leads">Leads {leads.length > 0 && <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">{leads.length}</span>}</TabsTrigger>
          <TabsTrigger value="offers">Offers {offers.length > 0 && <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">{offers.length}</span>}</TabsTrigger>
          <TabsTrigger value="referrals">Marketplace Referrals {marketplaceReferrals.length > 0 && <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">{marketplaceReferrals.length}</span>}</TabsTrigger>
          <TabsTrigger value="page">My Page</TabsTrigger>
          <TabsTrigger value="share">Share Tools</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
        </TabsList>

        <TabsContent value="customers">
          <CustomersTab biz={{ id: biz.id, name: biz.name, offer_amount: biz.offer_amount, offer_trigger: biz.offer_trigger }} publicUrl={publicUrl} />
        </TabsContent>
        <TabsContent value="leads"><LeadsTab leads={leads} reload={loadAll} /></TabsContent>
        <TabsContent value="offers"><OffersTab offers={offers} /></TabsContent>
        <TabsContent value="referrals"><MarketplaceReferralsTab referrals={marketplaceReferrals} reload={loadAll} /></TabsContent>
        <TabsContent value="page"><PageTab biz={biz} publicUrl={publicUrl} onUpdate={loadAll} /></TabsContent>
        <TabsContent value="share"><ShareTab biz={biz} publicUrl={publicUrl} /></TabsContent>
        <TabsContent value="account"><AccountTab biz={biz} onUpdate={loadAll} /></TabsContent>
      </Tabs>
    </div>
  );
};

// ============= SUBSCRIPTION LOCK SCREEN =============
const SubscriptionLockScreen = ({ biz }: { biz: Business }) => {
  const { toast } = useToast();
  const [busy, setBusy] = useState<"checkout" | "portal" | null>(null);

  const startCheckout = async () => {
    setBusy("checkout");
    const { data, error } = await supabase.functions.invoke("create-business-checkout", {
      body: { includeLaunchPackage: false },
    });
    if (error || !data?.url) {
      setBusy(null);
      toast({ title: "Could not start checkout", description: error?.message, variant: "destructive" });
      return;
    }
    window.location.href = data.url;
  };

  const openPortal = async () => {
    setBusy("portal");
    const { data, error } = await supabase.functions.invoke("customer-portal");
    setBusy(null);
    if (error || !data?.url) {
      toast({ title: "Could not open billing portal", description: error?.message, variant: "destructive" });
      return;
    }
    window.open(data.url, "_blank");
  };

  const status = biz.subscription_status || "none";
  const hasStripeCustomer = !!biz.stripe_customer_id;

  return (
    <div className="container max-w-xl py-16">
      <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700">
          <Lock className="h-5 w-5" />
        </div>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-foreground">Reactivate your subscription</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your Revvin dashboard is locked because your subscription is not active. Reactivate to restore your referral page, leads, and marketplace offers.
        </p>
        <p className="mt-2 text-[11px] uppercase tracking-wider text-muted-foreground">
          Current status: {status}
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <Button size="lg" className="h-11" onClick={startCheckout} disabled={busy !== null}>
            {busy === "checkout" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reactivate ($49/month)"}
          </Button>
          {hasStripeCustomer && (
            <Button variant="outline" onClick={openPortal} disabled={busy !== null}>
              {busy === "portal" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Manage billing in customer portal"}
            </Button>
          )}
        </div>
        <p className="mt-4 text-[11px] text-muted-foreground">
          Need help? Email <a className="underline" href="mailto:info@revvin.co">info@revvin.co</a>.
        </p>
      </div>
    </div>
  );
};

// ============= OFFERS TAB =============
const OffersTab = ({ offers }: { offers: OfferRow[] }) => {
  if (offers.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-16 text-center">
        <Inbox className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-lg font-semibold text-foreground">No marketplace offers yet</h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
          Create a public offer so outside referrers on the Revvin marketplace can find you and submit referrals.
        </p>
        <Button asChild className="mt-6"><Link to="/dashboard/create-offer"><Plus className="mr-2 h-3.5 w-3.5" /> Create your first offer</Link></Button>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button asChild size="sm"><Link to="/dashboard/create-offer"><Plus className="mr-2 h-3.5 w-3.5" /> Create offer</Link></Button>
      </div>
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Offer</th>
                <th className="text-left px-4 py-3 font-medium">Category</th>
                <th className="text-left px-4 py-3 font-medium">Payout</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {offers.map((o) => (
                <tr key={o.id} className="border-t border-border hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium text-foreground">{o.title}</td>
                  <td className="px-4 py-3 text-muted-foreground">{o.category || "—"}</td>
                  <td className="px-4 py-3 text-foreground">{o.payout ? `$${o.payout}` : "—"}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-xs capitalize text-muted-foreground">
                      {o.approval_status === "approved" ? (o.status || "active") : (o.approval_status || "pending")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link to={`/dashboard/edit-offer/${o.id}`}>Edit</Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ============= LEADS TAB =============
const LeadsTab = ({ leads, reload }: { leads: Lead[]; reload: () => void }) => {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState<Record<string, string>>({});

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("leads").update({ status }).eq("id", id);
    if (error) toast({ title: "Update failed", description: error.message, variant: "destructive" });
    else {
      if (status === "closed_won") {
        supabase.functions.invoke("notify-deal-closed", { body: { lead_id: id } }).catch(() => {});
      }
      reload();
    }
  };

  const saveNotes = async (id: string) => {
    const { error } = await supabase.from("leads").update({ notes: editingNotes[id] ?? "" }).eq("id", id);
    if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Notes saved" }); reload(); }
  };

  const saveDealValue = async (id: string, raw: string) => {
    const v = raw.trim() === "" ? null : Number(raw.replace(/[^0-9.]/g, ""));
    if (v !== null && (Number.isNaN(v) || v < 0)) {
      toast({ title: "Enter a valid amount", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("leads").update({ deal_value: v } as never).eq("id", id);
    if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Deal value saved" }); reload(); }
  };

  const exportCsv = () => {
    const rows = [
      ["Date","Lead name","Lead phone","Lead email","Need","Referrer name","Referrer email","Referrer phone","Status","Notes"],
      ...leads.map(l => [
        new Date(l.created_at).toISOString(),
        l.lead_name, l.lead_phone, l.lead_email || "", l.lead_need,
        l.referrer_name, l.referrer_email, l.referrer_phone || "",
        l.status, (l.notes || "").replace(/\n/g, " "),
      ]),
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `revvin-leads-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  if (leads.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-16 text-center">
        <Inbox className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-lg font-semibold text-foreground">No leads yet</h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">Share your referral link or QR code to start receiving leads. Check the Share Tools tab.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button variant="outline" size="sm" onClick={exportCsv}><Download className="mr-2 h-3.5 w-3.5" /> Export CSV</Button>
      </div>
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Date</th>
                <th className="text-left px-4 py-3 font-medium">Lead</th>
                <th className="text-left px-4 py-3 font-medium">Referrer</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => (
                <>
                  <tr key={l.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{new Date(l.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3"><div className="font-medium text-foreground">{l.lead_name}</div><div className="text-xs text-muted-foreground">{l.lead_phone}</div></td>
                    <td className="px-4 py-3"><div className="text-foreground">{l.referrer_name}</div><div className="text-xs text-muted-foreground">{l.referrer_email}</div></td>
                    <td className="px-4 py-3">
                      <Select value={l.status} onValueChange={(v) => updateStatus(l.id, v)}>
                        <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}</SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="sm" onClick={() => setExpanded(expanded === l.id ? null : l.id)}>{expanded === l.id ? "Hide" : "Details"}</Button>
                    </td>
                  </tr>
                  {expanded === l.id && (
                    <tr className="border-t border-border bg-muted/20">
                      <td colSpan={5} className="px-4 py-5">
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2 text-sm">
                            <div><span className="text-muted-foreground">Lead email:</span> {l.lead_email || "—"}</div>
                            <div><span className="text-muted-foreground">What they need:</span> {l.lead_need}</div>
                            <div><span className="text-muted-foreground">Referrer phone:</span> {l.referrer_phone || "—"}</div>
                            <div><span className="text-muted-foreground">Relationship:</span> {l.relationship_to_lead || "—"}</div>
                            {l.status === "closed_won" && (
                              <div className="pt-2">
                                <Label className="text-xs">Deal value (optional)</Label>
                                <div className="mt-1.5 flex items-center gap-2">
                                  <span className="text-sm text-muted-foreground">$</span>
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    inputMode="decimal"
                                    defaultValue={l.deal_value ?? ""}
                                    placeholder="0"
                                    className="h-9 max-w-[160px]"
                                    onBlur={(e) => {
                                      const v = e.target.value;
                                      const current = l.deal_value == null ? "" : String(l.deal_value);
                                      if (v !== current) saveDealValue(l.id, v);
                                    }}
                                  />
                                </div>
                                <p className="mt-1 text-xs text-muted-foreground">Powers your monthly Revvin ROI recap.</p>
                              </div>
                            )}
                          </div>
                          <div>
                            <Label className="text-xs">Notes</Label>
                            <Textarea
                              className="mt-1.5"
                              defaultValue={l.notes || ""}
                              onChange={(e) => setEditingNotes((p) => ({ ...p, [l.id]: e.target.value }))}
                              rows={3}
                            />
                            <Button size="sm" className="mt-2" onClick={() => saveNotes(l.id)}>Save notes</Button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ============= MARKETPLACE REFERRALS TAB =============
const MarketplaceReferralsTab = ({ referrals, reload }: { referrals: MarketplaceReferral[]; reload: () => void }) => {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState<string | null>(null);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("referrals").update({ status }).eq("id", id);
    if (error) toast({ title: "Update failed", description: error.message, variant: "destructive" });
    else {
      if (status === "won") {
        supabase.functions.invoke("notify-deal-closed", { body: { referral_id: id } }).catch(() => {});
      }
      reload();
    }
  };

  const markAsPaid = async (id: string) => {
    const { error } = await supabase
      .from("referrals")
      .update({ payment_status: "paid", payment_marked_at: new Date().toISOString() } as never)
      .eq("id", id);
    if (error) toast({ title: "Update failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Marked as paid" }); reload(); }
  };

  const saveDealValue = async (id: string, raw: string, current: number | null | undefined) => {
    const v = raw.trim() === "" ? null : Number(raw.replace(/[^0-9.]/g, ""));
    if (v !== null && (Number.isNaN(v) || v < 0)) {
      toast({ title: "Enter a valid amount", variant: "destructive" });
      return;
    }
    if ((v ?? null) === (current ?? null)) return;
    const { error } = await supabase.from("referrals").update({ deal_value: v } as never).eq("id", id);
    if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Deal value saved" }); reload(); }
  };

  if (referrals.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-16 text-center">
        <Inbox className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-lg font-semibold text-foreground">No marketplace referrals yet</h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">Referrals submitted through public offers on the Revvin marketplace will appear here.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Date</th>
              <th className="text-left px-4 py-3 font-medium">Customer</th>
              <th className="text-left px-4 py-3 font-medium">Offer</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="text-left px-4 py-3 font-medium">Payment</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {referrals.map((r) => (
              <>
                <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{new Date(r.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">{r.customer_name}</div>
                    <div className="text-xs text-muted-foreground">{r.customer_phone || r.customer_email || "—"}</div>
                  </td>
                  <td className="px-4 py-3 text-foreground">{r.offers?.title ?? "—"}</td>
                  <td className="px-4 py-3">
                    <Select value={r.status} onValueChange={(v) => updateStatus(r.id, v)}>
                      <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{REFERRAL_STATUSES.map((s) => <SelectItem key={s} value={s}>{REFERRAL_STATUS_LABEL[s]}</SelectItem>)}</SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-3">
                    {r.status === "won" ? (
                      r.payment_status === "paid" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                          <Check className="h-3 w-3" /> Paid
                        </span>
                      ) : r.payment_status === "flagged_unpaid" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-xs text-destructive">
                          <AlertCircle className="h-3 w-3" /> Flagged unpaid
                        </span>
                      ) : (
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => markAsPaid(r.id)}>
                          Mark as paid {r.payout_amount ? `($${r.payout_amount})` : ""}
                        </Button>
                      )
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="sm" onClick={() => setExpanded(expanded === r.id ? null : r.id)}>{expanded === r.id ? "Hide" : "Details"}</Button>
                  </td>
                </tr>
                {expanded === r.id && (
                  <tr className="border-t border-border bg-muted/20">
                    <td colSpan={6} className="px-4 py-5">
                      <div className="grid gap-4 md:grid-cols-2 text-sm">
                        <div className="space-y-2">
                          <div><span className="text-muted-foreground">Customer email:</span> {r.customer_email || "—"}</div>
                          <div><span className="text-muted-foreground">Customer phone:</span> {r.customer_phone || "—"}</div>
                          <div><span className="text-muted-foreground">Payout owed:</span> {r.payout_amount ? `$${r.payout_amount}` : "—"}</div>
                          {r.status === "won" && (
                            <div className="pt-2">
                              <Label className="text-xs">Deal value (optional)</Label>
                              <div className="mt-1.5 flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">$</span>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  inputMode="decimal"
                                  defaultValue={r.deal_value ?? ""}
                                  placeholder="0"
                                  className="h-9 max-w-[160px]"
                                  onBlur={(e) => saveDealValue(r.id, e.target.value, r.deal_value)}
                                />
                              </div>
                              <p className="mt-1 text-xs text-muted-foreground">Powers your monthly Revvin ROI recap.</p>
                            </div>
                          )}
                        </div>
                        <div>
                          <Label className="text-xs">Notes from referrer</Label>
                          <p className="mt-1.5 text-foreground">{r.notes || "—"}</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ============= PAGE TAB =============
const PageTab = ({ biz, publicUrl, onUpdate }: { biz: Business; publicUrl: string; onUpdate: () => void }) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(publicUrl); setCopied(true); setTimeout(() => setCopied(false), 1500); };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="rounded-2xl border border-border bg-card p-6">
        <h3 className="text-sm font-semibold text-foreground mb-3">Your public referral page</h3>
        <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm font-mono text-foreground break-all">{publicUrl}</div>
        <div className="mt-3 flex gap-2">
          <Button variant="outline" size="sm" onClick={copy}>{copied ? <><Check className="mr-2 h-3.5 w-3.5" /> Copied</> : <><Copy className="mr-2 h-3.5 w-3.5" /> Copy link</>}</Button>
          <Button variant="outline" size="sm" asChild><a href={publicUrl} target="_blank" rel="noopener noreferrer">Open <ExternalLink className="ml-2 h-3.5 w-3.5" /></a></Button>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <h3 className="text-sm font-semibold text-foreground mb-3">Edit your page</h3>
        <p className="text-sm text-muted-foreground mb-4">Update your business info, offer, or logo.</p>
        <Button variant="outline" asChild><Link to="/welcome">Edit setup</Link></Button>
      </div>

      <div className="md:col-span-2 rounded-2xl border border-border bg-card p-6">
        <h3 className="text-sm font-semibold text-foreground mb-4">Preview</h3>
        <div className="rounded-xl border border-border bg-muted/30 p-6">
          <div className="flex items-center gap-3">
            {biz.logo_url ? <img src={biz.logo_url} className="h-12 w-12 rounded-xl object-cover border border-border" alt="" /> : <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-semibold">{biz.name.charAt(0)}</div>}
            <div>
              <p className="font-semibold text-foreground">{biz.name}</p>
              <p className="text-xs text-muted-foreground">{biz.description}</p>
            </div>
          </div>
          {biz.offer_amount && (
            <div className="mt-4 rounded-lg bg-primary/5 border border-primary/20 p-3">
              <p className="text-sm font-semibold text-foreground">Refer a customer, earn {biz.offer_amount}</p>
              {biz.offer_trigger && <p className="text-xs text-muted-foreground">{biz.offer_trigger}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============= SHARE TAB =============
const ShareTab = ({ biz, publicUrl }: { biz: Business; publicUrl: string }) => {
  const qrRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!qrRef.current) return;
    const qr = new QRCodeStyling({
      width: 240, height: 240, data: publicUrl,
      dotsOptions: { color: "#0F172A", type: "rounded" },
      cornersSquareOptions: { color: "#15803D", type: "extra-rounded" },
      cornersDotOptions: { color: "#15803D", type: "dot" },
      backgroundOptions: { color: "#ffffff" },
      qrOptions: { errorCorrectionLevel: "H" },
    });
    qrRef.current.innerHTML = "";
    qr.append(qrRef.current);
  }, [publicUrl]);

  const download = (ext: "png" | "svg") => {
    const hq = new QRCodeStyling({
      width: 1024, height: 1024, data: publicUrl,
      dotsOptions: { color: "#0F172A", type: "rounded" },
      cornersSquareOptions: { color: "#15803D", type: "extra-rounded" },
      cornersDotOptions: { color: "#15803D", type: "dot" },
      backgroundOptions: { color: "#ffffff" },
      qrOptions: { errorCorrectionLevel: "H" },
    });
    hq.download({ name: `${biz.slug}-qr`, extension: ext });
  };

  const printPdf = () => {
    const canvas = qrRef.current?.querySelector("canvas");
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<html><head><title>${biz.name} — Referral QR</title><style>body{margin:0;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;font-family:system-ui,sans-serif;text-align:center}img{width:400px;height:400px}h1{font-size:24px;margin:24px 0 8px}p{color:#64748b;font-size:14px}@media print{body{padding:0}}</style></head><body><h1>${biz.name}</h1><p>Refer a customer, earn ${biz.offer_amount || ""}</p><img src="${dataUrl}" /><p style="margin-top:16px;font-size:12px;word-break:break-all">${publicUrl}</p><script>window.onload=()=>window.print()</script></body></html>`);
    w.document.close();
  };

  const emailTemplate = `Hey [name], we've launched a referral program. If you know someone who could use our services, send them through this link: ${publicUrl}`;
  const smsTemplate = `Hey — quick favor: if you know anyone who needs ${biz.category || "our services"}, send them here: ${publicUrl}`;

  const copy = (s: string, label: string) => { navigator.clipboard.writeText(s); toast({ title: `${label} copied` }); };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="rounded-2xl border border-border bg-card p-6">
        <h3 className="text-sm font-semibold text-foreground mb-4">QR code</h3>
        <div className="flex justify-center mb-4" ref={qrRef} />
        <div className="flex gap-2 flex-wrap justify-center">
          <Button variant="outline" size="sm" onClick={() => download("png")}><Download className="mr-2 h-3.5 w-3.5" /> PNG</Button>
          <Button variant="outline" size="sm" onClick={() => download("svg")}><Download className="mr-2 h-3.5 w-3.5" /> SVG</Button>
          <Button variant="outline" size="sm" onClick={printPdf}>Print / PDF</Button>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-2">Referral link</h3>
          <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm font-mono break-all">{publicUrl}</div>
          <Button size="sm" variant="outline" className="mt-2" onClick={() => copy(publicUrl, "Link")}><Copy className="mr-2 h-3.5 w-3.5" /> Copy</Button>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-2">Email template</h3>
          <Textarea readOnly value={emailTemplate} rows={3} className="text-xs" />
          <Button size="sm" variant="outline" className="mt-2" onClick={() => copy(emailTemplate, "Email")}><Copy className="mr-2 h-3.5 w-3.5" /> Copy</Button>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-2">SMS template</h3>
          <Textarea readOnly value={smsTemplate} rows={2} className="text-xs" />
          <Button size="sm" variant="outline" className="mt-2" onClick={() => copy(smsTemplate, "SMS")}><Copy className="mr-2 h-3.5 w-3.5" /> Copy</Button>
        </div>
      </div>
    </div>
  );
};

// ============= ACCOUNT TAB =============
const AccountTab = ({ biz, onUpdate }: { biz: Business; onUpdate: () => void }) => {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [notifs, setNotifs] = useState({
    email: true,
    sms: false,
    email_on_new_lead: true,
    email_on_closed_deal: true,
    notification_email: biz.business_email || "",
    notification_phone: biz.phone || "",
  });
  const [marketplaceListed, setMarketplaceListed] = useState<boolean>(biz.marketplace_listed ?? true);
  const [savingMarketplace, setSavingMarketplace] = useState(false);

  const toggleMarketplace = async (next: boolean) => {
    setMarketplaceListed(next);
    setSavingMarketplace(true);
    const { error } = await supabase
      .from("businesses")
      .update({ marketplace_listed: next } as never)
      .eq("id", biz.id);
    setSavingMarketplace(false);
    if (error) {
      setMarketplaceListed(!next);
      toast({ title: "Could not update", description: error.message, variant: "destructive" });
    } else {
      toast({ title: next ? "Listed on marketplace" : "Removed from marketplace" });
      onUpdate();
    }
  };

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("notification_settings").select("*").eq("business_id", biz.id).limit(1);
      const n = data?.[0];
      if (n) setNotifs({
        email: n.email_notifications_enabled,
        sms: n.sms_notifications_enabled,
        email_on_new_lead: (n as any).email_on_new_lead ?? true,
        email_on_closed_deal: (n as any).email_on_closed_deal ?? true,
        notification_email: n.notification_email || biz.business_email || "",
        notification_phone: n.notification_phone || biz.phone || "",
      });
    })();
  }, [biz.id]);

  const saveNotifs = async () => {
    setBusy(true);
    const { error } = await supabase.from("notification_settings").upsert({
      business_id: biz.id,
      email_notifications_enabled: notifs.email,
      sms_notifications_enabled: notifs.sms,
      email_on_new_lead: notifs.email_on_new_lead,
      email_on_closed_deal: notifs.email_on_closed_deal,
      notification_email: notifs.notification_email,
      notification_phone: notifs.notification_phone,
    } as never, { onConflict: "business_id" });
    setBusy(false);
    if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
    else toast({ title: "Saved" });
  };

  const openPortal = async () => {
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("customer-portal");
    setBusy(false);
    if (error || !data?.url) { toast({ title: "Could not open billing portal", description: error?.message, variant: "destructive" }); return; }
    window.open(data.url, "_blank");
  };

  const startSubscription = async () => {
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("create-business-checkout", {
      body: { includeLaunchPackage: false },
    });
    setBusy(false);
    if (error || !data?.url) {
      toast({ title: "Could not start checkout", description: error?.message, variant: "destructive" });
      return;
    }
    window.location.href = data.url;
  };

  const hasSubscription = !!biz.subscription_status && !["none", "canceled"].includes(biz.subscription_status);

  const periodEnd = biz.current_period_end ? new Date(biz.current_period_end).toLocaleDateString() : null;

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="rounded-2xl border border-border bg-card p-6 md:col-span-2">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">Marketplace Listing</h3>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${marketplaceListed ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                {marketplaceListed ? "On" : "Off"}
              </span>
            </div>
            <p className="mt-2 max-w-2xl text-xs leading-relaxed text-muted-foreground">
              When <span className="font-semibold text-foreground">ON</span>, your offer appears on the public Revvin.co marketplace where outside referrers can discover and submit referrals.
              When <span className="font-semibold text-foreground">OFF</span>, your referral page is only accessible to people you share it with directly.
            </p>
          </div>
          <Switch checked={marketplaceListed} onCheckedChange={toggleMarketplace} disabled={savingMarketplace} />
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <h3 className="text-sm font-semibold text-foreground mb-1">Subscription</h3>
        <p className="text-xs text-muted-foreground mb-4">Pro · $49/month · cancel anytime.</p>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Status</span><span className="text-foreground font-medium capitalize">{biz.subscription_status || "—"}</span></div>
          {periodEnd && <div className="flex justify-between"><span className="text-muted-foreground">Next billing</span><span className="text-foreground">{periodEnd}</span></div>}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Launch Package</span>
            {biz.launch_package_status && biz.launch_package_status !== "none" ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                <Check className="h-3 w-3" /> {biz.launch_package_status === "purchased" ? "Purchased" : biz.launch_package_status.replace(/_/g, " ")}
              </span>
            ) : (
              <span className="text-muted-foreground">Not added</span>
            )}
          </div>
        </div>
        {biz.launch_package_status && biz.launch_package_status !== "none" && (
          <p className="mt-3 rounded-md bg-surface-warm p-2.5 text-[11px] leading-snug text-muted-foreground">
            $297 Launch Package recorded. Our team will reach out within 1 business day to schedule your onboarding call.
          </p>
        )}
        {hasSubscription ? (
          <Button variant="outline" className="mt-4 w-full" onClick={openPortal} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Manage billing"}</Button>
        ) : (
          <Button className="mt-4 w-full" onClick={startSubscription} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Start subscription · $49/month"}</Button>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <h3 className="text-sm font-semibold text-foreground mb-4">Lead notifications</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between"><Label className="text-sm">Email notifications</Label><Switch checked={notifs.email} onCheckedChange={(v) => setNotifs((p) => ({ ...p, email: v }))} /></div>
          <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm text-foreground">Email me when a new lead arrives</p>
                <p className="text-xs text-muted-foreground">Instant alert with lead details and a link to the dashboard.</p>
              </div>
              <Switch
                disabled={!notifs.email}
                checked={notifs.email_on_new_lead}
                onCheckedChange={(v) => setNotifs((p) => ({ ...p, email_on_new_lead: v }))}
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm text-foreground">Email me when a deal closes</p>
                <p className="text-xs text-muted-foreground">Short congrats note when you mark a referral closed or won.</p>
              </div>
              <Switch
                disabled={!notifs.email}
                checked={notifs.email_on_closed_deal}
                onCheckedChange={(v) => setNotifs((p) => ({ ...p, email_on_closed_deal: v }))}
              />
            </div>
          </div>
          <div><Label className="text-xs">Notification email</Label><Input type="email" value={notifs.notification_email} onChange={(e) => setNotifs((p) => ({ ...p, notification_email: e.target.value }))} className="mt-1.5" /></div>
          <div className="flex items-center justify-between"><Label className="text-sm">SMS notifications</Label><Switch checked={notifs.sms} onCheckedChange={(v) => setNotifs((p) => ({ ...p, sms: v }))} /></div>
          <div><Label className="text-xs">Notification phone</Label><Input type="tel" value={notifs.notification_phone} onChange={(e) => setNotifs((p) => ({ ...p, notification_phone: e.target.value }))} className="mt-1.5" /></div>
          <Button onClick={saveNotifs} disabled={busy} className="w-full">Save</Button>
        </div>
      </div>
    </div>
  );
};

export default BusinessDashboard;