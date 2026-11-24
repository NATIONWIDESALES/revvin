// Emails a business's five print-ready PDFs to a print shop at the owner's
// request. Transactional: one recipient the owner typed, plus an optional copy
// to the owner. The browser uploads the PDFs into the private print-kits
// bucket; this function checks ownership and limits, signs 30-day links and sends.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.97.0";
import { RESEND_FROM_ADDRESS } from "../_shared/app-config.ts";
import { customerFromAddress, customerReplyTo, isSuppressed, postalAddressOf } from "../_shared/outreach.ts";
import { sendEmailViaGateway } from "../_shared/resend-gateway.ts";
import {
  businessDecision, PRINT_KIT_BUCKET, PRINT_KIT_LINK_DAYS, PRINT_KIT_PIECES, printFileName, printKitEmail,
  rateLimitDecision, REFUSAL_STATUS, sanitizeNote, validKitFolder, validPrintShopEmail, type PrintKitRefusal,
} from "../_shared/print-kit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const refuse = (code: PrintKitRefusal) => json({ error: code, code }, REFUSAL_STATUS[code]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return refuse("unauthorized");

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anonKey || !serviceKey) return json({ error: "Server configuration error" }, 500);

  const anonClient = createClient(url, anonKey, { auth: { persistSession: false } });
  const { data: { user }, error: userError } = await anonClient.auth.getUser(authHeader.slice(7));
  if (userError || !user) return refuse("unauthorized");

  let input: { recipient?: unknown; note?: unknown; copy_to_me?: unknown; folder?: unknown };
  try { input = await req.json(); } catch { return json({ error: "Invalid JSON body" }, 400); }

  const db = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: rows } = await db.from("businesses")
    .select("id, user_id, name, slug, is_disabled, is_demo, business_email, street_address, city, postal_code, country")
    .eq("user_id", user.id).limit(1);
  const business = rows?.[0] ?? null;
  const bizRefusal = businessDecision(business, user.id);
  if (bizRefusal || !business) return refuse(bizRefusal ?? "business_not_found");

  if (!validPrintShopEmail(input.recipient)) return refuse("invalid_recipient");
  const recipient = String(input.recipient).trim().toLowerCase();
  try { if (await isSuppressed(db, business.id, recipient)) return refuse("recipient_suppressed"); }
  catch { return json({ error: "Could not check the recipient. Try again." }, 503); }

  const now = Date.now();
  const [{ count: day }, { count: month }] = await Promise.all([
    db.from("print_kit_sends").select("id", { count: "exact", head: true }).eq("business_id", business.id).gte("created_at", new Date(now - 86_400_000).toISOString()),
    db.from("print_kit_sends").select("id", { count: "exact", head: true }).eq("business_id", business.id).gte("created_at", new Date(now - 30 * 86_400_000).toISOString()),
  ]);
  const limited = rateLimitDecision(day ?? 0, month ?? 0);
  if (limited) return refuse(limited);

  if (!validKitFolder(input.folder, business.id) || !business.slug) return refuse("invalid_folder");
  const links: Array<{ id: string; url: string }> = [];
  for (const piece of PRINT_KIT_PIECES) {
    const path = `${input.folder}/${printFileName(business.slug, piece.id)}`;
    const { data, error } = await db.storage.from(PRINT_KIT_BUCKET).createSignedUrl(path, PRINT_KIT_LINK_DAYS * 86_400);
    if (error || !data?.signedUrl) return refuse("files_missing");
    links.push({ id: piece.id, url: data.signedUrl });
  }

  const addr = postalAddressOf(business);
  const email = printKitEmail({
    businessName: business.name,
    note: sanitizeNote(input.note),
    links,
    address: addr ? [addr.street_address, addr.city, addr.postal_code, addr.country].join(", ") : null,
  });
  const copyToMe = input.copy_to_me === true && !!user.email;
  const to = copyToMe && user.email!.toLowerCase() !== recipient ? [recipient, user.email!.toLowerCase()] : [recipient];

  // Record first so a provider retry cannot slip past the limits.
  const { data: sendRow, error: insertError } = await db.from("print_kit_sends")
    .insert({ business_id: business.id, recipient_email: recipient, copy_to_owner: copyToMe })
    .select("id, created_at").single();
  if (insertError || !sendRow) return json({ error: "Could not record the send" }, 500);

  const result = await sendEmailViaGateway({
    from: customerFromAddress(business.name, RESEND_FROM_ADDRESS),
    to,
    reply_to: customerReplyTo(business.business_email, user.email),
    subject: email.subject,
    html: email.html,
    text: email.text,
    idempotencyKey: `print-kit-${sendRow.id}`,
  });
  await db.from("email_send_log").insert({
    message_id: result.id || `print-kit-${sendRow.id}`,
    template_name: "print-kit",
    recipient_email: recipient,
    status: result.success ? "sent" : "failed",
    error_message: result.success ? null : String(result.error || "send failed").slice(0, 500),
  });
  if (!result.success) {
    // A failed send does not use up the owner's allowance.
    await db.from("print_kit_sends").delete().eq("id", sendRow.id);
    if (result.error === "recipient_suppressed") return refuse("recipient_suppressed");
    return json({ error: "send_failed", code: "send_failed" }, 502);
  }
  return json({ ok: true, id: sendRow.id, sent_at: sendRow.created_at, recipient });
});
