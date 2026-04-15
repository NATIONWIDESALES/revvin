import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Building2, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ReferrerDashboard from "./ReferrerDashboard";
import BusinessDashboard from "./BusinessDashboard";
import AdminDashboard from "./AdminDashboard";

const RoleSelector = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const selectRole = async (role: "business" | "referrer") => {
    if (!user) return;
    setLoading(true);
    try {
      // Insert role
      await supabase.from("user_roles").insert({ user_id: user.id, role });

      // If business, create business row and wallet
      if (role === "business") {
        const name = user.user_metadata?.full_name || user.email?.split("@")[0] || "My Business";
        await supabase.from("businesses").insert({
          user_id: user.id,
          name: name + "'s Business",
          account_status: "approved",
        });
        await supabase.from("wallet_balances").insert({ user_id: user.id });
      }

      // Reload to pick up the new role
      window.location.reload();
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to set role", variant: "destructive" });
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="max-w-md w-full space-y-6 text-center px-6">
        <h1 className="text-2xl font-bold text-foreground">Welcome to Revvin!</h1>
        <p className="text-muted-foreground">How would you like to use Revvin?</p>
        <div className="grid grid-cols-2 gap-4">
          <Button
            variant="outline"
            className="flex flex-col items-center gap-3 h-auto py-8 px-4 rounded-xl border-2 hover:border-primary"
            onClick={() => selectRole("referrer")}
            disabled={loading}
          >
            <Users className="h-8 w-8 text-primary" />
            <span className="font-semibold">I want to earn</span>
            <span className="text-xs text-muted-foreground">Refer customers & get paid</span>
          </Button>
          <Button
            variant="outline"
            className="flex flex-col items-center gap-3 h-auto py-8 px-4 rounded-xl border-2 hover:border-primary"
            onClick={() => selectRole("business")}
            disabled={loading}
          >
            <Building2 className="h-8 w-8 text-primary" />
            <span className="font-semibold">I'm a business</span>
            <span className="text-xs text-muted-foreground">Get qualified referrals</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

const DashboardRouter = () => {
  const { userRole, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // No role assigned (e.g. Google OAuth first login) — show role selector
  if (!userRole) return <RoleSelector />;

  if (userRole === "admin") return <AdminDashboard />;
  if (userRole === "business") return <BusinessDashboard />;
  return <ReferrerDashboard />;
};

export default DashboardRouter;
