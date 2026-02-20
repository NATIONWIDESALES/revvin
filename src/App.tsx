import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { WalletProvider } from "@/contexts/WalletContext";
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
import Auth from "./pages/Auth";
import DashboardRouter from "./pages/dashboard/DashboardRouter";
import CreateOffer from "./pages/dashboard/CreateOffer";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <WalletProvider>
            <CountryProvider>
              <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route element={<Layout />}>
                  <Route path="/" element={<Index />} />
                  <Route path="/browse" element={<Browse />} />
                  <Route path="/offer/:id" element={<OfferDetail />} />
                  <Route path="/how-it-works" element={<HowItWorks />} />
                  <Route path="/trust" element={<TrustCenter />} />
                  <Route path="/for-businesses" element={<ForBusinesses />} />
                  <Route path="/for-referrers" element={<ForReferrers />} />
                  <Route path="/dashboard" element={<ProtectedRoute><DashboardRouter /></ProtectedRoute>} />
                  <Route path="/dashboard/create-offer" element={<ProtectedRoute requiredRole="business"><CreateOffer /></ProtectedRoute>} />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </CountryProvider>
          </WalletProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
