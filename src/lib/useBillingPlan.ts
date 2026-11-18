import { useEffect, useRef, useState } from "react";
import type { BillingPlan } from "@/config/pricing";
import { takePendingPlan } from "@/lib/pendingPlan";

// Sale defaults apply only until a visitor supplies an explicit choice.
export function useBillingPlan(saleLive: boolean, restorePending = false) {
  const [plan, setPlan] = useState<BillingPlan>("monthly");
  const chosen = useRef(false);
  useEffect(() => {
    if (!restorePending) return;
    const pending = takePendingPlan();
    if (pending) {
      chosen.current = true;
      setPlan(pending);
    }
  }, [restorePending]);
  useEffect(() => {
    if (saleLive && !chosen.current) setPlan("annual");
  }, [saleLive]);
  const choosePlan = (next: BillingPlan) => {
    chosen.current = true;
    setPlan(next);
  };
  return [plan, choosePlan] as const;
}