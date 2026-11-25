import { useLocation } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import ScrollToTopButton from "@/components/ScrollToTopButton";
import PageTransition from "@/components/PageTransition";
import AppTopBar from "@/components/AppTopBar";
import { Link } from "react-router-dom";
import MobileStartBar, { hasMobileStartBar } from "@/components/marketing/MobileStartBar";
import SalePromotion from "@/components/billing/SalePromotion";

/** Signed-in app routes bring their own chrome (dashboard shell, /me bar). */
export function isAppRoute(pathname: string): boolean {
  return (
    pathname === "/dashboard" ||
    pathname.startsWith("/dashboard/") ||
    pathname === "/me" ||
    pathname === "/welcome" ||
    pathname.startsWith("/partners/dashboard")
  );
}

/** Full-screen map pages: viewport height, no footer, no page scroll. */
export function isFullScreenRoute(pathname: string): boolean {
  return pathname === "/marketplace" || pathname === "/browse";
}

/** A business's public referral page (/r/:slug, not /r/status/...). */
export function isReferralPageRoute(pathname: string): boolean {
  return /^\/r\/[^/]+\/?$/.test(pathname) && !pathname.startsWith("/r/status");
}

/** Minimal header for referral pages so referrers stay on the form. */
const ReferralHeader = () => (
  <header className="border-b border-line bg-paper">
    <div className="mk-wrap flex h-12 items-center">
      <Link to="/" className="font-display text-sm font-extrabold tracking-tight text-forest">REVVIN.CO</Link>
    </div>
  </header>
);

const Layout = () => {
  const { pathname } = useLocation();
  const app = isAppRoute(pathname);
  const full = isFullScreenRoute(pathname);
  const startBar = !full && hasMobileStartBar(pathname);
  return (
    <div className={full ? "flex h-[100dvh] flex-col overflow-hidden" : `flex min-h-screen flex-col ${startBar ? "pb-[calc(84px+env(safe-area-inset-bottom))] md:pb-0" : ""}`}>
      <ScrollToTop />
      <div className="sticky top-0 z-50">
        <SalePromotion />
        {app ? <AppTopBar /> : isReferralPageRoute(pathname) ? <ReferralHeader /> : <Navbar />}
      </div>
      <main className={app ? "flex-1" : full ? "site-main site-full min-h-0 flex-1" : "site-main flex-1"}>
        <PageTransition />
      </main>
      {!app && !full && <Footer />}
      {!app && !full && !/^\/b\/[^/]+\/?$/.test(pathname) && <ScrollToTopButton />}
      {startBar && <MobileStartBar pathname={pathname} />}
    </div>
  );
};

export default Layout;
