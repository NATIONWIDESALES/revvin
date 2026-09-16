import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { appUrl, RESEND_FROM_ADDRESS, RESEND_REPLY_TO } from "../_shared/app-config.ts";
import { sendEmailViaGateway } from "../_shared/resend-gateway.ts";
import { createNotificationWorker } from "../_shared/owner-notification-worker.ts";
import { sendPush } from "../_shared/push.ts";

// Deploy after the token-aware queue RPCs. Schedule POST with x-cron-secret or
// the exact configured service-role credential; never use browser JWT claims.
const handler = createNotificationWorker({
  credentials: {
    cronSecret: Deno.env.get("CRON_SECRET") ?? "",
    serviceRoleKey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  },
  createClient: () => createClient(
    Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  ),
  sendEmail: (params) => sendEmailViaGateway(params as unknown as Parameters<typeof sendEmailViaGateway>[0]),
  dashboardUrl: appUrl("/dashboard"), fromAddress: RESEND_FROM_ADDRESS, replyTo: RESEND_REPLY_TO,
  sendPush: async ({ business_id, user_id, title, body, url, tag }) => {
    const db = createClient(
      Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );
    const target = user_id ? { user_id } : { business_id };
    await sendPush(db, target, { title, body, url, tag });
  },
});
Deno.serve(handler);
