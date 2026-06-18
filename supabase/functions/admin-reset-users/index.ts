import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

// One-time destructive reset of TEST data.
// Wipes auth.users + user-owned public tables, then creates a super admin.

const SUPER_ADMIN_EMAIL = "KARM@REVVIN.CO";

function genPassword(): string {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  const b64 = btoa(String.fromCharCode(...bytes)).replace(/[+/=]/g, "");
  return `Rv!${b64.slice(0, 16)}9`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

    const cleared: Record<string, number> = {};
    // Tables to fully clear. Order matters only for FK constraints we do not have cascades for.
    const tables = [
      "audit_log",
      "notifications",
      "notifications_log",
      "saved_offers",
      "user_badges",
      "referral_contacts",
      "referral_triggers",
      "referrals",
      "leads",
      "callback_requests",
      "reward_tiers",
      "seasonal_campaigns",
      "campaign_sends",
      "campaign_contacts",
      "campaign_templates",
      "campaigns",
      "send_log",
      "sms_outbound_log",
      "email_send_log",
      "email_send_state",
      "email_unsubscribe_tokens",
      "unsubscribe_tokens",
      "suppressed_contacts",
      "suppressed_emails",
      "notification_settings",
      "launch_tasks",
      "monthly_recap_log",
      "offers",
      "businesses",
      "profiles",
      "user_roles",
    ];

    for (const t of tables) {
      const { count: before } = await admin.from(t).select("*", { count: "exact", head: true });
      const { error } = await admin.from(t).delete().not("id", "is", null);
      if (error) {
        // try without id filter (in case of composite PK)
        const { error: e2 } = await admin.from(t).delete().gte("created_at", "1900-01-01");
        if (e2) {
          cleared[t] = -1;
          console.error("clear failed", t, error.message, e2.message);
          continue;
        }
      }
      cleared[t] = before ?? 0;
    }

    // Delete all auth users (paginate)
    let deletedUsers = 0;
    let page = 1;
    while (true) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
      if (error) throw error;
      const users = data.users ?? [];
      if (users.length === 0) break;
      for (const u of users) {
        const { error: delErr } = await admin.auth.admin.deleteUser(u.id);
        if (!delErr) deletedUsers++;
        else console.error("delete user failed", u.email, delErr.message);
      }
      if (users.length < 200) break;
      // After deletion, page 1 should now be fresh; stay on page 1.
    }

    // Create super admin
    const tempPassword = genPassword();
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: SUPER_ADMIN_EMAIL,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: "Karm (Super Admin)", role: "referrer" },
    });
    if (createErr) throw createErr;

    const newUserId = created.user!.id;

    // Grant admin via user_roles (the existing mechanism: has_role(uid,'admin'))
    const { error: roleErr } = await admin
      .from("user_roles")
      .insert({ user_id: newUserId, role: "admin" });
    if (roleErr) throw roleErr;

    return new Response(
      JSON.stringify({
        ok: true,
        deletedUsers,
        cleared,
        superAdmin: {
          email: SUPER_ADMIN_EMAIL,
          user_id: newUserId,
          temp_password: tempPassword,
          mechanism: "public.user_roles row with role='admin' (checked by has_role(auth.uid(),'admin'))",
          email_confirmed: true,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e?.message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});