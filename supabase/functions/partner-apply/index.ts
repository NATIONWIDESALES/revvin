// Public: accepts a partner application, emails the applicant a receipt and
// alerts info@revvin.co. Rate limited, with a honeypot field.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { appUrl } from "../_shared/app-config.ts";
import { sendPartnerEmail } from "../_shared/partner-email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const AUDIENCE_SIZES = ["Under 1,000", "1,000 to 10,000", "10,000 to 50,000", "50,000+"];
const clean = (value: unknown, max: number) => String(value ?? "").trim().slice(0, max);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body = await req.json().catch(() => ({}));

    // Honeypot: bots fill every field. A real form leaves this one empty.
    if (clean(body?.website_url, 200)) return json({ ok: true });

    const name = clean(body?.name, 120);
    const email = clean(body?.email, 200).toLowerCase();
    const country = clean(body?.country, 80);
    const channels = clean(body?.channels, 1000);
    const audienceSize = clean(body?.audience_size, 40);
    const promoPlan = clean(body?.promo_plan, 1000);
    const payoutMethod = clean(body?.payout_method, 20) === "bank" ? "bank" : "paypal";
    const agreed = body?.agreed_to_terms === true;

    const problems: string[] = [];
    if (name.length < 2) problems.push("Please enter your full name.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) problems.push("Please enter a valid email.");
    if (!country) problems.push("Please enter your country.");
    if (channels.length < 3) problems.push("Tell us where you will share Revvin.");
    if (!AUDIENCE_SIZES.includes(audienceSize)) problems.push("Please pick an audience size.");
    if (!agreed) problems.push("Please agree to the Partner Terms.");
    if (problems.length) return json({ error: problems[0] }, 400);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const { data: allowed } = await admin.rpc("fn_rate_bucket_hit", {
      p_key: `partner_apply:${email}`,
      p_window: "1 hour",
      p_max_hits: 3,
    });
    if (allowed === false) {
      return json({ error: "We already have your application. Give us a few days." }, 429);
    }

    const { data: existing } = await admin
      .from("partners")
      .select("id, status")
      .ilike("email", email)
      .limit(1);
    if (existing?.length) {
      // Never confirm or deny an existing application: the same neutral reply.
      return json({ ok: true });
    }

    const { data: inserted, error } = await admin
      .from("partners")
      .insert({
        name,
        email,
        country,
        channels,
        audience_size: audienceSize,
        promo_plan: promoPlan,
        payout_method: payoutMethod,
        status: "pending",
      })
      .select("id")
      .limit(1);
    if (error) {
      console.error("[partner-apply] insert failed", error);
      return json({ error: "Could not save your application. Please try again." }, 500);
    }
    const partnerId = inserted?.[0]?.id ?? null;

    try {
      await sendPartnerEmail({
        supabase: admin,
        templateName: "partner_application_received",
        to: email,
        partnerId,
        idempotencyKey: `partner-application-${partnerId}`,
        data: { name },
      });
    } catch (e) {
      console.error("[partner-apply] applicant email failed", e);
    }

    try {
      await sendPartnerEmail({
        supabase: admin,
        templateName: "partner_admin_new_application",
        to: "info@revvin.co",
        partnerId,
        idempotencyKey: `partner-application-admin-${partnerId}`,
        data: {
          name,
          email,
          country,
          channels,
          audienceSize,
          promoPlan,
          payoutMethod,
          adminLink: appUrl("/__sa"),
        },
      });
    } catch (e) {
      console.error("[partner-apply] admin alert failed", e);
    }

    return json({ ok: true });
  } catch (err) {
    console.error("[partner-apply]", err);
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
});
