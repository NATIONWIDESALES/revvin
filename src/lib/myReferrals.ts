import { supabase } from "@/integrations/supabase/client";

export interface MyReferral {
  lead_first_name: string;
  created_at: string;
  status: "new" | "contacted" | "quoted" | "closed" | "lost";
  reward_amount: number | null;
  reward_status: "owed" | "paid" | null;
}
export interface MyBusiness {
  business_name: string;
  slug: string;
  reward: string | null;
  token: string;
  referrals: MyReferral[];
}

/** Every business the signed-in, confirmed email refers for. Read-only. */
export async function loadMyReferrals(): Promise<{ data: MyBusiness[]; error: string | null }> {
  const { data, error } = await supabase.rpc("fn_my_referrals" as never);
  if (error) return { data: [], error: "We could not load your referrals. Try again in a moment." };
  return { data: ((data as unknown) as MyBusiness[]) ?? [], error: null };
}

/** Email sign-in link back to /me. */
export async function sendMeSignInLink(email: string) {
  return supabase.auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: { emailRedirectTo: `${window.location.origin}/me`, shouldCreateUser: true },
  });
}
