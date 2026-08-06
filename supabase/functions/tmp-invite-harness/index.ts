// TEMPORARY test harness for the invite-code release flow. Deleted after the
// end-to-end run. Guarded by CRON_SECRET.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok");
  const secret = Deno.env.get("CRON_SECRET") || "";
  if (!secret || req.headers.get("x-cron-secret") !== secret) {
    return new Response(JSON.stringify({ error: "forbidden" }), { status: 403 });
  }
  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );
  const body = await req.json();
  const out: Record<string, unknown> = {};

  if (body.action === "release") {
    const { data, error } = await admin.rpc("fn_release_invite_code", { p_session_id: body.session_id });
    out.released = data;
    out.error = error?.message ?? null;
  }

  if (body.action === "state") {
    const { data: codes } = await admin.from("invite_codes").select("*").eq("code", body.code);
    const { data: reds } = await admin.from("invite_redemptions").select("*");
    out.codes = codes;
    out.redemptions = reds;
  }

  if (body.action === "cleanup") {
    if (body.user_id) {
      await admin.from("invite_redemptions").delete().eq("user_id", body.user_id);
      await admin.from("businesses").delete().eq("user_id", body.user_id);
      await admin.from("profiles").delete().eq("user_id", body.user_id);
      await admin.from("user_roles").delete().eq("user_id", body.user_id);
      const { error } = await admin.auth.admin.deleteUser(body.user_id);
      out.user_deleted = error?.message ?? true;
    }
    if (body.code) {
      const { data: c } = await admin.from("invite_codes").select("id").eq("code", body.code);
      const id = c?.[0]?.id;
      if (id) {
        await admin.from("invite_redemptions").delete().eq("invite_code_id", id);
        await admin.from("invite_codes").delete().eq("id", id);
      }
      out.code_deleted = !!id;
    }
    const { data: users } = await admin.auth.admin.listUsers();
    out.user_count = users?.users?.length ?? null;
    out.user_emails = users?.users?.map((u) => u.email);
  }

  return new Response(JSON.stringify(out), { headers: { "Content-Type": "application/json" } });
});
