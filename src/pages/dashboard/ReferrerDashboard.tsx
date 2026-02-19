import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DollarSign, TrendingUp, Clock, CheckCircle2, XCircle,
  Trophy, Star, Zap, Award, Send, ArrowRight
} from "lucide-react";

const iconMap: Record<string, any> = { trophy: Trophy, star: Star, zap: Zap, "dollar-sign": DollarSign, "trending-up": TrendingUp, award: Award };

const statusColors: Record<string, string> = {
  submitted: "bg-muted text-muted-foreground",
  contacted: "bg-blue-100 text-blue-700",
  in_progress: "bg-accent/20 text-accent-foreground",
  won: "bg-earnings/20 text-earnings",
  lost: "bg-destructive/10 text-destructive",
};

const ReferrerDashboard = () => {
  const { user } = useAuth();
  const [referrals, setReferrals] = useState<any[]>([]);
  const [badges, setBadges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const [refRes, badgeRes] = await Promise.all([
        supabase.from("referrals").select("*, offers(title, payout, payout_type), businesses(name)").eq("referrer_id", user.id).order("created_at", { ascending: false }),
        supabase.from("user_badges").select("*, badges(*)").eq("user_id", user.id),
      ]);
      setReferrals(refRes.data ?? []);
      setBadges(badgeRes.data ?? []);
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const totalEarnings = referrals.filter(r => r.payout_status === "paid").reduce((sum, r) => sum + (r.payout_amount ?? 0), 0);
  const pendingEarnings = referrals.filter(r => r.payout_status === "approved").reduce((sum, r) => sum + (r.payout_amount ?? 0), 0);
  const wonCount = referrals.filter(r => r.status === "won").length;

  const stats = [
    { label: "Total Earnings", value: `$${totalEarnings.toLocaleString()}`, icon: DollarSign, color: "text-earnings" },
    { label: "Pending Payout", value: `$${pendingEarnings.toLocaleString()}`, icon: Clock, color: "text-accent" },
    { label: "Deals Won", value: wonCount.toString(), icon: CheckCircle2, color: "text-primary" },
    { label: "Total Referrals", value: referrals.length.toString(), icon: Send, color: "text-muted-foreground" },
  ];

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  }

  return (
    <div className="py-8">
      <div className="container max-w-6xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">Earnings Dashboard</h1>
            <p className="mt-1 text-muted-foreground">Track your referrals and earnings</p>
          </div>
          <Button asChild className="gap-2">
            <Link to="/browse">Find Opportunities <ArrowRight className="h-4 w-4" /></Link>
          </Button>
        </div>

        {/* Stats */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-muted p-2">
                  <s.icon className={`h-5 w-5 ${s.color}`} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                  <p className="font-display text-2xl font-bold text-foreground">{s.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Badges */}
        {badges.length > 0 && (
          <div className="mb-8">
            <h2 className="font-display text-lg font-semibold mb-4">Your Badges</h2>
            <div className="flex flex-wrap gap-3">
              {badges.map((ub: any) => {
                const Icon = iconMap[ub.badges?.icon] ?? Trophy;
                return (
                  <div key={ub.id} className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2">
                    <Icon className="h-4 w-4 text-accent" />
                    <span className="text-sm font-medium">{ub.badges?.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Referral List */}
        <h2 className="font-display text-lg font-semibold mb-4">Your Referrals</h2>
        {referrals.length === 0 ? (
          <div className="rounded-xl border border-border bg-card py-16 text-center">
            <Send className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <p className="font-medium text-foreground">No referrals yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Browse opportunities and submit your first referral</p>
            <Button asChild className="mt-4" variant="outline">
              <Link to="/browse">Browse Offers</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {referrals.map((ref: any) => (
              <div key={ref.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
                <div className="flex-1">
                  <p className="font-medium text-foreground">{ref.customer_name}</p>
                  <p className="text-sm text-muted-foreground">{ref.offers?.title ?? "Offer"} • {ref.businesses?.name ?? "Business"}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className={statusColors[ref.status] ?? ""}>{ref.status.replace("_", " ")}</Badge>
                  {ref.payout_amount && (
                    <span className="font-display font-bold text-earnings">${ref.payout_amount}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReferrerDashboard;
