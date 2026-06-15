import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import SEOHead from "@/components/SEOHead";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: "business" | "referrer" | "admin";
}

const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const { user, loading, userRole } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (requiredRole && userRole !== requiredRole) return <Navigate to="/dashboard" replace />;

  return (
    <>
      {/* Private app surface. Force noindex on every authenticated route so
          dashboards, onboarding, and account pages never end up in search. */}
      <SEOHead
        title="Revvin"
        description="Private Revvin app page."
        noindex
      />
      {children}
    </>
  );
};

export default ProtectedRoute;
