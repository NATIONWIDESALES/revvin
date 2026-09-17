// Public: emails the dashboard link to an approved partner. Always returns the
// same neutral message, so the endpoint cannot be used to test which addresses
// are partners.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { appUrl } from "../_shared/app-config.ts";
import { sendPartnerEmail } from "../_shared/partner-email.ts";
import { COMMISSION_RATE, HOLD_DAYS, MIN_PAYOUT_USD } from "../_shared/partner-config.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const NEUTRAL = {
  ok: true,
  message: "If that email belongs to an approved partner, the dashboard link is on its way.",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body?.email ?? "").trim().toLowerCase().slice(0, 200);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return json(NEUTRAL);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const { data: allowed } = await admin.rpc("fn_rate_bucket_hit", {
      p_key: `partner_resend:${email}`,
      p_window: "1 hour",
      p_max_hits: 3,
    });
    if (allowed === false) return json(NEUTRAL);

    const { data: partners } = await admin
      .from("partners")
      .select("id, name, code, dashboard_token, status")
      .ilike("email", email)
      .limit(1);
    const partner = partners?.[0];
    if (!partner || partner.status !== "approved" || !partner.dashboard_token) {
      return json(NEUTRAL);
    }

    await sendPartnerEmail({
      supabase: admin,
      templateName: "partner_approved",
      to: email,
      partnerId: partner.id,
      data: {
        name: partner.name,
        code: partner.code,
        partnerLink: `${appUrl("/")}?via=${partner.code}`,
        dashboardLink: appUrl(`/partners/dashboard?t=${partner.dashboard_token}`),
        commissionLine:
          `You earn ${Math.round(COMMISSION_RATE * 100)}% of the cash we collect from customers you refer, for as long as they keep paying.`,
        payoutLine:
          `Commissions clear ${HOLD_DAYS} days after your customer pays. We pay on the 15th of each month once your payable balance reaches $${MIN_PAYOUT_USD}.`,
      },
    });

    return json(NEUTRAL);
  } catch (err) {
    console.error("[partner-resend-link]", err);
    return json(NEUTRAL);
  }
});
