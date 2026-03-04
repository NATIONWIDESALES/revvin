import { useState, useEffect } from "react";
import { toSlug } from "@/lib/utils";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCountry } from "@/contexts/CountryContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DollarSign, Users, PlusCircle,
  CheckCircle2, XCircle, Clock, Eye, Building2,
  Pause, Play, Edit, Target, Link2, Check, X
} from "lucide-react";
import { motion } from "framer-motion";
import DashboardChecklist from "@/components/DashboardChecklist";
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

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.5 } }),
};

const BusinessDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { currencySymbol, displayCurrency } = useCountry();
  const { toast } = useToast();
  const [business, setBusiness] = useState<any>(null);
  const [offers, setOffers] = useState<any[]>([]);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPayout, setEditingPayout] = useState<string | null>(null);
  const [newPayout, setNewPayout] = useState("");
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

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
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const handleAccept = async (ref: any) => {
    const payoutAmt = ref.offers?.payout_type === "flat" ? Number(ref.offers.payout) : 0;
    await supabase.from("referrals").update({ status: "accepted", payout_snapshot: payoutAmt, payout_type_snapshot: ref.offers?.payout_type ?? "flat" }).eq("id", ref.id);
    setReferrals((prev) => prev.map((r) => (r.id === ref.id ? { ...r, status: "accepted" } : r)));
    toast({ title: "Referral accepted", description: `Payout of $${payoutAmt} locked for this referral.` });
    if (user) {
      supabase.rpc("fn_create_audit_entry", { p_referral_id: ref.id, p_actor_id: user.id, p_event_type: "referral_accepted", p_payload: { payout: payoutAmt } });
      supabase.rpc("fn_create_notification", { p_user_id: ref.referrer_id, p_title: "Referral accepted!", p_body: `Your referral for "${ref.offers?.title}" has been accepted.`, p_type: "referral_accepted", p_referral_id: ref.id });
    }
  };

  const handleDecline = async (ref: any) => {
    await supabase.from("referrals").update({ status: "declined" }).eq("id", ref.id);
    setReferrals((prev) => prev.map((r) => (r.id === ref.id ? { ...r, status: "declined" } : r)));
    toast({ title: "Referral declined" });
    if (user) {
      supabase.rpc("fn_create_audit_entry", { p_referral_id: ref.id, p_actor_id: user.id, p_event_type: "referral_declined" });
      supabase.rpc("fn_create_notification", { p_user_id: ref.referrer_id, p_title: "Referral declined", p_body: `Your referral for "${ref.offers?.title}" was declined.`, p_type: "referral_declined", p_referral_id: ref.id });
    }
  };

  const handleWon = async (ref: any) => {
    const payoutAmt = ref.payout_snapshot ?? (ref.offers?.payout_type === "flat" ? Number(ref.offers.payout) : 0);
    const referrerPayout = Math.round(payoutAmt * 0.9);
    const platformFee = payoutAmt - referrerPayout;
    await supabase.from("referrals").update({ status: "won", payout_amount: referrerPayout, payout_status: "approved" }).eq("id", ref.id);
    await supabase.from("payouts").insert({ referral_id: ref.id, business_id: ref.business_id, referrer_id: ref.referrer_id, amount: referrerPayout, platform_fee: platformFee, status: "ready" });
    setReferrals((prev) => prev.map((r) => (r.id === ref.id ? { ...r, status: "won", payout_amount: referrerPayout, payout_status: "approved" } : r)));
    toast({ title: "Deal closed!", description: `Payout created for referrer.` });
    if (user) {
      supabase.rpc("fn_create_audit_entry", { p_referral_id: ref.id, p_actor_id: user.id, p_event_type: "referral_won", p_payload: { payout: referrerPayout, fee: platformFee } });
      supabase.rpc("fn_create_notification", { p_user_id: ref.referrer_id, p_title: "Deal closed — payout coming!", p_body: `Your referral for "${ref.offers?.title}" closed. Payout is being processed.`, p_type: "referral_won", p_referral_id: ref.id });
    }
  };

  const handleLost = async (ref: any) => {
    await supabase.from("referrals").update({ status: "lost" }).eq("id", ref.id);
    setReferrals((prev) => prev.map((r) => (r.id === ref.id ? { ...r, status: "lost" } : r)));
    toast({ title: "Marked as lost" });
    if (user) {
      supabase.rpc("fn_create_audit_entry", { p_referral_id: ref.id, p_actor_id: user.id, p_event_type: "referral_lost" });
      supabase.rpc("fn_create_notification", { p_user_id: ref.referrer_id, p_title: "Referral lost", p_body: `Your referral for "${ref.offers?.title}" was marked as lost.`, p_type: "referral_lost", p_referral_id: ref.id });
    }
  };

  const updateReferralStatus = async (id: string, status: string) => {
    await supabase.from("referrals").update({ status }).eq("id", id);
    setReferrals((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
  };

  const toggleOfferStatus = async (offerId: string, currentStatus: string) => {
    const offer = offers.find(o => o.id === offerId);
    if (currentStatus !== "active" && offer?.deposit_status === "required") {
      toast({ title: "Deposit required", description: "You must pay the deposit before activating this offer.", variant: "destructive" });
      return;
    }
    if (currentStatus !== "active" && offer?.deposit_status === "pending") {
      toast({ title: "Deposit pending", description: "Your deposit payment is still processing.", variant: "destructive" });
      return;
    }
    const newStatus = currentStatus === "active" ? "paused" : "active";
    await supabase.from("offers").update({ status: newStatus }).eq("id", offerId);
    setOffers((prev) => prev.map((o) => (o.id === offerId ? { ...o, status: newStatus } : o)));
  };

  const handlePayDeposit = async (offerId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("create-deposit-session", {
        body: { offer_id: offerId },
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to create payment session", variant: "destructive" });
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

  return (
    <div className="py-8">
      <div className="container max-w-6xl">
        <motion.div initial="hidden" animate="visible">
          {/* Pending Approval Banner */}
          {!isApproved && business && (
            <motion.div variants={fadeUp} custom={0} className="mb-6 rounded-xl border border-accent/30 bg-accent/5 p-5 flex items-start gap-3">
              <Clock className="h-5 w-5 text-accent-foreground shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-foreground">Account Pending Approval</h3>
                <p className="text-sm text-muted-foreground mt-1">Your business account is under review. You'll be able to create offers once an admin approves your account.</p>
              </div>
            </motion.div>
          )}

          {/* Header */}
          <motion.div variants={fadeUp} custom={0} className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">{business?.name ?? "Your Business"}</h1>
              <p className="text-muted-foreground mt-1">{activeOffers} active offer{activeOffers !== 1 ? "s" : ""} • {referrals.length} referrals</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" asChild className="gap-2 h-11">
                <Link to="/dashboard/profile"><Edit className="h-4 w-4" /> Edit Profile</Link>
              </Button>
              {isApproved && (
                <Button asChild className="gap-2 h-11">
                  <Link to="/dashboard/create-offer"><PlusCircle className="h-4 w-4" /> Create Offer</Link>
                </Button>
              )}
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
                        <Badge variant={offer.status === "active" ? "default" : "secondary"}>{offer.status}</Badge>
                      </div>
                      <div className="flex items-center justify-between mb-3">
                        {editingPayout === offer.id ? (
                          <div className="flex items-center gap-1">
                            <Input type="number" value={newPayout} onChange={(e) => setNewPayout(e.target.value)} className="h-7 w-20 text-xs" placeholder={String(offer.payout)} />
                            <Button size="sm" className="h-7 text-xs px-2" onClick={() => saveEditPayout(offer.id)}>Save</Button>
                            <Button size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={() => setEditingPayout(null)}><X className="h-3 w-3" /></Button>
                          </div>
                        ) : (
                          <span className="rounded-full bg-primary/10 text-primary px-3 py-0.5 text-xs font-bold">{offer.payout_type === "flat" ? `${sym}${offer.payout}` : `${offer.payout}%`}</span>
                        )}
                        <span className="text-xs text-muted-foreground">{offer.category}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mb-3">{offerRefs.length} refs • {offerWon} won</div>
                      {/* Deposit status badge */}
                      {offer.deposit_status && offer.deposit_status !== "not_required" && offer.deposit_status !== "paid" && (
                        <div className="mb-3">
                          <Badge variant="outline" className={`text-xs ${offer.deposit_status === "pending" ? "border-accent text-accent-foreground" : "border-destructive text-destructive"}`}>
                            {offer.deposit_status === "pending" ? "Deposit Pending" : "Deposit Required"}
                          </Badge>
                        </div>
                      )}
                      {offer.deposit_status === "paid" && (
                        <div className="mb-3">
                          <Badge variant="outline" className="text-xs border-earnings text-earnings">Deposit Paid</Badge>
                        </div>
                      )}
                      <div className="flex items-center gap-2 pt-3 border-t border-border flex-wrap">
                        {offer.deposit_status === "required" ? (
                          <Button size="sm" className="gap-1 text-xs" onClick={() => handlePayDeposit(offer.id)}>
                            <DollarSign className="h-3 w-3" /> Pay Deposit
                          </Button>
                        ) : offer.deposit_status === "pending" ? (
                          <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => handlePayDeposit(offer.id)}>
                            <Clock className="h-3 w-3" /> Retry Deposit
                          </Button>
                        ) : (
                          <>
                            <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => toggleOfferStatus(offer.id, offer.status)}>
                              {offer.status === "active" ? <><Pause className="h-3 w-3" /> Pause</> : <><Play className="h-3 w-3" /> Activate</>}
                            </Button>
                            <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => { setEditingPayout(offer.id); setNewPayout(String(offer.payout)); }}>
                              <Edit className="h-3 w-3" /> Edit Payout
                            </Button>
                          </>
                        )}
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
