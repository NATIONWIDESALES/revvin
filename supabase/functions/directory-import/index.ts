// Service-only batch import of directory listings (businesses that have not signed up).
// Callable with the service credential or by a signed-in super admin.
import { createClient } from "npm:@supabase/supabase-js@2.97.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2.97.0/cors";
import { checkCronAuth } from "../_shared/cron-auth.ts";
import { isPlatformAdmin } from "../_shared/admin-auth.ts";
import { validateImportBatch } from "../_shared/directory.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

  if (!checkCronAuth(req).ok) {
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "unauthorized" }, 401);
    const { data } = await createClient(url, anonKey).auth.getUser(token);
    if (!data?.user) return json({ error: "unauthorized" }, 401);
    const caller = createClient(url, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } } });
    if (!(await isPlatformAdmin(admin, data.user, caller))) return json({ error: "forbidden" }, 403);
  }

  const body = await req.json().catch(() => null);
  const checked = validateImportBatch((body as { rows?: unknown } | null)?.rows);
  if ("error" in checked) return json({ error: checked.error }, 400);
  if (checked.rows.length === 0) return json({ inserted: 0, updated: 0, rejected: checked.rejected.length, errors: checked.rejected.slice(0, 50) });

  const { data, error } = await admin.rpc("fn_directory_import", { p_rows: checked.rows });
  if (error) { console.error("[directory-import]", error.message); return json({ error: "import_failed" }, 500); }
  const counts = data as { inserted: number; updated: number };
  return json({ ...counts, rejected: checked.rejected.length, errors: checked.rejected.slice(0, 50) });
});
