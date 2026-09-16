import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

/**
 * Called by the service worker's pushsubscriptionchange handler, which has no
 * user session available. The browser hands us the endpoint it is replacing, and
 * that endpoint is an unguessable per-device URL, so it is what identifies the
 * row. Nothing is read back to the caller and no new row is created: an unknown
 * old endpoint is answered with a plain ok and ignored.
 */

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const str = (value: unknown, max: number) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let payload: Record<string, any>;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const oldEndpoint = str(payload.old_endpoint, 800);
  const endpoint = str(payload?.subscription?.endpoint, 800);
  const p256dh = str(payload?.subscription?.keys?.p256dh, 300);
  const auth = str(payload?.subscription?.keys?.auth, 300);
  if (!oldEndpoint || !endpoint || !p256dh || !auth) {
    return json({ error: "old_endpoint and subscription are required" }, 400);
  }
  if (!/^https:\/\//.test(endpoint)) return json({ error: "Invalid endpoint" }, 400);

  const db = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const { error } = await db
    .from("push_subscriptions")
    .update({
      endpoint,
      p256dh,
      auth,
      failed_count: 0,
      disabled_at: null,
      last_used_at: new Date().toISOString(),
    })
    .eq("endpoint", oldEndpoint);

  if (error) {
    console.error("[push-resubscribe] update failed", error.message);
    return json({ error: "Could not update the subscription" }, 500);
  }
  return json({ ok: true });
});
