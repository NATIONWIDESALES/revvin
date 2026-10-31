import { createClient } from "npm:@supabase/supabase-js@2.97.0";

export async function globalSuppression(email: string): Promise<boolean> {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Suppression configuration missing");
  const db = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await db.from("suppressed_emails").select("id").eq("email", email.trim().toLowerCase()).limit(1);
  if (error) throw new Error("Suppression lookup failed");
  return Boolean(data?.length);
}