import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  DollarSign, Users, Building2, TrendingUp, FileText, CheckCircle2,
  Clock, XCircle, Eye, BarChart3, Shield, Activity, BadgeCheck,
  AlertTriangle, Pause, Play, Scale, Gavel, History, Search
} from "lucide-react";
import { motion } from "framer-motion";
import type { DisputeStatus } from "@/types/offer";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.5 } }),
};

const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
  submitted: { bg: "bg-muted", text: "text-muted-foreground", label: "Submitted" },
  accepted: { bg: "bg-primary/10", text: "text-primary", label: "Accepted" },
  contacted: { bg: "bg-blue-50", text: "text-blue-700", label: "Contacted" },
  qualified: { bg: "bg-primary/10", text: "text-primary", label: "Qualified" },
  in_progress: { bg: "bg-accent/10", text: "text-accent-foreground", label: "In Progress" },
  won: { bg: "bg-earnings/10", text: "text-earnings", label: "Won" },
  lost: { bg: "bg-destructive/10", text: "text-destructive", label: "Lost" },
  declined: { bg: "bg-muted", text: "text-muted-foreground", label: "Declined" },
};

// Simulated disputes
const mockDisputes = [
  { id: "d1", referralId: "ref-001", referrerName: "Sarah M.", businessName: "NorthShield Roofing", reason: "Lead resulted in a closed deal but was marked as 'lost'. Customer confirms they signed a contract.", status: "submitted" as DisputeStatus, createdAt: new Date(Date.now() - 2 * 86400000).toISOString(), amount: 540 },
  { id: "d2", referralId: "ref-002", referrerName: "James R.", businessName: "FlowFix Plumbing", reason: "Business has not responded for 14 days after accepting. Funds are locked in escrow.", status: "under_review" as DisputeStatus, createdAt: new Date(Date.now() - 5 * 86400000).toISOString(), amount: 112 },
  { id: "d3", referralId: "ref-003", referrerName: "Maria L.", businessName: "SunPower Solutions", reason: "Duplicate claim — referrer says they submitted first.", status: "resolved_paid" as DisputeStatus, createdAt: new Date(Date.now() - 10 * 86400000).toISOString(), resolvedAt: new Date(Date.now() - 7 * 86400000).toISOString(), amount: 450 },
];

// Simulated audit log
const mockAuditLog = [
  { id: "a1", action: "business_verified", actor: "Admin", target: "NorthShield Roofing", detail: "Verified → Verified+", date: new Date(Date.now() - 1 * 86400000).toISOString() },
  { id: "a2", action: "dispute_resolved", actor: "Admin", target: "Dispute #d3", detail: "Resolved: Paid to Maria L.", date: new Date(Date.now() - 7 * 86400000).toISOString() },
  { id: "a3", action: "offer_frozen", actor: "Admin", target: "IT Managed Services", detail: "Offer paused — low funds", date: new Date(Date.now() - 3 * 86400000).toISOString() },
  { id: "a4", action: "payout_approved", actor: "System", target: "Sarah M.", detail: "$540 CAD released", date: new Date(Date.now() - 2 * 86400000).toISOString() },
  { id: "a5", action: "referral_status", actor: "TopShield Roofing", target: "Referral #ref-005", detail: "Status: submitted → accepted", date: new Date(Date.now() - 4 * 86400000).toISOString() },
  { id: "a6", action: "wallet_topup", actor: "PacificGreen Landscapes", target: "Wallet", detail: "+CA$1,000 via Interac", date: new Date(Date.now() - 6 * 86400000).toISOString() },
];

const AdminDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [referrals, setReferrals] = useState<any[]>([]);
  const [offers, setOffers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [disputes, setDisputes] = useState(mockDisputes);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    if (!user) return;
    const fetchAll = async () => {
      const [refRes, offRes, roleRes, bizRes, profRes] = await Promise.all([
        supabase.from("referrals").select("*, offers(title, payout, payout_type), businesses(name)").order("created_at", { ascending: false }),
        supabase.from("offers").select("*, businesses(name)").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("*"),
        supabase.from("businesses").select("*").order("created_at", { ascending: false }),
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      ]);
      setReferrals(refRes.data ?? []);
      setOffers(offRes.data ?? []);
      setRoles(roleRes.data ?? []);
      setBusinesses(bizRes.data ?? []);
      setProfiles(profRes.data ?? []);
      setLoading(false);
    };
    fetchAll();
  }, [user]);

  const totalBusinesses = roles.filter(r => r.role === "business").length;
  const totalReferrers = roles.filter(r => r.role === "referrer").length;
  const wonDeals = referrals.filter(r => r.status === "won").length;
  const totalPlatformRevenue = referrals.filter(r => r.status === "won").reduce((sum, r) => sum + (r.payout_amount ?? r.offers?.payout ?? 0) * 0.1, 0);
  const totalPayouts = referrals.filter(r => r.status === "won").reduce((sum, r) => sum + (r.payout_amount ?? r.offers?.payout ?? 0), 0);
  const activeOffers = offers.filter(o => o.status === "active").length;
  const conversionRate = referrals.length > 0 ? Math.round((wonDeals / referrals.length) * 100) : 0;
  const pendingDisputes = disputes.filter(d => d.status === "submitted" || d.status === "under_review").length;

  const stats = [
    { label: "Businesses", value: totalBusinesses.toString(), icon: Building2, color: "text-primary", bgColor: "bg-primary/10" },
    { label: "Referrers", value: totalReferrers.toString(), icon: Users, color: "text-accent-foreground", bgColor: "bg-accent/10" },
    { label: "Active Offers", value: activeOffers.toString(), icon: Activity, color: "text-primary", bgColor: "bg-primary/10" },
    { label: "Deals Won", value: wonDeals.toString(), icon: CheckCircle2, color: "text-earnings", bgColor: "bg-earnings/10" },
    { label: "Conversion", value: `${conversionRate}%`, icon: TrendingUp, color: "text-accent-foreground", bgColor: "bg-accent/10" },
    { label: "Total Payouts", value: `$${totalPayouts.toLocaleString()}`, icon: DollarSign, color: "text-earnings", bgColor: "bg-earnings/10" },
    { label: "Platform Revenue", value: `$${Math.round(totalPlatformRevenue).toLocaleString()}`, icon: BarChart3, color: "text-primary", bgColor: "bg-primary/10" },
    { label: "Open Disputes", value: pendingDisputes.toString(), icon: Scale, color: pendingDisputes > 0 ? "text-destructive" : "text-muted-foreground", bgColor: pendingDisputes > 0 ? "bg-destructive/10" : "bg-muted" },
  ];

  const resolveDispute = (id: string, resolution: "resolved_paid" | "resolved_not_paid") => {
    setDisputes(prev => prev.map(d => d.id === id ? { ...d, status: resolution, resolvedAt: new Date().toISOString() } : d));
    toast({ title: "Dispute resolved", description: resolution === "resolved_paid" ? "Payout approved for referrer." : "Dispute closed — no payout." });
  };

  const verifyBusiness = (bizId: string) => {
    setBusinesses(prev => prev.map(b => b.id === bizId ? { ...b, verified: true } : b));
    toast({ title: "Business verified", description: "Verification status updated." });
  };

  const freezeOffer = (offerId: string) => {
    setOffers(prev => prev.map(o => o.id === offerId ? { ...o, status: o.status === "active" ? "paused" : "active" } : o));
    toast({ title: "Offer status updated" });
  };

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  }

  return (
    <div className="py-8">
      <div className="container max-w-7xl">
        <motion.div initial="hidden" animate="visible">
          <motion.div variants={fadeUp} custom={0} className="mb-6">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="font-display text-3xl font-bold text-foreground">Admin Console</h1>
              <Badge variant="secondary" className="gap-1"><Shield className="h-3 w-3" /> Platform Operator</Badge>
            </div>
            <p className="text-muted-foreground">Full platform oversight — verification, disputes, payouts, and audit</p>
          </motion.div>

          {/* Stats */}
          <motion.div variants={fadeUp} custom={1} className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className={`rounded-xl p-2 ${s.bgColor}`}><s.icon className={`h-4 w-4 ${s.color}`} /></div>
                  <div>
                    <p className="text-[11px] text-muted-foreground font-medium">{s.label}</p>
                    <p className="font-display text-xl font-bold text-foreground">{s.value}</p>
                  </div>
                </div>
              </div>
            ))}
          </motion.div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6 bg-muted/50 p-1">
              <TabsTrigger value="overview" className="gap-1"><BarChart3 className="h-3.5 w-3.5" /> Overview</TabsTrigger>
              <TabsTrigger value="verification" className="gap-1"><BadgeCheck className="h-3.5 w-3.5" /> Verification</TabsTrigger>
              <TabsTrigger value="disputes" className="gap-1 relative">
                <Scale className="h-3.5 w-3.5" /> Disputes
                {pendingDisputes > 0 && <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-[10px] text-destructive-foreground flex items-center justify-center font-bold">{pendingDisputes}</span>}
              </TabsTrigger>
              <TabsTrigger value="payouts" className="gap-1"><DollarSign className="h-3.5 w-3.5" /> Payouts</TabsTrigger>
              <TabsTrigger value="audit" className="gap-1"><History className="h-3.5 w-3.5" /> Audit Log</TabsTrigger>
            </TabsList>

            {/* OVERVIEW TAB */}
            <TabsContent value="overview">
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Businesses */}
                <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                  <h2 className="font-display text-base font-bold mb-3 flex items-center gap-2"><Building2 className="h-4 w-4 text-primary" /> Businesses ({businesses.length})</h2>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {businesses.length === 0 ? <p className="text-sm text-muted-foreground py-6 text-center">No businesses yet</p> : businesses.map((biz) => (
                      <div key={biz.id} className="flex items-center justify-between rounded-xl border border-border bg-muted/30 p-3">
                        <div>
                          <p className="text-sm font-medium">{biz.name}</p>
                          <p className="text-xs text-muted-foreground">{biz.industry ?? "—"} • {biz.city ?? "—"}</p>
                        </div>
                        <Badge variant={biz.verified ? "default" : "secondary"}>{biz.verified ? "Verified" : "Pending"}</Badge>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent Users */}
                <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                  <h2 className="font-display text-base font-bold mb-3 flex items-center gap-2"><Users className="h-4 w-4 text-accent-foreground" /> Recent Users ({profiles.length})</h2>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {profiles.length === 0 ? <p className="text-sm text-muted-foreground py-6 text-center">No users yet</p> : profiles.slice(0, 15).map((p) => {
                      const role = roles.find(r => r.user_id === p.user_id);
                      return (
                        <div key={p.id} className="flex items-center justify-between rounded-xl border border-border bg-muted/30 p-3">
                          <div>
                            <p className="text-sm font-medium">{p.full_name ?? "Unnamed"}</p>
                            <p className="text-xs text-muted-foreground">{p.city ?? "—"}</p>
                          </div>
                          <Badge variant={role?.role === "business" ? "default" : "secondary"}>{role?.role ?? "unknown"}</Badge>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* All Referrals table */}
              <div className="mt-6 rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
                <div className="p-4 border-b border-border"><h2 className="font-display text-base font-bold flex items-center gap-2"><Activity className="h-4 w-4 text-earnings" /> All Referrals ({referrals.length})</h2></div>
                {referrals.length === 0 ? <p className="text-sm text-muted-foreground py-10 text-center">No referrals yet</p> : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b border-border bg-muted/50">
                        <th className="text-left p-3 font-medium text-muted-foreground">Customer</th>
                        <th className="text-left p-3 font-medium text-muted-foreground">Offer</th>
                        <th className="text-left p-3 font-medium text-muted-foreground">Business</th>
                        <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                        <th className="text-left p-3 font-medium text-muted-foreground">Payout</th>
                        <th className="text-left p-3 font-medium text-muted-foreground">Date</th>
                      </tr></thead>
                      <tbody>{referrals.slice(0, 20).map((ref) => {
                        const sc = statusConfig[ref.status] ?? statusConfig.submitted;
                        return (
                          <tr key={ref.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                            <td className="p-3"><p className="font-medium">{ref.customer_name}</p><p className="text-xs text-muted-foreground">{ref.customer_email ?? "—"}</p></td>
                            <td className="p-3 text-muted-foreground">{ref.offers?.title ?? "—"}</td>
                            <td className="p-3 text-muted-foreground">{ref.businesses?.name ?? "—"}</td>
                            <td className="p-3"><Badge className={`${sc.bg} ${sc.text} border-0`}>{sc.label}</Badge></td>
                            <td className="p-3 font-medium">{ref.payout_amount ? `$${ref.payout_amount}` : "—"}</td>
                            <td className="p-3 text-muted-foreground">{new Date(ref.created_at).toLocaleDateString()}</td>
                          </tr>
                        );
                      })}</tbody>
                    </table>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* VERIFICATION TAB */}
            <TabsContent value="verification">
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <h2 className="font-display text-base font-bold mb-4 flex items-center gap-2"><BadgeCheck className="h-4 w-4 text-primary" /> Business Verification Queue</h2>
                <div className="space-y-3">
                  {businesses.map((biz) => (
                    <div key={biz.id} className="flex items-center justify-between rounded-xl border border-border bg-muted/30 p-4">
                      <div className="flex-1">
                        <p className="font-medium">{biz.name}</p>
                        <p className="text-xs text-muted-foreground">{biz.industry ?? "—"} • {biz.city ?? "No location"} • Joined {new Date(biz.created_at).toLocaleDateString()}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant={biz.verified ? "default" : "secondary"}>{biz.verified ? "Verified" : "Unverified"}</Badge>
                          {biz.website && <span className="text-xs text-muted-foreground">{biz.website}</span>}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {!biz.verified && (
                          <>
                            <Button size="sm" onClick={() => verifyBusiness(biz.id)} className="gap-1"><BadgeCheck className="h-3 w-3" /> Verify</Button>
                            <Button size="sm" variant="outline" className="gap-1"><BadgeCheck className="h-3 w-3" /> Verify+</Button>
                          </>
                        )}
                        <Button size="sm" variant="destructive" className="gap-1" onClick={() => toast({ title: "Business suspended (simulated)" })}><Pause className="h-3 w-3" /> Suspend</Button>
                      </div>
                    </div>
                  ))}
                  {businesses.length === 0 && <p className="text-sm text-muted-foreground py-8 text-center">No businesses to verify</p>}
                </div>
              </div>

              {/* Offers Management */}
              <div className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-sm">
                <h2 className="font-display text-base font-bold mb-4 flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /> Offer Management ({offers.length})</h2>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {offers.map((offer) => (
                    <div key={offer.id} className="flex items-center justify-between rounded-xl border border-border bg-muted/30 p-3">
                      <div>
                        <p className="text-sm font-medium">{offer.title}</p>
                        <p className="text-xs text-muted-foreground">{offer.businesses?.name} • {offer.category} • {offer.payout_type === "flat" ? `$${offer.payout}` : `${offer.payout}%`}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={offer.status === "active" ? "default" : "secondary"}>{offer.status}</Badge>
                        <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => freezeOffer(offer.id)}>
                          {offer.status === "active" ? <><Pause className="h-3 w-3 mr-1" /> Freeze</> : <><Play className="h-3 w-3 mr-1" /> Activate</>}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* DISPUTES TAB */}
            <TabsContent value="disputes">
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <h2 className="font-display text-base font-bold mb-4 flex items-center gap-2"><Scale className="h-4 w-4 text-primary" /> Disputes Queue</h2>
                <div className="space-y-3">
                  {disputes.map((d) => {
                    const isPending = d.status === "submitted" || d.status === "under_review";
                    return (
                      <div key={d.id} className={`rounded-xl border p-4 ${isPending ? "border-destructive/20 bg-destructive/5" : "border-border bg-muted/30"}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-medium">{d.referrerName}</p>
                              <span className="text-xs text-muted-foreground">vs</span>
                              <p className="font-medium">{d.businessName}</p>
                            </div>
                            <p className="text-sm text-muted-foreground">{d.reason}</p>
                            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                              <span>Amount: <strong className="text-foreground">${d.amount}</strong></span>
                              <span>Filed: {new Date(d.createdAt).toLocaleDateString()}</span>
                              {d.resolvedAt && <span>Resolved: {new Date(d.resolvedAt).toLocaleDateString()}</span>}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <Badge className={
                              d.status === "submitted" ? "bg-accent/10 text-accent-foreground border-0"
                                : d.status === "under_review" ? "bg-primary/10 text-primary border-0"
                                : d.status === "resolved_paid" ? "bg-earnings/10 text-earnings border-0"
                                : "bg-muted text-muted-foreground border-0"
                            }>
                              {d.status === "submitted" ? "Submitted" : d.status === "under_review" ? "Under Review" : d.status === "resolved_paid" ? "Resolved — Paid" : "Resolved — Not Paid"}
                            </Badge>
                            {isPending && (
                              <div className="flex gap-1">
                                {d.status === "submitted" && (
                                  <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => setDisputes(prev => prev.map(x => x.id === d.id ? { ...x, status: "under_review" as DisputeStatus } : x))}>
                                    <Eye className="h-3 w-3 mr-1" /> Review
                                  </Button>
                                )}
                                <Button size="sm" className="text-xs h-7 gap-1" onClick={() => resolveDispute(d.id, "resolved_paid")}>
                                  <CheckCircle2 className="h-3 w-3" /> Pay Referrer
                                </Button>
                                <Button size="sm" variant="destructive" className="text-xs h-7 gap-1" onClick={() => resolveDispute(d.id, "resolved_not_paid")}>
                                  <XCircle className="h-3 w-3" /> Deny
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </TabsContent>

            {/* PAYOUTS TAB */}
            <TabsContent value="payouts">
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <h2 className="font-display text-base font-bold mb-4 flex items-center gap-2"><DollarSign className="h-4 w-4 text-earnings" /> Payout Approvals</h2>
                <div className="space-y-2">
                  {referrals.filter(r => r.status === "won").length === 0 ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">No payouts to review</p>
                  ) : referrals.filter(r => r.status === "won").map((ref) => (
                    <div key={ref.id} className="flex items-center justify-between rounded-xl border border-border bg-muted/30 p-3">
                      <div>
                        <p className="text-sm font-medium">{ref.customer_name}</p>
                        <p className="text-xs text-muted-foreground">{ref.offers?.title} • {ref.businesses?.name}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-display font-bold text-earnings">${ref.payout_amount ?? "—"}</span>
                        <Badge className="bg-earnings/10 text-earnings border-0">Approved</Badge>
                        <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => toast({ title: "Manual override (simulated)" })}>
                          <Gavel className="h-3 w-3 mr-1" /> Override
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* AUDIT LOG TAB */}
            <TabsContent value="audit">
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <h2 className="font-display text-base font-bold mb-4 flex items-center gap-2"><History className="h-4 w-4 text-primary" /> Audit Log</h2>
                <div className="space-y-2">
                  {mockAuditLog.map((entry) => (
                    <div key={entry.id} className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-3">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-lg shrink-0 ${
                        entry.action.includes("verified") ? "bg-primary/10" :
                        entry.action.includes("dispute") ? "bg-accent/10" :
                        entry.action.includes("payout") ? "bg-earnings/10" :
                        entry.action.includes("frozen") ? "bg-destructive/10" :
                        "bg-muted"
                      }`}>
                        {entry.action.includes("verified") ? <BadgeCheck className="h-4 w-4 text-primary" /> :
                         entry.action.includes("dispute") ? <Scale className="h-4 w-4 text-accent-foreground" /> :
                         entry.action.includes("payout") ? <DollarSign className="h-4 w-4 text-earnings" /> :
                         entry.action.includes("frozen") ? <Pause className="h-4 w-4 text-destructive" /> :
                         <Activity className="h-4 w-4 text-muted-foreground" />}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm"><strong>{entry.actor}</strong> → {entry.target}</p>
                        <p className="text-xs text-muted-foreground">{entry.detail}</p>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {new Date(entry.date).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
};

export default AdminDashboard;
