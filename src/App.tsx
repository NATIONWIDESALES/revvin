import { lazy, Suspense } from "react";
import ErrorBoundary from "@/components/ErrorBoundary";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { CountryProvider } from "@/contexts/CountryContext";
import Layout from "@/components/Layout";
import ProtectedRoute from "@/components/ProtectedRoute";
import Analytics from "@/components/Analytics";
import MetaPixel from "@/components/MetaPixel";

// Eager: the homepage is the most requested route and the LCP target, and
// NotFound is tiny. Everything else is route-split so a marketing visitor
// never downloads the dashboard, admin or map code.
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

const Browse = lazy(() => import("./pages/Browse"));
const OfferDetail = lazy(() => import("./pages/OfferDetail"));
const SavedOffers = lazy(() => import("./pages/SavedOffers"));
const HowItWorks = lazy(() => import("./pages/HowItWorks"));
const TrustCenter = lazy(() => import("./pages/TrustCenter"));
const ForBusinesses = lazy(() => import("./pages/ForBusinesses"));
const ForReferrers = lazy(() => import("./pages/ForReferrers"));
const AskKit = lazy(() => import("./pages/AskKit"));
const AboutRevvinLLM = lazy(() => import("./pages/AboutRevvinLLM"));
const ReferrerProfile = lazy(() => import("./pages/ReferrerProfile"));
const Auth = lazy(() => import("./pages/Auth"));
const Signup = lazy(() => import("./pages/Signup"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const DashboardRouter = lazy(() => import("./pages/dashboard/DashboardRouter"));
const CreateOffer = lazy(() => import("./pages/dashboard/CreateOffer"));
const EditOffer = lazy(() => import("./pages/dashboard/EditOffer"));
const ProfileEdit = lazy(() => import("./pages/dashboard/ProfileEdit"));
const AccountSettings = lazy(() => import("./pages/dashboard/AccountSettings"));
const InviteCustomers = lazy(() => import("./pages/dashboard/InviteCustomers"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const ReferralAgreement = lazy(() => import("./pages/ReferralAgreement"));
const Pricing = lazy(() => import("./pages/Pricing"));
const PublicReferralPage = lazy(() => import("./pages/PublicReferralPage"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Sample = lazy(() => import("./pages/Sample"));
const InviteLanding = lazy(() => import("./pages/InviteLanding"));
const ReferralStatus = lazy(() => import("./pages/ReferralStatus"));
const Feedback = lazy(() => import("./pages/Feedback"));
const PrintAssetPage = lazy(() => import("./pages/PrintAsset"));
const ZapierDocs = lazy(() => import("./pages/docs/Zapier"));
const IndustriesHub = lazy(() => import("./pages/IndustriesHub"));
const IndustryLanding = lazy(() => import("./pages/IndustryLanding"));
const SuperAdminCRM = lazy(() => import("./pages/SuperAdminCRM"));
const ConnectionHealth = lazy(() => import("./pages/ConnectionHealth"));

// Deliberately quiet: same background as every page, fixed viewport height, no
// text or skeleton, so a route chunk arriving does not shift layout or flash.
const RouteFallback = () => (
  <div className="min-h-screen bg-background" aria-busy="true" />
);

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
              <Analytics />
              <MetaPixel />
              <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/login" element={<Auth />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/i/:code" element={<InviteLanding />} />
                <Route path="/__sa" element={<SuperAdminCRM />} />
                <Route path="/__health" element={<ConnectionHealth />} />
                <Route element={<Layout />}>
                  <Route path="/" element={<Index />} />
                  <Route path="/browse" element={<Browse />} />
                  <Route path="/marketplace" element={<Browse />} />
                  <Route path="/saved" element={<SavedOffers />} />
                  <Route path="/offer/:businessSlug/:id" element={<OfferDetail />} />
                  <Route path="/offer/:id" element={<OfferDetail />} />
                  <Route path="/r/:slug" element={<PublicReferralPage />} />
                  <Route path="/r/status/:token" element={<ReferralStatus />} />
                  <Route path="/feedback/:token" element={<Feedback />} />
                  <Route path="/print/:asset" element={<PrintAssetPage />} />
                  <Route path="/docs/zapier" element={<ZapierDocs />} />
                  <Route path="/welcome" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
                  <Route path="/how-it-works" element={<HowItWorks />} />
                  <Route path="/sample" element={<Sample />} />
                  <Route path="/pricing" element={<Pricing />} />
                  <Route path="/trust" element={<TrustCenter />} />
                  <Route path="/for-businesses" element={<ForBusinesses />} />
                  <Route path="/for-referrers" element={<ForReferrers />} />
                  <Route path="/ask-kit" element={<AskKit />} />
                  <Route path="/referral-programs" element={<IndustriesHub />} />
                  <Route path="/referral-program/:industry" element={<IndustryLanding />} />
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
                  <Route path="/dashboard/invite" element={<ProtectedRoute requiredRole="business"><InviteCustomers /></ProtectedRoute>} />
                </Route>
                {/*
                  Legacy URLs from prior uses of the revvin.co domain.
                  Client-side redirect to "/" is a fallback for JS-executing
                  crawlers; a true server-side 301 (en-usd) and 410 (products)
                  must be configured at the hosting layer. See FOUNDER TODOs.
                */}
                <Route path="/en-usd" element={<Navigate to="/" replace />} />
                <Route path="/en-usd/*" element={<Navigate to="/" replace />} />
                <Route path="/en-cad" element={<Navigate to="/" replace />} />
                <Route path="/en-cad/*" element={<Navigate to="/" replace />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
              </Suspense>
            </CountryProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
