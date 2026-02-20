import { useAuth } from "@/contexts/AuthContext";
import ReferrerDashboard from "./ReferrerDashboard";
import BusinessDashboard from "./BusinessDashboard";
import AdminDashboard from "./AdminDashboard";

const DashboardRouter = () => {
  const { userRole, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (userRole === "admin") return <AdminDashboard />;
  if (userRole === "business") return <BusinessDashboard />;
  return <ReferrerDashboard />;
};

export default DashboardRouter;
