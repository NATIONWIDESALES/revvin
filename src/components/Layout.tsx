import { useLocation } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import ScrollToTopButton from "@/components/ScrollToTopButton";
import PageTransition from "@/components/PageTransition";
import AppTopBar from "@/components/AppTopBar";
import MobileStartBar, { hasMobileStartBar } from "@/components/marketing/MobileStartBar";

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

const Layout = () => {
  const { pathname } = useLocation();
  const app = isAppRoute(pathname);
  return (
    <div className={`flex min-h-screen flex-col ${hasMobileStartBar(pathname) ? "pb-[calc(84px+env(safe-area-inset-bottom))] md:pb-0" : ""}`}>
      <ScrollToTop />
      {app ? <AppTopBar /> : <Navbar />}
      <main className={app ? "flex-1" : "site-main flex-1"}>
        <PageTransition />
      </main>
      {!app && <Footer />}
      {!app && <ScrollToTopButton />}
      {hasMobileStartBar(pathname) && <MobileStartBar pathname={pathname} />}
    </div>
  );
};

export default Layout;
