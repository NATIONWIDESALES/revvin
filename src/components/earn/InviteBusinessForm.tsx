import { useState } from "react";
import { Link } from "react-router-dom";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/contexts/AuthContext";
import { applyAsEarnPartner, submitEarnLead } from "@/lib/earn";

export const PARTNER_LINE = "If a business you invite joins and pays for Revvin Pro, you can earn through our partner program.";

/** "Know a business that should be here?" Saves the invite, and optionally a pending partner application. */
const InviteBusinessForm = ({ metroSlug }: { metroSlug?: string }) => {
  const { user } = useAuth();
  const [f, setF] = useState({ biz: "", contact: "", name: "", email: "" });
  const [partner, setPartner] = useState(false);
  const [state, setState] = useState<"idle" | "saving" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const email = user?.email ?? f.email;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (f.biz.trim().length < 2) { setError("Enter the business name."); return; }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) { setError("Enter a valid email address."); return; }
    if (partner && f.name.trim().length < 2) { setError("Enter your name for the partner application."); return; }
    setState("saving"); setError(null);
    const ok = await submitEarnLead({ email, source: "business_invite", metroSlug, businessName: f.biz, businessContact: f.contact });
    if (ok && partner) await applyAsEarnPartner(f.name.trim(), email.trim().toLowerCase(), f.biz.trim());
    if (ok) setState("done");
    else { setState("idle"); setError("We could not save that just now. Email info@revvin.co and we will pass it on."); }
  };

  if (state === "done") {
    return <p role="status" className="flex items-center gap-2 text-sm font-medium text-foreground"><Check className="h-4 w-4 text-primary" aria-hidden="true" /> Thanks. We'll reach out to them.</p>;
  }
  const field = (id: keyof typeof f, label: string, type = "text", ac?: string) => (
    <div><Label htmlFor={`invite-${id}`}>{label}</Label><Input id={`invite-${id}`} type={type} autoComplete={ac} value={f[id]} onChange={(e) => setF((v) => ({ ...v, [id]: e.target.value }))} className="mt-1.5" /></div>
  );
  return (
    <form onSubmit={submit} noValidate className="space-y-3">
      {field("biz", "Business name", "text", "organization")}
      {field("contact", "Their email or phone")}
      {!user && field("email", "Your email", "email", "email")}
      <label className="flex items-start gap-3 text-sm text-foreground">
        <Checkbox checked={partner} onCheckedChange={(v) => setPartner(!!v)} className="mt-0.5" aria-label="Also apply to the partner program" />
        <span>Also apply to the partner program. I agree to the <Link to="/partners/terms" className="underline underline-offset-4">partner terms</Link>.</span>
      </label>
      {partner && field("name", "Your name", "text", "name")}
      <p className="text-xs text-muted-foreground">
        {PARTNER_LINE} <Link to="/partners/terms" className="font-medium underline underline-offset-4">See the partner terms.</Link>
      </p>
      {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}
      <Button type="submit" disabled={state === "saving"} className="h-auto min-h-11 w-full whitespace-normal py-2.5 sm:w-auto">
        {state === "saving" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Send
      </Button>
    </form>
  );
};
export default InviteBusinessForm;
