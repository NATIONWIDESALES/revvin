import { useState, useEffect, useCallback, useRef } from "react";
import { toSlug } from "@/lib/utils";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCountry } from "@/contexts/CountryContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DollarSign, Users, PlusCircle,
  CheckCircle2, XCircle, Clock, Eye, Building2,
  Pause, Play, Edit, Target, Link2, Check, X, Info,
  Wallet, ArrowUpRight, CreditCard, Loader2, Crown, Zap, AlertTriangle
} from "lucide-react";
import { motion } from "framer-motion";
import DashboardChecklist from "@/components/DashboardChecklist";
import PlanSelector from "@/components/PlanSelector";
import OfferQRCode from "@/components/OfferQRCode";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { QrCode } from "lucide-react";

const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
  submitted: { bg: "bg-muted", text: "text-muted-foreground", label: "Submitted" },
  accepted: { bg: "bg-primary/10", text: "text-primary", label: "Accepted" },
  contacted: { bg: "bg-blue-50", text: "text-blue-700", label: "Contacted" },
  in_progress: { bg: "bg-accent/10", text: "text-accent-foreground", label: "In Progress" },
  qualified: { bg: "bg-primary/10", text: "text-primary", label: "Qualified" },
  won: { bg: "bg-earnings/10", text: "text-earnings", label: "Closed / Won" },
  lost: { bg: "bg-destructive/10", text: "text-destructive", label: "Lost" },
  declined: { bg: "bg-muted", text: "text-muted-foreground", label: "Declined" },
  void: { bg: "bg-muted", text: "text-muted-foreground", label: "Void" },
  paid: { bg: "bg-earnings/10", text: "text-earnings", label: "Paid" },
  duplicate: { bg: "bg-muted", text: "text-muted-foreground", label: "Duplicate" },
};

const txTypeLabels: Record<string, { label: string; color: string }> = {
  topup: { label: "Top-Up", color: "text-earnings" },
  fee: { label: "Fee", color: "text-muted-foreground" },
  payout: { label: "Payout", color: "text-destructive" },
  refund: { label: "Refund", color: "text-earnings" },
};

const SUGGESTED_AMOUNTS = [100, 250, 500, 1000];

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.5 } }),
};

const BusinessDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { currencySymbol, displayCurrency } = useCountry();
  const { toast } = useToast();
  const [business, setBusiness] = useState<any>(null);
  const [offers, setOffers] = useState<any[]>([]);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPayout, setEditingPayout] = useState<string | null>(null);
  const [newPayout, setNewPayout] = useState("");
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  // Wallet state
  const [walletBalance, setWalletBalance] = useState<any>(null);
  const [walletTransactions, setWalletTransactions] = useState<any[]>([]);
  const [topUpAmount, setTopUpAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [topUpLoading, setTopUpLoading] = useState(false);
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [showPlanSelector, setShowPlanSelector] = useState(false);

  const fetchWallet = async (userId: string) => {
    const [balRes, txRes] = await Promise.all([
      supabase.from("wallet_balances").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("wallet_transactions").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(10),
    ]);
    setWalletBalance(balRes.data);
    setWalletTransactions(txRes.data ?? []);
  };

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const { data: bizRows } = await supabase.from("businesses").select("*").eq("user_id", user.id).order("created_at", { ascending: true }).limit(1);
      const biz = bizRows && bizRows.length > 0 ? bizRows[0] : null;
      setBusiness(biz);
      if (biz) {
        const [offRes, refRes] = await Promise.all([
          supabase.from("offers").select("*").eq("business_id", biz.id).order("created_at", { ascending: false }),
          supabase.from("referrals").select("*, offers(title, payout, payout_type)").eq("business_id", biz.id).order("created_at", { ascending: false }),
        ]);
        setOffers(offRes.data ?? []);
        setReferrals(refRes.data ?? []);
      }
      await fetchWallet(user.id);
      setLoading(false);
    };
    fetchData();
  }, [user]);

  // Refetch business row from DB
  const refetchBusiness = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from("businesses").select("*").eq("user_id", user.id).order("created_at", { ascending: true }).limit(1);
    if (data && data.length > 0) setBusiness(data[0]);
  }, [user]);

  // Auto-refresh polling after returning from Stripe checkout/portal
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollCountRef = useRef(0);

  const startPolling = useCallback(() => {
    if (pollRef.current) return; // already polling
    pollCountRef.current = 0;
    pollRef.current = setInterval(async () => {
      pollCountRef.current += 1;
      await refetchBusiness();
      if (user) await fetchWallet(user.id);
      // Stop after 10 polls (~30s)
      if (pollCountRef.current >= 10 && pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    }, 3000);
  }, [refetchBusiness, user]);

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // Listen for window focus (user returning from Stripe tab)
  useEffect(() => {
    const handleFocus = () => {
      refetchBusiness();
      if (user) fetchWallet(user.id);
      startPolling();
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [refetchBusiness, startPolling, user]);

  // Detect top-up / upgrade success from URL
  useEffect(() => {
    if (searchParams.get("topup") === "success" && user) {
      toast({ title: "Wallet funded!", description: "Your wallet balance has been updated." });
      fetchWallet(user.id);
      startPolling();
      searchParams.delete("topup");
      setSearchParams(searchParams, { replace: true });
    }
    if (searchParams.get("upgrade") === "success" && user) {
      supabase.functions.invoke("check-subscription").then(() => {
        refetchBusiness().then(() => {
          // Show toast with latest tier
          supabase.from("businesses").select("pricing_tier").eq("user_id", user.id).limit(1).single().then(({ data }) => {
            const tier = data?.pricing_tier || "free";
            toast({ title: "Upgrade complete!", description: `You're now on the ${tier.charAt(0).toUpperCase() + tier.slice(1)} plan.` });
          });
        });
      });
      startPolling();
      searchParams.delete("upgrade");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, user]);

  const handleTopUp = async () => {
    const amount = topUpAmount ?? (parseFloat(customAmount) || 0);
    if (amount < 50) {
      toast({ title: "Minimum $50", description: "The minimum top-up amount is $50.", variant: "destructive" });
      return;
    }
    setTopUpLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-deposit-session", {
        body: { amount },
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to create payment session", variant: "destructive" });
    } finally {
      setTopUpLoading(false);
    }
  };

  const handleUpgrade = async () => {
    setUpgradeLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-subscription-session");
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to create subscription session", variant: "destructive" });
    } finally {
      setUpgradeLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.url) {
        window.open(data.url, "_blank");
      } else {
        throw new Error("No portal URL returned");
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to open subscription portal", variant: "destructive" });
    } finally {
      setPortalLoading(false);
    }
  };

  const handleAccept = async (ref: any) => {
    const payoutAmt = ref.offers?.payout_type === "flat" ? Number(ref.offers.payout) : 0;
    await supabase.from("referrals").update({ status: "accepted", payout_snapshot: payoutAmt, payout_type_snapshot: ref.offers?.payout_type ?? "flat" }).eq("id", ref.id);
    setReferrals((prev) => prev.map((r) => (r.id === ref.id ? { ...r, status: "accepted" } : r)));
    toast({ title: "Referral accepted", description: `Payout of $${payoutAmt} locked for this referral.` });
    if (user) {
      supabase.rpc("fn_create_audit_entry", { p_referral_id: ref.id, p_event_type: "referral_accepted", p_payload: { payout: payoutAmt } });
      supabase.rpc("fn_create_notification", { p_user_id: ref.referrer_id, p_title: "Referral accepted!", p_body: `Your referral for "${ref.offers?.title}" has been accepted.`, p_type: "referral_accepted", p_referral_id: ref.id });
      // Send email notification (fire-and-forget)
      supabase.functions.invoke("send-notification", {
        body: {
          type: "referral_accepted",
          recipientEmail: ref.customer_email || "",
          recipientName: ref.customer_name || "",
          data: { referrerName: ref.customer_name, customerName: ref.customer_name, offerTitle: ref.offers?.title || "" },
        },
      }).catch((err) => console.error("Email notification failed:", err));
    }
  };

  const handleDecline = async (ref: any) => {
    await supabase.from("referrals").update({ status: "declined" }).eq("id", ref.id);
    setReferrals((prev) => prev.map((r) => (r.id === ref.id ? { ...r, status: "declined" } : r)));
    toast({ title: "Referral declined" });
    if (user) {
      supabase.rpc("fn_create_audit_entry", { p_referral_id: ref.id, p_event_type: "referral_declined" });
      supabase.rpc("fn_create_notification", { p_user_id: ref.referrer_id, p_title: "Referral declined", p_body: `Your referral for "${ref.offers?.title}" was declined.`, p_type: "referral_declined", p_referral_id: ref.id });
      supabase.functions.invoke("send-notification", {
        body: {
          type: "referral_declined",
          recipientEmail: "",
          recipientName: ref.customer_name || "",
          data: { referrerName: ref.customer_name, customerName: ref.customer_name, offerTitle: ref.offers?.title || "" },
        },
      }).catch((err) => console.error("Email notification failed:", err));
    }
  };

  const handleWon = async (ref: any) => {
    try {
      const { data, error } = await supabase.functions.invoke("process-deal-won", {
        body: { referral_id: ref.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const payoutAmt = data?.payout_amount ?? ref.payout_snapshot ?? Number(ref.offers?.payout ?? 0);
      setReferrals((prev) => prev.map((r) => (r.id === ref.id ? { ...r, status: "won", payout_amount: payoutAmt, payout_status: "approved" } : r)));
      toast({ title: "Deal closed!", description: `Payout of $${payoutAmt} created for referrer.` });
      if (user) await fetchWallet(user.id);
    } catch (err: any) {
      toast({ title: "Error closing deal", description: err.message || "Something went wrong", variant: "destructive" });
    }
  };

  const handleLost = async (ref: any) => {
    await supabase.from("referrals").update({ status: "lost" }).eq("id", ref.id);
    setReferrals((prev) => prev.map((r) => (r.id === ref.id ? { ...r, status: "lost" } : r)));
    toast({ title: "Marked as lost" });
    if (user) {
      supabase.rpc("fn_create_audit_entry", { p_referral_id: ref.id, p_event_type: "referral_lost" });
      supabase.rpc("fn_create_notification", { p_user_id: ref.referrer_id, p_title: "Referral lost", p_body: `Your referral for "${ref.offers?.title}" was marked as lost.`, p_type: "referral_lost", p_referral_id: ref.id });
      supabase.functions.invoke("send-notification", {
        body: {
          type: "deal_lost",
          recipientEmail: "",
          recipientName: ref.customer_name || "",
          data: { referrerName: ref.customer_name, customerName: ref.customer_name, offerTitle: ref.offers?.title || "" },
        },
      }).catch((err) => console.error("Email notification failed:", err));
    }
  };

  const updateReferralStatus = async (id: string, status: string) => {
    await supabase.from("referrals").update({ status }).eq("id", id);
    setReferrals((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
  };

  const toggleOfferStatus = async (offerId: string, currentStatus: string) => {
    if (currentStatus === "active") {
      // Pausing: use edge function (checks for active referrals)
      try {
        const { data, error } = await supabase.functions.invoke("release-offer-funds", {
          body: { offer_id: offerId, new_status: "paused" },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        setOffers((prev) => prev.map((o) => (o.id === offerId ? { ...o, status: "paused" } : o)));
        toast({ title: "Offer paused", description: "Offer is now hidden from the marketplace." });
      } catch (err: any) {
        toast({ title: "Cannot pause offer", description: err.message || "Something went wrong", variant: "destructive" });
      }
    } else {
      // Reactivating: validate balance via reserve-offer-funds
      try {
        const { data, error } = await supabase.functions.invoke("reserve-offer-funds", {
          body: { offer_id: offerId },
        });
        if (error) throw error;
        if (data?.error) {
          toast({ title: "Cannot activate offer", description: data.error, variant: "destructive" });
          return;
        }
        setOffers((prev) => prev.map((o) => (o.id === offerId ? { ...o, status: "active" } : o)));
        toast({ title: "Offer activated", description: "Offer is now live on the marketplace." });
      } catch (err: any) {
        toast({ title: "Cannot activate offer", description: err.message || "Something went wrong", variant: "destructive" });
      }
    }
  };

  const saveEditPayout = async (offerId: string) => {
    const val = parseFloat(newPayout);
    if (isNaN(val) || val <= 0) return;
    await supabase.from("offers").update({ payout: val }).eq("id", offerId);
    setOffers((prev) => prev.map((o) => (o.id === offerId ? { ...o, payout: val } : o)));
    setEditingPayout(null); setNewPayout("");
  };

  const inviteReferrers = (offerId: string) => {
    const slug = business?.name ? toSlug(business.name) : null;
    const url = slug ? `${window.location.origin}/offer/${slug}/${offerId}` : `${window.location.origin}/offer/${offerId}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(offerId);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const totalPaid = referrals.filter(r => r.payout_status === "paid" || r.payout_status === "approved").reduce((s, r) => s + (r.payout_amount ?? 0), 0);
  const wonCount = referrals.filter(r => r.status === "won").length;
  const activeOffers = offers.filter(o => o.status === "active").length;
  const newRefs7d = referrals.filter(r => new Date(r.created_at) > new Date(Date.now() - 7 * 86400000)).length;
  const sym = currencySymbol(displayCurrency);

  const wb = walletBalance || { available: 0, reserved: 0, total_funded: 0, platform_fees: 0, paid_out: 0 };

  // Soft reserve: calculate committed from active offers
  const totalCommitted = offers
    .filter(o => o.status === "active")
    .reduce((sum, o) => sum + Math.round(Number(o.payout) * (1 + Number(o.platform_fee_rate ?? 0.25)) * 100) / 100, 0);
  const availableToCommit = Math.max(0, Math.round((Number(wb.available) - totalCommitted) * 100) / 100);

  const checklistItems = [
    { label: "Upload business logo", done: !!business?.logo_url, action: () => navigate("/dashboard/profile"), actionLabel: "Upload" },
    { label: "Create an offer", done: offers.length > 0, action: () => navigate("/dashboard/create-offer"), actionLabel: "Create" },
    { label: "Publish an offer", done: offers.some(o => o.status === "active"), action: undefined },
    { label: "Accept a referral", done: referrals.some(r => ["accepted", "contacted", "qualified", "won"].includes(r.status)), action: undefined },
    { label: "Close a deal", done: referrals.some(r => r.status === "won"), action: undefined },
  ];

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  }

  const isApproved = business?.account_status === "approved";
  const isSuspended = business?.account_status === "suspended";

  return (
    <div className="py-8">
      <div className="container max-w-6xl">
        <motion.div initial="hidden" animate="visible">
          {/* Suspended Banner */}
          {isSuspended && business && (
            <motion.div variants={fadeUp} custom={0} className="mb-6 rounded-xl border border-destructive/30 bg-destructive/5 p-5">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-bold text-destructive">Your account has been temporarily suspended</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Your offers are hidden from the marketplace. Contact support@revvin.co for details.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* T5: Low-wallet auto-pause banner */}
          {(() => {
            const autoPaused = offers.filter((o: any) => o.status === "paused" && o.paused_reason === "low_wallet");
            if (autoPaused.length === 0 || isSuspended) return null;
            return (
              <motion.div variants={fadeUp} custom={0.1} className="mb-6 rounded-xl border border-accent/40 bg-accent/5 p-5 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-accent-foreground shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-bold text-foreground">{autoPaused.length} offer{autoPaused.length > 1 ? "s" : ""} paused — wallet too low</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Top up your wallet to automatically reactivate paused offers. They'll go live again as soon as your balance covers the committed amount.
                  </p>
                </div>
              </motion.div>
            );
          })()}

          {/* Welcome banner for brand-new businesses with no offers yet */}
          {isApproved && business && offers.length === 0 && (
            <motion.div variants={fadeUp} custom={0} className="mb-6 rounded-xl border border-primary/30 bg-primary/5 p-5">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-bold text-foreground">You're in. Let's get your first offer live.</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Your account is active. Follow these steps to start receiving referrals:
                  </p>
                  <ol className="text-sm text-muted-foreground mt-3 space-y-1 list-decimal list-inside">
                    <li>Upload your business logo</li>
                    <li>Fund your wallet (minimum $50)</li>
                    <li>Create your first referral offer</li>
                    <li>Share your offer link</li>
                  </ol>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" className="gap-1.5" asChild>
                      <Link to="/dashboard/profile">Upload your logo</Link>
                    </Button>
                    <Button variant="outline" size="sm" className="gap-1.5" asChild>
                      <Link to="/dashboard/create-offer">Create your first offer</Link>
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Past Due Payment Banner */}
          {business?.subscription_status === "past_due" && (
            <motion.div variants={fadeUp} custom={0.2} className="mb-6 rounded-xl border border-destructive/40 bg-destructive/5 p-5 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-bold text-destructive">Payment Failed</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Your latest subscription payment failed. Please update your payment method to keep your plan benefits and avoid being downgraded to the Free tier.
                </p>
                <Button
                  size="sm"
                  variant="destructive"
                  className="mt-3 gap-1.5"
                  disabled={portalLoading}
                  onClick={handleManageSubscription}
                >
                  {portalLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                  Update Payment Method
                </Button>
              </div>
            </motion.div>
          )}

          {/* Plan Selection (shown during onboarding for new businesses with no offers) */}
          {isApproved && business && offers.length === 0 && (!business.pricing_tier || business.pricing_tier === "free") && (
            <motion.div variants={fadeUp} custom={0.5} className="mb-8 rounded-2xl border bg-card p-6 md:p-8">
              <PlanSelector
                businessId={business.id}
                currentTier={business.pricing_tier}
                onPlanSelected={(tier) => setBusiness((prev: any) => prev ? { ...prev, pricing_tier: tier } : prev)}
              />
            </motion.div>
          )}

          {/* Header */}
          <motion.div variants={fadeUp} custom={0} className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-foreground">{business?.name ?? "Your Business"}</h1>
                <Badge variant={business?.pricing_tier && business.pricing_tier !== "free" ? "default" : "secondary"} className="gap-1">
                  {(() => {
                    const tier = business?.pricing_tier || "free";
                    const labels: Record<string, { label: string; fee: string }> = {
                      free: { label: "Free", fee: "25%" },
                      starter: { label: "Starter", fee: "10%" },
                      pro: { label: "Pro", fee: "1%" },
                      enterprise: { label: "Enterprise", fee: "Custom" },
                    };
                    const info = labels[tier] || labels.free;
                    return tier !== "free" ? <><Crown className="h-3 w-3" /> {info.label} ({info.fee} fee)</> : <>{info.label} ({info.fee} fee)</>;
                  })()}
                </Badge>
              </div>
              <p className="text-muted-foreground mt-1">{activeOffers} active offer{activeOffers !== 1 ? "s" : ""} • {referrals.length} referrals</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" asChild className="gap-2 h-11">
                <Link to="/dashboard/profile"><Edit className="h-4 w-4" /> Edit Profile</Link>
              </Button>
              <Button asChild className="gap-2 h-11" disabled={isSuspended}>
                <Link to="/dashboard/create-offer"><PlusCircle className="h-4 w-4" /> Create Offer</Link>
              </Button>
            </div>
          </motion.div>

          <DashboardChecklist title="Getting Started" items={checklistItems} />

          {/* Stats */}
          <motion.div variants={fadeUp} custom={1} className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Active Offers", value: activeOffers.toString(), icon: Building2, color: "text-primary", bgColor: "bg-primary/10" },
              { label: "New Referrals (7d)", value: newRefs7d.toString(), icon: Users, color: "text-primary", bgColor: "bg-primary/10" },
              { label: "Deals Closed", value: wonCount.toString(), icon: CheckCircle2, color: "text-earnings", bgColor: "bg-earnings/10" },
              { label: "Total Paid Out", value: `${sym}${totalPaid.toLocaleString()}`, icon: DollarSign, color: "text-earnings", bgColor: "bg-earnings/10" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className={`rounded-xl p-2 ${s.bgColor}`}><s.icon className={`h-4 w-4 ${s.color}`} /></div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">{s.label}</p>
                    <p className="text-xl font-bold text-foreground">{s.value}</p>
                  </div>
                </div>
              </div>
            ))}
          </motion.div>

          {/* Subscription Management */}
          {business?.pricing_tier === "free" ? (
            <motion.div variants={fadeUp} custom={1.3} className="mb-8">
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-xl bg-primary/10 p-2.5">
                      <Zap className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground">Upgrade to Starter — $50/mo</h3>
                      <p className="text-sm text-muted-foreground mt-1">Reduce your platform fee from 25% to 10% on every referral payout.</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Breakeven at ~3 closed referrals per month.</p>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button variant="outline" onClick={() => setShowPlanSelector(!showPlanSelector)} className="gap-2">
                      <Target className="h-4 w-4" /> View Plans
                    </Button>
                    <Button onClick={handleUpgrade} disabled={upgradeLoading} className="gap-2">
                      {upgradeLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Processing...</> : <><Crown className="h-4 w-4" /> Upgrade Now</>}
                    </Button>
                  </div>
                </div>
              </div>
              {showPlanSelector && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mt-4 rounded-2xl border bg-card p-6 md:p-8 overflow-visible">
                  <PlanSelector
                    businessId={business.id}
                    currentTier={business.pricing_tier}
                    onPlanSelected={(tier) => {
                      setBusiness((prev: any) => prev ? { ...prev, pricing_tier: tier } : prev);
                      setShowPlanSelector(false);
                    }}
                  />
                </motion.div>
              )}
            </motion.div>
          ) : (
            <motion.div variants={fadeUp} custom={1.3} className="mb-8">
              <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-xl bg-primary/10 p-2.5">
                      <Crown className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground">
                        {(() => {
                          const tier = business?.pricing_tier || "free";
                          const labels: Record<string, string> = { starter: "Starter", pro: "Pro", enterprise: "Enterprise" };
                          const prices: Record<string, string> = { starter: "$50", pro: "$250", enterprise: "$500" };
                          return `${labels[tier] || tier} Plan — ${prices[tier] || ""}/mo`;
                        })()}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {(() => {
                          const fees: Record<string, string> = { starter: "10%", pro: "1%", enterprise: "Custom" };
                          return `${fees[business?.pricing_tier] || "25%"} platform fee on referral payouts`;
                        })()}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button variant="outline" onClick={() => setShowPlanSelector(!showPlanSelector)} className="gap-2">
                      <Target className="h-4 w-4" /> Change Plan
                    </Button>
                    <Button variant="outline" onClick={handleManageSubscription} disabled={portalLoading} className="gap-2">
                      {portalLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Loading...</> : <><CreditCard className="h-4 w-4" /> Manage Billing</>}
                    </Button>
                  </div>
                </div>
              </div>
              {showPlanSelector && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mt-4 rounded-2xl border bg-card p-6 md:p-8 overflow-visible">
                  <PlanSelector
                    businessId={business.id}
                    currentTier={business.pricing_tier}
                    onPlanSelected={(tier) => {
                      setBusiness((prev: any) => prev ? { ...prev, pricing_tier: tier } : prev);
                      setShowPlanSelector(false);
                    }}
                  />
                </motion.div>
              )}
            </motion.div>
          )}

          {/* Wallet Section */}
          <motion.div variants={fadeUp} custom={1.5} className="mb-8">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Wallet className="h-5 w-5" /> Wallet</h2>
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-6">
                {[
                  { label: "Balance", value: `$${Number(wb.available).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, color: "text-earnings" },
                  { label: "Committed", value: `$${totalCommitted.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, color: "text-primary", tooltip: "This is the total amount your active offers could pay out. Your wallet balance needs to stay above this amount. When a referral closes, the payout + platform fee is deducted from your balance." },
                  { label: "Available to Commit", value: `$${availableToCommit.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, color: "text-foreground" },
                  { label: "Total Paid Out", value: `$${Number(wb.paid_out).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, color: "text-muted-foreground" },
                ].map((item: any) => (
                  <div key={item.label} className="rounded-xl bg-muted/30 border border-border p-4 text-center relative group">
                    <p className="text-xs text-muted-foreground font-medium flex items-center justify-center gap-1">
                      {item.label}
                      {item.tooltip && <Info className="h-3 w-3 text-muted-foreground/60 cursor-help" />}
                    </p>
                    <p className={`text-xl font-bold ${item.color}`}>{item.value}</p>
                    {item.tooltip && (
                      <div className="absolute z-10 hidden group-hover:block bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 rounded-lg bg-popover border border-border shadow-lg text-xs text-popover-foreground">
                        {item.tooltip}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Top Up */}
              <div className="border-t border-border pt-4">
                <p className="text-sm font-medium mb-3">Top Up Wallet</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {SUGGESTED_AMOUNTS.map((amt) => (
                    <Button
                      key={amt}
                      type="button"
                      variant={topUpAmount === amt ? "default" : "outline"}
                      size="sm"
                      onClick={() => { setTopUpAmount(amt); setCustomAmount(""); }}
                    >
                      ${amt}
                    </Button>
                  ))}
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      placeholder="Custom"
                      value={customAmount}
                      onChange={(e) => { setCustomAmount(e.target.value); setTopUpAmount(null); }}
                      className="h-9 w-24 text-sm"
                      min={50}
                    />
                  </div>
                </div>
                <Button onClick={handleTopUp} disabled={topUpLoading} className="gap-2">
                  {topUpLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Processing...</> : <><CreditCard className="h-4 w-4" /> Fund Wallet</>}
                </Button>
                <p className="text-xs text-muted-foreground mt-2">Minimum top-up: $50. Payments processed via Stripe.</p>
              </div>

              {/* Recent Transactions */}
              {walletTransactions.length > 0 && (
                <div className="border-t border-border pt-4 mt-4">
                  <p className="text-sm font-medium mb-3">Recent Transactions</p>
                  <div className="space-y-2">
                    {walletTransactions.map((tx) => {
                      const txMeta = txTypeLabels[tx.type] || { label: tx.type, color: "text-foreground" };
                      return (
                        <div key={tx.id} className="flex items-center justify-between text-sm py-1.5 border-b border-border last:border-0">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={`text-xs ${txMeta.color}`}>{txMeta.label}</Badge>
                            <span className="text-muted-foreground text-xs truncate max-w-[200px]">{tx.description}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`font-medium ${["topup", "refund"].includes(tx.type) ? "text-earnings" : "text-foreground"}`}>
                              {["topup", "refund"].includes(tx.type) ? "+" : "-"}${Number(tx.amount).toFixed(2)}
                            </span>
                            <span className="text-xs text-muted-foreground">{new Date(tx.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* Offers */}
          <motion.div variants={fadeUp} custom={2} className="mb-8">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">Your Offers</h2>
              {isApproved && <Button variant="ghost" size="sm" className="gap-1" asChild><Link to="/dashboard/create-offer">Add Offer <PlusCircle className="h-4 w-4" /></Link></Button>}
            </div>
            {offers.length === 0 ? (
              <div className="rounded-xl border border-border bg-card py-14 text-center shadow-sm">
                <Building2 className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
                <p className="text-lg font-semibold">No offers yet</p>
                <p className="mt-1 text-sm text-muted-foreground">Create your first referral offer to start receiving leads</p>
                <Button asChild className="mt-5"><Link to="/dashboard/create-offer">Create Offer</Link></Button>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {offers.map((offer: any) => {
                  const offerRefs = referrals.filter(r => r.offer_id === offer.id);
                  const offerWon = offerRefs.filter(r => r.status === "won").length;
                  return (
                    <div key={offer.id} className="rounded-xl border border-border bg-card p-5 shadow-sm">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="font-bold text-foreground">{offer.title}</h3>
                        {(() => {
                          // T5: surface auto-paused state distinctly
                          if (offer.status === "active") return <Badge className="bg-primary/10 text-primary border-0">Live</Badge>;
                          if (offer.status === "paused" && offer.paused_reason === "low_wallet") return <Badge className="bg-accent/10 text-accent-foreground border-0">Paused — Low Balance</Badge>;
                          if (offer.status === "paused") return <Badge variant="secondary">Paused by You</Badge>;
                          if (offer.status === "draft") return <Badge variant="secondary">Draft</Badge>;
                          return <Badge variant="secondary">{offer.status}</Badge>;
                        })()}
                      </div>
                      <div className="flex items-center justify-between mb-3">
                        {editingPayout === offer.id ? (
                          <div className="flex items-center gap-1">
                            <Input type="number" value={newPayout} onChange={(e) => setNewPayout(e.target.value)} className="h-7 w-20 text-xs" placeholder={String(offer.payout)} />
                            <Button size="sm" className="h-7 text-xs px-2" onClick={() => saveEditPayout(offer.id)}>Save</Button>
                            <Button size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={() => setEditingPayout(null)}><X className="h-3 w-3" /></Button>
                          </div>
                        ) : (
                          <span className="rounded-full bg-primary/10 text-primary px-3 py-0.5 text-xs font-bold">${offer.payout}</span>
                        )}
                        <span className="text-xs text-muted-foreground">{offer.category}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mb-3">{offerRefs.length} refs • {offerWon} won</div>
                      <div className="flex items-center gap-2 pt-3 border-t border-border flex-wrap">
                        <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => toggleOfferStatus(offer.id, offer.status)}>
                          {offer.status === "active" ? <><Pause className="h-3 w-3" /> Pause</> : <><Play className="h-3 w-3" /> Activate</>}
                        </Button>
                        <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => { setEditingPayout(offer.id); setNewPayout(String(offer.payout)); }}>
                          <Edit className="h-3 w-3" /> Edit Payout
                        </Button>
                        <Button variant="ghost" size="sm" className="gap-1 text-xs" asChild>
                          <Link to={`/dashboard/edit-offer/${offer.id}`}><Edit className="h-3 w-3" /> Edit Offer</Link>
                        </Button>
                        <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => inviteReferrers(offer.id)}>
                          {copiedLink === offer.id ? <><Check className="h-3 w-3" /> Copied!</> : <><Link2 className="h-3 w-3" /> Invite Referrers</>}
                        </Button>
                      </div>
                      {/* QR Code Section */}
                      {offer.status === "active" ? (
                        <Collapsible>
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="sm" className="gap-1 text-xs mt-3 w-full justify-center">
                              <QrCode className="h-3 w-3" /> QR Code
                            </Button>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="mt-3">
                            <OfferQRCode
                              offerId={offer.id}
                              businessName={business?.name ?? "Business"}
                              offerTitle={offer.title}
                              payoutAmount={offer.payout}
                              payoutCurrency={displayCurrency}
                            />
                          </CollapsibleContent>
                        </Collapsible>
                      ) : (
                        <p className="text-xs text-muted-foreground mt-3 text-center">Publish your offer to get your shareable QR code and referral link.</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>

          {/* Referrals Inbox */}
          <motion.div variants={fadeUp} custom={3}>
            <h2 className="text-lg font-bold mb-4">Referrals Inbox</h2>
            {referrals.length === 0 ? (
              <div className="rounded-xl border border-border bg-card py-14 text-center shadow-sm">
                <Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
                <p className="text-lg font-semibold">No referrals yet</p>
                <p className="mt-1 text-sm text-muted-foreground">Referrals will appear here once referrers submit leads</p>
              </div>
            ) : (
              <div className="space-y-3">
                {referrals.map((ref: any) => {
                  const sc = statusConfig[ref.status] ?? statusConfig.submitted;
                  return (
                    <div key={ref.id} className="rounded-xl border border-border bg-card p-5 shadow-sm">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex-1">
                          <p className="font-semibold text-foreground">{ref.customer_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {ref.customer_email && <span>{ref.customer_email} • </span>}{ref.offers?.title}
                          </p>
                          {ref.notes && <p className="mt-1.5 text-sm text-muted-foreground italic bg-muted/50 rounded-lg p-2">"{ref.notes}"</p>}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={`${sc.bg} ${sc.text} border-0`}>{sc.label}</Badge>
                          {ref.status === "submitted" && (
                            <>
                              <Button size="sm" onClick={() => handleAccept(ref)} className="gap-1"><CheckCircle2 className="h-3 w-3" /> Accept</Button>
                              <Button size="sm" variant="destructive" onClick={() => handleDecline(ref)} className="gap-1"><XCircle className="h-3 w-3" /> Decline</Button>
                            </>
                          )}
                          {ref.status === "accepted" && (
                            <>
                              <Button size="sm" variant="outline" onClick={() => updateReferralStatus(ref.id, "contacted")} className="gap-1"><Eye className="h-3 w-3" /> Contacted</Button>
                              <Button size="sm" onClick={() => handleWon(ref)} className="gap-1"><CheckCircle2 className="h-3 w-3" /> Closed/Won</Button>
                              <Button size="sm" variant="destructive" onClick={() => handleLost(ref)} className="gap-1"><XCircle className="h-3 w-3" /> Lost</Button>
                            </>
                          )}
                          {ref.status === "contacted" && (
                            <>
                              <Button size="sm" variant="outline" onClick={() => updateReferralStatus(ref.id, "qualified")} className="gap-1"><Target className="h-3 w-3" /> Qualified</Button>
                              <Button size="sm" onClick={() => handleWon(ref)} className="gap-1"><CheckCircle2 className="h-3 w-3" /> Closed/Won</Button>
                              <Button size="sm" variant="destructive" onClick={() => handleLost(ref)} className="gap-1"><XCircle className="h-3 w-3" /> Lost</Button>
                            </>
                          )}
                          {ref.status === "qualified" && (
                            <>
                              <Button size="sm" onClick={() => handleWon(ref)} className="gap-1"><CheckCircle2 className="h-3 w-3" /> Closed/Won</Button>
                              <Button size="sm" variant="destructive" onClick={() => handleLost(ref)} className="gap-1"><XCircle className="h-3 w-3" /> Lost</Button>
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
