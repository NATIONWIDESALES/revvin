import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { checkSlug, slugRejectionMessage, slugifyName, suggestSlug, type SlugRejection } from "@/lib/slugRules";

interface SlugFieldProps {
  value: string;
  onChange: (slug: string) => void;
  /** Used to derive a suggestion when the typed slug is rejected. */
  businessName?: string;
  /** Availability check ignores this business's own slug. */
  onValidityChange?: (valid: boolean) => void;
  label?: string;
}

/**
 * Slug input with live server-backed validation. The database trigger is the
 * real gate; this only explains the outcome before the user hits save.
 */
const SlugField = ({ value, onChange, businessName = "", onValidityChange, label = "Your referral page URL" }: SlugFieldProps) => {
  const [checking, setChecking] = useState(false);
  const [status, setStatus] = useState<"ok" | SlugRejection | null>(null);

  useEffect(() => {
    if (!value) {
      setStatus(null);
      onValidityChange?.(false);
      return;
    }
    const local = checkSlug(value);
    if (!local.ok) {
      setStatus(local.reason!);
      onValidityChange?.(false);
      return;
    }
    setChecking(true);
    const t = setTimeout(async () => {
      const { data, error } = await supabase.rpc("fn_slug_status", { p_slug: value });
      setChecking(false);
      const result = (error ? "format" : (data as string)) as "ok" | SlugRejection;
      setStatus(result);
      onValidityChange?.(result === "ok");
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const suggestion = status && status !== "ok" ? suggestSlug(businessName, value) : null;

  return (
    <div>
      <Label>{label}</Label>
      <div className="mt-1.5 flex items-center rounded-lg border border-input bg-background overflow-hidden">
        <span className="px-3 py-2 text-sm text-muted-foreground bg-muted/50 border-r border-border">revvin.co/r/</span>
        <input
          className="flex-1 px-3 py-2 text-sm outline-none bg-transparent"
          value={value}
          onChange={(e) => onChange(slugifyName(e.target.value))}
          placeholder="your-business"
          aria-label="Referral page URL"
        />
      </div>
      <p className="mt-2 text-xs" aria-live="polite">
        {checking ? (
          <span className="text-muted-foreground">Checking…</span>
        ) : status === "ok" ? (
          <span className="text-primary">Available ✓</span>
        ) : status ? (
          <span className="text-destructive">{slugRejectionMessage(status)}</span>
        ) : null}
      </p>
      {suggestion && !checking && (
        <button
          type="button"
          onClick={() => onChange(suggestion)}
          className="mt-1 text-xs text-foreground underline underline-offset-2"
        >
          Try {suggestion} instead
        </button>
      )}
    </div>
  );
};

export default SlugField;
