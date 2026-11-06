import { supabase } from "@/integrations/supabase/client";
import { track } from "@/lib/track";

export type PublishSurface = "onboarding" | "dashboard_banner" | "share_tools" | "checklist";

/** Which required field the server refused on, so the UI can ask for exactly that. */
export type MissingField = "slug" | "name" | "offer_amount" | null;

export const PUBLISH_FAILED_MESSAGE =
  "We couldn't publish your page just now. Try again in a minute, or email info@revvin.co and we'll fix it fast.";

const KNOWN_MISSING: Record<Exclude<MissingField, null>, string> = {
  slug: "Choose your page link before publishing.",
  name: "Add your business name before publishing.",
  offer_amount: "Add the reward you pay before publishing.",
};

export function missingFieldFromError(message: string): MissingField {
  if (/page link/i.test(message)) return "slug";
  if (/business name/i.test(message)) return "name";
  if (/reward/i.test(message)) return "offer_amount";
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
      track("publish_failed", { surface });
      const missing = missingFieldFromError(error.message || "");
      return { ok: false, message: missing ? KNOWN_MISSING[missing] : PUBLISH_FAILED_MESSAGE, missing };
    }
    track("publish_succeeded", { surface });
    track("page_published");
    void supabase.functions.invoke("notify-business-signup", { body: { event: "published" } });
    return { ok: true };
  } catch (e) {
    track("publish_failed", { surface });
    return { ok: false, message: PUBLISH_FAILED_MESSAGE, missing: null };
  }
}
