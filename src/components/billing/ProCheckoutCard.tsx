import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import PlanPicker from "@/components/billing/PlanPicker";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { PRICE_TEXT, type BillingPlan } from "@/config/pricing";
import { setPendingPlan } from "@/lib/pendingPlan";
import { friendlyError } from "@/lib/errors";
import { toast } from "@/hooks/use-toast";
import { track } from "@/lib/track";
import type { ToolkitCta } from "@/lib/toolkit/analytics";

/**
 * Real Pro checkout on a public page.
 *
 * Signed-in business owners go straight to Stripe Checkout on the plan they
 * picked. Everyone else needs an account first, so we remember the plan for
 * this browser session and send them to signup. Publishing a referral page
 * stays free either way, and that stays visible here.
 */
const ProCheckoutCard = ({
  heading,
  body,
  cta,
  className = "",
}: {
  heading: string;
  body: string;
  cta: ToolkitCta;
  className?: string;
}) => {
  const { user, userRole } = useAuth();
  const navigate = useNavigate();
  const [plan, setPlan] = useState<BillingPlan>("monthly");
  const [busy, setBusy] = useState(false);
  // null = not checked yet / not applicable. Owners who already pay must never
  // be able to open a second subscription checkout from a public page.
  const [alreadyPro, setAlreadyPro] = useState<boolean | null>(null);

  const isBusinessOwner = !!user && userRole === "business";

  useEffect(() => {
    if (!isBusinessOwner) {
      setAlreadyPro(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("businesses")
        .select("subscription_status")
        .eq("user_id", user!.id)
        .limit(1);
      const status = (data?.[0]?.subscription_status || "").toLowerCase();
      if (!cancelled) setAlreadyPro(!!status && !["none", "canceled"].includes(status));
    })();
    return () => {
      cancelled = true;
    };
  }, [isBusinessOwner, user?.id]);

  const canCheckOutHere = isBusinessOwner && alreadyPro === false;

  const openPortal = async () => {
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("customer-portal");
    setBusy(false);
    if (error || !data?.url) {
      toast({
        title: "Could not open billing",
        description: friendlyError(error),
        variant: "destructive",
      });
      return;
    }
    window.location.href = data.url;
  };

  const start = async () => {
    track("cta_clicked", { cta });

    if (!canCheckOutHere) {
      setPendingPlan(plan);
      navigate(`/signup?plan=${plan}`);
      return;
    }

    setBusy(true);
    const { data, error } = await supabase.functions.invoke("create-business-checkout", {
      body: { includeLaunchPackage: false, plan },
    });
    setBusy(false);

    if (error || !data?.url) {
      toast({
        title: "Could not start checkout",
        description: friendlyError(error),
        variant: "destructive",
      });
      return;
    }
    track("checkout_redirected");
    window.location.href = data.url;
  };

  return (
    <div className={`rounded-2xl border border-primary/30 bg-primary/5 p-6 ${className}`}>
      <h3 className="text-base font-bold text-foreground">{heading}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{body}</p>

      <PlanPicker plan={plan} onChange={setPlan} className="mt-4" />

      <Button size="lg" className="mt-4 h-12 w-full" onClick={start} disabled={busy}>
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : canCheckOutHere ? (
          `Start Revvin Pro, ${plan === "annual" ? PRICE_TEXT.annualPerYear : PRICE_TEXT.monthlyPerMonth}`
        ) : (
          `Create my account and start Pro, ${plan === "annual" ? PRICE_TEXT.annualPerYear : PRICE_TEXT.monthlyPerMonth}`
        )}
      </Button>

      <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Lock className="h-3 w-3" aria-hidden="true" />
        {canCheckOutHere
          ? "Secure checkout powered by Stripe. Cancel anytime."
          : "Secure checkout powered by Stripe. Publishing your referral page stays free, with no card."}
      </p>
    </div>
  );
};

export default ProCheckoutCard;
