import { supabase } from "@/integrations/supabase/client";

/**
 * Centralized writer for the email_leads table. Use a distinct `source`
 * per capture surface so we can segment in the admin CRM later.
 *
 * Allowed sources are enforced server-side by an RLS WITH CHECK clause —
 * keep this union in sync with the migration's allowed list.
 */
export type EmailLeadSource = "landing" | "playbook" | "sample";

export async function submitEmailLead(
  email: string,
  source: EmailLeadSource,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
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
    return { ok: true };
  } catch (err) {
    console.error("[submitEmailLead] unexpected error", err);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}