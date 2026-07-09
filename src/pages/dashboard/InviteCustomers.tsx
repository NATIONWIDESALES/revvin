import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import CustomersTab from "@/components/dashboard/CustomersTab";
import AttestationGate from "@/components/dashboard/AttestationGate";

// Standalone Invite Customers area. Wraps the existing CustomersTab (which already
// owns the import + template + device-native send UX) with a one-time consent gate.
// Revvin never sends on behalf of the business. All sends leave the business's own
// device through sms:, mailto:, or the Web Share API.

interface BizRow {
  id: string;
  name: string;
  slug: string | null;
  offer_amount: string | null;
  offer_trigger: string | null;
  contact_outreach_consent_at: string | null;
}

const InviteCustomers = () => {
  const { user, userRole } = useAuth();
  const [biz, setBiz] = useState<BizRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("businesses")
        .select("id, name, slug, offer_amount, offer_trigger, contact_outreach_consent_at")
        .eq("user_id", user.id)
        .limit(1);
      setBiz((data?.[0] as BizRow) ?? null);
      setLoading(false);
    })();
  }, [user]);

  if (!user) return <Navigate to="/auth" replace />;
  if (userRole && userRole !== "business" && userRole !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!biz) {
    return (
      <div className="container max-w-2xl py-10">
        <p className="text-sm text-muted-foreground">
          We could not find a business on your account yet. Finish setup first.
        </p>
        <Button asChild className="mt-4"><Link to="/dashboard">Back to dashboard</Link></Button>
      </div>
    );
  }

  const publicUrl = biz.slug ? `${window.location.origin}/r/${biz.slug}` : "";

  return (
    <div className="py-8">
      <div className="container max-w-3xl">
        <Button variant="ghost" size="sm" className="mb-4 gap-1" asChild>
          <Link to="/dashboard"><ArrowLeft className="h-4 w-4" /> Back to dashboard</Link>
        </Button>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Invite customers</h1>
          <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
            Your customers are your best referral source. Import the people you have already
            done good work for, then send them a quick note from your own phone letting them
            know they can earn by referring you. You send each message yourself, so it comes
            from you, not from a robot.
          </p>
        </div>

        <AttestationGate
          businessId={biz.id}
          consentedAt={biz.contact_outreach_consent_at}
          onConsented={(iso) => setBiz({ ...biz, contact_outreach_consent_at: iso })}
        >
          <CustomersTab
            biz={{
              id: biz.id,
              name: biz.name,
              offer_amount: biz.offer_amount,
              offer_trigger: biz.offer_trigger,
            }}
            publicUrl={publicUrl}
          />
        </AttestationGate>
      </div>
    </div>
  );
};

export default InviteCustomers;