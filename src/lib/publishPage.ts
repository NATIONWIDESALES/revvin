import { supabase } from "@/integrations/supabase/client";
import { track } from "@/lib/track";
import { publishFailure } from "@/lib/publishFailure";

export type PublishSurface = "onboarding" | "dashboard_banner" | "share_tools" | "checklist";

/** Which required field the server refused on, so the UI can ask for exactly that. */
export type MissingField = "slug" | "name" | "offer_amount" | null;

export const PUBLISH_FAILED_MESSAGE =
  "We couldn't publish your page just now. Try again in a minute, or email info@revvin.co and we'll fix it fast.";

export function missingFieldFromError(message: string): MissingField {
  const { reason } = publishFailure({ message });
  if (reason === "missing_slug") return "slug";
  if (reason === "missing_name") return "name";
  if (reason === "missing_reward") return "offer_amount";
  return null;
}

/**
 * The single publish call. Publishing is free; the RPC owns the rules and the
 * wording of its errors. Every attempt is recorded as succeeded or failed.
 */
export async function publishPage(surface: PublishSurface): Promise<{ ok: boolean; message?: string; missing?: MissingField }> {
  try {
    const { error } = await supabase.rpc("fn_set_business_published", { p_published: true });
    if (error) {
      const failure = publishFailure(error);
      track("publish_failed", { surface, reason: failure.reason });
      const missing = missingFieldFromError(error.message || "");
      return { ok: false, message: failure.safeMessage ?? PUBLISH_FAILED_MESSAGE, missing };
    }
    track("publish_succeeded", { surface });
    track("page_published");
    void supabase.functions.invoke("notify-business-signup", { body: { event: "published" } });
    return { ok: true };
  } catch (e) {
    track("publish_failed", { surface, reason: publishFailure(e).reason });
    return { ok: false, message: PUBLISH_FAILED_MESSAGE, missing: null };
  }
}
