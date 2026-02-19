import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DollarSign, Users, TrendingUp, PlusCircle, ArrowRight,
  CheckCircle2, XCircle, Clock, Eye, BarChart3
} from "lucide-react";

const statusColors: Record<string, string> = {
  submitted: "bg-muted text-muted-foreground",
  contacted: "bg-blue-100 text-blue-700",
  in_progress: "bg-accent/20 text-accent-foreground",
  won: "bg-earnings/20 text-earnings",
  lost: "bg-destructive/10 text-destructive",
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

  const stats = [
    { label: "Total Referrals", value: referrals.length.toString(), icon: Users, color: "text-primary" },
    { label: "Deals Won", value: wonCount.toString(), icon: CheckCircle2, color: "text-earnings" },
    { label: "Conversion Rate", value: `${conversionRate}%`, icon: TrendingUp, color: "text-accent" },
    { label: "Total Paid", value: `$${totalPaid.toLocaleString()}`, icon: DollarSign, color: "text-muted-foreground" },
  ];

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  }

  return (
    <div className="py-8">
      <div className="container max-w-6xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">Business Dashboard</h1>
            <p className="mt-1 text-muted-foreground">{business?.name ?? "Your Business"}</p>
          </div>
          <Button asChild className="gap-2">
            <Link to="/dashboard/create-offer"><PlusCircle className="h-4 w-4" /> Create Offer</Link>
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

        {/* Active Offers */}
        <div className="mb-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Your Offers</h2>
            <Button variant="ghost" size="sm" className="gap-1" asChild>
              <Link to="/dashboard/create-offer">Add Offer <PlusCircle className="h-4 w-4" /></Link>
            </Button>
          </div>
          {offers.length === 0 ? (
            <div className="rounded-xl border border-border bg-card py-12 text-center">
              <BarChart3 className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
              <p className="font-medium">No offers yet</p>
              <p className="mt-1 text-sm text-muted-foreground">Create your first referral offer to start receiving leads</p>
              <Button asChild className="mt-4">
                <Link to="/dashboard/create-offer">Create Offer</Link>
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {offers.map((offer: any) => (
                <div key={offer.id} className="rounded-xl border border-border bg-card p-5">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-display font-semibold text-foreground">{offer.title}</h3>
                    <Badge variant={offer.status === "active" ? "default" : "secondary"}>{offer.status}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{offer.description}</p>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="earnings-badge rounded-full px-3 py-0.5 text-xs font-bold">
                      {offer.payout_type === "flat" ? `$${offer.payout}` : `${offer.payout}%`}
                    </span>
                    <span className="text-muted-foreground">{offer.category}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Incoming Referrals */}
        <h2 className="font-display text-lg font-semibold mb-4">Incoming Referrals</h2>
        {referrals.length === 0 ? (
          <div className="rounded-xl border border-border bg-card py-12 text-center">
            <Users className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <p className="font-medium">No referrals yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Referrals will appear here once referrers submit leads</p>
          </div>
        ) : (
          <div className="space-y-3">
            {referrals.map((ref: any) => (
              <div key={ref.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{ref.customer_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {ref.customer_email && <span>{ref.customer_email} • </span>}
                      {ref.offers?.title}
                    </p>
                    {ref.notes && <p className="mt-1 text-sm text-muted-foreground italic">"{ref.notes}"</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={statusColors[ref.status] ?? ""}>{ref.status.replace("_", " ")}</Badge>
                    {ref.status === "submitted" && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => updateReferralStatus(ref.id, "contacted")}>
                          <Eye className="mr-1 h-3 w-3" /> Review
                        </Button>
                        <Button size="sm" variant="default" onClick={() => updateReferralStatus(ref.id, "won")} className="gap-1">
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BusinessDashboard;
