import { useEffect, useState, useMemo, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import NotFound from "./NotFound";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronRight, Search, CheckCircle2, Clock, AlertTriangle, XCircle, Shield, Building2, Users, DollarSign, Activity, BadgeCheck, History, FileText, Pause, Play, TrendingUp, BarChart3 } from "lucide-react";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

const SUPER_ADMIN_EMAIL = "sales@nationwidesales.ca";

const STAGES = ["submitted", "accepted", "in_progress", "won", "lost", "declined", "void"] as const;

const stageConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  submitted: { label: "Submitted", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200", icon: <Clock className="h-3 w-3" /> },
  accepted: { label: "Accepted", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200", icon: <CheckCircle2 className="h-3 w-3" /> },
  in_progress: { label: "In Progress", color: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200", icon: <Clock className="h-3 w-3" /> },
  won: { label: "Won", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200", icon: <CheckCircle2 className="h-3 w-3" /> },
  lost: { label: "Lost", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200", icon: <XCircle className="h-3 w-3" /> },
  declined: { label: "Declined", color: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200", icon: <XCircle className="h-3 w-3" /> },
  void: { label: "Void", color: "bg-gray-100 text-gray-600 dark:bg-gray-900 dark:text-gray-400", icon: <AlertTriangle className="h-3 w-3" /> },
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

const payoutStatusConfig: Record<string, { bg: string; text: string; label: string }> = {
  ready: { bg: "bg-accent/10", text: "text-accent-foreground", label: "Ready" },
  processing: { bg: "bg-primary/10", text: "text-primary", label: "Processing" },
  paid: { bg: "bg-earnings/10", text: "text-earnings", label: "Paid" },
  failed: { bg: "bg-destructive/10", text: "text-destructive", label: "Failed" },
  canceled: { bg: "bg-muted", text: "text-muted-foreground", label: "Canceled" },
};

interface Business {
  id: string; name: string; verified: boolean | null; created_at: string; city: string | null; state: string | null; industry: string | null; account_status?: string;
}
interface Profile {
  user_id: string; full_name: string | null; city: string | null;
}
interface ReferralSummary {
  id: string; business_id: string; status: string; payout_status: string;
}
interface Referral {
  id: string; customer_name: string; customer_email: string | null; customer_phone: string | null;
  referrer_id: string; status: string; payout_status: string; payout_amount: number | null;
  payout_snapshot: number | null; notes: string | null; created_at: string; updated_at: string;
  offer_id: string; business_id: string; void_reason: string | null; file_url: string | null;
  offers: { title: string; payout: number; payout_type: string } | null;
  businesses?: { name: string } | null;
}
interface AuditEntry {
  id: string; referral_id: string | null; actor_id: string; event_type: string; payload: any; created_at: string;
}
interface PayoutRecord {
  id: string; business_id: string; status: string; amount: number; referral_id: string; currency: string; created_at: string; method?: string; provider_reference?: string; paid_at?: string;
}
interface OfferRecord {
  id: string; business_id: string; status: string; title: string; approval_status: string | null; category: string; payout: number; payout_type: string; deposit_status?: string; deposit_amount?: number; stripe_payment_intent_id?: string; businesses?: { name: string }; deposit_paid_at?: string;
}

const SuperAdminCRM = () => {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [overview, setOverview] = useState<{
    businesses: Business[]; profiles: Profile[]; referral_summary: ReferralSummary[];
    payouts: PayoutRecord[]; offers: OfferRecord[];
  } | null>(null);
  
  // Data for tabs
  const [referrals, setReferrals] = useState<any[]>([]);
  const [offers, setOffers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [auditLog, setAuditLog] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("overview");
  const [expandedBiz, setExpandedBiz] = useState<Record<string, boolean>>({});
  const [bizReferrals, setBizReferrals] = useState<Record<string, Referral[]>>({});
  const [bizAudit, setBizAudit] = useState<Record<string, AuditEntry[]>>({});
  const [bizPayouts, setBizPayouts] = useState<Record<string, PayoutRecord[]>>({});
  const [bizLoading, setBizLoading] = useState<Record<string, boolean>>({});
  const [selectedReferral, setSelectedReferral] = useState<Referral | null>(null);
  const [editingNotes, setEditingNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [approvingBiz, setApprovingBiz] = useState<string | null>(null);
  const [payoutMethod, setPayoutMethod] = useState("");
  const [payoutRef, setPayoutRef] = useState("");

  // SEO: noindex
  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex,nofollow";
    document.head.appendChild(meta);
    return () => { document.head.removeChild(meta); };
  }, []);

  const isAuthorized = user?.email?.toLowerCase() === SUPER_ADMIN_EMAIL;

  // Load data
  useEffect(() => {
    if (!isAuthorized) return;
    const load = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      try {
        // Load overview data for filters
        const res = await supabase.functions.invoke("sa-data", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (res.data) setOverview(res.data);

        // Load comprehensive data for tabs
        const [refRes, offRes, roleRes, bizRes, profRes, payRes, auditRes] = await Promise.all([
          supabase.from("referrals").select("*, offers(title, payout, payout_type), businesses(name)").order("created_at", { ascending: false }),
          supabase.from("offers").select("*, businesses(name)").order("created_at", { ascending: false }),
          supabase.from("user_roles").select("*"),
          supabase.from("businesses").select("*").order("created_at", { ascending: false }),
          supabase.from("profiles").select("*").order("created_at", { ascending: false }),
          supabase.from("payouts").select("*").order("created_at", { ascending: false }),
          supabase.from("audit_log").select("*").order("created_at", { ascending: false }).limit(50),
        ]);
        
        setReferrals(refRes.data ?? []);
        setOffers(offRes.data ?? []);
        setRoles(roleRes.data ?? []);
        setBusinesses(bizRes.data ?? []);
        setProfiles(profRes.data ?? []);
        setPayouts(payRes.data ?? []);
        setAuditLog(auditRes.data ?? []);
      } catch (err) {
        console.error("Error loading admin data:", err);
      }
      
      setLoading(false);
    };
    load();
  }, [isAuthorized]);

  const loadBizDetails = useCallback(async (bizId: string) => {
    if (bizReferrals[bizId]) return;
    setBizLoading((p) => ({ ...p, [bizId]: true }));
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    
    try {
      // Use query params via direct fetch
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sa-data?biz_id=${bizId}`;
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setBizReferrals((p) => ({ ...p, [bizId]: data.referrals || [] }));
        setBizAudit((p) => ({ ...p, [bizId]: data.audit_log || [] }));
        setBizPayouts((p) => ({ ...p, [bizId]: data.payouts || [] }));
      }
    } catch (err) {
      console.error("Error loading biz details:", err);
    }
    setBizLoading((p) => ({ ...p, [bizId]: false }));
  }, [bizReferrals]);

  const toggleBiz = (bizId: string) => {
    const next = !expandedBiz[bizId];
    setExpandedBiz((p) => ({ ...p, [bizId]: next }));
    if (next) loadBizDetails(bizId);
  };

  const profileMap = useMemo(() => {
    const m: Record<string, string> = {};
    profiles?.forEach((p) => { m[p.user_id] = p.full_name || "Unknown"; });
    return m;
  }, [profiles]);

  // Stats
  const totalBusinesses = roles.filter(r => r.role === "business").length;
  const totalReferrers = roles.filter(r => r.role === "referrer").length;
  const wonDeals = referrals.filter(r => r.status === "won").length;
  const totalPlatformRevenue = referrals.filter(r => r.status === "won").reduce((sum, r) => sum + (r.payout_amount ?? r.offers?.payout ?? 0) * 0.1, 0);
  const totalPayoutsAmount = referrals.filter(r => r.status === "won").reduce((sum, r) => sum + (r.payout_amount ?? r.offers?.payout ?? 0), 0);
  const activeOffers = offers.filter(o => o.status === "active").length;
  const conversionRate = referrals.length > 0 ? Math.round((wonDeals / referrals.length) * 100) : 0;
  const pendingPayouts = payouts.filter(p => p.status === "ready" || p.status === "processing").length;

  const dashboardStats = [
    { label: "Businesses", value: totalBusinesses.toString(), icon: Building2, color: "text-primary", bgColor: "bg-primary/10" },
    { label: "Referrers", value: totalReferrers.toString(), icon: Users, color: "text-accent-foreground", bgColor: "bg-accent/10" },
    { label: "Active Offers", value: activeOffers.toString(), icon: Activity, color: "text-primary", bgColor: "bg-primary/10" },
    { label: "Deals Won", value: wonDeals.toString(), icon: CheckCircle2, color: "text-earnings", bgColor: "bg-earnings/10" },
    { label: "Conversion", value: `${conversionRate}%`, icon: TrendingUp, color: "text-accent-foreground", bgColor: "bg-accent/10" },
    { label: "Total Payouts", value: `$${totalPayoutsAmount.toLocaleString()}`, icon: DollarSign, color: "text-earnings", bgColor: "bg-earnings/10" },
    { label: "Platform Revenue", value: `$${Math.round(totalPlatformRevenue).toLocaleString()}`, icon: BarChart3, color: "text-primary", bgColor: "bg-primary/10" },
    { label: "Pending Payouts", value: pendingPayouts.toString(), icon: Clock, color: pendingPayouts > 0 ? "text-accent-foreground" : "text-muted-foreground", bgColor: pendingPayouts > 0 ? "bg-accent/10" : "bg-muted" },
  ];

  // Filtered businesses for the list
  const filteredBusinesses = useMemo(() => {
    if (!overview) return [];
    let biz = overview.businesses;
    if (search) {
      const q = search.toLowerCase();
      biz = biz.filter((b) => b.name.toLowerCase().includes(q) || b.city?.toLowerCase().includes(q) || b.industry?.toLowerCase().includes(q));
    }
    // If stage filter active, only show businesses that have referrals in that stage
    if (stageFilter !== "all") {
      const bizIds = new Set(overview.referral_summary.filter((r) => r.status === stageFilter).map((r) => r.business_id));
      biz = biz.filter((b) => bizIds.has(b.id));
    }
    // Sort by referral count desc
    const countMap: Record<string, number> = {};
    overview.referral_summary.forEach((r) => { countMap[r.business_id] = (countMap[r.business_id] || 0) + 1; });
    biz.sort((a, b) => (countMap[b.id] || 0) - (countMap[a.id] || 0));
    return biz;
  }, [overview, search, stageFilter]);

  const getBizStats = useCallback((bizId: string) => {
    if (!overview) return { referrals: 0, won: 0, active_offers: 0, payouts_ready: 0 };
    const refs = overview.referral_summary.filter((r) => r.business_id === bizId);
    const activeOffers = overview.offers.filter((o) => o.business_id === bizId && o.status === "active").length;
    const payoutsReady = overview.payouts.filter((p) => p.business_id === bizId && p.status === "ready").length;
    return {
      referrals: refs.length,
      won: refs.filter((r) => r.status === "won").length,
      active_offers: activeOffers,
      payouts_ready: payoutsReady,
    };
  }, [overview]);

  const saveNotes = async () => {
    if (!selectedReferral) return;
    setSavingNotes(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sa-data?action=update_notes`;
    await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ referral_id: selectedReferral.id, notes: editingNotes }),
    });
    // Update local state
    setSelectedReferral({ ...selectedReferral, notes: editingNotes });
    setBizReferrals((prev) => {
      const bizId = selectedReferral.business_id;
      if (!prev[bizId]) return prev;
      return {
        ...prev,
        [bizId]: prev[bizId].map((r) => r.id === selectedReferral.id ? { ...r, notes: editingNotes } : r),
      };
    });
    setSavingNotes(false);
  };

  const updateBusinessStatus = async (bizId: string, newStatus: string) => {
    setApprovingBiz(bizId);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setApprovingBiz(null); return; }
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sa-data?action=update_business_status`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ business_id: bizId, account_status: newStatus }),
    });
    if (response.ok) {
      if (overview) {
        setOverview({
          ...overview,
          businesses: overview.businesses.map((b) =>
            b.id === bizId ? { ...b, account_status: newStatus } : b
          ),
        });
      }
      setBusinesses(prev => prev.map(b => b.id === bizId ? { ...b, account_status: newStatus } : b));
      toast({ title: `Business status updated to ${newStatus}` });
    }
    setApprovingBiz(null);
  };

  const verifyBusiness = async (bizId: string) => {
    const { error } = await supabase.from("businesses").update({ verified: true }).eq("id", bizId);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setBusinesses(prev => prev.map(b => b.id === bizId ? { ...b, verified: true } : b));
    if (user) await supabase.rpc("fn_create_audit_entry", { p_actor_id: user.id, p_event_type: "business_verified", p_referral_id: bizId });
    toast({ title: "Business verified" });
  };

  const approveAccount = async (bizId: string) => {
    const { error } = await supabase.from("businesses").update({ account_status: "approved" } as any).eq("id", bizId);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setBusinesses(prev => prev.map(b => b.id === bizId ? { ...b, account_status: "approved" } : b));
    toast({ title: "Account approved", description: "Business can now create offers." });
  };

  const rejectAccount = async (bizId: string) => {
    const { error } = await supabase.from("businesses").update({ account_status: "rejected" } as any).eq("id", bizId);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setBusinesses(prev => prev.map(b => b.id === bizId ? { ...b, account_status: "rejected" } : b));
    toast({ title: "Account rejected" });
  };

  const freezeOffer = async (offerId: string) => {
    const offer = offers.find(o => o.id === offerId);
    const newStatus = offer?.status === "active" ? "paused" : "active";
    const { error } = await supabase.from("offers").update({ status: newStatus }).eq("id", offerId);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setOffers(prev => prev.map(o => o.id === offerId ? { ...o, status: newStatus } : o));
    toast({ title: `Offer ${newStatus}` });
  };

  const approveOffer = async (offerId: string) => {
    const { error } = await supabase.from("offers").update({ approval_status: "approved" }).eq("id", offerId);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setOffers(prev => prev.map(o => o.id === offerId ? { ...o, approval_status: "approved" } : o));
    toast({ title: "Offer approved" });
  };

  const updatePayoutStatus = async (payoutId: string, status: string, method?: string, providerRef?: string) => {
    const updates: any = { status, updated_at: new Date().toISOString() };
    if (status === "paid") { updates.paid_at = new Date().toISOString(); updates.processed_by = user?.id; }
    if (method) updates.method = method;
    if (providerRef) updates.provider_reference = providerRef;

    const { error } = await supabase.from("payouts").update(updates).eq("id", payoutId);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setPayouts(prev => prev.map(p => p.id === payoutId ? { ...p, ...updates } : p));
    if (user) await supabase.rpc("fn_create_audit_entry", { p_actor_id: user.id, p_event_type: `payout_${status}`, p_referral_id: payouts.find(p => p.id === payoutId)?.referral_id });
    toast({ title: `Payout marked as ${status}` });
    setPayoutMethod("");
    setPayoutRef("");
  };

  // Auth gate
  if (authLoading) return <div className="flex items-center justify-center min-h-screen"><Skeleton className="h-8 w-48" /></div>;
  if (!isAuthorized) return <NotFound />;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-3">
          <Shield className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold text-foreground">Revvin Super Admin</h1>
          <span className="text-xs text-muted-foreground ml-auto">{user?.email}</span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {dashboardStats.map((s) => (
                <div key={s.label} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className={`rounded-xl p-2 ${s.bgColor}`}><s.icon className={`h-4 w-4 ${s.color}`} /></div>
                    <div>
                      <p className="text-[11px] text-muted-foreground font-medium">{s.label}</p>
                      <p className="text-xl font-bold text-foreground">{s.value}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-6 bg-muted/50 p-1">
                <TabsTrigger value="overview" className="gap-1"><Activity className="h-3.5 w-3.5" /> Overview</TabsTrigger>
                <TabsTrigger value="verification" className="gap-1 relative">
                  <BadgeCheck className="h-3.5 w-3.5" /> Verification
                  {businesses.filter(b => (b as any).account_status === "pending_approval").length > 0 && <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-xs text-destructive-foreground flex items-center justify-center font-bold">{businesses.filter(b => (b as any).account_status === "pending_approval").length}</span>}
                </TabsTrigger>
                <TabsTrigger value="payouts" className="gap-1 relative">
                  <DollarSign className="h-3.5 w-3.5" /> Payouts
                  {pendingPayouts > 0 && <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-xs text-destructive-foreground flex items-center justify-center font-bold">{pendingPayouts}</span>}
                </TabsTrigger>
                <TabsTrigger value="audit" className="gap-1"><History className="h-3.5 w-3.5" /> Audit Log</TabsTrigger>
              </TabsList>

              {/* OVERVIEW TAB */}
              <TabsContent value="overview">
                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                    <h2 className="text-base font-bold mb-3 flex items-center gap-2"><Building2 className="h-4 w-4 text-primary" /> Businesses ({businesses.length})</h2>
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

                  <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                    <h2 className="text-base font-bold mb-3 flex items-center gap-2"><Users className="h-4 w-4 text-accent-foreground" /> Recent Users ({profiles.length})</h2>
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
                <div className="mt-6 rounded-xl border border-border bg-card shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-border"><h2 className="text-base font-bold flex items-center gap-2"><Activity className="h-4 w-4 text-earnings" /> All Referrals ({referrals.length})</h2></div>
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
                <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                  <h2 className="text-base font-bold mb-4 flex items-center gap-2"><BadgeCheck className="h-4 w-4 text-primary" /> Business Verification Queue</h2>
                  <div className="space-y-3">
                    {businesses.map((biz) => {
                      const accountStatus = (biz as any).account_status || "approved";
                      return (
                      <div key={biz.id} className="flex items-center justify-between rounded-xl border border-border bg-muted/30 p-4">
                        <div className="flex-1">
                          <p className="font-medium">{biz.name}</p>
                          <p className="text-xs text-muted-foreground">{biz.industry ?? "—"} • {biz.city ?? "No location"} • {(biz as any).phone ? `📞 ${(biz as any).phone} • ` : ""}Joined {new Date(biz.created_at).toLocaleDateString()}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant={biz.verified ? "default" : "secondary"}>{biz.verified ? "Verified" : "Unverified"}</Badge>
                            <Badge variant={accountStatus === "approved" ? "default" : accountStatus === "rejected" ? "destructive" : "secondary"}>
                              {accountStatus === "approved" ? "Account Approved" : accountStatus === "rejected" ? "Account Rejected" : "Pending Approval"}
                            </Badge>
                            {biz.website && <span className="text-xs text-muted-foreground">{biz.website}</span>}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {accountStatus === "pending_approval" && (
                            <>
                              <Button size="sm" onClick={() => approveAccount(biz.id)} className="gap-1"><CheckCircle2 className="h-3 w-3" /> Approve</Button>
                              <Button size="sm" variant="destructive" onClick={() => rejectAccount(biz.id)} className="gap-1"><XCircle className="h-3 w-3" /> Reject</Button>
                            </>
                          )}
                          {accountStatus === "rejected" && (
                            <Button size="sm" onClick={() => approveAccount(biz.id)} className="gap-1"><CheckCircle2 className="h-3 w-3" /> Approve</Button>
                          )}
                          {!biz.verified && (
                            <Button size="sm" variant="outline" onClick={() => verifyBusiness(biz.id)} className="gap-1"><BadgeCheck className="h-3 w-3" /> Verify</Button>
                          )}
                        </div>
                      </div>
                      );
                    })}
                    {businesses.length === 0 && <p className="text-sm text-muted-foreground py-8 text-center">No businesses to verify</p>}
                  </div>
                </div>

                {/* Pending Approval Offers */}
                {offers.filter(o => o.approval_status === "pending_approval").length > 0 && (
                  <div className="mt-6 rounded-xl border border-accent/30 bg-card p-5 shadow-sm">
                    <h2 className="text-base font-bold mb-4 flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-accent-foreground" /> Offers Pending Approval (Restricted Categories)</h2>
                    <div className="space-y-2">
                      {offers.filter(o => o.approval_status === "pending_approval").map((offer) => (
                        <div key={offer.id} className="flex items-center justify-between rounded-xl border border-border bg-muted/30 p-3">
                          <div>
                            <p className="text-sm font-medium">{offer.title}</p>
                            <p className="text-xs text-muted-foreground">{offer.businesses?.name} • {offer.category} • {offer.payout_type === "flat" ? `$${offer.payout}` : `${offer.payout}%`}</p>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => approveOffer(offer.id)} className="gap-1"><CheckCircle2 className="h-3 w-3" /> Approve</Button>
                            <Button size="sm" variant="destructive" className="gap-1" onClick={async () => {
                              await supabase.from("offers").update({ approval_status: "rejected" }).eq("id", offer.id);
                              setOffers(prev => prev.map(o => o.id === offer.id ? { ...o, approval_status: "rejected" } : o));
                              toast({ title: "Offer rejected" });
                            }}><XCircle className="h-3 w-3" /> Reject</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Offer Management */}
                <div className="mt-6 rounded-xl border border-border bg-card p-5 shadow-sm">
                  <h2 className="text-base font-bold mb-4 flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /> Offer Management ({offers.length})</h2>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {offers.map((offer) => (
                      <div key={offer.id} className="flex items-center justify-between rounded-xl border border-border bg-muted/30 p-3">
                        <div>
                          <p className="text-sm font-medium">{offer.title}</p>
                          <p className="text-xs text-muted-foreground">{offer.businesses?.name} • {offer.category} • {offer.payout_type === "flat" ? `$${offer.payout}` : `${offer.payout}%`}</p>
                          {offer.deposit_status && offer.deposit_status !== "not_required" && (
                            <p className="text-xs mt-1">
                              <Badge variant="outline" className={`text-xs ${offer.deposit_status === "paid" ? "border-earnings text-earnings" : offer.deposit_status === "pending" ? "border-accent text-accent-foreground" : "border-destructive text-destructive"}`}>
                                Deposit: {offer.deposit_status} {offer.deposit_amount ? `($${offer.deposit_amount})` : ""}
                              </Badge>
                              {offer.stripe_payment_intent_id && <span className="text-xs text-muted-foreground ml-2">PI: {offer.stripe_payment_intent_id.slice(0, 12)}...</span>}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={offer.status === "active" ? "default" : "secondary"}>{offer.status}</Badge>
                          {offer.approval_status && offer.approval_status !== "approved" && (
                            <Badge variant="outline" className="text-xs">{offer.approval_status}</Badge>
                          )}
                          <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => freezeOffer(offer.id)}>
                            {offer.status === "active" ? <><Pause className="h-3 w-3 mr-1" /> Pause</> : <><Play className="h-3 w-3 mr-1" /> Activate</>}
                          </Button>
                          {offer.deposit_status && offer.deposit_status !== "paid" && offer.deposit_status !== "not_required" && (
                            <Button size="sm" variant="outline" className="text-xs h-7" onClick={async () => {
                              await supabase.from("offers").update({ deposit_status: "paid", deposit_paid_at: new Date().toISOString() }).eq("id", offer.id);
                              setOffers(prev => prev.map(o => o.id === offer.id ? { ...o, deposit_status: "paid", deposit_paid_at: new Date().toISOString() } : o));
                              toast({ title: "Deposit overridden", description: "Deposit manually marked as paid." });
                            }}>Override Deposit</Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              {/* PAYOUTS TAB */}
              <TabsContent value="payouts">
                <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                  <h2 className="text-base font-bold mb-4 flex items-center gap-2"><DollarSign className="h-4 w-4 text-earnings" /> Payout Queue</h2>
                  <div className="space-y-3">
                    {payouts.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-8 text-center">No payouts to process</p>
                    ) : payouts.map((payout) => {
                      const sc = payoutStatusConfig[payout.status] ?? payoutStatusConfig.ready;
                      const isPending = payout.status === "ready" || payout.status === "processing";
                      return (
                        <div key={payout.id} className={`rounded-xl border p-4 ${isPending ? "border-primary/20 bg-primary/5" : "border-border bg-muted/30"}`}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge className={`${sc.bg} ${sc.text} border-0`}>{sc.label}</Badge>
                                <span className="font-bold text-foreground">${payout.amount}</span>
                                <span className="text-xs text-muted-foreground">{payout.currency}</span>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Referral: {payout.referral_id?.slice(0, 8)}... • Created: {new Date(payout.created_at).toLocaleDateString()}
                                {payout.method && ` • Method: ${payout.method}`}
                                {payout.provider_reference && ` • Ref: ${payout.provider_reference}`}
                                {payout.paid_at && ` • Paid: ${new Date(payout.paid_at).toLocaleDateString()}`}
                              </p>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              {payout.status === "ready" && (
                                <Button size="sm" className="text-xs h-7 gap-1" onClick={() => updatePayoutStatus(payout.id, "processing")}>
                                  <Clock className="h-3 w-3" /> Start Processing
                                </Button>
                              )}
                              {payout.status === "processing" && (
                                <div className="flex flex-col gap-2">
                                  <div className="flex gap-1">
                                    <Input placeholder="Method (e.g. tremendous)" className="h-7 text-xs w-32" value={payoutMethod} onChange={e => setPayoutMethod(e.target.value)} />
                                    <Input placeholder="Reference ID" className="h-7 text-xs w-32" value={payoutRef} onChange={e => setPayoutRef(e.target.value)} />
                                  </div>
                                  <div className="flex gap-1">
                                    <Button size="sm" className="text-xs h-7 gap-1" onClick={() => updatePayoutStatus(payout.id, "paid", payoutMethod, payoutRef)}>
                                      <CheckCircle2 className="h-3 w-3" /> Mark Paid
                                    </Button>
                                    <Button size="sm" variant="destructive" className="text-xs h-7 gap-1" onClick={() => updatePayoutStatus(payout.id, "failed")}>
                                      <XCircle className="h-3 w-3" /> Failed
                                    </Button>
                                  </div>
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

              {/* AUDIT LOG TAB */}
              <TabsContent value="audit">
                <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                  <h2 className="text-base font-bold mb-4 flex items-center gap-2"><History className="h-4 w-4 text-primary" /> Audit Log</h2>
                  <div className="space-y-2">
                    {auditLog.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-8 text-center">No audit events yet</p>
                    ) : auditLog.map((entry) => (
                      <div key={entry.id} className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-3">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-lg shrink-0 ${
                          entry.event_type.includes("verified") ? "bg-primary/10" :
                          entry.event_type.includes("payout") ? "bg-earnings/10" :
                          entry.event_type.includes("won") ? "bg-earnings/10" :
                          entry.event_type.includes("declined") || entry.event_type.includes("lost") ? "bg-destructive/10" :
                          "bg-muted"
                        }`}>
                          {entry.event_type.includes("verified") ? <BadgeCheck className="h-4 w-4 text-primary" /> :
                           entry.event_type.includes("payout") ? <DollarSign className="h-4 w-4 text-earnings" /> :
                           entry.event_type.includes("won") ? <CheckCircle2 className="h-4 w-4 text-earnings" /> :
                           <Activity className="h-4 w-4 text-muted-foreground" />}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{entry.event_type}</p>
                          <p className="text-xs text-muted-foreground">
                            Actor: {entry.actor_id?.slice(0, 8)}...
                            {entry.referral_id && ` • Referral: ${entry.referral_id.slice(0, 8)}...`}
                            {entry.payload && ` • ${JSON.stringify(entry.payload).slice(0, 80)}`}
                          </p>
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {new Date(entry.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </>
        )}
      </main>

      {/* Detail drawer */}
      <Sheet open={!!selectedReferral} onOpenChange={(open) => { if (!open) setSelectedReferral(null); }}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Referral Detail</SheetTitle>
            <SheetDescription>
              {selectedReferral?.customer_name}
            </SheetDescription>
          </SheetHeader>
          {selectedReferral && (
            <div className="mt-6 space-y-6">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Field label="Customer" value={selectedReferral.customer_name} />
                <Field label="Email" value={selectedReferral.customer_email} />
                <Field label="Phone" value={selectedReferral.customer_phone} />
                <Field label="Status" value={<Badge className={stageConfig[selectedReferral.status]?.color}>{stageConfig[selectedReferral.status]?.label || selectedReferral.status}</Badge>} />
                <Field label="Offer" value={selectedReferral.offers?.title} />
                <Field label="Payout" value={selectedReferral.offers ? `$${selectedReferral.offers.payout} (${selectedReferral.offers.payout_type})` : "—"} />
                <Field label="Payout Status" value={selectedReferral.payout_status} />
                <Field label="Referrer" value={profileMap[selectedReferral.referrer_id] || selectedReferral.referrer_id.slice(0, 8)} />
                <Field label="Submitted" value={format(new Date(selectedReferral.created_at), "MMM d, yyyy")} />
                <Field label="Updated" value={format(new Date(selectedReferral.updated_at), "MMM d, yyyy")} />
                {selectedReferral.void_reason && <Field label="Void Reason" value={selectedReferral.void_reason} />}
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Admin Notes</label>
                <Textarea value={editingNotes} onChange={(e) => setEditingNotes(e.target.value)} rows={3} />
                <Button size="sm" onClick={saveNotes} disabled={savingNotes}>
                  {savingNotes ? "Saving..." : "Save Notes"}
                </Button>
              </div>

              {/* Audit log */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-foreground">Audit Timeline</h4>
                {(bizAudit[selectedReferral.business_id] || [])
                  .filter((a) => a.referral_id === selectedReferral.id)
                  .map((entry) => (
                    <div key={entry.id} className="text-xs border-l-2 border-muted pl-3 py-1">
                      <span className="font-medium">{entry.event_type}</span>
                      <span className="text-muted-foreground ml-2">{format(new Date(entry.created_at), "MMM d, yyyy h:mm a")}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

const Field = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div>
    <div className="text-xs text-muted-foreground">{label}</div>
    <div className="text-sm font-medium text-foreground">{value || "—"}</div>
  </div>
);

export default SuperAdminCRM;
