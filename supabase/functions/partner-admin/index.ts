// Admin only: everything Karm needs to run the partner program.
//
// Authorization reuses the existing platform-admin check. Every read and write
// on the partner tables happens here with the service role, because those tables
// have no client-facing policies at all.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { isPlatformAdmin } from "../_shared/admin-auth.ts";
import { appUrl } from "../_shared/app-config.ts";
import { sendPartnerEmail } from "../_shared/partner-email.ts";
import {
  COMMISSION_RATE,
  HOLD_DAYS,
  MIN_PAYOUT_USD,
  PRODUCT_LABELS,
} from "../_shared/partner-config.ts";
import {
  meetsPayoutMinimum,
  normalizePartnerCode,
  payableBalanceCents,
} from "../_shared/partner-rules.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const hidden = () => new Response(null, { status: 404, headers: corsHeaders });

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

function csv(rows: (string | number | null)[][]): string {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const value = cell === null || cell === undefined ? "" : String(cell);
          return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
        })
        .join(","),
    )
    .join("\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return hidden();

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: userError } = await anonClient.auth.getUser();
    if (userError || !user) return hidden();

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );
    if (!(await isPlatformAdmin(admin, user))) return hidden();

    const url = new URL(req.url);
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const action = String(body?.action ?? url.searchParams.get("action") ?? "list");

    /* ---------------------------------------------------------------- list */
    if (action === "list") {
      const [partnersRes, commissionsRes, payoutsRes, adjustmentsRes, bizRes, clicksRes] =
        await Promise.all([
          admin.from("partners").select("*").order("created_at", { ascending: false }),
          admin
            .from("partner_commissions")
            .select("id, partner_id, business_id, product, amount_collected_cents, commission_cents, currency, paid_at, payable_at, status, payout_id, source_type, stripe_object_id")
            .order("paid_at", { ascending: false })
            .limit(2000),
          admin.from("partner_payouts").select("*").order("paid_at", { ascending: false }).limit(500),
          admin.from("partner_adjustments").select("*").order("created_at", { ascending: false }).limit(1000),
          admin
            .from("businesses")
            .select("id, name, partner_id, plan, subscription_status, is_published")
            .not("partner_id", "is", null),
          admin.from("partner_clicks").select("partner_id, created_at").limit(20000),
        ]);

      const commissions = commissionsRes.data ?? [];
      const adjustments = adjustmentsRes.data ?? [];
      const clicks = clicksRes.data ?? [];
      const businesses = bizRes.data ?? [];
      const paying = new Set(["active", "trialing", "past_due"]);

      const partners = (partnersRes.data ?? []).map((p: any) => {
        const own = commissions.filter((c) => c.partner_id === p.id);
        const unapplied = adjustments.filter((a) => a.partner_id === p.id && !a.payout_id);
        const total = (status: string) =>
          own.filter((c) => c.status === status).reduce((t, c) => t + Number(c.commission_cents), 0);
        const payableBalance = payableBalanceCents(
          own.filter((c) => c.status === "payable"),
          unapplied,
        );
        const referred = businesses.filter((b) => b.partner_id === p.id);
        return {
          ...p,
          clicks: clicks.filter((c) => c.partner_id === p.id).length,
          signups: referred.length,
          payingCustomers: referred.filter((b) => paying.has(String(b.subscription_status ?? ""))).length,
          pendingCents: total("pending"),
          payableCents: total("payable"),
          paidCents: total("paid"),
          reversedCents: total("reversed"),
          adjustmentsCents: unapplied.reduce((t, a) => t + Number(a.amount_cents), 0),
          payableBalanceCents: payableBalance,
          readyForPayout: meetsPayoutMinimum(payableBalance),
        };
      });

      return json({
        config: { commissionRate: COMMISSION_RATE, holdDays: HOLD_DAYS, minPayoutUsd: MIN_PAYOUT_USD },
        partners,
        commissions,
        payouts: payoutsRes.data ?? [],
        adjustments,
        attributedBusinesses: businesses,
      });
    }

    /* ------------------------------------------------------------- approve */
    if (action === "approve") {
      const partnerId = String(body?.partner_id ?? "");
      const code = normalizePartnerCode(body?.code);
      if (!partnerId || !code) {
        return json({ error: "A code of 3 to 24 letters, numbers or hyphens is required." }, 400);
      }
      const { data: clash } = await admin
        .from("partners")
        .select("id")
        .eq("code", code)
        .neq("id", partnerId)
        .limit(1);
      if (clash?.length) return json({ error: "That code is already taken." }, 409);

      const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "").slice(0, 8);
      const { data: updated, error } = await admin
        .from("partners")
        .update({ status: "approved", code, dashboard_token: token, approved_at: new Date().toISOString() })
        .eq("id", partnerId)
        .select("id, name, email, code")
        .limit(1);
      if (error) return json({ error: error.message }, 500);
      const partner = updated?.[0];
      if (!partner) return json({ error: "Partner not found." }, 404);

      await sendPartnerEmail({
        supabase: admin,
        templateName: "partner_approved",
        to: partner.email,
        partnerId: partner.id,
        idempotencyKey: `partner-approved-${partner.id}`,
        data: {
          name: partner.name,
          code: partner.code,
          partnerLink: `${appUrl("/")}?via=${partner.code}`,
          dashboardLink: appUrl(`/partners/dashboard?t=${token}`),
          commissionLine:
            `You earn ${Math.round(COMMISSION_RATE * 100)}% of the cash we collect from customers you refer, for as long as they keep paying.`,
          payoutLine:
            `Commissions clear ${HOLD_DAYS} days after your customer pays. We pay on the 15th of each month once your payable balance reaches $${MIN_PAYOUT_USD}.`,
        },
      });

      return json({ ok: true, code, dashboardToken: token });
    }

    /* -------------------------------------------------------------- reject */
    if (action === "reject") {
      const { error } = await admin
        .from("partners")
        .update({ status: "rejected" })
        .eq("id", String(body?.partner_id ?? ""));
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    /* -------------------------------------------------------------- remove */
    if (action === "remove") {
      const partnerId = String(body?.partner_id ?? "");
      if (!partnerId) return json({ error: "partner_id is required." }, 400);
      const { error } = await admin
        .from("partners")
        .update({ status: "removed" })
        .eq("id", partnerId);
      if (error) return json({ error: error.message }, 500);
      const { data: reversed } = await admin
        .from("partner_commissions")
        .update({ status: "reversed", reversal_reason: "removed" })
        .eq("partner_id", partnerId)
        .in("status", ["pending", "payable"])
        .select("id");
      return json({ ok: true, reversed: reversed?.length ?? 0 });
    }

    /* ------------------------------------------------------------ tax form */
    if (action === "set_tax_form") {
      const { error } = await admin
        .from("partners")
        .update({ tax_form_received: body?.tax_form_received === true })
        .eq("id", String(body?.partner_id ?? ""));
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    /* -------------------------------------------------------- record payout */
    if (action === "record_payout") {
      const partnerId = String(body?.partner_id ?? "");
      const method = String(body?.method ?? "").trim().slice(0, 40);
      const reference = String(body?.reference ?? "").trim().slice(0, 120);
      if (!partnerId || !method) return json({ error: "Method is required." }, 400);

      const { data: partners } = await admin
        .from("partners")
        .select("id, name, email, dashboard_token, tax_form_received")
        .eq("id", partnerId)
        .limit(1);
      const partner = partners?.[0];
      if (!partner) return json({ error: "Partner not found." }, 404);
      if (partner.tax_form_received !== true) {
        return json({ error: "Collect a tax form first." }, 400);
      }

      const { data: payable } = await admin
        .from("partner_commissions")
        .select("id, commission_cents")
        .eq("partner_id", partnerId)
        .eq("status", "payable");
      const { data: adjustments } = await admin
        .from("partner_adjustments")
        .select("id, amount_cents")
        .eq("partner_id", partnerId)
        .is("payout_id", null);

      const amount = payableBalanceCents(payable ?? [], adjustments ?? []);
      if (!meetsPayoutMinimum(amount)) {
        return json({ error: `The payable balance is under $${MIN_PAYOUT_USD}.` }, 400);
      }

      const { data: payoutRows, error: payoutErr } = await admin
        .from("partner_payouts")
        .insert({
          partner_id: partnerId,
          amount_cents: amount,
          method,
          reference: reference || null,
          created_by: user.id,
        })
        .select("id")
        .limit(1);
      if (payoutErr) return json({ error: payoutErr.message }, 500);
      const payoutId = payoutRows?.[0]?.id;

      if (payable?.length) {
        await admin
          .from("partner_commissions")
          .update({ status: "paid", payout_id: payoutId })
          .in("id", payable.map((c: any) => c.id));
      }
      if (adjustments?.length) {
        await admin
          .from("partner_adjustments")
          .update({ payout_id: payoutId })
          .in("id", adjustments.map((a: any) => a.id));
      }

      await sendPartnerEmail({
        supabase: admin,
        templateName: "partner_payout_sent",
        to: partner.email,
        partnerId,
        idempotencyKey: `partner-payout-${payoutId}`,
        data: {
          name: partner.name,
          amount: money(amount),
          method,
          reference: reference || null,
          dashboardLink: partner.dashboard_token
            ? appUrl(`/partners/dashboard?t=${partner.dashboard_token}`)
            : appUrl("/partners"),
        },
      });

      return json({ ok: true, amountCents: amount, payoutId });
    }

    /* --------------------------------------------- set a business's partner */
    if (action === "set_business_partner") {
      const businessId = String(body?.business_id ?? "");
      const partnerId = body?.partner_id ? String(body.partner_id) : null;
      const note = String(body?.note ?? "").trim().slice(0, 500);
      if (!businessId) return json({ error: "business_id is required." }, 400);
      if (!note) return json({ error: "A note is required." }, 400);

      const { error } = await admin
        .from("businesses")
        .update({
          partner_id: partnerId,
          partner_attributed_at: partnerId ? new Date().toISOString() : null,
        })
        .eq("id", businessId);
      if (error) return json({ error: error.message }, 500);

      // The note is kept on the partner record, so the change is never silent.
      const stamp = `${new Date().toISOString()} ${user.email ?? user.id}: ${note}`;
      const target = partnerId;
      if (target) {
        const { data: rows } = await admin.from("partners").select("notes").eq("id", target).limit(1);
        const existing = rows?.[0]?.notes ? `${rows[0].notes}\n` : "";
        await admin.from("partners").update({ notes: `${existing}${stamp}` }).eq("id", target);
      }
      return json({ ok: true });
    }

    /* --------------------------------------------------------------- export */
    if (action === "export") {
      const kind = String(body?.kind ?? url.searchParams.get("kind") ?? "commissions");
      if (kind === "payouts") {
        const { data } = await admin
          .from("partner_payouts")
          .select("id, partner_id, amount_cents, method, reference, paid_at")
          .order("paid_at", { ascending: false });
        const { data: partnerRows } = await admin.from("partners").select("id, name, email");
        const byId = new Map((partnerRows ?? []).map((p: any) => [p.id, p]));
        const rows: (string | number | null)[][] = [
          ["payout_id", "partner", "partner_email", "amount_usd", "method", "reference", "paid_at"],
          ...(data ?? []).map((p: any) => [
            p.id,
            byId.get(p.partner_id)?.name ?? "",
            byId.get(p.partner_id)?.email ?? "",
            (Number(p.amount_cents) / 100).toFixed(2),
            p.method,
            p.reference,
            p.paid_at,
          ]),
        ];
        return json({ ok: true, filename: "partner-payouts.csv", csv: csv(rows) });
      }

      const { data } = await admin
        .from("partner_commissions")
        .select("id, partner_id, product, amount_collected_cents, commission_cents, currency, paid_at, payable_at, status, source_type, stripe_object_id")
        .order("paid_at", { ascending: false });
      const { data: partnerRows } = await admin.from("partners").select("id, name, email");
      const byId = new Map((partnerRows ?? []).map((p: any) => [p.id, p]));
      const rows: (string | number | null)[][] = [
        ["commission_id", "partner", "partner_email", "product", "amount_collected_usd", "commission_usd", "currency", "paid_at", "payable_at", "status", "source", "stripe_object_id"],
        ...(data ?? []).map((c: any) => [
          c.id,
          byId.get(c.partner_id)?.name ?? "",
          byId.get(c.partner_id)?.email ?? "",
          PRODUCT_LABELS[c.product as keyof typeof PRODUCT_LABELS] ?? c.product,
          (Number(c.amount_collected_cents) / 100).toFixed(2),
          (Number(c.commission_cents) / 100).toFixed(2),
          c.currency,
          c.paid_at,
          c.payable_at,
          c.status,
          c.source_type,
          c.stripe_object_id,
        ]),
      ];
      return json({ ok: true, filename: "partner-commissions.csv", csv: csv(rows) });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err) {
    console.error("[partner-admin]", err);
    return json({ error: (err as Error).message }, 500);
  }
});
