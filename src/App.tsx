import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { CountryProvider } from "@/contexts/CountryContext";
import Layout from "@/components/Layout";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Browse from "./pages/Browse";
import OfferDetail from "./pages/OfferDetail";
import HowItWorks from "./pages/HowItWorks";
import TrustCenter from "./pages/TrustCenter";
import ForBusinesses from "./pages/ForBusinesses";
import ForReferrers from "./pages/ForReferrers";
import ReferrerProfile from "./pages/ReferrerProfile";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import DashboardRouter from "./pages/dashboard/DashboardRouter";
import CreateOffer from "./pages/dashboard/CreateOffer";
import ProfileEdit from "./pages/dashboard/ProfileEdit";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import ReferralAgreement from "./pages/ReferralAgreement";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <CountryProvider>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route element={<Layout />}>
                <Route path="/" element={<Index />} />
                <Route path="/browse" element={<Browse />} />
                <Route path="/offer/:businessSlug/:id" element={<OfferDetail />} />
                <Route path="/offer/:id" element={<OfferDetail />} />
                <Route path="/how-it-works" element={<HowItWorks />} />
                <Route path="/trust" element={<TrustCenter />} />
                <Route path="/for-businesses" element={<ForBusinesses />} />
                <Route path="/for-referrers" element={<ForReferrers />} />
                <Route path="/referrer/:userId" element={<ReferrerProfile />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/referral-agreement" element={<ReferralAgreement />} />
                <Route path="/dashboard" element={<ProtectedRoute><DashboardRouter /></ProtectedRoute>} />
                <Route path="/dashboard/create-offer" element={<ProtectedRoute requiredRole="business"><CreateOffer /></ProtectedRoute>} />
                <Route path="/dashboard/profile" element={<ProtectedRoute><ProfileEdit /></ProtectedRoute>} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </CountryProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
