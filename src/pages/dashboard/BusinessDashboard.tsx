import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DollarSign, Users, TrendingUp, PlusCircle, ArrowRight,
  CheckCircle2, XCircle, Clock, Eye, BarChart3, Building2, Shield
} from "lucide-react";
import { motion } from "framer-motion";

const statusConfig: Record<string, { bg: string; text: string }> = {
  submitted: { bg: "bg-muted", text: "text-muted-foreground" },
  contacted: { bg: "bg-blue-50", text: "text-blue-700" },
  in_progress: { bg: "bg-accent/10", text: "text-accent-foreground" },
  won: { bg: "bg-earnings/10", text: "text-earnings" },
  lost: { bg: "bg-destructive/10", text: "text-destructive" },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.5 } }),
};

const BusinessDashboard = () => {
  const { user } = useAuth();
  const [business, setBusiness] = useState<any>(null);
  const [offers, setOffers] = useState<any[]>([]);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const { data: biz } = await supabase.from("businesses").select("*").eq("user_id", user.id).maybeSingle();
      setBusiness(biz);
      if (biz) {
        const [offRes, refRes] = await Promise.all([
          supabase.from("offers").select("*").eq("business_id", biz.id).order("created_at", { ascending: false }),
          supabase.from("referrals").select("*, offers(title, payout, payout_type)").eq("business_id", biz.id).order("created_at", { ascending: false }),
        ]);
        setOffers(offRes.data ?? []);
        setReferrals(refRes.data ?? []);
      }
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const updateReferralStatus = async (id: string, status: string) => {
    await supabase.from("referrals").update({ status }).eq("id", id);
    setReferrals((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
  };

  const totalPaid = referrals.filter(r => r.payout_status === "paid").reduce((s, r) => s + (r.payout_amount ?? 0), 0);
  const wonCount = referrals.filter(r => r.status === "won").length;
  const conversionRate = referrals.length > 0 ? Math.round((wonCount / referrals.length) * 100) : 0;
  const activeOffers = offers.filter(o => o.status === "active").length;

  const stats = [
    { label: "Incoming Referrals", value: referrals.length.toString(), icon: Users, color: "text-primary", bgColor: "bg-primary/10" },
    { label: "Deals Closed", value: wonCount.toString(), icon: CheckCircle2, color: "text-earnings", bgColor: "bg-earnings/10" },
    { label: "Conversion Rate", value: `${conversionRate}%`, icon: TrendingUp, color: "text-accent", bgColor: "bg-accent/10" },
    { label: "Total Paid Out", value: `$${totalPaid.toLocaleString()}`, icon: DollarSign, color: "text-muted-foreground", bgColor: "bg-muted" },
  ];

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  }

  return (
    <div className="py-8">
      <div className="container max-w-6xl">
        <motion.div initial="hidden" animate="visible">
          {/* Header */}
          <motion.div variants={fadeUp} custom={0} className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="font-display text-3xl font-bold text-foreground">Business Dashboard</h1>
                <Badge variant="secondary" className="gap-1"><Shield className="h-3 w-3" /> Verified</Badge>
              </div>
              <p className="text-muted-foreground">{business?.name ?? "Your Business"} • {activeOffers} active {activeOffers === 1 ? "offer" : "offers"}</p>
            </div>
            <Button asChild className="gap-2 h-11">
              <Link to="/dashboard/create-offer"><PlusCircle className="h-4 w-4" /> Create Offer</Link>
            </Button>
          </motion.div>

          {/* Stats */}
          <motion.div variants={fadeUp} custom={1} className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className={`rounded-xl p-2.5 ${s.bgColor}`}>
                    <s.icon className={`h-5 w-5 ${s.color}`} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">{s.label}</p>
                    <p className="font-display text-2xl font-bold text-foreground">{s.value}</p>
                  </div>
                </div>
              </div>
            ))}
          </motion.div>

          {/* Active Offers */}
          <motion.div variants={fadeUp} custom={2} className="mb-8">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold">Your Offers</h2>
              <Button variant="ghost" size="sm" className="gap-1" asChild>
                <Link to="/dashboard/create-offer">Add Offer <PlusCircle className="h-4 w-4" /></Link>
              </Button>
            </div>
            {offers.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card py-14 text-center shadow-sm">
                <Building2 className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
                <p className="font-display text-lg font-semibold">No offers yet</p>
                <p className="mt-1 text-sm text-muted-foreground">Create your first referral offer to start receiving leads</p>
                <Button asChild className="mt-5">
                  <Link to="/dashboard/create-offer">Create Offer</Link>
                </Button>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {offers.map((offer: any) => {
                  const offerRefs = referrals.filter(r => r.offer_id === offer.id);
                  const offerWon = offerRefs.filter(r => r.status === "won").length;
                  return (
                    <div key={offer.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="font-display font-bold text-foreground">{offer.title}</h3>
                        <Badge variant={offer.status === "active" ? "default" : "secondary"}>{offer.status}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{offer.description}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="earnings-badge rounded-full px-3 py-0.5 text-xs font-bold">
                            {offer.payout_type === "flat" ? `$${offer.payout}` : `${offer.payout}%`}
                          </span>
                          <span className="text-xs text-muted-foreground">{offer.category}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {offerRefs.length} referrals • {offerWon} won
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>

          {/* Incoming Referrals */}
          <motion.div variants={fadeUp} custom={3}>
            <h2 className="font-display text-lg font-bold mb-4">Incoming Referrals</h2>
            {referrals.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card py-14 text-center shadow-sm">
                <Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
                <p className="font-display text-lg font-semibold">No referrals yet</p>
                <p className="mt-1 text-sm text-muted-foreground">Referrals will appear here once referrers submit leads</p>
              </div>
            ) : (
              <div className="space-y-3">
                {referrals.map((ref: any) => {
                  const sc = statusConfig[ref.status] ?? statusConfig.submitted;
                  return (
                    <div key={ref.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex-1">
                          <p className="font-display font-semibold text-foreground">{ref.customer_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {ref.customer_email && <span>{ref.customer_email} • </span>}
                            {ref.offers?.title}
                          </p>
                          {ref.notes && <p className="mt-1.5 text-sm text-muted-foreground italic bg-muted/50 rounded-lg p-2">"{ref.notes}"</p>}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={`${sc.bg} ${sc.text} border-0`}>{ref.status.replace("_", " ")}</Badge>
                          {ref.status === "submitted" && (
                            <>
                              <Button size="sm" variant="outline" onClick={() => updateReferralStatus(ref.id, "contacted")} className="gap-1">
                                <Eye className="h-3 w-3" /> Review
                              </Button>
                              <Button size="sm" onClick={() => updateReferralStatus(ref.id, "won")} className="gap-1">
                                <CheckCircle2 className="h-3 w-3" /> Won
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => updateReferralStatus(ref.id, "lost")} className="gap-1">
                                <XCircle className="h-3 w-3" /> Lost
                              </Button>
                            </>
                          )}
                          {ref.status === "contacted" && (
                            <>
                              <Button size="sm" onClick={() => updateReferralStatus(ref.id, "in_progress")} className="gap-1">
                                <Clock className="h-3 w-3" /> In Progress
                              </Button>
                            </>
                          )}
                          {ref.status === "in_progress" && (
                            <>
                              <Button size="sm" onClick={() => updateReferralStatus(ref.id, "won")} className="gap-1">
                                <CheckCircle2 className="h-3 w-3" /> Won
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => updateReferralStatus(ref.id, "lost")} className="gap-1">
                                <XCircle className="h-3 w-3" /> Lost
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default BusinessDashboard;
