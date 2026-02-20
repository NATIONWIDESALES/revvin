import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useWallet } from "@/contexts/WalletContext";
import { useCountry } from "@/contexts/CountryContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DollarSign, Users, TrendingUp, PlusCircle, ArrowRight,
  CheckCircle2, XCircle, Clock, Eye, BarChart3, Building2, Shield,
  Pause, Play, Edit, Target, Link2, Check, AlertTriangle,
  Wallet, ShieldCheck, ArrowUpRight, ArrowDownLeft, RefreshCw, CreditCard
} from "lucide-react";
import { motion } from "framer-motion";
import OfferCompetitiveness from "@/components/OfferCompetitiveness";
import DashboardChecklist from "@/components/DashboardChecklist";
import AddFundsModal from "@/components/AddFundsModal";
import { useToast } from "@/hooks/use-toast";

const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
  submitted: { bg: "bg-muted", text: "text-muted-foreground", label: "Submitted" },
  accepted: { bg: "bg-primary/10", text: "text-primary", label: "Accepted (Reserved)" },
  contacted: { bg: "bg-blue-50", text: "text-blue-700", label: "Contacted" },
  in_progress: { bg: "bg-accent/10", text: "text-accent-foreground", label: "In Progress" },
  qualified: { bg: "bg-primary/10", text: "text-primary", label: "Qualified" },
  won: { bg: "bg-earnings/10", text: "text-earnings", label: "Closed/Won (Paid)" },
  lost: { bg: "bg-destructive/10", text: "text-destructive", label: "Lost" },
  declined: { bg: "bg-muted", text: "text-muted-foreground", label: "Declined" },
  paid: { bg: "bg-earnings/10", text: "text-earnings", label: "Paid" },
  duplicate: { bg: "bg-muted", text: "text-muted-foreground", label: "Duplicate" },
};

const txTypeConfig: Record<string, { icon: any; color: string; sign: string }> = {
  topup: { icon: ArrowDownLeft, color: "text-earnings", sign: "+" },
  reserve: { icon: ShieldCheck, color: "text-primary", sign: "-" },
  payout: { icon: ArrowUpRight, color: "text-destructive", sign: "-" },
  refund: { icon: RefreshCw, color: "text-earnings", sign: "+" },
  release: { icon: RefreshCw, color: "text-earnings", sign: "+" },
  fee: { icon: CreditCard, color: "text-muted-foreground", sign: "-" },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.5 } }),
};

const BusinessDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { wallet, addFunds, reserveFunds, releasePayout, refundReserve, canCoverPayout } = useWallet();
  const { displayCurrency, currencySymbol } = useCountry();
  const { toast } = useToast();
  const [business, setBusiness] = useState<any>(null);
  const [offers, setOffers] = useState<any[]>([]);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPayout, setEditingPayout] = useState<string | null>(null);
  const [newPayout, setNewPayout] = useState("");
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [showAddFunds, setShowAddFunds] = useState(false);

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

  const handleAccept = async (ref: any) => {
    const payoutAmt = ref.offers?.payout_type === "flat" ? Number(ref.offers.payout) : 0;
    if (payoutAmt > 0 && !canCoverPayout(payoutAmt)) {
      toast({ title: "Insufficient funds", description: `You need $${payoutAmt} available. Add funds to your wallet.`, variant: "destructive" });
      return;
    }
    if (payoutAmt > 0) reserveFunds(payoutAmt, ref.id, `Reserved $${payoutAmt} for ${ref.customer_name}`);
    await supabase.from("referrals").update({ status: "accepted" }).eq("id", ref.id);
    setReferrals((prev) => prev.map((r) => (r.id === ref.id ? { ...r, status: "accepted" } : r)));
    toast({ title: "Referral accepted", description: `$${payoutAmt} reserved in escrow.` });
  };

  const handleDecline = async (ref: any) => {
    await supabase.from("referrals").update({ status: "declined" }).eq("id", ref.id);
    setReferrals((prev) => prev.map((r) => (r.id === ref.id ? { ...r, status: "declined" } : r)));
    toast({ title: "Referral declined" });
  };

  const handleWon = async (ref: any) => {
    const payoutAmt = ref.offers?.payout_type === "flat" ? Number(ref.offers.payout) : 0;
    const referrerPayout = Math.round(payoutAmt * 0.9);
    if (payoutAmt > 0) releasePayout(payoutAmt, ref.id, `Payout released: $${referrerPayout} to referrer`);
    await supabase.from("referrals").update({ status: "won", payout_amount: referrerPayout, payout_status: "approved" }).eq("id", ref.id);
    setReferrals((prev) => prev.map((r) => (r.id === ref.id ? { ...r, status: "won", payout_amount: referrerPayout, payout_status: "approved" } : r)));
    toast({ title: "Deal closed!", description: `$${referrerPayout} released to referrer. $${payoutAmt - referrerPayout} platform fee.` });
  };

  const handleLost = async (ref: any) => {
    const payoutAmt = ref.offers?.payout_type === "flat" ? Number(ref.offers.payout) : 0;
    if (["accepted", "contacted", "qualified"].includes(ref.status) && payoutAmt > 0) {
      refundReserve(payoutAmt, ref.id, `Reserve released: ${ref.customer_name} (deal lost)`);
    }
    await supabase.from("referrals").update({ status: "lost" }).eq("id", ref.id);
    setReferrals((prev) => prev.map((r) => (r.id === ref.id ? { ...r, status: "lost" } : r)));
    toast({ title: "Marked as lost", description: ["accepted", "contacted", "qualified"].includes(ref.status) ? "Escrowed funds returned." : undefined });
  };

  const updateReferralStatus = async (id: string, status: string) => {
    await supabase.from("referrals").update({ status }).eq("id", id);
    setReferrals((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
  };

  const toggleOfferStatus = async (offerId: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "paused" : "active";
    await supabase.from("offers").update({ status: newStatus }).eq("id", offerId);
    setOffers((prev) => prev.map((o) => (o.id === offerId ? { ...o, status: newStatus } : o)));
  };

  const saveEditPayout = async (offerId: string) => {
    const val = parseFloat(newPayout);
    if (isNaN(val) || val <= 0) return;
    await supabase.from("offers").update({ payout: val }).eq("id", offerId);
    setOffers((prev) => prev.map((o) => (o.id === offerId ? { ...o, payout: val } : o)));
    setEditingPayout(null); setNewPayout("");
  };

  const inviteReferrers = (offerId: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/offer/${offerId}`);
    setCopiedLink(offerId);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const totalPaid = referrals.filter(r => r.payout_status === "paid" || r.payout_status === "approved").reduce((s, r) => s + (r.payout_amount ?? 0), 0);
  const wonCount = referrals.filter(r => r.status === "won").length;
  const conversionRate = referrals.length > 0 ? Math.round((wonCount / referrals.length) * 100) : 0;
  const activeOffers = offers.filter(o => o.status === "active").length;
  const avgAcquisitionCost = wonCount > 0 ? Math.round(totalPaid / wonCount) : 0;
  const newRefs7d = referrals.filter(r => new Date(r.created_at) > new Date(Date.now() - 7 * 86400000)).length;
  const sym = currencySymbol(displayCurrency);

  // Checklist items
  const checklistItems = [
    { label: "Fund your wallet", done: wallet.totalFunded > 0, action: () => setShowAddFunds(true), actionLabel: "Add funds" },
    { label: "Create an offer", done: offers.length > 0, action: () => navigate("/dashboard/create-offer"), actionLabel: "Create" },
    { label: "Publish an offer", done: offers.some(o => o.status === "active"), action: undefined },
    { label: "Accept a referral (reserve funds)", done: referrals.some(r => ["accepted", "contacted", "qualified", "won"].includes(r.status)), action: undefined },
    { label: "Mark closed & release payout", done: referrals.some(r => r.status === "won"), action: undefined },
  ];

  const handleDemoMode = () => {
    addFunds(5000, displayCurrency);
    toast({ title: "🎮 Demo Mode", description: "Added $5,000 to your wallet. Create an offer to continue the demo." });
  };

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  }

  return (
    <div className="py-8">
      <div className="container max-w-6xl">
        <motion.div initial="hidden" animate="visible">
          {/* Header */}
          <motion.div variants={fadeUp} custom={0} className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="font-display text-3xl font-bold text-foreground">Acquisition Dashboard</h1>
                <Badge variant="secondary" className="gap-1"><Shield className="h-3 w-3" /> Verified</Badge>
              </div>
              <p className="text-muted-foreground">{business?.name ?? "Your Business"} • {activeOffers} active offer{activeOffers !== 1 ? "s" : ""} • {displayCurrency}</p>
            </div>
            <Button asChild className="gap-2 h-11">
              <Link to="/dashboard/create-offer"><PlusCircle className="h-4 w-4" /> Create Offer</Link>
            </Button>
          </motion.div>

          {/* Checklist */}
          <DashboardChecklist title="Start Here — Business Setup" items={checklistItems} onDemoMode={handleDemoMode} />

          {/* WALLET */}
          <motion.div variants={fadeUp} custom={0.5} className="mb-8 rounded-2xl border-2 border-primary/20 bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display text-lg font-bold flex items-center gap-2">
                <Wallet className="h-5 w-5 text-primary" /> Revvin Wallet — {displayCurrency}
              </h2>
              <Button size="sm" onClick={() => setShowAddFunds(true)} className="gap-1">
                <PlusCircle className="h-3.5 w-3.5" /> Add Funds
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-5">
              <div className="rounded-xl border border-earnings/20 bg-earnings/5 p-4 text-center">
                <p className="text-[10px] text-muted-foreground font-medium mb-1">Available</p>
                <p className="font-display text-2xl font-bold text-earnings">{sym}{wallet.available.toLocaleString()}</p>
              </div>
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-center">
                <p className="text-[10px] text-muted-foreground font-medium mb-1">Reserved (Escrow)</p>
                <p className="font-display text-2xl font-bold text-primary">{sym}{wallet.reserved.toLocaleString()}</p>
              </div>
              <div className="rounded-xl border border-border bg-muted/30 p-4 text-center">
                <p className="text-[10px] text-muted-foreground font-medium mb-1">Paid Out</p>
                <p className="font-display text-2xl font-bold text-foreground">{sym}{wallet.paidOut.toLocaleString()}</p>
              </div>
              <div className="rounded-xl border border-border bg-muted/30 p-4 text-center">
                <p className="text-[10px] text-muted-foreground font-medium mb-1">Platform Fees</p>
                <p className="font-display text-2xl font-bold text-muted-foreground">{sym}{wallet.platformFees.toLocaleString()}</p>
              </div>
            </div>
            {/* Transaction Log */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Transaction Ledger</p>
              <div className="max-h-48 overflow-y-auto space-y-1.5">
                {wallet.transactions.slice(0, 12).map((tx) => {
                  const cfg = txTypeConfig[tx.type] ?? txTypeConfig.topup;
                  const Icon = cfg.icon;
                  return (
                    <div key={tx.id} className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2 text-xs">
                      <div className="flex items-center gap-2">
                        <Icon className={`h-3.5 w-3.5 ${cfg.color}`} />
                        <span className="text-muted-foreground">{tx.description}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground">{new Date(tx.date).toLocaleDateString()}</span>
                        <span className={`font-mono font-medium ${cfg.color}`}>{cfg.sign}{sym}{tx.amount}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div variants={fadeUp} custom={1} className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Active Offers", value: activeOffers.toString(), icon: Building2, color: "text-primary", bgColor: "bg-primary/10" },
              { label: "New Referrals (7d)", value: newRefs7d.toString(), icon: Users, color: "text-primary", bgColor: "bg-primary/10" },
              { label: "Deals Closed", value: wonCount.toString(), icon: CheckCircle2, color: "text-earnings", bgColor: "bg-earnings/10" },
              { label: "Conversion Rate", value: `${conversionRate}%`, icon: TrendingUp, color: "text-accent-foreground", bgColor: "bg-accent/10" },
              { label: "Cost per Close", value: wonCount > 0 ? `${sym}${avgAcquisitionCost}` : "—", icon: Target, color: "text-primary", bgColor: "bg-primary/10" },
              { label: "Total Paid Out", value: `${sym}${totalPaid.toLocaleString()}`, icon: DollarSign, color: "text-earnings", bgColor: "bg-earnings/10" },
              { label: "Revenue Influenced", value: wonCount > 0 ? `${sym}${(wonCount * 15000).toLocaleString()}` : "—", icon: BarChart3, color: "text-earnings", bgColor: "bg-earnings/10" },
              { label: "Avg Time-to-Close", value: "~18 days", icon: Clock, color: "text-muted-foreground", bgColor: "bg-muted" },
            ].map((s) => (
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

          {/* Competitiveness */}
          <motion.div variants={fadeUp} custom={1.5} className="mb-8 grid gap-4 md:grid-cols-2">
            <OfferCompetitiveness score={conversionRate > 50 ? 78 : 55} label={conversionRate > 50 ? "Strong" : "Competitive"} />
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-sm font-medium mb-3">Improve Ranking</p>
              <ul className="space-y-2">
                <li className="flex items-start gap-2 text-xs text-muted-foreground"><TrendingUp className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" /> Increase payout to attract more referrers</li>
                <li className="flex items-start gap-2 text-xs text-muted-foreground"><Clock className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" /> Shorten payout timeline to Net 7</li>
                <li className="flex items-start gap-2 text-xs text-muted-foreground"><Wallet className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" /> Add funds to enable "Funds Secured" badge</li>
              </ul>
            </div>
          </motion.div>

          {/* Offers */}
          <motion.div variants={fadeUp} custom={2} className="mb-8">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold">Your Offers</h2>
              <Button variant="ghost" size="sm" className="gap-1" asChild><Link to="/dashboard/create-offer">Add Offer <PlusCircle className="h-4 w-4" /></Link></Button>
            </div>
            {offers.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card py-14 text-center shadow-sm">
                <Building2 className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
                <p className="font-display text-lg font-semibold">No offers yet</p>
                <p className="mt-1 text-sm text-muted-foreground">Create your first referral offer to start receiving leads</p>
                <Button asChild className="mt-5"><Link to="/dashboard/create-offer">Create Offer</Link></Button>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {offers.map((offer: any) => {
                  const offerRefs = referrals.filter(r => r.offer_id === offer.id);
                  const offerWon = offerRefs.filter(r => r.status === "won").length;
                  const canFund = offer.payout_type === "flat" && canCoverPayout(Number(offer.payout));
                  return (
                    <div key={offer.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="font-display font-bold text-foreground">{offer.title}</h3>
                        <div className="flex items-center gap-1.5">
                          {canFund && offer.status === "active" && <Badge variant="outline" className="text-[10px] gap-0.5 border-primary/30 text-primary"><ShieldCheck className="h-3 w-3" /> Funds Secured</Badge>}
                          <Badge variant={offer.status === "active" ? "default" : "secondary"}>{offer.status}</Badge>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mb-3">
                        {editingPayout === offer.id ? (
                          <div className="flex items-center gap-1">
                            <Input type="number" value={newPayout} onChange={(e) => setNewPayout(e.target.value)} className="h-7 w-20 text-xs" placeholder={String(offer.payout)} />
                            <Button size="sm" className="h-7 text-xs px-2" onClick={() => saveEditPayout(offer.id)}>Save</Button>
                            <Button size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={() => setEditingPayout(null)}>✕</Button>
                          </div>
                        ) : (
                          <span className="earnings-badge rounded-full px-3 py-0.5 text-xs font-bold">{offer.payout_type === "flat" ? `${sym}${offer.payout}` : `${offer.payout}%`}</span>
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
                        <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => inviteReferrers(offer.id)}>
                          {copiedLink === offer.id ? <><Check className="h-3 w-3" /> Copied!</> : <><Link2 className="h-3 w-3" /> Invite Referrers</>}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>

          {/* Referrals Inbox */}
          <motion.div variants={fadeUp} custom={3}>
            <h2 className="font-display text-lg font-bold mb-4">Referrals Inbox</h2>
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
                            {ref.customer_email && <span>{ref.customer_email} • </span>}{ref.offers?.title}
                          </p>
                          {ref.notes && <p className="mt-1.5 text-sm text-muted-foreground italic bg-muted/50 rounded-lg p-2">"{ref.notes}"</p>}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={`${sc.bg} ${sc.text} border-0`}>{sc.label}</Badge>
                          {ref.status === "submitted" && (
                            <>
                              <Button size="sm" onClick={() => handleAccept(ref)} className="gap-1"><ShieldCheck className="h-3 w-3" /> Accept & Reserve</Button>
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
      <AddFundsModal open={showAddFunds} onClose={() => setShowAddFunds(false)} />
    </div>
  );
};

export default BusinessDashboard;
