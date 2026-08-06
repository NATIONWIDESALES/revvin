import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
serve(async (req) => {
  if (req.headers.get("x-cron-secret") !== (Deno.env.get("CRON_SECRET") || "x")) {
    return new Response("forbidden", { status: 403 });
  }
  const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", { auth: { persistSession: false } });
  const { data: users } = await admin.auth.admin.listUsers();
  const purged: string[] = [];
  for (const u of (users?.users ?? []).filter((x) => (x.email ?? "").endsWith("@revvin.test"))) {
    await admin.from("businesses").delete().eq("user_id", u.id);
    await admin.from("profiles").delete().eq("user_id", u.id);
    await admin.from("user_roles").delete().eq("user_id", u.id);
    const { error } = await admin.auth.admin.deleteUser(u.id);
    purged.push(`${u.email}:${error ? error.message : "deleted"}`);
  }
  const { data: after } = await admin.auth.admin.listUsers();
  return new Response(JSON.stringify({ purged, user_count: after?.users?.length, emails: after?.users?.map((u) => u.email) }), { headers: { "Content-Type": "application/json" } });
});
