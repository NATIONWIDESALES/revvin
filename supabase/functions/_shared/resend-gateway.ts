const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";
import { createClient } from "npm:@supabase/supabase-js@2.97.0";
import { globalSuppression } from "./global-suppression.ts";

export interface SendEmailParams {
  from: string;
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  reply_to?: string;
  idempotencyKey?: string;
  tags?: { name: string; value: string }[];
  unsubscribeUrl?: string;
  /** Internal incident alerts only: send even while outbound email is paused. */
  allowWhenPaused?: boolean;
}

/** Outbound email kill switch. A lookup failure defaults to not paused so a
 * transient database error can never stop all email on its own. */
async function outboundEmailPaused(): Promise<boolean> {
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) return false;
    const db = createClient(url, key, { auth: { persistSession: false } });
    const { data } = await db.from("platform_flags").select("enabled").eq("key", "outbound_email_paused").limit(1);
    return Boolean(data?.[0]?.enabled);
  } catch {
    return false;
  }
}

export interface SendEmailResult {
  success: boolean;
  id?: string;
  error?: string;
}

export async function sendEmailViaGateway(params: SendEmailParams): Promise<SendEmailResult> {
  try {
    for (const email of Array.isArray(params.to) ? params.to : [params.to]) {
      if (await globalSuppression(email)) return { success: false, error: "recipient_suppressed" };
    }
  } catch { return { success: false, error: "suppression_unavailable" }; }
  const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
  const resendApiKey = Deno.env.get("RESEND_API_KEY");

  if (!lovableApiKey) {
    console.error("[resend-gateway] LOVABLE_API_KEY not configured");
    return { success: false, error: "LOVABLE_API_KEY not configured" };
  }
  if (!resendApiKey) {
    console.error("[resend-gateway] RESEND_API_KEY not configured");
    return { success: false, error: "RESEND_API_KEY not configured" };
  }

  const body: Record<string, unknown> = {
    from: params.from,
    to: Array.isArray(params.to) ? params.to : [params.to],
    subject: params.subject,
  };

  if (params.html) body.html = params.html;
  if (params.text) body.text = params.text;
  if (params.reply_to) body.reply_to = params.reply_to;
  if (params.tags) body.tags = params.tags;
  if (params.unsubscribeUrl) {
    body.headers = { "List-Unsubscribe": `<${params.unsubscribeUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" };
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${lovableApiKey}`,
    "X-Connection-Api-Key": resendApiKey,
  };

  if (params.idempotencyKey) headers["Idempotency-Key"] = params.idempotencyKey;

  const res = await fetch(`${GATEWAY_URL}/emails`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const error = data?.message || JSON.stringify(data).slice(0, 500);
    console.error("[resend-gateway] send failed:", res.status, error);
    return { success: false, error };
  }

  return { success: true, id: data.id };
}
