import { createClient } from "https://esm.sh/@supabase/supabase-js@2.97.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2.97.0/cors";
import { z } from "npm:zod@3.23.8";

const Fields = z.object({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(100),
  name: z.string().trim().min(1).max(120),
  role: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().max(40).optional().default(""),
  details: z.string().trim().min(5).max(3000),
  visitor: z.string().max(0).optional().default(""),
});

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

async function visitorHash(req: Request) {
  const ip = req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`ownership_dispute:${ip}`));
  return Array.from(new Uint8Array(bytes).slice(0, 16), (b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  let form: FormData;
  try { form = await req.formData(); } catch { return json({ error: "invalid_body" }, 400); }
  const parsed = Fields.safeParse(Object.fromEntries([...form.entries()].filter(([, value]) => typeof value === "string")));
  if (!parsed.success) return json({ error: "invalid_request" }, 400);
  if (parsed.data.visitor) return json({ ok: true });

  const proof = form.get("proof");
  if (proof !== null && !(proof instanceof File)) return json({ error: "invalid_document" }, 400);
  if (proof instanceof File && proof.size > 0) {
    if (proof.size > 10 * 1024 * 1024 || !["application/pdf", "image/jpeg", "image/png"].includes(proof.type)) {
      return json({ error: "invalid_document" }, 400);
    }
  }

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return json({ error: "unavailable" }, 503);
  const db = createClient(url, serviceKey, { auth: { persistSession: false } });
  const disputeId = crypto.randomUUID();
  let path: string | null = null;

  if (proof instanceof File && proof.size > 0) {
    const ext = proof.type === "application/pdf" ? "pdf" : proof.type === "image/jpeg" ? "jpg" : "png";
    path = `disputes/${disputeId}.${ext}`;
    const { error } = await db.storage.from("ownership-verification").upload(path, proof, { contentType: proof.type });
    if (error) return json({ error: "upload_failed" }, 500);
  }

  const { error } = await db.rpc("fn_ownership_file_dispute", {
    p_slug: parsed.data.slug,
    p_name: parsed.data.name,
    p_role: parsed.data.role,
    p_email: parsed.data.email.toLowerCase(),
    p_phone: parsed.data.phone || null,
    p_details: parsed.data.details,
    p_file_path: path,
    p_visitor_hash: await visitorHash(req),
  });
  if (error) {
    if (path) await db.storage.from("ownership-verification").remove([path]);
    const message = error.message.includes("rate_limited") ? "rate_limited" : error.message.includes("not_found") ? "not_found" : "submit_failed";
    return json({ error: message }, message === "rate_limited" ? 429 : message === "not_found" ? 404 : 400);
  }
  return json({ ok: true });
});
