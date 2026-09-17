// Daily cron: a pending commission whose hold has elapsed becomes payable.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkCronAuth } from "../_shared/cron-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = checkCronAuth(req);
  if (!auth.ok) {
    console.warn("[partner-commissions-mature] unauthorized", auth.reason);
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const now = new Date().toISOString();
  const { data, error } = await admin
    .from("partner_commissions")
    .update({ status: "payable" })
    .eq("status", "pending")
    .lte("payable_at", now)
    .select("id");

  if (error) {
    console.error("[partner-commissions-mature]", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  console.log(`[partner-commissions-mature] matured ${data?.length ?? 0}`);
  return new Response(JSON.stringify({ ok: true, matured: data?.length ?? 0 }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
