import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { appUrl, RESEND_FROM_ADDRESS, RESEND_REPLY_TO } from "../_shared/app-config.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

function periodBounds(d: Date) {
  // d = "now"; compute last month [start, end)
  const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 1));
  return { start, end };
}

function fmtMoney(n: number) {
  return `$${(Math.round(n * 100) / 100).toLocaleString("en-US")}`;
}

function monthLabel(d: Date) {
  return d.toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

function buildHtml(opts: {
  businessName: string;
  monthLabel: string;
  leadsTotal: number;
  closedCount: number;
  revenue: number;
  topReferrer: string | null;
  dashboardUrl: string;
}) {
  const { businessName, monthLabel, leadsTotal, closedCount, revenue, topReferrer, dashboardUrl } = opts;
  const hasData = leadsTotal > 0 || closedCount > 0 || revenue > 0;
  return `<!doctype html><html><body style="margin:0;background:#ffffff;font-family:-apple-system,Segoe UI,Inter,Arial,sans-serif;color:#0F172A">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px">
    <div style="font-size:20px;font-weight:700;color:#15803D;letter-spacing:-0.01em;margin-bottom:24px">Revvin</div>
    <h1 style="font-size:22px;line-height:1.3;margin:0 0 8px;font-weight:600">Your ${monthLabel} recap</h1>
    <p style="font-size:14px;color:#475569;margin:0 0 24px">Here's what your referral program produced last month, ${businessName}.</p>
    ${hasData ? `
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:separate;border-spacing:0 8px;margin-bottom:24px">
      <tr><td style="padding:14px 16px;border:1px solid #E2E8F0;border-radius:12px"><div style="font-size:12px;color:#64748B;text-transform:uppercase;letter-spacing:.04em">New referral leads</div><div style="font-size:24px;font-weight:600;margin-top:4px">${leadsTotal}</div></td></tr>
      <tr><td style="padding:14px 16px;border:1px solid #E2E8F0;border-radius:12px"><div style="font-size:12px;color:#64748B;text-transform:uppercase;letter-spacing:.04em">Closed deals</div><div style="font-size:24px;font-weight:600;margin-top:4px">${closedCount}</div></td></tr>
      <tr><td style="padding:14px 16px;border:1px solid #E2E8F0;border-radius:12px"><div style="font-size:12px;color:#64748B;text-transform:uppercase;letter-spacing:.04em">Attributed revenue</div><div style="font-size:24px;font-weight:600;margin-top:4px;color:#15803D">${fmtMoney(revenue)}</div></td></tr>
      ${topReferrer ? `<tr><td style="padding:14px 16px;border:1px solid #E2E8F0;border-radius:12px"><div style="font-size:12px;color:#64748B;text-transform:uppercase;letter-spacing:.04em">Top referrer</div><div style="font-size:16px;font-weight:600;margin-top:4px">${topReferrer}</div></td></tr>` : ``}
    </table>` : `
    <div style="padding:20px;border:1px dashed #CBD5E1;border-radius:12px;color:#475569;font-size:14px;margin-bottom:24px">
      No referrals came in last month yet. Share your QR code and link with a few recent customers to get the first ones rolling.
    </div>`}
    <a href="${dashboardUrl}" style="display:inline-block;background:#15803D;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:10px;font-size:14px;font-weight:600">Open dashboard</a>
    <p style="font-size:12px;color:#94A3B8;margin-top:32px">You're getting this because you run a Revvin referral program. One short recap, once a month.</p>
  </div></body></html>`;
}

async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) return { status: "logged" as const, id: null };
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: RESEND_FROM_ADDRESS,
      to: [to],
      reply_to: RESEND_REPLY_TO,
      subject,
      html,
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error("resend send failed", body);
    return { status: "failed" as const, id: null };
  }
  return { status: "sent" as const, id: body?.id ?? null };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    let body: any = {};
    try { body = await req.json(); } catch { body = {}; }
    const dryRun: boolean = body?.dry_run === true;
    const onlyBusinessId: string | undefined = body?.business_id || undefined;

    const now = new Date();
    const { start, end } = periodBounds(now);
    const periodMonth = start.toISOString().slice(0, 10); // YYYY-MM-01
    const label = monthLabel(start);

    // Eligible businesses: active subscription + not disabled + published
    let q = supabase
      .from("businesses")
      .select("id, name, user_id, subscription_status, is_disabled, is_published")
      .eq("is_disabled", false)
      .eq("is_published", true)
      .in("subscription_status", ["active", "trialing", "past_due"]);
    if (onlyBusinessId) q = q.eq("id", onlyBusinessId);
    const { data: businesses, error: bizErr } = await q;
    if (bizErr) throw bizErr;

    const results: any[] = [];

    for (const biz of businesses ?? []) {
      // Skip if already sent for this month (idempotency)
      const { data: existing } = await supabase
        .from("monthly_recap_log")
        .select("id")
        .eq("business_id", biz.id)
        .eq("period_month", periodMonth)
        .limit(1);
      if (existing && existing.length > 0) {
        results.push({ business_id: biz.id, skipped: "already_sent" });
        continue;
      }

      // Aggregate last month
      const [leadsRes, refsRes] = await Promise.all([
        supabase
          .from("leads")
          .select("id, status, deal_value, referrer_name, referrer_email", { count: "exact" })
          .eq("business_id", biz.id)
          .gte("created_at", start.toISOString())
          .lt("created_at", end.toISOString()),
        supabase
          .from("referrals")
          .select("id, status, deal_value, referrer_id", { count: "exact" })
          .eq("business_id", biz.id)
          .gte("created_at", start.toISOString())
          .lt("created_at", end.toISOString()),
      ]);

      const leads = leadsRes.data ?? [];
      const refs = refsRes.data ?? [];
      const leadsTotal = leads.length + refs.length;
      const closedLeads = leads.filter((l: any) => l.status === "closed_won");
      const closedRefs = refs.filter((r: any) => r.status === "won");
      const closedCount = closedLeads.length + closedRefs.length;
      const revenue =
        closedLeads.reduce((s: number, l: any) => s + (Number(l.deal_value) || 0), 0) +
        closedRefs.reduce((s: number, r: any) => s + (Number(r.deal_value) || 0), 0);

      // Top referrer by closed count (from leads.referrer_name; refs would need a join)
      const referrerCounts = new Map<string, number>();
      for (const l of closedLeads as any[]) {
        const k = l.referrer_name?.trim();
        if (k) referrerCounts.set(k, (referrerCounts.get(k) ?? 0) + 1);
      }
      let topReferrer: string | null = null;
      let topN = 0;
      for (const [name, n] of referrerCounts) {
        if (n > topN) { topReferrer = name; topN = n; }
      }

      // Resolve recipient email
      let recipient: string | null = null;
      const { data: bizFull } = await supabase
        .from("businesses")
        .select("business_email, user_id")
        .eq("id", biz.id)
        .limit(1);
      recipient = bizFull?.[0]?.business_email ?? null;
      if (!recipient && biz.user_id) {
        const { data: u } = await supabase.auth.admin.getUserById(biz.user_id);
        recipient = u?.user?.email ?? null;
      }
      if (!recipient) {
        results.push({ business_id: biz.id, skipped: "no_recipient" });
        continue;
      }

      const summary = {
        leads_total: leadsTotal,
        closed_count: closedCount,
        revenue,
        top_referrer: topReferrer,
        period_month: periodMonth,
        period_label: label,
      };

      const subject = `Your Revvin recap for ${label}`;
      const html = buildHtml({
        businessName: biz.name,
        monthLabel: label,
        leadsTotal,
        closedCount,
        revenue,
        topReferrer,
        dashboardUrl: appUrl("/dashboard"),
      });

      if (dryRun) {
        results.push({ business_id: biz.id, dry_run: true, summary, recipient });
        continue;
      }

      const sendResult = await sendEmail(recipient, subject, html);

      // Log into notifications_log
      await supabase.from("notifications_log").insert({
        type: "monthly_recap",
        recipient_email: recipient,
        recipient_name: biz.name,
        subject,
        body: html,
        status: sendResult.status,
      });

      // Idempotent recap entry
      const { error: logErr } = await supabase.from("monthly_recap_log").insert({
        business_id: biz.id,
        period_month: periodMonth,
        recipient_email: recipient,
        summary,
        status: sendResult.status,
      });
      if (logErr) console.error("monthly_recap_log insert failed", logErr);

      console.log(`monthly-roi-recap: business=${biz.id} status=${sendResult.status} recipient=${recipient}`);
      results.push({ business_id: biz.id, status: sendResult.status });
    }

    return new Response(JSON.stringify({ ok: true, period: periodMonth, count: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("monthly-roi-recap error", err);
    return new Response(JSON.stringify({ error: err?.message || "internal_error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});