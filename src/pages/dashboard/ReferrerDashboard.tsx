import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DollarSign, TrendingUp, Clock, CheckCircle2,
  Trophy, Star, Zap, Award, Send, ArrowRight, Target, BarChart3, Wallet, Bell, Flame, ShieldCheck
} from "lucide-react";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useToast } from "@/hooks/use-toast";
import LeaderboardPreview from "@/components/LeaderboardPreview";
import InviteBusinessModal from "@/components/InviteBusinessModal";

const iconMap: Record<string, any> = { trophy: Trophy, star: Star, zap: Zap, "dollar-sign": DollarSign, "trending-up": TrendingUp, award: Award };

const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
  submitted: { bg: "bg-muted", text: "text-muted-foreground", label: "Submitted" },
  accepted: { bg: "bg-primary/10", text: "text-primary", label: "Funds Reserved" },
  contacted: { bg: "bg-blue-100/60", text: "text-blue-700", label: "Contacted" },
  qualified: { bg: "bg-primary/10", text: "text-primary", label: "Qualified" },
  in_progress: { bg: "bg-accent/10", text: "text-accent-foreground", label: "In Progress" },
  won: { bg: "bg-earnings/10", text: "text-earnings", label: "Closed — Paid" },
  lost: { bg: "bg-destructive/10", text: "text-destructive", label: "Lost" },
  declined: { bg: "bg-muted", text: "text-muted-foreground", label: "Declined" },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.5 } }),
};

const ReferrerDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
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

  const paidEarnings = referrals.filter(r => r.payout_status === "paid").reduce((sum, r) => sum + (r.payout_amount ?? 0), 0);
  const confirmedEarnings = referrals.filter(r => r.status === "won" && r.payout_status === "approved").reduce((sum, r) => sum + (r.payout_amount ?? 0), 0);
  const reservedEarnings = referrals.filter(r => r.status === "accepted").reduce((sum, r) => {
    const offer = r.offers;
    if (!offer || offer.payout_type !== "flat") return sum;
    return sum + Math.round(Number(offer.payout) * 0.9);
  }, 0);
  const pendingEarnings = referrals.filter(r => ["submitted", "contacted", "in_progress"].includes(r.status)).reduce((sum, r) => {
    const offer = r.offers;
    if (!offer || offer.payout_type !== "flat") return sum;
    return sum + Math.round(Number(offer.payout) * 0.9);
  }, 0);
  const lifetimeEarnings = paidEarnings + confirmedEarnings;
  const wonCount = referrals.filter(r => r.status === "won").length;
  const successRate = referrals.length > 0 ? Math.round((wonCount / referrals.length) * 100) : 0;

  // Streak: referrals this week
  const thisWeekRefs = referrals.filter(r => new Date(r.created_at) > new Date(Date.now() - 7 * 86400000)).length;

  const stats = [
    { label: "Pending Earnings", value: `$${pendingEarnings.toLocaleString()}`, icon: Clock, color: "text-accent-foreground", bgColor: "bg-accent/10" },
    { label: "Reserved (Escrowed)", value: `$${reservedEarnings.toLocaleString()}`, icon: ShieldCheck, color: "text-primary", bgColor: "bg-primary/10" },
    { label: "Confirmed Earnings", value: `$${confirmedEarnings.toLocaleString()}`, icon: CheckCircle2, color: "text-primary", bgColor: "bg-primary/10" },
    { label: "Paid Earnings", value: `$${paidEarnings.toLocaleString()}`, icon: Wallet, color: "text-earnings", bgColor: "bg-earnings/10" },
    { label: "Lifetime Earnings", value: `$${lifetimeEarnings.toLocaleString()}`, icon: DollarSign, color: "text-earnings", bgColor: "bg-earnings/10" },
    { label: "Conversion Rate", value: `${successRate}%`, icon: Target, color: "text-primary", bgColor: "bg-primary/10" },
  ];

  const earningsByMonth = referrals
    .filter(r => r.status === "won" && r.payout_amount)
    .reduce((acc: Record<string, number>, r) => {
      const month = new Date(r.created_at).toLocaleString("default", { month: "short", year: "2-digit" });
      acc[month] = (acc[month] || 0) + (r.payout_amount ?? 0);
      return acc;
    }, {});
  const chartData = Object.entries(earningsByMonth).map(([month, amount]) => ({ month, amount }));
  const displayChartData = chartData.length > 0 ? chartData : [{ month: "Jan 26", amount: 0 }, { month: "Feb 26", amount: 0 }];

  // Earnings by category
  const earningsByCategory = referrals
    .filter(r => r.status === "won" && r.payout_amount && r.offers?.category)
    .reduce((acc: Record<string, number>, r) => {
      acc[r.offers.category] = (acc[r.offers.category] || 0) + (r.payout_amount ?? 0);
      return acc;
    }, {});

  const milestones = [
    { label: "First Referral", target: 1, current: referrals.length, icon: Send },
    { label: "5 Deals Won", target: 5, current: wonCount, icon: Trophy },
    { label: "$1,000 Earned", target: 1000, current: lifetimeEarnings, icon: DollarSign },
    { label: "$5,000 Earned", target: 5000, current: lifetimeEarnings, icon: Zap },
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
              <h1 className="font-display text-3xl font-bold text-foreground">Earnings Dashboard</h1>
              <p className="mt-1 text-muted-foreground">Track your referrals, earnings, and achievements</p>
            </div>
            <div className="flex gap-2">
              <InviteBusinessModal />
              <Button asChild className="gap-2 h-11">
                <Link to="/browse">Find Opportunities <ArrowRight className="h-4 w-4" /></Link>
              </Button>
            </div>
          </motion.div>

          {/* Streak */}
          <motion.div variants={fadeUp} custom={0.5} className="mb-6 rounded-xl border border-accent/30 bg-accent/5 p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
              <Flame className="h-5 w-5 text-accent-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">Weekly Streak: <strong>{thisWeekRefs} referral{thisWeekRefs !== 1 ? "s" : ""}</strong> this week</p>
              <p className="text-xs text-muted-foreground">Keep submitting to maintain your streak and climb the leaderboard</p>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div variants={fadeUp} custom={1} className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

          {/* Charts + Category Breakdown */}
          <motion.div variants={fadeUp} custom={2} className="mb-8 grid gap-6 md:grid-cols-3">
            <div className="md:col-span-2 rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h2 className="font-display text-lg font-bold mb-4 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-earnings" /> Earnings Over Time
              </h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={displayChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `$${v}`} />
                    <Tooltip
                      formatter={(value: number) => [`$${value.toLocaleString()}`, "Earnings"]}
                      contentStyle={{ borderRadius: "0.75rem", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }}
                    />
                    <Bar dataKey="amount" fill="hsl(var(--earnings))" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h2 className="font-display text-lg font-bold mb-4">Earnings by Category</h2>
              {Object.keys(earningsByCategory).length > 0 ? (
                <div className="space-y-3">
                  {Object.entries(earningsByCategory).sort(([,a],[,b]) => (b as number) - (a as number)).map(([cat, amt]) => (
                    <div key={cat} className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{cat}</span>
                      <span className="font-display text-sm font-bold text-earnings">${amt.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-4 text-center">No earnings data yet</p>
              )}
            </div>
          </motion.div>

          {/* Milestones, Badges & Leaderboard */}
          <motion.div variants={fadeUp} custom={3} className="mb-8 grid gap-6 md:grid-cols-3">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h2 className="font-display text-lg font-bold mb-4 flex items-center gap-2">
                <Trophy className="h-5 w-5 text-accent" /> Milestones
              </h2>
              <div className="space-y-4">
                {milestones.map((m) => {
                  const pct = Math.min(100, Math.round((m.current / m.target) * 100));
                  const done = pct >= 100;
                  return (
                    <div key={m.label}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="flex items-center gap-2 text-sm font-medium">
                          <m.icon className={`h-4 w-4 ${done ? "text-earnings" : "text-muted-foreground"}`} />
                          {m.label}
                        </span>
                        <span className={`text-xs font-medium ${done ? "text-earnings" : "text-muted-foreground"}`}>
                          {done ? "✓ Complete" : `${pct}%`}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${done ? "bg-earnings" : "bg-primary"}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h2 className="font-display text-lg font-bold mb-4 flex items-center gap-2">
                <Award className="h-5 w-5 text-accent" /> Your Badges
              </h2>
              {badges.length === 0 ? (
                <div className="py-8 text-center">
                  <Award className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">Submit referrals to unlock badges</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {badges.map((ub: any) => {
                    const Icon = iconMap[ub.badges?.icon] ?? Trophy;
                    return (
                      <div key={ub.id} className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10">
                          <Icon className="h-4 w-4 text-accent" />
                        </div>
                        <div>
                          <span className="text-sm font-medium block">{ub.badges?.name}</span>
                          <span className="text-xs text-muted-foreground">{ub.badges?.description}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <LeaderboardPreview city="Your City" />
          </motion.div>

          {/* Referral History */}
          <motion.div variants={fadeUp} custom={4}>
            <h2 className="font-display text-lg font-bold mb-4">Referral History</h2>
            {referrals.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card py-16 text-center shadow-sm">
                <Send className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
                <p className="font-display text-lg font-semibold text-foreground">No referrals yet</p>
                <p className="mt-2 text-sm text-muted-foreground">Browse opportunities and submit your first referral to start earning</p>
                <Button asChild className="mt-5" variant="outline">
                  <Link to="/browse">Browse Offers</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {referrals.map((ref: any) => {
                  const sc = statusConfig[ref.status] ?? statusConfig.submitted;
                  return (
                    <div key={ref.id} className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 shadow-sm">
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{ref.customer_name}</p>
                        <p className="text-sm text-muted-foreground">{ref.offers?.title ?? "Offer"} • {ref.businesses?.name ?? "Business"}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        {["submitted", "contacted", "in_progress"].includes(ref.status) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1 text-xs"
                            onClick={() => toast({ title: "Nudge sent", description: `Reminder sent to ${ref.businesses?.name ?? "the business"}.` })}
                          >
                            <Bell className="h-3 w-3" /> Nudge
                          </Button>
                        )}
                        <Badge className={`${sc.bg} ${sc.text} border-0`}>{sc.label}</Badge>
                        {ref.payout_amount && (
                          <span className="font-display font-bold text-earnings">${ref.payout_amount}</span>
                        )}
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
