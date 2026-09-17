// Public, token authenticated: the private partner dashboard payload.
//
// Privacy rule: this function never returns a business name, a business email
// or any customer detail. Referred businesses appear as "Business #1", "#2" and
// so on, with their plan and status only. A bad or unknown token is a 404.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { appUrl } from "../_shared/app-config.ts";
import {
  COMMISSION_RATE,
  HOLD_DAYS,
  MIN_PAYOUT_USD,
  type CommissionStatus,
} from "../_shared/partner-config.ts";
import { payableBalanceCents } from "../_shared/partner-rules.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const notFound = () => new Response(JSON.stringify({ error: "Not found" }), {
  status: 404,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

const PAYING = new Set(["active", "trialing", "past_due"]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const token = String(body?.token ?? url.searchParams.get("t") ?? "").trim();
    if (token.length < 16 || token.length > 100) return notFound();

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const { data: partners } = await admin
      .from("partners")
      .select("id, name, code, status, tax_form_received")
      .eq("dashboard_token", token)
      .limit(1);
    const partner = partners?.[0];
    if (!partner || partner.status !== "approved" || !partner.code) return notFound();

    const since30 = new Date(Date.now() - 30 * 86_400_000).toISOString();

    const [clicksAllRes, clicks30Res, bizRes, commissionsRes, payoutsRes, adjustmentsRes] =
      await Promise.all([
        admin.from("partner_clicks").select("id", { count: "exact", head: true }).eq("partner_id", partner.id),
        admin
          .from("partner_clicks")
          .select("id", { count: "exact", head: true })
          .eq("partner_id", partner.id)
          .gte("created_at", since30),
        admin
          .from("businesses")
          .select("plan, subscription_status, is_published, partner_attributed_at")
          .eq("partner_id", partner.id)
          .order("partner_attributed_at", { ascending: true }),
        admin
          .from("partner_commissions")
          .select("id, product, amount_collected_cents, commission_cents, currency, paid_at, payable_at, status")
          .eq("partner_id", partner.id)
          .order("paid_at", { ascending: false })
          .limit(500),
        admin
          .from("partner_payouts")
          .select("amount_cents, method, reference, paid_at")
          .eq("partner_id", partner.id)
          .order("paid_at", { ascending: false })
          .limit(100),
        admin
          .from("partner_adjustments")
          .select("amount_cents, reason, created_at, payout_id")
          .eq("partner_id", partner.id)
          .order("created_at", { ascending: false })
          .limit(200),
      ]);

    const businesses = (bizRes.data ?? []).map((b: any, index: number) => ({
      label: `Business #${index + 1}`,
      plan: b.plan === "pro" ? "Pro" : "Free",
      status: PAYING.has(String(b.subscription_status ?? "")) ? "Paying" : "Not paying",
      published: b.is_published === true,
      attributedAt: b.partner_attributed_at,
    }));

    const commissions = (commissionsRes.data ?? []).map((c: any) => ({
      id: c.id,
      product: c.product,
      amountCollectedCents: Number(c.amount_collected_cents),
      commissionCents: Number(c.commission_cents),
      currency: c.currency,
      paidAt: c.paid_at,
      payableAt: c.payable_at,
      status: c.status as CommissionStatus,
    }));

    const sum = (status: CommissionStatus) =>
      commissions.filter((c) => c.status === status).reduce((t, c) => t + c.commissionCents, 0);

    const unapplied = (adjustmentsRes.data ?? []).filter((a: any) => !a.payout_id);
    const payableBalance = payableBalanceCents(
      commissions
        .filter((c) => c.status === "payable")
        .map((c) => ({ commission_cents: c.commissionCents })),
      unapplied,
    );

    return json({
      partner: {
        name: partner.name,
        code: partner.code,
        link: `${appUrl("/")}?via=${partner.code}`,
        taxFormReceived: partner.tax_form_received === true,
      },
      config: {
        commissionRate: COMMISSION_RATE,
        holdDays: HOLD_DAYS,
        minPayoutUsd: MIN_PAYOUT_USD,
      },
      stats: {
        clicks30: clicks30Res.count ?? 0,
        clicksAllTime: clicksAllRes.count ?? 0,
        signups: businesses.length,
        published: businesses.filter((b) => b.published).length,
        paying: businesses.filter((b) => b.status === "Paying").length,
      },
      balances: {
        pendingCents: sum("pending"),
        payableCents: payableBalance,
        paidCents: sum("paid"),
        adjustmentsCents: unapplied.reduce((t: number, a: any) => t + Number(a.amount_cents), 0),
      },
      businesses,
      commissions,
      payouts: (payoutsRes.data ?? []).map((p: any) => ({
        amountCents: Number(p.amount_cents),
        method: p.method,
        reference: p.reference,
        paidAt: p.paid_at,
      })),
      adjustments: (adjustmentsRes.data ?? []).map((a: any) => ({
        amountCents: Number(a.amount_cents),
        reason: a.reason,
        createdAt: a.created_at,
        applied: Boolean(a.payout_id),
      })),
    });
  } catch (err) {
    console.error("[partner-dashboard]", err);
    return notFound();
  }
});
