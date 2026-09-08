import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { appUrl, RESEND_FROM_ADDRESS, RESEND_REPLY_TO } from "../_shared/app-config.ts";
import { sendEmailViaGateway } from "../_shared/resend-gateway.ts";
import { createNotificationWorker } from "../_shared/owner-notification-worker.ts";

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
});
Deno.serve(handler);
