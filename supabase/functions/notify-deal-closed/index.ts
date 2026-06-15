import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { appUrl } from "../_shared/app-config.ts";
import { notify } from "../_shared/notify.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const esc = (s: unknown) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const fmtUsd = (n: number) =>
  `$${(Math.round(n * 100) / 100).toLocaleString("en-US")}`;

function buildHtml(opts: {
  businessName: string;
  customerName: string;
  dealValue: number | null;
  source: string;
  dashboardUrl: string;
}) {
  const { businessName, customerName, dealValue, source, dashboardUrl } = opts;
  const headline =
    dealValue && dealValue > 0
      ? `You just closed a referred job worth ${fmtUsd(dealValue)}.`
      : `You just closed a referred job.`;
  return `<!doctype html><html><body style="margin:0;padding:0;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Inter',Segoe UI,Roboto,sans-serif;color:#0f172a">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px">
    <div style="font-size:13px;color:#15803d;font-weight:600;letter-spacing:.04em;text-transform:uppercase">Revvin</div>
    <h1 style="margin:8px 0 8px;font-size:24px;line-height:1.25;font-weight:600">Deal closed</h1>
    <p style="margin:0 0 20px;color:#334155;font-size:15px">${esc(headline)}</p>
    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:20px;margin-bottom:24px">
      <div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.06em;font-weight:600;margin-bottom:10px">Customer</div>
      <div style="font-size:16px;font-weight:600">${esc(customerName)}</div>
      ${dealValue && dealValue > 0 ? `<div style="font-size:14px;color:#15803d;margin-top:6px;font-weight:600">${fmtUsd(dealValue)}</div>` : ``}
      <div style="font-size:13px;color:#64748b;margin-top:10px">Source: ${esc(source)}</div>
    </div>
    <p style="margin:0 0 20px;font-size:14px;color:#334155">Don't forget to pay your referrer directly. Revvin doesn't take a cut of the payout.</p>
    <a href="${dashboardUrl}" style="display:inline-block;background:#15803d;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600;font-size:14px">Open dashboard</a>
    <p style="margin:28px 0 0;font-size:12px;color:#94a3b8">${esc(businessName)} · You're getting this because a referral was just marked closed.</p>
  </div>
</body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const { lead_id, referral_id } = body ?? {};
    if (!lead_id && !referral_id) {
      return new Response(JSON.stringify({ error: "lead_id or referral_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    let businessId: string | null = null;
    let customerName = "";
    let dealValue: number | null = null;
    let source = "";
    let referralIdForNotif: string | null = null;
    let idempotencyKey = "";

    if (lead_id) {
      const { data: rows } = await supabase
        .from("leads")
        .select("id, business_id, lead_name, status, deal_value, referrer_name")
        .eq("id", lead_id)
        .limit(1);
      const lead = rows?.[0];
      if (!lead) return new Response(JSON.stringify({ error: "lead not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (lead.status !== "closed_won") {
        return new Response(JSON.stringify({ ok: true, skipped: "status_not_closed_won" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      businessId = lead.business_id;
      customerName = lead.lead_name;
      dealValue = lead.deal_value == null ? null : Number(lead.deal_value);
      source = lead.referrer_name ? `Referred by ${lead.referrer_name}` : "Direct referral";
      idempotencyKey = `closed-lead-${lead.id}`;
    } else if (referral_id) {
      const { data: rows } = await supabase
        .from("referrals")
        .select("id, business_id, customer_name, status, deal_value, offer_id, offers(title)")
        .eq("id", referral_id)
        .limit(1);
      const ref = rows?.[0];
      if (!ref) return new Response(JSON.stringify({ error: "referral not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (ref.status !== "won") {
        return new Response(JSON.stringify({ ok: true, skipped: "status_not_won" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      businessId = ref.business_id;
      customerName = ref.customer_name;
      dealValue = ref.deal_value == null ? null : Number(ref.deal_value);
      source = ref.offers?.title ? `Marketplace · ${ref.offers.title}` : "Marketplace referral";
      referralIdForNotif = ref.id;
      idempotencyKey = `closed-referral-${ref.id}`;
    }

    if (!businessId) {
      return new Response(JSON.stringify({ error: "business_id missing" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: bizRows } = await supabase
      .from("businesses")
      .select("name")
      .eq("id", businessId)
      .limit(1);
    const businessName = bizRows?.[0]?.name ?? "your business";

    const inAppTitle =
      dealValue && dealValue > 0
        ? `Deal closed · ${fmtUsd(dealValue)}`
        : `Deal closed`;
    const inAppBody = `${customerName} just turned into a closed job.${dealValue ? ` Worth ${fmtUsd(dealValue)}.` : ""}`;

    const subject =
      dealValue && dealValue > 0
        ? `Closed: ${customerName} (${fmtUsd(dealValue)})`
        : `Closed: ${customerName}`;

    const html = buildHtml({
      businessName,
      customerName,
      dealValue,
      source,
      dashboardUrl: appUrl("/dashboard"),
    });

    const result = await notify({
      supabase,
      businessId,
      channel: "closed_deal",
      inApp: {
        title: inAppTitle,
        body: inAppBody,
        type: "deal_closed",
        referralId: referralIdForNotif,
      },
      email: {
        subject,
        html,
        idempotencyKey,
      },
    });

    return new Response(JSON.stringify({ ok: result.ok, result }), {
      status: result.ok ? 200 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[notify-deal-closed] error", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});