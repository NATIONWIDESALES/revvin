import { useState } from "react";
import { Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { submitEmailLead, type EmailLeadSource } from "@/lib/emailLeads";

export interface LeadField {
  id: string;
  label: string;
  type?: string;
  autoComplete?: string;
}

/**
 * Small waitlist form. The email field is what is saved to email_leads with
 * the given source. Extra fields are saved only when onSubmitLead handles them.
 */
const LeadCaptureForm = ({
  source,
  emailLabel = "Email",
  extraFields = [],
  submitLabel,
  idPrefix,
  onSubmitLead,
  initialValues,
}: {
  /** Optional custom save, given the email and the extra field values. */
  onSubmitLead?: (email: string, values: Record<string, string>) => Promise<boolean>;
  initialValues?: Record<string, string>;
  source: EmailLeadSource;
  emailLabel?: string;
  extraFields?: LeadField[];
  submitLabel: string;
  idPrefix: string;
}) => {
  const [email, setEmail] = useState("");
  const [values, setValues] = useState<Record<string, string>>(initialValues ?? {});
  const [state, setState] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    setState("saving");
    setError(null);
    const ok = onSubmitLead ? await onSubmitLead(email, values) : (await submitEmailLead(email, source)).ok;
    if (ok) setState("done");
    else {
      setState("error");
      setError("We could not save that just now. Email info@revvin.co and we will add you.");
    }
  };

  if (state === "done") {
    return (
      <p role="status" className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Check className="h-4 w-4 text-primary" aria-hidden="true" /> Thanks. You're on the list.
      </p>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-3">
      {extraFields.map((f) => (
        <div key={f.id}>
          <Label htmlFor={`${idPrefix}-${f.id}`}>{f.label}</Label>
          <Input
            id={`${idPrefix}-${f.id}`}
            type={f.type ?? "text"}
            autoComplete={f.autoComplete}
            value={values[f.id] ?? ""}
            onChange={(e) => setValues((v) => ({ ...v, [f.id]: e.target.value }))}
            className="mt-1.5"
          />
        </div>
      ))}
      <div>
        <Label htmlFor={`${idPrefix}-email`}>{emailLabel}</Label>
        <Input id={`${idPrefix}-email`} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5" />
      </div>
      {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}
      <Button type="submit" disabled={state === "saving"} className="h-auto min-h-11 w-full whitespace-normal py-2.5 sm:w-auto">
        {state === "saving" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        {submitLabel}
      </Button>
    </form>
  );
};

export default LeadCaptureForm;
