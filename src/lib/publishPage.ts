import { supabase } from "@/integrations/supabase/client";
import { track } from "@/lib/track";
import { friendlyError } from "@/lib/errors";

export type PublishSurface = "onboarding" | "dashboard_banner" | "share_tools" | "checklist";

/** Which required field the server refused on, so the UI can ask for exactly that. */
export type MissingField = "slug" | "name" | "offer_amount" | null;

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
      const message = error.message || friendlyError(error);
      return { ok: false, message, missing: missingFieldFromError(message) };
    }
    track("publish_succeeded", { surface });
    track("page_published");
    return { ok: true };
  } catch (e) {
    track("publish_failed", { surface });
    return { ok: false, message: friendlyError(e), missing: null };
  }
}
