import { Suspense, useEffect, useState } from "react";
import { lazyWithChunkRecovery as lazy } from "@/lib/chunkRecovery";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSaleState } from "@/lib/useSale";
import { isPaidAdSession, isSaleMarketingPath, isSaleSurface, saleCountdown, SALE_BANNER_SESSION_KEY, SALE_POPUP_KEY } from "@/lib/salePresentation";
import SaleBanner from "./SaleBanner";

const SalePopup = lazy(() => import("./SalePopup"));
let popupSeenThisSession = false;
let bannerDismissedThisSession = false;
const firstLoad = typeof performance === "undefined" ? 0 : performance.now();

export default function SalePromotion() {
  const { pathname, search } = useLocation();
  const { user, userRole, loading } = useAuth();
  const owner = !!user && userRole === "business";
  const eligible = isSaleSurface(pathname) && !loading && (!user || owner);
  const sale = useSaleState(owner, eligible);
  const [dismissed, setDismissed] = useState(() => {
    try { return bannerDismissedThisSession || sessionStorage.getItem(SALE_BANNER_SESSION_KEY) === "1"; } catch { return bannerDismissedThisSession; }
  });
  const [popup, setPopup] = useState(false);
  const [unpaidOwner, setUnpaidOwner] = useState(false);
  useEffect(() => { setPopup(false); }, [pathname, search]);

  useEffect(() => {
    setUnpaidOwner(false);
    if (!owner || !user || !isSaleMarketingPath(pathname)) return;
    let current = true;
    void import("@/lib/supabaseLazy").then(async ({ loadSupabase }) => {
      const { data, error } = await (await loadSupabase()).from("businesses").select("subscription_status").eq("user_id", user.id).limit(1);
      if (current && !error && data?.[0]) setUnpaidOwner(!data[0].subscription_status || ["none", "canceled"].includes(data[0].subscription_status));
    }).catch(() => {});
    return () => { current = false; };
  }, [owner, user?.id, pathname]);

  useEffect(() => {
    if (isPaidAdSession(search)) return;
    if (!eligible || !sale.live || !isSaleMarketingPath(pathname) || (owner && !unpaidOwner)) return;
    if (/bot|crawler|spider|headless|lighthouse|prerender/i.test(navigator.userAgent)) return;
    try { if (localStorage.getItem(SALE_POPUP_KEY) === "1") return; } catch { /* In-memory fallback below. */ }
    if (popupSeenThisSession) return;
    const timer = setTimeout(() => {
      if (popupSeenThisSession) return;
      popupSeenThisSession = true;
      try { localStorage.setItem(SALE_POPUP_KEY, "1"); } catch { /* Once per page session when storage is blocked. */ }
      setPopup(true);
    }, Math.max(0, 2000 - (performance.now() - firstLoad)));
    return () => clearTimeout(timer);
  }, [eligible, sale.live, pathname, search, owner, unpaidOwner]);

  const dismiss = () => {
    bannerDismissedThisSession = true;
    setDismissed(true);
    try { sessionStorage.setItem(SALE_BANNER_SESSION_KEY, "1"); } catch { /* Session fallback. */ }
  };
  if (!eligible || !sale.live) return null;
  return <>
    <SaleBanner live={!dismissed} owner={owner} countdown={saleCountdown(sale.serverNow, sale.end)} onDismiss={dismiss} />
    {popup && isSaleMarketingPath(pathname) && (!owner || unpaidOwner) && <Suspense fallback={null}><SalePopup owner={owner} onClose={() => setPopup(false)} /></Suspense>}
  </>;
}