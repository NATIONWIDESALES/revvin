import { useRef, useState, type ReactNode } from "react";
import { ShieldCheck, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

// One-time consent gate used before any customer-facing send/copy action.
// Extracted from InviteCustomers so BusinessDashboard's Customers tab can reuse
// the exact same gate. Persists to businesses.contact_outreach_consent_at, which
// is append-only at the database level.
// FOUNDER TODO (future run): store the exact attestation text alongside the
// timestamp so historical wording is preserved for legal review.

interface Props {
  businessId: string;
  consentedAt: string | null;
  onConsented: (nowIso: string) => void;
  children: ReactNode;
}

const AttestationGate = ({ businessId, consentedAt, onConsented, children }: Props) => {
  const { toast } = useToast();
  const [agreed, setAgreed] = useState(false);
  const [saving, setSaving] = useState(false);
  // A disabled Continue button reads as tappable on mobile and explains nothing.
  // Instead the button stays enabled and an attempt without the box ticked
  // surfaces an inline reason and visibly flags the checkbox.
  const [showReason, setShowReason] = useState(false);
  const checkboxRef = useRef<HTMLDivElement | null>(null);

  if (consentedAt) return <>{children}</>;

  const acceptConsent = async () => {
    if (!agreed) {
      setShowReason(true);
      checkboxRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setShowReason(false);
    setSaving(true);
    const nowIso = new Date().toISOString();
    const { error } = await supabase
      .from("businesses")
      .update({ contact_outreach_consent_at: nowIso })
      .eq("id", businessId);
    setSaving(false);
    if (error) {
      const raw = (error.message || "").toLowerCase();
      const isAppendOnly = raw.includes("append-only") || (error as { code?: string }).code === "P0001";
      if (isAppendOnly) {
        const { data } = await supabase
          .from("businesses")
          .select("contact_outreach_consent_at")
          .eq("id", businessId)
          .limit(1);
        const existing = (data?.[0]?.contact_outreach_consent_at as string | null) ?? null;
        if (existing) {
          onConsented(existing);
          toast({
            title: "Already confirmed",
            description: "You already confirmed this on " + new Date(existing).toLocaleDateString() + ".",
          });
          return;
        }
      }
      toast({
        title: "Could not save",
        description: "We could not save your confirmation. Please try again in a moment.",
        variant: "destructive",
      });
      console.error("[AttestationGate] consent save failed", error);
      return;
    }
    onConsented(nowIso);
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <ShieldCheck className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <h2 className="text-base font-semibold text-foreground">One quick confirmation</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Before importing or inviting, please confirm that these are people you already have
            a relationship with. Every message you send leaves your own device through your own
            Messages or Mail app. Revvin does not transmit anything on your behalf.
          </p>
          <label
            ref={checkboxRef as unknown as React.Ref<HTMLLabelElement>}
            className={`mt-4 flex items-start gap-3 rounded-lg p-2 cursor-pointer transition-colors ${
              showReason ? "bg-destructive/5 ring-2 ring-destructive/50 animate-pulse" : ""
            }`}
          >
            <Checkbox
              checked={agreed}
              onCheckedChange={(v) => {
                setAgreed(v === true);
                if (v === true) setShowReason(false);
              }}
              aria-invalid={showReason}
              className="mt-0.5 h-5 w-5"
            />
            <span className="text-sm text-foreground">
              These are my own past or current customers, and I have an existing relationship
              with them.
            </span>
          </label>
          {showReason && (
            <p role="alert" className="mt-2 text-sm font-medium text-destructive">
              Please tick the box above to confirm, then tap Continue.
            </p>
          )}
          <Button
            className="mt-4 h-11 w-full sm:h-10 sm:w-auto"
            onClick={acceptConsent}
            disabled={saving}
          >
            {saving ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AttestationGate;