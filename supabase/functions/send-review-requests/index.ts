// Sends "How did {Business} do?" review requests to contacts the owner picked
// from their own customer list. Each request is a 'requested' review row with a
// one-use token, queued through the campaign_emails queue with the same From,
// Reply-To, unsubscribe link and postal footer as launch emails.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.97.0";
import { appUrl, RESEND_FROM_ADDRESS } from "../_shared/app-config.ts";
import { effectivePlan } from "../_shared/effective-plan.ts";
import { customerFromAddress, customerReplyTo, emailShell, esc, isSuppressed, unsubscribeUrlFor } from "../_shared/outreach.ts";
import { firstNameOf } from "../_shared/referral-launch.ts";
import {
  newReviewToken, REVIEW_BUTTON_LABEL, REVIEW_REQUEST_COOLDOWN_DAYS, REVIEW_REQUEST_MAX_PER_CALL,
  reviewBody, reviewMonthlyAllowance, reviewSubject,
} from "../_shared/reviews.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);
  const url = Deno.env.get("SUPABASE_URL"), anonKey = Deno.env.get("SUPABASE_ANON_KEY"), serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anonKey || !serviceKey) return json({ error: "Server configuration error" }, 500);
  const anonClient = createClient(url, anonKey, { auth: { persistSession: false } });
  const { data: { user } } = await anonClient.auth.getUser(auth.slice(7));
  if (!user) return json({ error: "unauthorized" }, 401);

  let input: { contact_ids?: unknown; dry_run?: unknown };
  try { input = await req.json(); } catch { return json({ error: "Invalid JSON body" }, 400); }
  const ids = Array.isArray(input.contact_ids) ? [...new Set(input.contact_ids.filter((x): x is string => typeof x === "string" && UUID.test(x)))] : [];
  if (ids.length === 0 || ids.length > REVIEW_REQUEST_MAX_PER_CALL) return json({ error: "invalid_contacts" }, 400);

  const db = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: bizRows } = await db.from("businesses")
    .select("id, user_id, name, slug, logo_url, business_email, street_address, city, postal_code, country, is_demo, is_disabled")
    .eq("user_id", user.id).limit(1);
  const biz = bizRows?.[0];
  if (!biz || biz.is_disabled) return json({ error: "business_not_found" }, 404);
  if (biz.is_demo) return json({ error: "demo_account" }, 403);

  let pro = false;
  try { pro = (await effectivePlan(db, biz.id)) === "pro"; } catch { return json({ error: "plan_unavailable" }, 503); }
  const monthStart = new Date(); monthStart.setUTCDate(1); monthStart.setUTCHours(0, 0, 0, 0);
  const { count: monthCount } = await db.from("business_reviews").select("id", { count: "exact", head: true })
    .eq("business_id", biz.id).gte("created_at", monthStart.toISOString());
  let allowance = reviewMonthlyAllowance(pro, monthCount ?? 0);

  const { data: contacts } = await db.from("referral_contacts").select("id, name, email, is_mock").eq("business_id", biz.id).in("id", ids);
  const since = new Date(Date.now() - REVIEW_REQUEST_COOLDOWN_DAYS * 86_400_000).toISOString();
  const { data: recent } = await db.from("business_reviews").select("contact_id").eq("business_id", biz.id).in("contact_id", ids).gte("created_at", since);
  const recentSet = new Set((recent ?? []).map((r) => r.contact_id));

  const results: Array<{ contact_id: string; status: string }> = [];
  for (const id of ids) {
    const c = contacts?.find((x) => x.id === id);
    if (!c) { results.push({ contact_id: id, status: "not_found" }); continue; }
    const email = String(c.email ?? "").trim().toLowerCase();
    if (!email || c.is_mock) { results.push({ contact_id: id, status: "no_email" }); continue; }
    if (recentSet.has(id)) { results.push({ contact_id: id, status: "asked_recently" }); continue; }
    if (allowance !== null && allowance <= 0) { results.push({ contact_id: id, status: "monthly_limit" }); continue; }
    try { if (await isSuppressed(db, biz.id, email)) { results.push({ contact_id: id, status: "unsubscribed" }); continue; } }
    catch { results.push({ contact_id: id, status: "check_failed" }); continue; }
    if (input.dry_run === true) { results.push({ contact_id: id, status: "would_send" }); if (allowance !== null) allowance--; continue; }

    const tokenUrl = await unsubscribeUrlFor(db, biz.id, email);
    if (!tokenUrl) { results.push({ contact_id: id, status: "unsubscribe_token_failed" }); continue; }
    const token = newReviewToken(() => crypto.getRandomValues(new Uint8Array(24)));
    const { data: row, error } = await db.from("business_reviews")
      .insert({ business_id: biz.id, contact_id: id, reviewer_email: email, token, status: "requested" }).select("id").single();
    if (error || !row) { results.push({ contact_id: id, status: "record_failed" }); continue; }

    const link = appUrl(`/review/${token}`);
    const subject = reviewSubject(biz.name).slice(0, 200);
    const [p1, p2] = reviewBody(biz.name, firstNameOf(c.name ?? ""));
    const inner = `<h1 style="margin:8px 0 14px;font-size:22px;line-height:1.3">${esc(subject)}</h1><p style="margin:0 0 14px;color:#475569;font-size:14px;line-height:1.6">${esc(p1)}</p><p style="margin:0 0 14px;color:#475569;font-size:14px;line-height:1.6">${esc(p2)}</p><p style="margin:18px 0 0"><a href="${esc(link)}" style="display:inline-block;background:#15803d;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600;font-size:14px">${REVIEW_BUTTON_LABEL}</a></p>`;
    const messageId = `review-request-${row.id}`;
    const { error: qErr } = await db.rpc("enqueue_email", {
      queue_name: "campaign_emails",
      payload: {
        business_id: biz.id, message_id: messageId, idempotency_key: messageId, queued_at: new Date().toISOString(),
        to: email, from: customerFromAddress(biz.name, RESEND_FROM_ADDRESS), reply_to: customerReplyTo(biz.business_email),
        subject,
        html: emailShell(biz.name, inner, tokenUrl, { street_address: biz.street_address, city: biz.city, postal_code: biz.postal_code, country: biz.country }),
        label: "review-request", purpose: "marketing", unsubscribe_token: tokenUrl.split("token=")[1] || null,
      },
    });
    if (qErr) { await db.from("business_reviews").delete().eq("id", row.id).eq("status", "requested"); results.push({ contact_id: id, status: "queue_failed" }); continue; }
    if (allowance !== null) allowance--;
    results.push({ contact_id: id, status: "sent" });
  }
  return json({ ok: true, results, sent: results.filter((r) => r.status === "sent" || r.status === "would_send").length, remaining_this_month: allowance });
});
