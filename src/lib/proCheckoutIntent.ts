import { supabase } from "@/integrations/supabase/client";
import type { BillingPlan } from "@/config/pricing";
import { LAUNCH_PACKAGE_ENABLED } from "@/config/featureFlags";
import { track } from "@/lib/track";

/**
 * Purchase intent from /signup?plan=monthly|annual. Held in sessionStorage so
 * it survives the email-confirmation round trip, and cleared the moment
 * checkout is started so it can never re-trigger.
 */
const INTENT_KEY = "revvin_checkout_intent";
const LAUNCH_KEY = "revvin_addon_launch";

export const parsePlan = (value: string | null | undefined): BillingPlan | null =>
  value === "monthly" || value === "annual" ? value : null;

export const holdCheckoutIntent = (plan: BillingPlan) => {
  try { window.sessionStorage.setItem(INTENT_KEY, plan); } catch { /* ignore */ }
};

export const peekCheckoutIntent = (): BillingPlan | null => {
  try { return parsePlan(window.sessionStorage.getItem(INTENT_KEY)); } catch { return null; }
};

export const clearCheckoutIntent = () => {
  try { window.sessionStorage.removeItem(INTENT_KEY); } catch { /* ignore */ }
};

const wantsLaunchPackage = () => {
  if (!LAUNCH_PACKAGE_ENABLED) return false;
  try { return window.sessionStorage.getItem(LAUNCH_KEY) === "1"; } catch { return false; }
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** The signup trigger creates the business row; wait briefly if it is racing. */
const waitForBusiness = async (userId: string): Promise<boolean> => {
  for (let i = 0; i < 6; i++) {
    const { data } = await supabase.from("businesses").select("id").eq("user_id", userId).limit(1);
    if (data?.[0]) return true;
    await sleep(500 * (i + 1));
  }
  return false;
};

/**
 * Starts Stripe checkout for a held plan. Returns true when the browser is
 * being redirected; false means the caller should fall back to onboarding.
 */
export const startHeldCheckout = async (userId: string, plan: BillingPlan): Promise<boolean> => {
  clearCheckoutIntent();
  try {
    if (!(await waitForBusiness(userId))) return false;
    const includeLaunchPackage = wantsLaunchPackage();
    const { data, error } = await supabase.functions.invoke("create-business-checkout", {
      body: { plan, includeLaunchPackage },
    });
    if (error || !data?.url) return false;
    try { window.sessionStorage.removeItem(LAUNCH_KEY); } catch { /* ignore */ }
    track("checkout_redirected");
    window.location.href = data.url;
    return true;
  } catch {
    return false;
  }
};

export const CHECKOUT_FALLBACK_TOAST = {
  title: "Your account is ready.",
  description: "You can start Pro any time from your dashboard.",
};
