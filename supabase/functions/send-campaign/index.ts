import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { appUrl, RESEND_FROM_ADDRESS } from "../_shared/app-config.ts";
import { emailShell, esc, isSuppressed, renderTokens, unsubscribeUrlFor } from "../_shared/outreach.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_RECIPIENTS = 500;
const UNDELIVERABLE_DOMAINS = new Set(["example.com", "example.net", "example.org", "test.com"]);

const SEGMENTS: Record<string, { label: string; minMonths: number | null; maxMonths: number | null }> = {
  m24_plus: { label: "24 months or more", minMonths: 24, maxMonths: null },
  m12_24: { label: "12 to 24 months", minMonths: 12, maxMonths: 24 },
  m6_12: { label: "6 to 12 months", minMonths: 6, maxMonths: 12 },
  recent: { label: "Under 6 months", minMonths: 0, maxMonths: 6 },
  unknown: { label: "No last job date", minMonths: null, maxMonths: null },
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function monthsAgo(months: number) {
  const date = new Date();
  date.setMonth(date.getMonth() - months);
  return date.getTime();
}

function inSegment(contact: { last_job_at?: string | null }, segment: typeof SEGMENTS[string]) {
  if (!contact.last_job_at) return segment === SEGMENTS.unknown;
  const time = new Date(contact.last_job_at).getTime();
  if (!Number.isFinite(time)) return segment === SEGMENTS.unknown;
  if (segment === SEGMENTS.unknown) return false;
  if (segment.minMonths !== null && time > monthsAgo(segment.minMonths)) return false;
  return segment.maxMonths === null || time >= monthsAgo(segment.maxMonths);
}

function invalidEmail(email: string) {
  const value = email.trim().toLowerCase();
  const [local, domain] = value.split("@");
  return !local || !domain || !domain.includes(".") || local.startsWith("test") || UNDELIVERABLE_DOMAINS.has(domain);
}

function paragraphs(value: string) {
  return value
    .split(/\n{2,}/)
    .map((paragraph) => `<p style="margin:0 0 14px;color:#475569;font-size:14px;line-height:1.6">${paragraph.replace(/\n/g, "<br />")}</p>`)
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceKey) return json({ error: "Server configuration error" }, 500);

  const caller = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: { user }, error: userError } = await caller.auth.getUser();
  if (userError || !user) return json({ error: "Unauthorized" }, 401);

  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  let input: { name?: string; segment_key?: string; subject?: string; body?: string; consent_confirmed?: boolean };
  try {
    input = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const name = String(input.name || "").trim().slice(0, 100);
  const subjectTemplate = String(input.subject || "").trim().slice(0, 200);
  const bodyTemplate = String(input.body || "").trim().slice(0, 20000);
  const segmentKey = String(input.segment_key || "");
  const segment = SEGMENTS[segmentKey];
  if (!name || !subjectTemplate || !bodyTemplate || !segment) return json({ error: "Campaign name, subject, message, and a valid segment are required" }, 400);
  if (input.consent_confirmed !== true) return json({ error: "Customer relationship confirmation is required" }, 400);

  const { data: businesses, error: businessError } = await supabase
    .from("businesses")
    .select("id, user_id, name, slug, is_disabled, is_published, is_demo, street_address, city, postal_code, country, business_email, plan")
    .eq("user_id", user.id)
    .limit(1);
  const business = businesses?.[0];
  if (businessError || !business) return json({ error: "Business not found" }, 404);
  if (business.is_disabled) return json({ error: "This business is disabled" }, 403);
  if ((business.plan || "free") !== "pro") return json({ error: "Reactivation campaigns require Revvin Pro" }, 403);
  if (business.is_demo === true) return json({ error: "Campaign sending is disabled for demo accounts" }, 403);

  // Re-check every readiness field on the server. The browser is never trusted
  // to decide whether a commercial email can be composed or sent.
  const required = ["street_address", "city", "postal_code", "country", "business_email"] as const;
  const missing = required.filter((field) => !String(business[field] || "").trim());
  if (missing.length) return json({ error: "Campaign readiness is incomplete", missing }, 422);
  if (!business.is_published) return json({ error: "Publish your referral page before sending a campaign" }, 422);

  const { data: contacts, error: contactError } = await supabase
    .from("referral_contacts")
    .select("id, name, email, last_job_at, opted_out, is_mock")
    .eq("business_id", business.id)
    .limit(10000);
  if (contactError) return json({ error: "Could not load customers" }, 500);

  const reasons: Record<string, number> = {};
  const skipped = (reason: string) => { reasons[reason] = (reasons[reason] || 0) + 1; };
  const candidates: Array<{ id: string; name: string; email: string }> = [];
  const seen = new Set<string>();

  for (const contact of contacts ?? []) {
    if (!inSegment(contact, segment)) continue;
    const email = String(contact.email || "").trim().toLowerCase();
    if (contact.is_mock) { skipped("mock_contact"); continue; }
    if (contact.opted_out) { skipped("opted_out"); continue; }
    if (!email) { skipped("no_email"); continue; }
    if (invalidEmail(email)) { skipped("undeliverable_email"); continue; }
    if (seen.has(email)) { skipped("duplicate_email"); continue; }
    if (await isSuppressed(supabase, business.id, email)) { skipped("suppressed"); continue; }
    seen.add(email);
    candidates.push({ id: contact.id, name: String(contact.name || ""), email });
  }

  const truncated = candidates.length > MAX_RECIPIENTS;
  const recipients = candidates.slice(0, MAX_RECIPIENTS);
  if (truncated) skipped("over_500_campaign_cap");
  if (!recipients.length) return json({ campaign_id: null, queued: 0, skipped: Object.values(reasons).reduce((a, b) => a + b, 0), reasons });

  const segmentLabel = segment.label;
  const { data: campaign, error: campaignError } = await supabase
    .from("campaigns")
    .insert({
      business_id: business.id,
      name,
      channel: "email",
      subject: subjectTemplate,
      body: bodyTemplate,
      status: "sending",
      segment_key: segmentKey,
      segment_label: segmentLabel,
      consent_confirmed: true,
      created_by: user.id,
      total_recipients: recipients.length,
    })
    .select("id")
    .single();
  if (campaignError || !campaign) return json({ error: "Could not create campaign" }, 500);

  const sendRows: Array<Record<string, unknown>> = [];
  const messages: Array<Record<string, unknown>> = [];
  const referralUrl = appUrl(`/r/${business.slug || ""}`);
  const address = {
    street_address: String(business.street_address),
    city: String(business.city),
    postal_code: String(business.postal_code),
    country: String(business.country),
  };

  for (const contact of recipients) {
    const { data: tokenUrl } = await unsubscribeUrlFor(supabase, business.id, contact.email).then((url) => ({ data: url }));
    if (!tokenUrl) {
      skipped("unsubscribe_token_failed");
      continue;
    }
    const { data: sendRow, error: sendRowError } = await supabase
      .from("campaign_sends")
      .insert({
        campaign_id: campaign.id,
        contact_id: contact.id,
        business_id: business.id,
        recipient_email: contact.email,
        status: "pending",
      })
      .select("id")
      .single();
    if (sendRowError || !sendRow) {
      skipped("campaign_send_record_failed");
      continue;
    }
    sendRows.push(sendRow);
    const messageId = `campaign-${campaign.id}-${sendRow.id}`;
    const tokens = {
      first_name: contact.name.trim().split(/\s+/)[0] || "there",
      business_name: String(business.name),
    };
    const subject = renderTokens(subjectTemplate, tokens, false);
    const body = renderTokens(bodyTemplate, tokens, true);
    const inner = `<h1 style="margin:8px 0 14px;font-size:22px;line-height:1.3">${esc(subject)}</h1>${paragraphs(body)}<p style="margin:18px 0 0"><a href="${esc(referralUrl)}" style="display:inline-block;background:#15803d;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600;font-size:14px">Get in touch</a></p>`;
    messages.push({
      campaign_id: campaign.id,
      business_id: business.id,
      campaign_send_id: sendRow.id,
      message_id: messageId,
      idempotency_key: messageId,
      queued_at: new Date().toISOString(),
      to: contact.email,
      from: `${String(business.name).replace(/[<>]/g, "")} <${RESEND_FROM_ADDRESS.match(/<([^>]+)>/)?.[1] || "info@revvin.co"}>`,
      reply_to: String(business.business_email),
      subject,
      html: emailShell(String(business.name), inner, tokenUrl, address),
      label: "reactivation-campaign",
      purpose: "marketing",
      unsubscribe_token: tokenUrl.split("token=")[1] || null,
    });
  }

  if (messages.length) {
    for (const message of messages) {
      const { error } = await supabase.rpc("enqueue_email", { queue_name: "campaign_emails", payload: message });
      if (error) {
        await supabase.from("campaign_sends").update({ status: "failed", failure_reason: "queue_enqueue_failed" }).eq("id", message.campaign_send_id);
        skipped("queue_enqueue_failed");
      }
    }
  }

  const queued = messages.length - (reasons.queue_enqueue_failed || 0);
  if (!queued) {
    await supabase.from("campaigns").update({ status: "failed", total_recipients: 0 }).eq("id", campaign.id);
  } else if (reasons.queue_enqueue_failed) {
    await supabase.from("campaigns").update({ total_recipients: queued }).eq("id", campaign.id);
  }

  return json({
    campaign_id: campaign.id,
    queued,
    skipped: Object.values(reasons).reduce((a, b) => a + b, 0),
    reasons: { ...reasons, ...(truncated ? { truncated_to: MAX_RECIPIENTS } : {}) },
  });
});
