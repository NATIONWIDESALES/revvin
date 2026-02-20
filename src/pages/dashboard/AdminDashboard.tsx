import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import {
  DollarSign, Users, Building2, TrendingUp, FileText, CheckCircle2,
  Clock, XCircle, Eye, BarChart3, Shield, Activity
} from "lucide-react";
import { motion } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.5 } }),
};

const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
  submitted: { bg: "bg-muted", text: "text-muted-foreground", label: "Submitted" },
  contacted: { bg: "bg-blue-50", text: "text-blue-700", label: "Contacted" },
  in_progress: { bg: "bg-accent/10", text: "text-accent-foreground", label: "In Progress" },
  won: { bg: "bg-earnings/10", text: "text-earnings", label: "Won" },
  lost: { bg: "bg-destructive/10", text: "text-destructive", label: "Lost" },
};

const AdminDashboard = () => {
  const { user } = useAuth();
  const [referrals, setReferrals] = useState<any[]>([]);
  const [offers, setOffers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
  const totalReferrals = referrals.length;
  const wonDeals = referrals.filter(r => r.status === "won").length;
  const totalPlatformRevenue = referrals
    .filter(r => r.status === "won")
    .reduce((sum, r) => sum + (r.payout_amount ?? r.offers?.payout ?? 0) * 0.1, 0);
  const totalPayouts = referrals
    .filter(r => r.status === "won")
    .reduce((sum, r) => sum + (r.payout_amount ?? r.offers?.payout ?? 0), 0);
  const activeOffers = offers.filter(o => o.status === "active").length;
  const conversionRate = totalReferrals > 0 ? Math.round((wonDeals / totalReferrals) * 100) : 0;

  const stats = [
    { label: "Total Businesses", value: totalBusinesses.toString(), icon: Building2, color: "text-primary", bgColor: "bg-primary/10" },
    { label: "Total Referrers", value: totalReferrers.toString(), icon: Users, color: "text-accent", bgColor: "bg-accent/10" },
    { label: "Total Referrals", value: totalReferrals.toString(), icon: FileText, color: "text-muted-foreground", bgColor: "bg-muted" },
    { label: "Deals Won", value: wonDeals.toString(), icon: CheckCircle2, color: "text-earnings", bgColor: "bg-earnings/10" },
    { label: "Active Offers", value: activeOffers.toString(), icon: Activity, color: "text-primary", bgColor: "bg-primary/10" },
    { label: "Conversion Rate", value: `${conversionRate}%`, icon: TrendingUp, color: "text-accent", bgColor: "bg-accent/10" },
    { label: "Total Payouts", value: `$${totalPayouts.toLocaleString()}`, icon: DollarSign, color: "text-earnings", bgColor: "bg-earnings/10" },
    { label: "Platform Revenue (10%)", value: `$${Math.round(totalPlatformRevenue).toLocaleString()}`, icon: BarChart3, color: "text-primary", bgColor: "bg-primary/10" },
  ];

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  }

  return (
    <div className="py-8">
      <div className="container max-w-7xl">
        <motion.div initial="hidden" animate="visible">
          {/* Header */}
          <motion.div variants={fadeUp} custom={0} className="mb-8">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="font-display text-3xl font-bold text-foreground">Admin Dashboard</h1>
              <Badge variant="secondary" className="gap-1"><Shield className="h-3 w-3" /> Platform Admin</Badge>
            </div>
            <p className="text-muted-foreground">Full platform overview — businesses, referrers, and referral activity</p>
          </motion.div>

          {/* Stats Grid */}
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

          {/* Two-column: Businesses + Recent Users */}
          <motion.div variants={fadeUp} custom={2} className="mb-8 grid gap-6 lg:grid-cols-2">
            {/* Businesses */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h2 className="font-display text-lg font-bold mb-4 flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" /> Registered Businesses
              </h2>
              {businesses.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No businesses registered yet</p>
              ) : (
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {businesses.map((biz) => {
                    const bizOffers = offers.filter(o => o.business_id === biz.id);
                    const bizReferrals = referrals.filter(r => r.business_id === biz.id);
                    return (
                      <div key={biz.id} className="flex items-center justify-between rounded-xl border border-border bg-muted/30 p-3">
                        <div>
                          <p className="text-sm font-medium text-foreground">{biz.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {biz.industry ?? "No industry"} • {biz.city ?? "No location"}
                          </p>
                        </div>
                        <div className="text-right text-xs text-muted-foreground">
                          <p>{bizOffers.length} offers</p>
                          <p>{bizReferrals.length} referrals</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Recent Users */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h2 className="font-display text-lg font-bold mb-4 flex items-center gap-2">
                <Users className="h-5 w-5 text-accent" /> Recent Users
              </h2>
              {profiles.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No users yet</p>
              ) : (
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {profiles.slice(0, 20).map((profile) => {
                    const role = roles.find(r => r.user_id === profile.user_id);
                    return (
                      <div key={profile.id} className="flex items-center justify-between rounded-xl border border-border bg-muted/30 p-3">
                        <div>
                          <p className="text-sm font-medium text-foreground">{profile.full_name ?? "Unnamed"}</p>
                          <p className="text-xs text-muted-foreground">{profile.city ?? "No location"}</p>
                        </div>
                        <Badge variant={role?.role === "business" ? "default" : "secondary"}>
                          {role?.role ?? "unknown"}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>

          {/* All Offers */}
          <motion.div variants={fadeUp} custom={3} className="mb-8">
            <h2 className="font-display text-lg font-bold mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" /> All Offers ({offers.length})
            </h2>
            {offers.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card py-12 text-center shadow-sm">
                <p className="text-sm text-muted-foreground">No offers created yet</p>
              </div>
            ) : (
              <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="text-left p-3 font-medium text-muted-foreground">Offer</th>
                        <th className="text-left p-3 font-medium text-muted-foreground">Business</th>
                        <th className="text-left p-3 font-medium text-muted-foreground">Category</th>
                        <th className="text-left p-3 font-medium text-muted-foreground">Payout</th>
                        <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                        <th className="text-left p-3 font-medium text-muted-foreground">Referrals</th>
                      </tr>
                    </thead>
                    <tbody>
                      {offers.map((offer) => {
                        const offerRefs = referrals.filter(r => r.offer_id === offer.id);
                        return (
                          <tr key={offer.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                            <td className="p-3 font-medium text-foreground">{offer.title}</td>
                            <td className="p-3 text-muted-foreground">{offer.businesses?.name ?? "—"}</td>
                            <td className="p-3 text-muted-foreground">{offer.category}</td>
                            <td className="p-3">
                              <span className="earnings-badge rounded-full px-2 py-0.5 text-xs font-bold">
                                {offer.payout_type === "flat" ? `$${offer.payout}` : `${offer.payout}%`}
                              </span>
                            </td>
                            <td className="p-3">
                              <Badge variant={offer.status === "active" ? "default" : "secondary"}>{offer.status}</Badge>
                            </td>
                            <td className="p-3 text-muted-foreground">{offerRefs.length}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </motion.div>

          {/* All Referrals */}
          <motion.div variants={fadeUp} custom={4}>
            <h2 className="font-display text-lg font-bold mb-4 flex items-center gap-2">
              <Activity className="h-5 w-5 text-earnings" /> All Referrals ({referrals.length})
            </h2>
            {referrals.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card py-12 text-center shadow-sm">
                <p className="text-sm text-muted-foreground">No referrals submitted yet</p>
              </div>
            ) : (
              <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="text-left p-3 font-medium text-muted-foreground">Customer</th>
                        <th className="text-left p-3 font-medium text-muted-foreground">Offer</th>
                        <th className="text-left p-3 font-medium text-muted-foreground">Business</th>
                        <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                        <th className="text-left p-3 font-medium text-muted-foreground">Payout</th>
                        <th className="text-left p-3 font-medium text-muted-foreground">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {referrals.map((ref) => {
                        const sc = statusConfig[ref.status] ?? statusConfig.submitted;
                        return (
                          <tr key={ref.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                            <td className="p-3">
                              <p className="font-medium text-foreground">{ref.customer_name}</p>
                              <p className="text-xs text-muted-foreground">{ref.customer_email ?? "—"}</p>
                            </td>
                            <td className="p-3 text-muted-foreground">{ref.offers?.title ?? "—"}</td>
                            <td className="p-3 text-muted-foreground">{ref.businesses?.name ?? "—"}</td>
                            <td className="p-3">
                              <Badge className={`${sc.bg} ${sc.text} border-0`}>{sc.label}</Badge>
                            </td>
                            <td className="p-3 font-medium text-foreground">
                              {ref.payout_amount ? `$${ref.payout_amount}` : ref.offers ? (ref.offers.payout_type === "flat" ? `$${ref.offers.payout}` : `${ref.offers.payout}%`) : "—"}
                            </td>
                            <td className="p-3 text-muted-foreground">
                              {new Date(ref.created_at).toLocaleDateString()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default AdminDashboard;
