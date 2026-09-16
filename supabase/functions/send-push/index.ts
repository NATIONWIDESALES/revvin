import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { sendPush, vapidConfigured } from "../_shared/push.ts";
import { checkCronAuth } from "../_shared/cron-auth.ts";

/**
 * Sends a web push notification.
 *
 * Two ways in, and nothing else:
 *  - backend: the cron secret or the exact service role key, which may target
 *    any user_id or business_id;
 *  - signed in user: a test path that can only ever reach their own devices.
 */

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const admin = () =>
  createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

const str = (value: unknown, max: number) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!vapidConfigured()) return json({ error: "Push is not configured" }, 503);

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const title = str(payload.title, 120);
  const body = str(payload.body, 300);
  const url = str(payload.url, 300) || "/dashboard";
  const tag = str(payload.tag, 60) || "revvin";
  if (!title) return json({ error: "title is required" }, 400);

  const db = admin();
  const backend = checkCronAuth(req, {
    cronSecret: Deno.env.get("CRON_SECRET") ?? "",
    serviceRoleKey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  }).ok;

  if (backend) {
    const target = {
      user_id: str(payload.user_id, 40) || null,
      business_id: str(payload.business_id, 40) || null,
    };
    if (!target.user_id && !target.business_id) {
      return json({ error: "user_id or business_id is required" }, 400);
    }
    const result = await sendPush(db, target, { title, body, url, tag });
    return json({ ok: true, ...result });
  }

  // Signed in test path: the caller's own devices only, whatever they ask for.
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "Unauthorized" }, 401);
  const anonClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { auth: { persistSession: false } },
  );
  const { data: userData, error: userErr } = await anonClient.auth.getUser(token);
  const user = userData?.user;
  if (userErr || !user) return json({ error: "Unauthorized" }, 401);

  const result = await sendPush(db, { user_id: user.id }, { title, body, url, tag });
  return json({ ok: true, ...result });
});
