import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCountry } from "@/contexts/CountryContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DollarSign, TrendingUp, Clock, CheckCircle2, User,
  Trophy, Star, Zap, Award, Send, ArrowRight, Target, BarChart3, Wallet, Bell, Flame, ShieldCheck, Scale, AlertTriangle
} from "lucide-react";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useToast } from "@/hooks/use-toast";
import LeaderboardPreview from "@/components/LeaderboardPreview";
import InviteBusinessModal from "@/components/InviteBusinessModal";
import DashboardChecklist from "@/components/DashboardChecklist";
import PayoutMethodSetup from "@/components/PayoutMethodSetup";

const iconMap: Record<string, any> = { trophy: Trophy, star: Star, zap: Zap, "dollar-sign": DollarSign, "trending-up": TrendingUp, award: Award };

const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
  submitted: { bg: "bg-muted", text: "text-muted-foreground", label: "Submitted" },
  accepted: { bg: "bg-primary/10", text: "text-primary", label: "Accepted" },
  contacted: { bg: "bg-blue-100/60", text: "text-blue-700", label: "Contacted" },
  qualified: { bg: "bg-primary/10", text: "text-primary", label: "Qualified" },
  in_progress: { bg: "bg-accent/10", text: "text-accent-foreground", label: "In Progress" },
  won: { bg: "bg-earnings/10", text: "text-earnings", label: "Won" },
  lost: { bg: "bg-destructive/10", text: "text-destructive", label: "Lost" },
  declined: { bg: "bg-muted", text: "text-muted-foreground", label: "Declined" },
  disputed: { bg: "bg-accent/10", text: "text-accent-foreground", label: "Disputed" },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.5 } }),
};

const ReferrerDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { displayCurrency, currencySymbol } = useCountry();
  const [referrals, setReferrals] = useState<any[]>([]);
  const [badges, setBadges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const [refRes, badgeRes] = await Promise.all([
        supabase.from("referrals").select("*, offers(title, payout, payout_type, category), businesses(name)").eq("referrer_id", user.id).order("created_at", { ascending: false }),
        supabase.from("user_badges").select("*, badges(*)").eq("user_id", user.id),
      ]);
      setReferrals(refRes.data ?? []);
      setBadges(badgeRes.data ?? []);
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const sym = currencySymbol(displayCurrency);
  const paidEarnings = referrals.filter(r => r.payout_status === "paid").reduce((sum, r) => sum + (r.payout_amount ?? 0), 0);
  const confirmedEarnings = referrals.filter(r => r.status === "won" && r.payout_status === "approved").reduce((sum, r) => sum + (r.payout_amount ?? 0), 0);
  const reservedEarnings = referrals.filter(r => r.status === "accepted").reduce((sum, r) => {
    const offer = r.offers;
    if (!offer || offer.payout_type !== "flat") return sum;
    return sum + Math.round(Number(offer.payout) * 0.9);
  }, 0);
  const pendingEarnings = referrals.filter(r => ["submitted", "contacted", "in_progress", "qualified"].includes(r.status)).reduce((sum, r) => {
    const offer = r.offers;
    if (!offer || offer.payout_type !== "flat") return sum;
    return sum + Math.round(Number(offer.payout) * 0.9);
  }, 0);
  const lifetimeEarnings = paidEarnings + confirmedEarnings;
  const wonCount = referrals.filter(r => r.status === "won").length;
  const successRate = referrals.length > 0 ? Math.round((wonCount / referrals.length) * 100) : 0;
  const thisWeekRefs = referrals.filter(r => new Date(r.created_at) > new Date(Date.now() - 7 * 86400000)).length;

  const stats = [
    { label: "Pending", value: `${sym}${pendingEarnings.toLocaleString()}`, icon: Clock, color: "text-accent-foreground", bgColor: "bg-accent/10" },
    { label: "Accepted", value: `${sym}${reservedEarnings.toLocaleString()}`, icon: ShieldCheck, color: "text-primary", bgColor: "bg-primary/10" },
    { label: "Confirmed", value: `${sym}${confirmedEarnings.toLocaleString()}`, icon: CheckCircle2, color: "text-primary", bgColor: "bg-primary/10" },
    { label: "Paid", value: `${sym}${paidEarnings.toLocaleString()}`, icon: Wallet, color: "text-earnings", bgColor: "bg-earnings/10" },
    { label: "Lifetime", value: `${sym}${lifetimeEarnings.toLocaleString()}`, icon: DollarSign, color: "text-earnings", bgColor: "bg-earnings/10" },
    { label: "Success Rate", value: `${successRate}%`, icon: Target, color: "text-primary", bgColor: "bg-primary/10" },
  ];

  const earningsByMonth = referrals.filter(r => r.status === "won" && r.payout_amount).reduce((acc: Record<string, number>, r) => {
    const month = new Date(r.created_at).toLocaleString("default", { month: "short", year: "2-digit" });
    acc[month] = (acc[month] || 0) + (r.payout_amount ?? 0);
    return acc;
  }, {});
  const chartData = Object.entries(earningsByMonth).map(([month, amount]) => ({ month, amount }));
  const displayChartData = chartData.length > 0 ? chartData : [{ month: "Jan 26", amount: 0 }, { month: "Feb 26", amount: 0 }];

  const earningsByCategory = referrals.filter(r => r.status === "won" && r.payout_amount && r.offers?.category).reduce((acc: Record<string, number>, r) => {
    acc[r.offers.category] = (acc[r.offers.category] || 0) + (r.payout_amount ?? 0);
    return acc;
  }, {});

  const milestones = [
    { label: "First Referral", target: 1, current: referrals.length, icon: Send },
    { label: "5 Deals Won", target: 5, current: wonCount, icon: Trophy },
    { label: "$1,000 Earned", target: 1000, current: lifetimeEarnings, icon: DollarSign },
    { label: "$5,000 Earned", target: 5000, current: lifetimeEarnings, icon: Zap },
  ];

  // Checklist
  const checklistItems = [
    { label: "Pick categories + city", done: true },
    { label: "Browse offers (list/map)", done: referrals.length > 0 || true, action: () => navigate("/browse"), actionLabel: "Browse" },
    { label: "Submit a referral", done: referrals.length > 0, action: () => navigate("/browse"), actionLabel: "Find offer" },
    { label: "Track status updates", done: referrals.some(r => r.status !== "submitted") },
    { label: "Get paid", done: paidEarnings > 0 || confirmedEarnings > 0 },
  ];

  const handleDispute = (refId: string) => {
    setReferrals(prev => prev.map(r => r.id === refId ? { ...r, status: "disputed" } : r));
    toast({ title: "Dispute submitted", description: "Your dispute has been sent to Revvin for review. You'll be notified of the outcome." });
  };

  const getExpectedPayDate = (ref: any) => {
    if (ref.status === "won") return "Processing";
    if (["accepted", "contacted", "qualified"].includes(ref.status)) {
      const days = ref.offers?.close_time_days ?? 30;
      const date = new Date(new Date(ref.created_at).getTime() + days * 86400000);
      return `Est. ${date.toLocaleDateString("default", { month: "short", day: "numeric" })}`;
    }
    return null;
  };

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  }

  return (
    <div className="py-8">
      <div className="container max-w-6xl">
        <motion.div initial="hidden" animate="visible">
          <motion.div variants={fadeUp} custom={0} className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="font-display text-3xl font-bold text-foreground">Earnings Dashboard</h1>
              <p className="mt-1 text-muted-foreground">Track referrals, earnings, and achievements • {displayCurrency}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" asChild className="gap-2 h-11"><Link to="/dashboard/profile"><User className="h-4 w-4" /> Profile</Link></Button>
              <InviteBusinessModal />
              <Button asChild className="gap-2 h-11"><Link to="/browse">Find Opportunities <ArrowRight className="h-4 w-4" /></Link></Button>
            </div>
          </motion.div>

          {/* Checklist */}
          <DashboardChecklist title="Start Here — Referrer Setup" items={checklistItems} />

          {/* Streak */}
          <motion.div variants={fadeUp} custom={0.5} className="mb-6 rounded-xl border border-accent/30 bg-accent/5 p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10"><Flame className="h-5 w-5 text-accent-foreground" /></div>
            <div>
              <p className="text-sm font-medium">Weekly Streak: <strong>{thisWeekRefs} referral{thisWeekRefs !== 1 ? "s" : ""}</strong> this week</p>
              <p className="text-xs text-muted-foreground">Keep submitting to maintain your streak and climb the leaderboard</p>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div variants={fadeUp} custom={1} className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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

          {/* Charts + Category + Payout Method */}
          <motion.div variants={fadeUp} custom={2} className="mb-8 grid gap-6 md:grid-cols-3">
            <div className="md:col-span-2 rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h2 className="font-display text-base font-bold mb-4 flex items-center gap-2"><BarChart3 className="h-4 w-4 text-earnings" /> Earnings Over Time</h2>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={displayChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `$${v}`} />
                    <Tooltip formatter={(value: number) => [`$${value.toLocaleString()}`, "Earnings"]} contentStyle={{ borderRadius: "0.75rem", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                    <Bar dataKey="amount" fill="hsl(var(--earnings))" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <PayoutMethodSetup />
          </motion.div>

          {/* Category + Milestones + Badges + Leaderboard */}
          <motion.div variants={fadeUp} custom={3} className="mb-8 grid gap-6 md:grid-cols-3">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <h2 className="font-display text-base font-bold mb-3 flex items-center gap-2"><Trophy className="h-4 w-4 text-accent-foreground" /> Milestones</h2>
              <div className="space-y-3">
                {milestones.map((m) => {
                  const pct = Math.min(100, Math.round((m.current / m.target) * 100));
                  const done = pct >= 100;
                  return (
                    <div key={m.label}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="flex items-center gap-2 text-sm font-medium"><m.icon className={`h-3.5 w-3.5 ${done ? "text-earnings" : "text-muted-foreground"}`} />{m.label}</span>
                        <span className={`text-xs font-medium ${done ? "text-earnings" : "text-muted-foreground"}`}>{done ? "✓" : `${pct}%`}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden"><div className={`h-full rounded-full ${done ? "bg-earnings" : "bg-primary"}`} style={{ width: `${pct}%` }} /></div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <h2 className="font-display text-base font-bold mb-3 flex items-center gap-2"><Award className="h-4 w-4 text-accent-foreground" /> Your Badges</h2>
              {badges.length === 0 ? (
                <div className="py-6 text-center"><Award className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" /><p className="text-sm text-muted-foreground">Submit referrals to unlock badges</p></div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {badges.map((ub: any) => {
                    const Icon = iconMap[ub.badges?.icon] ?? Trophy;
                    return (
                      <div key={ub.id} className="flex items-center gap-2 rounded-xl border border-border bg-muted/30 p-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10"><Icon className="h-3.5 w-3.5 text-accent-foreground" /></div>
                        <div><span className="text-xs font-medium block">{ub.badges?.name}</span></div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <LeaderboardPreview city="Your City" />
          </motion.div>

          {/* Referral Pipeline */}
          <motion.div variants={fadeUp} custom={4}>
            <h2 className="font-display text-lg font-bold mb-4">Referral Pipeline</h2>
            {referrals.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card py-16 text-center shadow-sm">
                <Send className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
                <p className="font-display text-lg font-semibold text-foreground">No referrals yet</p>
                <p className="mt-2 text-sm text-muted-foreground">Browse opportunities and submit your first referral</p>
                <Button asChild className="mt-5" variant="outline"><Link to="/browse">Browse Offers</Link></Button>
              </div>
            ) : (
              <div className="space-y-3">
                {referrals.map((ref: any) => {
                  const sc = statusConfig[ref.status] ?? statusConfig.submitted;
                  const expectedPay = getExpectedPayDate(ref);
                  const canDispute = ref.status === "lost" || ref.status === "declined";
                  return (
                    <div key={ref.id} className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 shadow-sm">
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{ref.customer_name}</p>
                        <p className="text-sm text-muted-foreground">{ref.offers?.title ?? "Offer"} • {ref.businesses?.name ?? "Business"}</p>
                        {expectedPay && <p className="text-xs text-muted-foreground mt-0.5">📅 {expectedPay}</p>}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {["submitted", "contacted", "in_progress", "qualified"].includes(ref.status) && (
                          <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => toast({ title: "Nudge sent", description: `Reminder sent to ${ref.businesses?.name ?? "the business"}.` })}>
                            <Bell className="h-3 w-3" /> Nudge
                          </Button>
                        )}
                        {canDispute && (
                          <Button variant="ghost" size="sm" className="gap-1 text-xs text-accent-foreground" onClick={() => handleDispute(ref.id)}>
                            <Scale className="h-3 w-3" /> Dispute
                          </Button>
                        )}
                        <Badge className={`${sc.bg} ${sc.text} border-0`}>{sc.label}</Badge>
                        {ref.payout_amount && <span className="font-display font-bold text-earnings">{sym}{ref.payout_amount}</span>}
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

export default ReferrerDashboard;
