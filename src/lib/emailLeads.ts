import { supabase } from "@/integrations/supabase/client";
import { track } from "@/lib/track";

/**
 * Centralized writer for the email_leads table. Use a distinct `source`
 * per capture surface so we can segment in the admin CRM later.
 *
 * Allowed sources are enforced server-side by an RLS WITH CHECK clause; keep
 * this union in sync with the migration's allowed list. Sources the insert
 * policy does not admit (team_waitlist) save through the narrow
 * fn_submit_earn_lead server function instead of a wider policy.
 */
export type EmailLeadSource =
  | "landing"
  | "playbook"
  | "sample"
  | "marketplace_notify"
  | "team_waitlist"
  | "earn_waitlist"
  | "business_invite";

const RPC_SOURCES = new Set<EmailLeadSource>(["team_waitlist", "earn_waitlist", "business_invite"]);

export async function submitEmailLead(
  email: string,
  source: EmailLeadSource,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    if (RPC_SOURCES.has(source)) {
      const { error } = await supabase.rpc("fn_submit_earn_lead" as never, { p_email: email.trim(), p_source: source } as never);
      if (error) return { ok: false, error: "We could not save that. Check the email and try again." };
      track("email_lead_submitted", { source });
      return { ok: true };
    }
    const { error } = await supabase.from("email_leads").insert({
      email: email.trim().toLowerCase(),
      source,
      user_agent:
        typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 500) : null,
      referrer:
        typeof document !== "undefined" ? document.referrer.slice(0, 500) : null,
    });
    if (error) {
      console.error("[submitEmailLead] insert failed", error);
      return { ok: false, error: error.message };
    }
    track("email_lead_submitted", { source });
    return { ok: true };
  } catch (err) {
    console.error("[submitEmailLead] unexpected error", err);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}