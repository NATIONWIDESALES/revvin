import { supabase } from "@/integrations/supabase/client";
export async function loadEffectivePlan(businessId: string): Promise<string> {
  const { data, error } = await supabase.rpc("fn_effective_plan", { p_business_id: businessId });
  return !error && typeof data === "string" ? data : "free";
}
export const trialDaysLeft = (endsAt: string | null | undefined, now = Date.now()) => {
  const remaining = endsAt ? new Date(endsAt).getTime() - now : 0;
  return Number.isFinite(remaining) && remaining > 0 ? Math.ceil(remaining / 86400000) : 0;
};