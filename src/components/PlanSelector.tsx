import { useState } from "react";
import { CheckCircle2, Crown, Zap, Building2, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const plans = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "/mo",
    fee: "25%",
    feeLabel: "platform fee per closed referral",
    desc: "Get listed quickly with no monthly cost.",
    icon: Building2,
    features: [
      "List your business for free",
      "Create referral offers",
      "Receive and manage referrals",
      "Platform-mediated payouts",
      "Basic business profile",
      "Email notifications",
    ],
    featured: false,
    paid: false,
  },
  {
    id: "starter",
    name: "Growth",
    price: "$50",
    period: "/mo",
    fee: "10%",
    feeLabel: "platform fee per closed referral",
    desc: "For businesses actively acquiring through referrals.",
    icon: Zap,
    features: [
      "Everything in Free",
      "Lower 10% platform fee",
      "Priority business review",
      "Enhanced profile visibility",
      "Referral analytics",
      "Priority support",
    ],
    featured: true,
    paid: true,
  },
  {
    id: "pro",
    name: "Pro",
    price: "$250",
    period: "/mo",
    fee: "1%",
    feeLabel: "platform fee per closed referral",
    desc: "For high-volume referral programs.",
    icon: Crown,
    features: [
      "Everything in Starter",
      "Minimal 1% platform fee",
      "Featured marketplace placement",
      "Advanced analytics dashboard",
      "Dedicated support",
      "Custom payout terms",
    ],
    featured: false,
    paid: true,
  },
  {
    id: "enterprise",
    name: "Elite",
    price: "$500",
    period: "/mo",
    fee: "0%",
    feeLabel: "platform fee on closed referrals",
    desc: "For category leaders running serious referral programs.",
    icon: Rocket,
    features: [
      "Everything in Pro",
      "0% platform fee — keep every dollar",
      "Premium featured placement",
      "Dedicated account manager",
      "Custom referral campaigns",
      "Multi-location support",
    ],
    featured: false,
    paid: true,
  },
];

interface PlanSelectorProps {
  businessId: string;
  currentTier?: string;
  onPlanSelected?: (tier: string) => void;
}

const PlanSelector = ({ businessId, currentTier, onPlanSelected }: PlanSelectorProps) => {
  const [selected, setSelected] = useState(currentTier || "free");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleConfirm = async () => {
    setSaving(true);
    try {
      const plan = plans.find(p => p.id === selected);

      // Free plan — just update DB directly
      if (!plan?.paid) {
        const feeMap: Record<string, number> = { free: 0.25, starter: 0.10, pro: 0.01, enterprise: 0 };
        const { error } = await supabase
          .from("businesses")
          .update({ pricing_tier: selected })
          .eq("id", businessId);
        if (error) throw error;

        const fee = feeMap[selected] ?? 0.25;
        await supabase
          .from("offers")
          .update({ platform_fee_rate: fee })
          .eq("business_id", businessId);

        toast({ title: "Plan selected", description: `You're on the Free plan.` });
        onPlanSelected?.(selected);
        return;
      }

      // Paid plan — redirect to Stripe Checkout
      const { data, error } = await supabase.functions.invoke("create-subscription-session", {
        body: { plan: selected },
      });

      if (error) throw new Error(error.message || "Failed to create checkout session");
      if (data?.error) throw new Error(data.error);
      if (!data?.url) throw new Error("No checkout URL returned");

      // Open Stripe Checkout in new tab
      window.open(data.url, "_blank");

      toast({
        title: "Redirecting to checkout",
        description: `Complete your ${plan.name} subscription in the new tab.`,
      });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to process plan selection", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-foreground tracking-tight">Select your plan</h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
          All plans include full platform access. The main difference is the platform fee on successful referrals. You can change your plan at any time.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 max-w-5xl mx-auto">
        {plans.map((plan, i) => {
          const isSelected = selected === plan.id;
          const isCurrent = currentTier === plan.id;
          return (
            <motion.button
              key={plan.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, duration: 0.4 }}
              onClick={() => setSelected(plan.id)}
              className={`rounded-2xl border p-5 text-left relative flex flex-col transition-all ${
                isSelected
                  ? "border-primary bg-primary/[0.02] shadow-sm ring-2 ring-primary/20"
                  : "border-border bg-card hover:border-primary/20"
              } ${plan.featured && !isSelected ? "border-primary/15" : ""}`}
            >
              {plan.featured && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-semibold px-2.5 py-0.5 rounded-full">
                  Most Popular
                </span>
              )}
              {isCurrent && (
                <span className="absolute -top-2.5 right-3 bg-accent text-accent-foreground text-[10px] font-semibold px-2.5 py-0.5 rounded-full">
                  Current
                </span>
              )}
              <div className="flex items-center gap-2 mb-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/5">
                  <plan.icon className="h-4 w-4 text-primary" />
                </div>
                <span className="text-sm font-semibold text-foreground">{plan.name}</span>
              </div>
              <div className="flex items-baseline gap-0.5 mb-1">
                <span className="text-2xl font-bold text-foreground">{plan.price}</span>
                <span className="text-xs text-muted-foreground">{plan.period}</span>
              </div>
              <span className="inline-flex items-center text-[11px] font-medium bg-primary/5 text-primary px-2 py-0.5 rounded-full mb-3 w-fit">
                {plan.fee} {plan.feeLabel}
              </span>
              <p className="text-xs text-muted-foreground mb-4">{plan.desc}</p>
              <ul className="space-y-1.5 flex-1">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-1.5 text-xs text-foreground">
                    <CheckCircle2 className="h-3 w-3 text-primary mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              {isSelected && (
                <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-primary">
                  <CheckCircle2 className="h-4 w-4" /> Selected
                </div>
              )}
            </motion.button>
          );
        })}
      </div>

      <div className="text-center mt-8">
        <Button
          onClick={handleConfirm}
          disabled={saving || selected === currentTier}
          className="h-11 px-8 gap-2"
        >
          {saving
            ? "Processing…"
            : selected === currentTier
              ? `Already on ${selected.charAt(0).toUpperCase() + selected.slice(1)}`
              : plans.find(p => p.id === selected)?.paid
                ? `Subscribe to ${selected.charAt(0).toUpperCase() + selected.slice(1)} — ${plans.find(p => p.id === selected)?.price}/mo`
                : `Continue with Free plan`}
        </Button>
        <p className="mt-3 text-xs text-muted-foreground">
          {plans.find(p => p.id === selected)?.paid
            ? "You'll be redirected to a secure Stripe checkout to complete your subscription."
            : "You can upgrade to a paid plan anytime from your dashboard."}
        </p>
      </div>
    </div>
  );
};

export default PlanSelector;
