// Referrer-side notifications for the payout loop.
//
// Two events, both emailed to the REFERRER (never the lead, never the owner):
//   kind = "created" -> the business closed the deal, a reward is now owed
//   kind = "paid"    -> the business marked that reward as paid
//
// Design constraints:
//   - At-most-once per event via an atomic conditional UPDATE on rewards
//     (created_notified_at / paid_notified_at), the same claim pattern as
//     notify-new-lead. Two columns, never one shared column.
//   - Owner-initiated, so the caller's JWT is resolved and ownership of the
//     business is verified, same as notify-deal-closed. Admins may also call.
//   - No email on file means skip silently with 200 so the owner's action in
//     the dashboard never fails because of a missing contact.
//   - Suppression (per-business + platform) is checked, and every email carries
//     a working unsubscribe link backed by unsubscribe_tokens.
//   - The lead's personal details are NEVER included. The referrer only ever
//     sees the business name, the amount, and their own links.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { appUrl, RESEND_FROM_ADDRESS, RESEND_REPLY_TO } from "../_shared/app-config.ts";
import { sendEmailViaGateway } from "../_shared/resend-gateway.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const esc = (s: unknown) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const fmtUsd = (n: number) =>
  `$${(Math.round((n || 0) * 100) / 100).toLocaleString("en-US")}`;

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const rewardId = body?.reward_id ? String(body.reward_id) : "";
    const kind = body?.kind === "paid" ? "paid" : body?.kind === "created" ? "created" : "";
    if (!rewardId || !kind) return json({ error: "reward_id and kind (created|paid) required" }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    // ---- Authenticate the caller from the bearer token only. Never trust ids
    // supplied in the request body for identity.
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
    if (!token) return json({ error: "unauthorized" }, 401);
    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );
    const { data: userRes } = await anonClient.auth.getUser(token);
    const user = userRes?.user;
    if (!user) return json({ error: "unauthorized" }, 401);

    const { data: rewardRows } = await supabase
      .from("rewards")
      .select("id, business_id, lead_id, referrer_name, referrer_contact, amount, status, created_notified_at, paid_notified_at")
      .eq("id", rewardId)
      .limit(1);
    const reward = rewardRows?.[0];
    if (!reward) return json({ error: "reward not found" }, 404);

    const { data: bizRows } = await supabase
      .from("businesses")
      .select("id, name, slug, user_id")
      .eq("id", reward.business_id)
      .limit(1);
    const biz = bizRows?.[0];
    if (!biz) return json({ error: "business not found" }, 404);

    // ---- Authorize: caller owns the business, or is a platform admin.
    if (biz.user_id !== user.id) {
      const { data: roleRow } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .limit(1);
      if (!roleRow?.length) return json({ error: "forbidden" }, 403);
    }

    if (kind === "paid" && reward.status !== "paid") {
      return json({ ok: true, skipped: "reward_not_paid" });
    }

    // ---- Resolve the referrer's email: reward row first, then the lead.
    let email = String(reward.referrer_contact ?? "").trim().toLowerCase();
    let referrerName = String(reward.referrer_name ?? "").trim();
    let statusToken: string | null = null;

    if (reward.lead_id) {
      const { data: leadRows } = await supabase
        .from("leads")
        .select("referrer_email, referrer_name, status_token")
        .eq("id", reward.lead_id)
        .limit(1);
      const lead = leadRows?.[0];
      if (lead) {
        statusToken = lead.status_token ?? null;
        if (!referrerName) referrerName = String(lead.referrer_name ?? "").trim();
        if (!isEmail(email)) email = String(lead.referrer_email ?? "").trim().toLowerCase();
      }
    }

    // referrer_contact can legitimately hold a phone number. Anything that is
    // not an email is not something we may auto-send to: SMS is device-native.
    if (!isEmail(email)) return json({ ok: true, skipped: "no_referrer_email" });

    // ---- Suppression, per business and platform wide.
    const [{ data: bizSuppressed }, { data: platformSuppressed }] = await Promise.all([
      supabase
        .from("suppressed_contacts")
        .select("id")
        .eq("business_id", biz.id)
        .eq("contact_type", "email")
        .eq("contact_value", email)
        .limit(1),
      supabase.from("suppressed_emails").select("id").eq("email", email).limit(1),
    ]);
    if (bizSuppressed?.length || platformSuppressed?.length) {
      return json({ ok: true, skipped: "recipient_suppressed" });
    }

    // ---- Atomic at-most-once claim. The UPDATE only matches while the column
    // is still NULL, so concurrent calls can never both send.
    const column = kind === "created" ? "created_notified_at" : "paid_notified_at";
    const nowIso = new Date().toISOString();
    const { data: claimed } = await supabase
      .from("rewards")
      .update({ [column]: nowIso })
      .eq("id", reward.id)
      .is(column, null)
      .select("id");
    if (!claimed?.length) return json({ ok: true, skipped: "already_notified" });

    const release = async () => {
      await supabase.from("rewards").update({ [column]: null }).eq("id", reward.id);
    };

    // ---- Unsubscribe token, one per (business, contact). Reuse if present.
    let unsubToken: string | null = null;
    const { data: existingToken } = await supabase
      .from("unsubscribe_tokens")
      .select("token")
      .eq("business_id", biz.id)
      .eq("contact_type", "email")
      .eq("contact_value", email)
      .limit(1);
    unsubToken = existingToken?.[0]?.token ?? null;
    if (!unsubToken) {
      unsubToken = crypto.randomUUID().replace(/-/g, "");
      const { error: tokenErr } = await supabase.from("unsubscribe_tokens").insert({
        token: unsubToken,
        business_id: biz.id,
        contact_type: "email",
        contact_value: email,
      });
      if (tokenErr) {
        await release();
        return json({ ok: false, error: "unsubscribe_token_failed" }, 500);
      }
    }

    const unsubscribeUrl =
      `${Deno.env.get("SUPABASE_URL")}/functions/v1/handle-unsubscribe?token=${unsubToken}`;
    const statusUrl = statusToken ? appUrl(`/r/status/${statusToken}`) : null;
    const referAgainUrl = biz.slug ? appUrl(`/r/${biz.slug}`) : null;
    const amount = Number(reward.amount || 0);
    const amountLabel = amount > 0 ? fmtUsd(amount) : null;
    const first = (referrerName || "").split(/\s+/)[0] || "there";
    const bizName = biz.name || "The business";

    let subject: string;
    let heading: string;
    let lead: string;
    let ctaLabel: string | null = null;
    let ctaUrl: string | null = null;

    if (kind === "created") {
      subject = amountLabel
        ? `${bizName} closed your referral - ${amountLabel} owed to you`
        : `${bizName} closed the deal you referred`;
      heading = "Good news, your referral closed";
      lead = amountLabel
        ? `${esc(bizName)} closed the deal you referred. They owe you ${esc(amountLabel)} and will pay you directly.`
        : `${esc(bizName)} closed the deal you referred. They will arrange your reward with you directly.`;
      if (statusUrl) {
        ctaLabel = "Track this referral";
        ctaUrl = statusUrl;
      }
    } else {
      subject = amountLabel
        ? `${bizName} marked your ${amountLabel} reward as paid`
        : `${bizName} marked your reward as paid`;
      heading = "Your reward was marked paid";
      lead = amountLabel
        ? `${esc(bizName)} marked your ${esc(amountLabel)} reward as paid.`
        : `${esc(bizName)} marked your reward as paid.`;
      if (referAgainUrl) {
        ctaLabel = "Refer someone else";
        ctaUrl = referAgainUrl;
      } else if (statusUrl) {
        ctaLabel = "View this referral";
        ctaUrl = statusUrl;
      }
    }

    const secondary =
      kind === "created"
        ? `Revvin tracks the referral. We do not move the money, so the payment comes straight from ${esc(bizName)}.`
        : `If you have not received it yet, reply to ${esc(bizName)} directly. Revvin records the payment but never handles the money.`;

    const html = `<!doctype html><html><body style="margin:0;padding:0;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Inter',Segoe UI,Roboto,sans-serif;color:#0f172a">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px">
    <div style="font-size:13px;color:#15803d;font-weight:600;letter-spacing:.04em;text-transform:uppercase">Revvin</div>
    <h1 style="margin:8px 0 8px;font-size:23px;line-height:1.25;font-weight:600">${esc(heading)}</h1>
    <p style="margin:0 0 18px;color:#334155;font-size:15px">Hi ${esc(first)}, ${lead}</p>
    ${amountLabel ? `<div style="background:#f6f7f9;border:1px solid #e2e8f0;border-radius:14px;padding:20px;margin-bottom:20px">
      <div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.06em;font-weight:600">Your reward</div>
      <div style="font-size:26px;font-weight:600;color:#15803d;margin-top:6px">${esc(amountLabel)}</div>
      <div style="font-size:13px;color:#64748b;margin-top:6px">Paid to you directly by ${esc(bizName)}</div>
    </div>` : ""}
    <p style="margin:0 0 20px;font-size:14px;color:#475569">${secondary}</p>
    ${ctaUrl ? `<a href="${ctaUrl}" style="display:inline-block;background:#15803d;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600;font-size:14px">${esc(ctaLabel)}</a>` : ""}
    <p style="margin:28px 0 0;font-size:12px;color:#94a3b8">You are getting this because you referred someone to ${esc(bizName)} through Revvin. <a href="${unsubscribeUrl}" style="color:#64748b">Unsubscribe</a> to stop these messages.</p>
  </div>
</body></html>`;

    const idempotencyKey = `reward-${kind}-${reward.id}`;
    const send = await sendEmailViaGateway({
      from: RESEND_FROM_ADDRESS,
      to: email,
      reply_to: RESEND_REPLY_TO,
      subject,
      html,
      idempotencyKey,
    });

    await supabase.from("email_send_log").insert({
      message_id: idempotencyKey,
      template_name: kind === "created" ? "referrer-reward-owed" : "referrer-reward-paid",
      recipient_email: email,
      status: send.success ? "sent" : "failed",
      error_message: send.success ? null : send.error?.slice(0, 500),
      metadata: { business_id: biz.id, reward_id: reward.id, kind },
    });

    if (!send.success) {
      // Give the claim back so a later attempt can retry. The owner's action in
      // the dashboard still succeeds either way.
      await release();
      return json({ ok: false, error: send.error }, 200);
    }

    return json({ ok: true, sent: true, kind });
  } catch (err) {
    console.error("[notify-referrer-reward] error", err);
    return json({ error: (err as Error).message }, 500);
  }
});
