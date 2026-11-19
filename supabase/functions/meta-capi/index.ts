import { corsHeaders } from "npm:@supabase/supabase-js@2.119.0/cors";
import { createClient } from "npm:@supabase/supabase-js@2.119.0";
import { z } from "npm:zod@3.25.76";
import { eligibleBusinessRegistration, gatewayTransport, sendRegistration, validMetaCookie } from "../_shared/meta-registration.ts";

const bodySchema = z.object({ advertising_allowed: z.boolean(), country: z.string().regex(/^[A-Z]{2}$/).nullable(), fbc: z.string().max(540).optional(), fbp: z.string().max(100).optional() }).strict();
const blocked = new Set(["AT","BE","BG","HR","CY","CZ","DK","EE","FI","FR","DE","GR","HU","IS","IE","IT","LI","LV","LT","LU","MT","NL","NO","PL","PT","RO","SK","SI","ES","SE","GB","CH","XX","T1"]);
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) return json({ error: "Invalid registration request" }, 400);
    const body = parsed.data;
    if ((body.fbc && !validMetaCookie(body.fbc, true)) || (body.fbp && !validMetaCookie(body.fbp))) return json({ error: "Invalid identifier" }, 400);
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_ANON_KEY");
    const token = req.headers.get("Authorization")?.replace(/^Bearer /, "");
    if (!url || !key || !token) return json({ error: "Unauthorized" }, 401);
    const anonClient = createClient(url, key, { global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data: { user }, error } = await anonClient.auth.getUser(token);
    if (error || !user) return json({ error: "Unauthorized" }, 401);
    const { data: businesses } = await anonClient.from("businesses").select("id,created_at,is_demo").eq("user_id", user.id).order("created_at", { ascending: true }).limit(1);
    const business = businesses?.[0];
    // A signup-only endpoint, not a way to upload arbitrary historic accounts.
    // Metadata identifies signup intent only; authentication above still authorizes the caller.
    if (!eligibleBusinessRegistration(user, business)) return json({ ok: true, skipped: true });
    const permitted = body.advertising_allowed === true && Boolean(body.country && !blocked.has(body.country)) && req.headers.get("sec-gpc") !== "1" && req.headers.get("dnt") !== "1";
    const result = await sendRegistration({ userId: user.id, createdAt: user.created_at, advertisingAllowed: permitted,
      fbc: body.fbc, fbp: body.fbp, ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim(), userAgent: req.headers.get("user-agent")?.slice(0, 512) ?? "" },
      (() => {
        const lovableKey = Deno.env.get("LOVABLE_API_KEY"); const connectionKey = Deno.env.get("META_ADS_API_KEY");
        const ready = Boolean(lovableKey && connectionKey);
        return { token: ready ? connectionKey : undefined, testCode: Deno.env.get("META_CAPI_TEST_EVENT_CODE"), log: (message: string) => console.log(message),
          transport: ready ? gatewayTransport(lovableKey!, connectionKey!) : undefined };
      })());
    return json({ ok: true, skipped: result !== "sent" });
  } catch { return json({ ok: true, skipped: true }); }
});