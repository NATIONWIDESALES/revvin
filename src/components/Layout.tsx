import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import ScrollToTopButton from "@/components/ScrollToTopButton";
import PageTransition from "@/components/PageTransition";
import PromoPopup from "@/components/promo/PromoPopup";

const Layout = () => {
  return (
    <div className="flex min-h-screen flex-col">
      <ScrollToTop />
      <Navbar />
      <main className="flex-1">
        <PageTransition />
      </main>
      <Footer />
      <ScrollToTopButton />
      <PromoPopup />
    </div>
  );
};

export default Layout;
