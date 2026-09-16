import { supabase } from "@/integrations/supabase/client";
import { isStandalone } from "@/config/pwa";

/**
 * Records the first time this business's owner actually opened Revvin from a
 * home screen, or accepted the browser install prompt. Stored on the business
 * row like the other activation stamps, so the tick survives a device change.
 * Only the owner can write it: the existing owner-only update policy applies.
 */
export async function stampAppInstalled(businessId: string): Promise<string | null> {
  const stamp = new Date().toISOString();
  const { error } = await supabase
    .from("businesses")
    .update({ app_installed_at: stamp })
    .eq("id", businessId);
  return error ? null : stamp;
}

/**
 * Watches for both signals: a standalone launch now, and the install prompt
 * being accepted later in this same session. Returns a cleanup function.
 */
export function watchAppInstalled(businessId: string, onStamped: (stamp: string) => void) {
  const stamp = async () => {
    const value = await stampAppInstalled(businessId);
    if (value) onStamped(value);
  };
  if (isStandalone()) void stamp();
  const onInstalled = () => void stamp();
  window.addEventListener("appinstalled", onInstalled);
  return () => window.removeEventListener("appinstalled", onInstalled);
}
