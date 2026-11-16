import { useEffect, useState } from "react";
import { SALE_END_ISO } from "@/config/pricing";

// Start hidden on SSR and hydration. Only the server's public state enables
// sale copy; a monotonic timer hides it at expiry even in a long-open tab.
export function useSaleState(authenticated = false, enabled = true) {
  const [sale, setSale] = useState({ live: false, serverNow: 0, end: SALE_END_ISO });
  useEffect(() => {
    if (!enabled) { setSale((s) => ({ ...s, live: false })); return; }
    let disposed = false;
    let expiry: ReturnType<typeof setTimeout> | undefined;
    const refresh = async () => {
      const started = performance.now();
      try {
        let headers: Record<string, string> = {};
        if (authenticated) {
          const { loadSupabase } = await import("@/lib/supabaseLazy");
          const { data } = await (await loadSupabase()).auth.getSession();
          if (!data.session) throw new Error("Sale eligibility unavailable");
          headers = { Authorization: `Bearer ${data.session.access_token}` };
        }
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-business-checkout`, { method: "GET", cache: "no-store", headers });
        if (!response.ok) throw new Error("Sale state unavailable");
        const state = await response.json();
        const remaining = Date.parse(SALE_END_ISO) - Date.parse(state.server_now) - (performance.now() - started);
        const enabled = state.sale_live === true && state.sale_end === SALE_END_ISO && remaining > 0;
        if (disposed) return;
        clearTimeout(expiry);
        setSale({ live: enabled, serverNow: Date.parse(state.server_now) + (performance.now() - started), end: state.sale_end });
        if (enabled) expiry = setTimeout(() => setSale((s) => ({ ...s, live: false })), Math.min(remaining, 2147483647));
      } catch {
        if (!disposed) setSale((s) => ({ ...s, live: false }));
      }
    };
    void refresh();
    const interval = setInterval(() => { void refresh(); }, 60000);
    const focus = () => { void refresh(); };
    window.addEventListener("focus", focus);
    return () => { disposed = true; clearTimeout(expiry); clearInterval(interval); window.removeEventListener("focus", focus); };
  }, [authenticated, enabled]);
  return enabled ? sale : { ...sale, live: false };
}

export function useSale(authenticated = false, enabled = true) {
  return useSaleState(authenticated, enabled).live;
}