import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { ArrowLeft, ShieldCheck, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import CustomersTab from "@/components/dashboard/CustomersTab";

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
  const { toast } = useToast();
  const [biz, setBiz] = useState<BizRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [agreed, setAgreed] = useState(false);
  const [saving, setSaving] = useState(false);

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

  const acceptConsent = async () => {
    if (!agreed) return;
    setSaving(true);
    const nowIso = new Date().toISOString();
    const { error } = await supabase
      .from("businesses")
      .update({ contact_outreach_consent_at: nowIso })
      .eq("id", biz.id);
    setSaving(false);
    if (error) {
      // The database trigger guards the consent timestamp as append-only so an
      // owner cannot clear it or move it earlier. Surface a friendly message
      // instead of the raw Postgres error, and refresh the row so the UI
      // reflects the already-recorded consent if that is what happened.
      const raw = (error.message || "").toLowerCase();
      const isAppendOnly = raw.includes("append-only") || (error as { code?: string }).code === "P0001";
      if (isAppendOnly) {
        const { data } = await supabase
          .from("businesses")
          .select("contact_outreach_consent_at")
          .eq("id", biz.id)
          .limit(1);
        const existing = (data?.[0]?.contact_outreach_consent_at as string | null) ?? null;
        if (existing) {
          setBiz({ ...biz, contact_outreach_consent_at: existing });
          toast({
            title: "Already confirmed",
            description: "You already confirmed this on " + new Date(existing).toLocaleDateString() + ". Taking you in.",
          });
          return;
        }
        toast({
          title: "Confirmation is permanent",
          description: "Once accepted, the confirmation timestamp cannot be cleared or moved earlier. Contact support if you need it corrected.",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Could not save",
        description: error.message || "Please try again in a moment.",
        variant: "destructive",
      });
      return;
    }
    setBiz({ ...biz, contact_outreach_consent_at: nowIso });
  };

  const hasConsent = !!biz.contact_outreach_consent_at;

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

        {!hasConsent ? (
          <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <ShieldCheck className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <h2 className="text-base font-semibold text-foreground">One quick confirmation</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Before importing, please confirm that these are people you already have a
                  relationship with. Every message you send leaves your own device through
                  your own Messages or Mail app. Revvin does not transmit anything on your
                  behalf.
                </p>
                {/* FOUNDER-CONFIRMED TODO: confirm exact attestation wording with counsel. */}
                <label className="mt-4 flex items-start gap-3 cursor-pointer">
                  <Checkbox
                    checked={agreed}
                    onCheckedChange={(v) => setAgreed(v === true)}
                    className="mt-0.5"
                  />
                  <span className="text-sm text-foreground">
                    These are my own past or current customers, and I have an existing
                    relationship with them.
                  </span>
                </label>
                <Button
                  className="mt-4"
                  size="sm"
                  onClick={acceptConsent}
                  disabled={!agreed || saving}
                >
                  {saving ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
                  Continue
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <CustomersTab
            biz={{
              id: biz.id,
              name: biz.name,
              offer_amount: biz.offer_amount,
              offer_trigger: biz.offer_trigger,
            }}
            publicUrl={publicUrl}
          />
        )}
      </div>
    </div>
  );
};

export default InviteCustomers;