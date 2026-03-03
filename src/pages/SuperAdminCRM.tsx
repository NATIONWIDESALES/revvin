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
import { ChevronDown, ChevronRight, Search, CheckCircle2, Clock, AlertTriangle, XCircle, Shield, Building2, Users, DollarSign } from "lucide-react";
import { format } from "date-fns";

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

interface Business {
  id: string; name: string; verified: boolean | null; created_at: string; city: string | null; state: string | null; industry: string | null; account_status?: string;
}
interface Profile {
  user_id: string; full_name: string | null;
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
}
interface AuditEntry {
  id: string; referral_id: string | null; actor_id: string; event_type: string; payload: any; created_at: string;
}
interface PayoutRecord {
  id: string; business_id: string; status: string; amount: number;
}
interface OfferRecord {
  id: string; business_id: string; status: string; title: string;
}

const SuperAdminCRM = () => {
  const { user, loading: authLoading } = useAuth();
  const [overview, setOverview] = useState<{
    businesses: Business[]; profiles: Profile[]; referral_summary: ReferralSummary[];
    payouts: PayoutRecord[]; offers: OfferRecord[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [expandedBiz, setExpandedBiz] = useState<Record<string, boolean>>({});
  const [bizReferrals, setBizReferrals] = useState<Record<string, Referral[]>>({});
  const [bizAudit, setBizAudit] = useState<Record<string, AuditEntry[]>>({});
  const [bizPayouts, setBizPayouts] = useState<Record<string, PayoutRecord[]>>({});
  const [bizLoading, setBizLoading] = useState<Record<string, boolean>>({});
  const [selectedReferral, setSelectedReferral] = useState<Referral | null>(null);
  const [editingNotes, setEditingNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [approvingBiz, setApprovingBiz] = useState<string | null>(null);

  // SEO: noindex
  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex,nofollow";
    document.head.appendChild(meta);
    return () => { document.head.removeChild(meta); };
  }, []);

  const isAuthorized = user?.email?.toLowerCase() === SUPER_ADMIN_EMAIL;

  // Load overview
  useEffect(() => {
    if (!isAuthorized) return;
    const load = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await supabase.functions.invoke("sa-data", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.data) setOverview(res.data);
      setLoading(false);
    };
    load();
  }, [isAuthorized]);

  const loadBizDetails = useCallback(async (bizId: string) => {
    if (bizReferrals[bizId]) return;
    setBizLoading((p) => ({ ...p, [bizId]: true }));
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const res = await supabase.functions.invoke("sa-data", {
      headers: { Authorization: `Bearer ${session.access_token}` },
      body: null,
    });
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
    setBizLoading((p) => ({ ...p, [bizId]: false }));
  }, [bizReferrals]);

  const toggleBiz = (bizId: string) => {
    const next = !expandedBiz[bizId];
    setExpandedBiz((p) => ({ ...p, [bizId]: next }));
    if (next) loadBizDetails(bizId);
  };

  const profileMap = useMemo(() => {
    const m: Record<string, string> = {};
    overview?.profiles?.forEach((p) => { m[p.user_id] = p.full_name || "Unknown"; });
    return m;
  }, [overview?.profiles]);

  // Stats
  const stats = useMemo(() => {
    if (!overview) return { total: 0, pending: 0, won: 0, payoutsReady: 0 };
    const rs = overview.referral_summary;
    return {
      total: rs.length,
      pending: rs.filter((r) => r.status === "submitted").length,
      won: rs.filter((r) => r.status === "won").length,
      payoutsReady: overview.payouts.filter((p) => p.status === "ready").length,
    };
  }, [overview]);

  // Filtered businesses
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
    if (response.ok && overview) {
      setOverview({
        ...overview,
        businesses: overview.businesses.map((b) =>
          b.id === bizId ? { ...b, account_status: newStatus } : b
        ),
      });
    }
    setApprovingBiz(null);
  };

  const groupByStage = (referrals: Referral[]) => {
    const groups: Record<string, Referral[]> = {};
    STAGES.forEach((s) => { groups[s] = []; });
    referrals.forEach((r) => {
      const key = groups[r.status] ? r.status : "submitted";
      groups[key].push(r);
    });
    return groups;
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
              <StatChip icon={<Users className="h-4 w-4" />} label="Total Referrals" value={stats.total} />
              <StatChip icon={<Clock className="h-4 w-4" />} label="Pending" value={stats.pending} />
              <StatChip icon={<CheckCircle2 className="h-4 w-4" />} label="Won" value={stats.won} />
              <StatChip icon={<DollarSign className="h-4 w-4" />} label="Payouts Ready" value={stats.payoutsReady} />
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search businesses..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
              </div>
              <Select value={stageFilter} onValueChange={setStageFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="All Stages" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stages</SelectItem>
                  {STAGES.map((s) => (
                    <SelectItem key={s} value={s}>{stageConfig[s]?.label || s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Business count */}
            <p className="text-sm text-muted-foreground">{filteredBusinesses.length} businesses</p>

            {/* Business cards */}
            <div className="space-y-3">
              <AnimatePresence>
                {filteredBusinesses.map((biz) => {
                  const bs = getBizStats(biz.id);
                  const isOpen = expandedBiz[biz.id];
                  return (
                    <motion.div key={biz.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                      <Card>
                        <button onClick={() => toggleBiz(biz.id)} className="w-full text-left">
                          <CardHeader className="py-4">
                            <div className="flex items-center gap-3 flex-wrap">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                {isOpen ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
                                <Building2 className="h-4 w-4 shrink-0 text-primary" />
                                <span className="font-semibold truncate">{biz.name}</span>
                                {biz.verified && <Badge variant="secondary" className="text-xs">Verified</Badge>}
                                {(biz as any).account_status && (biz as any).account_status !== "approved" && (
                                  <Badge variant={(biz as any).account_status === "rejected" ? "destructive" : "secondary"} className="text-xs">
                                    {(biz as any).account_status === "pending_approval" ? "Pending Approval" : "Rejected"}
                                  </Badge>
                                )}
                                {(biz as any).account_status === "approved" && <Badge className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Approved</Badge>}
                              </div>
                              <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                                <Badge variant="outline">{bs.active_offers} offers</Badge>
                                <Badge variant="outline">{bs.referrals} referrals</Badge>
                                {bs.won > 0 && <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">{bs.won} won</Badge>}
                                {bs.payouts_ready > 0 && <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">{bs.payouts_ready} payouts</Badge>}
                              </div>
                            </div>
                          </CardHeader>
                        </button>
                        {isOpen && (
                          <CardContent className="pt-0 pb-4 space-y-4">
                            {/* Approval actions */}
                            {biz.account_status && biz.account_status !== "approved" && (
                              <div className="flex items-center gap-3 p-3 rounded-lg border border-dashed border-muted-foreground/30 bg-muted/30">
                                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                                <span className="text-sm text-muted-foreground flex-1">
                                  This business is <strong>{biz.account_status === "pending_approval" ? "pending approval" : "rejected"}</strong>.
                                </span>
                                <Button
                                  size="sm"
                                  onClick={(e) => { e.stopPropagation(); updateBusinessStatus(biz.id, "approved"); }}
                                  disabled={approvingBiz === biz.id}
                                >
                                  {approvingBiz === biz.id ? "Saving..." : "Approve"}
                                </Button>
                                {biz.account_status !== "rejected" && (
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={(e) => { e.stopPropagation(); updateBusinessStatus(biz.id, "rejected"); }}
                                    disabled={approvingBiz === biz.id}
                                  >
                                    Reject
                                  </Button>
                                )}
                              </div>
                            )}
                            {biz.account_status === "approved" && (
                              <div className="flex items-center gap-3 p-3 rounded-lg border border-dashed border-muted-foreground/30 bg-muted/30">
                                <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                                <span className="text-sm text-muted-foreground flex-1">Business is <strong>approved</strong>.</span>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => { e.stopPropagation(); updateBusinessStatus(biz.id, "rejected"); }}
                                  disabled={approvingBiz === biz.id}
                                >
                                  Revoke
                                </Button>
                              </div>
                            )}
                            {bizLoading[biz.id] ? (
                              <div className="space-y-2">{[1, 2].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
                            ) : (
                              <ReferralsByStage
                                referrals={bizReferrals[biz.id] || []}
                                profileMap={profileMap}
                                stageFilter={stageFilter}
                                onViewDetail={(r) => { setSelectedReferral(r); setEditingNotes(r.notes || ""); }}
                              />
                            )}
                          </CardContent>
                        )}
                      </Card>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
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

const StatChip = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) => (
  <Card className="p-4">
    <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">{icon}{label}</div>
    <div className="text-2xl font-bold text-foreground">{value}</div>
  </Card>
);

const Field = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div>
    <div className="text-xs text-muted-foreground">{label}</div>
    <div className="text-sm font-medium text-foreground">{value || "—"}</div>
  </div>
);

const ReferralsByStage = ({
  referrals, profileMap, stageFilter, onViewDetail,
}: {
  referrals: Referral[]; profileMap: Record<string, string>; stageFilter: string;
  onViewDetail: (r: Referral) => void;
}) => {
  const groups = useMemo(() => {
    const g: Record<string, Referral[]> = {};
    STAGES.forEach((s) => { g[s] = []; });
    referrals.forEach((r) => { const k = g[r.status] ? r.status : "submitted"; g[k].push(r); });
    return g;
  }, [referrals]);

  const visibleStages = stageFilter === "all" ? STAGES : [stageFilter as typeof STAGES[number]];

  return (
    <div className="space-y-2">
      {visibleStages.map((stage) => {
        const items = groups[stage] || [];
        if (items.length === 0) return null;
        const cfg = stageConfig[stage];
        return (
          <Collapsible key={stage} defaultOpen={items.length <= 10}>
            <CollapsibleTrigger className="flex items-center gap-2 w-full py-2 text-sm font-medium hover:text-primary transition-colors">
              <ChevronRight className="h-3 w-3" />
              <Badge className={cfg.color}>{cfg.icon}<span className="ml-1">{cfg.label}</span></Badge>
              <span className="text-muted-foreground text-xs">({items.length})</span>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="text-left py-2 pr-3 font-medium">Customer</th>
                      <th className="text-left py-2 pr-3 font-medium hidden sm:table-cell">Contact</th>
                      <th className="text-left py-2 pr-3 font-medium">Referrer</th>
                      <th className="text-left py-2 pr-3 font-medium hidden md:table-cell">Offer</th>
                      <th className="text-left py-2 pr-3 font-medium">Date</th>
                      <th className="text-left py-2 pr-3 font-medium">Payout</th>
                      <th className="text-left py-2 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((r) => (
                      <tr key={r.id} className="border-b border-muted/50 hover:bg-muted/30">
                        <td className="py-2 pr-3 font-medium">{r.customer_name}</td>
                        <td className="py-2 pr-3 hidden sm:table-cell text-muted-foreground">{r.customer_email || r.customer_phone || "—"}</td>
                        <td className="py-2 pr-3">{profileMap[r.referrer_id] || r.referrer_id.slice(0, 8)}</td>
                        <td className="py-2 pr-3 hidden md:table-cell truncate max-w-[150px]">{r.offers?.title || "—"}</td>
                        <td className="py-2 pr-3 text-muted-foreground">{format(new Date(r.created_at), "MMM d")}</td>
                        <td className="py-2 pr-3">{r.offers ? `$${r.offers.payout}` : "—"}</td>
                        <td className="py-2">
                          <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => onViewDetail(r)}>View</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CollapsibleContent>
          </Collapsible>
        );
      })}
      {visibleStages.every((s) => (groups[s] || []).length === 0) && (
        <p className="text-sm text-muted-foreground py-4 text-center">No referrals found</p>
      )}
    </div>
  );
};

export default SuperAdminCRM;
