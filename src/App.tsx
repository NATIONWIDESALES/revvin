import ErrorBoundary from "@/components/ErrorBoundary";
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
import SavedOffers from "./pages/SavedOffers";
import HowItWorks from "./pages/HowItWorks";
import TrustCenter from "./pages/TrustCenter";
import ForBusinesses from "./pages/ForBusinesses";
import ForReferrers from "./pages/ForReferrers";
import AboutRevvinLLM from "./pages/AboutRevvinLLM";
import ReferrerProfile from "./pages/ReferrerProfile";
import Auth from "./pages/Auth";
import Signup from "./pages/Signup";
import ResetPassword from "./pages/ResetPassword";
import DashboardRouter from "./pages/dashboard/DashboardRouter";
import CreateOffer from "./pages/dashboard/CreateOffer";
import EditOffer from "./pages/dashboard/EditOffer";
import ProfileEdit from "./pages/dashboard/ProfileEdit";
import AccountSettings from "./pages/dashboard/AccountSettings";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import ReferralAgreement from "./pages/ReferralAgreement";
import Pricing from "./pages/Pricing";
import NotFound from "./pages/NotFound";

import { lazy, Suspense } from "react";

const SuperAdminCRM = lazy(() => import("./pages/SuperAdminCRM"));

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <CountryProvider>
              <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/login" element={<Auth />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/__sa" element={<Suspense fallback={null}><SuperAdminCRM /></Suspense>} />
                <Route element={<Layout />}>
                  <Route path="/" element={<Index />} />
                  <Route path="/browse" element={<Browse />} />
                  <Route path="/saved" element={<SavedOffers />} />
                  <Route path="/offer/:businessSlug/:id" element={<OfferDetail />} />
                  <Route path="/offer/:id" element={<OfferDetail />} />
                  <Route path="/how-it-works" element={<HowItWorks />} />
                  <Route path="/pricing" element={<Pricing />} />
                  <Route path="/trust" element={<TrustCenter />} />
                  <Route path="/for-businesses" element={<ForBusinesses />} />
                  <Route path="/for-referrers" element={<ForReferrers />} />
                  <Route path="/about-revvin-llm" element={<AboutRevvinLLM />} />
                  
                  <Route path="/referrer/:userId" element={<ReferrerProfile />} />
                  <Route path="/terms" element={<Terms />} />
                  <Route path="/privacy" element={<Privacy />} />
                  <Route path="/referral-agreement" element={<ReferralAgreement />} />
                  <Route path="/dashboard" element={<ProtectedRoute><DashboardRouter /></ProtectedRoute>} />
                  <Route path="/dashboard/create-offer" element={<ProtectedRoute requiredRole="business"><CreateOffer /></ProtectedRoute>} />
                  <Route path="/dashboard/edit-offer/:id" element={<ProtectedRoute requiredRole="business"><EditOffer /></ProtectedRoute>} />
                  <Route path="/dashboard/profile" element={<ProtectedRoute><ProfileEdit /></ProtectedRoute>} />
                  <Route path="/dashboard/settings" element={<ProtectedRoute><AccountSettings /></ProtectedRoute>} />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </CountryProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
