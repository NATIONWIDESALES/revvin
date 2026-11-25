// Public "Request a quote" form on Pro profiles. Saves to quote_requests and
// emails the business through the transactional queue, reply-to the requester.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.97.0";
import { effectivePlan } from "../_shared/effective-plan.ts";
import { esc } from "../_shared/outreach.ts";
import { validateQuote } from "../_shared/reviews.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

async function ipKey(req: Request) {
  const ip = req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`quote:${ip}`));
  return Array.from(new Uint8Array(d).slice(0, 12), (b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  let raw: unknown;
  try { raw = await req.json(); } catch { return json({ error: "invalid_body" }, 400); }
  const v = validateQuote(raw);
  // The honeypot answers like a success so bots learn nothing.
  if (!v.ok) return v.error === "spam" ? json({ ok: true }) : json({ error: v.error }, 400);
  const q = v.value;

  const url = Deno.env.get("SUPABASE_URL"), serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return json({ error: "Server configuration error" }, 500);
  const db = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: rows } = await db.from("businesses")
    .select("id, name, slug, business_email, account_status, is_published, is_disabled, is_internal, is_demo")
    .eq("slug", q.slug).limit(1);
  const b = rows?.[0];
  const live = b && b.account_status === "approved" && b.is_published && !b.is_disabled && !b.is_demo;
  if (!b || !live) return json({ error: "not_found" }, 404);
  try { if ((await effectivePlan(db, b.id)) !== "pro") return json({ error: "not_available" }, 403); }
  catch { return json({ error: "unavailable" }, 503); }

  const key = await ipKey(req);
  for (const [k, w, m] of [[`quote_ip:${key}`, "1 hour", 5], [`quote_biz:${b.id}`, "1 hour", 20], [`quote_biz_day:${b.id}`, "24 hours", 60]] as const) {
    const { data: ok, error } = await db.rpc("fn_rate_bucket_hit", { p_key: k, p_window: w, p_max_hits: m });
    if (error) return json({ error: "unavailable" }, 503);
    if (ok === false) return json({ error: "rate_limited" }, 429);
  }

  const { data: row, error } = await db.from("quote_requests")
    .insert({ business_id: b.id, name: q.name, email: q.email, phone: q.phone, message: q.message }).select("id").single();
  if (error || !row) return json({ error: "save_failed" }, 500);

  if (b.business_email) {
    const lines = [`Name: ${q.name}`, `Email: ${q.email}`, q.phone ? `Phone: ${q.phone}` : null, q.message ? `Message: ${q.message}` : null].filter(Boolean) as string[];
    await db.rpc("enqueue_email", {
      queue_name: "transactional_emails",
      payload: {
        to: b.business_email, from: "Revvin <info@revvin.co>", reply_to: q.email,
        subject: `New quote request from ${q.name}`.slice(0, 200),
        text: `You have a new quote request from your Revvin profile.\n\n${lines.join("\n")}\n\nReply to this email to answer ${q.name} directly.`,
        html: `<p>You have a new quote request from your Revvin profile.</p>${lines.map((l) => `<p>${esc(l)}</p>`).join("")}<p>Reply to this email to answer ${esc(q.name)} directly.</p>`,
        purpose: "transactional", label: "quote_request", queued_at: new Date().toISOString(),
        idempotency_key: `quote_request:${row.id}`, message_id: crypto.randomUUID(),
      },
    });
  }
  return json({ ok: true });
});
