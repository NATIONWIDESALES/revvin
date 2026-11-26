import { useCallback, useEffect, useState } from "react";
import { BadgeCheck, FileUp, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { loadOwnershipState, sendOwnershipCode, submitOwnershipDocument, verifyOwnershipCode, type OwnershipState } from "@/lib/ownership";

export function useOwnershipState(enabled = true) {
  const [state, setState] = useState<OwnershipState | null>(null);
  const [loading, setLoading] = useState(enabled);
  const reload = useCallback(async () => {
    if (!enabled) { setLoading(false); return; }
    setLoading(true);
    try { setState(await loadOwnershipState()); } finally { setLoading(false); }
  }, [enabled]);
  useEffect(() => { void reload().catch(() => setLoading(false)); }, [reload]);
  return { state, loading, reload };
}

const messageFor = (error: unknown) => {
  const m = String((error as { message?: string })?.message ?? error);
  if (m.includes("domain_mismatch")) return "Use an email address at the business website domain shown above.";
  if (m.includes("rate_limited")) return "You have reached the daily code limit. Try again tomorrow or upload a document.";
  if (m.includes("code_expired")) return "That code expired. Request a new one.";
  if (m.includes("too_many_attempts")) return "Too many wrong attempts. Request a new code after the daily limit resets, or upload a document.";
  if (m.includes("invalid_code")) return "That code is not correct. Check it and try again.";
  if (m.includes("already_submitted")) return "A document is already waiting for review.";
  if (m.includes("invalid_document")) return "Use a PDF, JPG or PNG up to 10 MB.";
  return "That did not go through. Try again.";
};

export default function OwnershipCard({ state, reload }: { state: OwnershipState; reload: () => Promise<void> }) {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  if (state.status === "verified") return null;

  const run = async (action: () => Promise<void>, success: string) => {
    setBusy(true);
    try { await action(); toast({ title: success }); await reload(); }
    catch (error) { toast({ title: messageFor(error), variant: "destructive" }); }
    finally { setBusy(false); }
  };

  return (
    <section className="rounded-2xl border-2 border-sign bg-card p-5" data-testid="ownership-card">
      <div className="flex items-start gap-3">
        <BadgeCheck className="mt-1 h-6 w-6 shrink-0 text-primary" aria-hidden />
        <div>
          <h2 className="text-lg font-bold text-forest">Confirm you own {state.business_name}</h2>
          <p className="mt-1 text-sm text-muted-foreground">Your tools stay available. Confirmation adds the owner-claimed badge and lets your profile receive quote requests.</p>
          {state.status === "disputed" && <p className="mt-2 rounded-lg bg-secondary p-3 text-sm">An ownership report is under review. Your profile shows Claim pending while Revvin reviews it.</p>}
          {state.status === "rejected" && <p className="mt-2 rounded-lg bg-secondary p-3 text-sm">The last review did not confirm ownership.{state.reject_reason ? ` Reason: ${state.reject_reason}` : ""} You can submit another document{state.domain ? " or use a business-domain email" : ""}.</p>}
        </div>
      </div>

      {state.request_status === "open" ? (
        <p className="mt-4 rounded-lg bg-secondary p-3 text-sm font-medium" role="status">Document received. We review documents within 2 business days.</p>
      ) : (
        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          {state.domain && state.status !== "disputed" && (
            <div className="rounded-xl border border-line p-4">
              <h3 className="flex items-center gap-2 font-semibold"><Mail className="h-4 w-4" aria-hidden />Confirm with a business email</h3>
              <p className="mt-1 text-sm text-muted-foreground">Use an address at <strong>@{state.domain}</strong>. A confirmed sign-in email at this domain is checked automatically.</p>
              <div className="mt-3 grid gap-2">
                <Label htmlFor="ownership-email">Business email address</Label>
                <Input id="ownership-email" type="email" autoComplete="email" maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} placeholder={`name@${state.domain}`} className="h-11" />
                <Button variant="outline" disabled={busy || !email.trim()} onClick={() => void run(async () => { await sendOwnershipCode(email); setCodeSent(true); }, "Code sent")}>Send a 6-digit code</Button>
                {codeSent && <>
                  <Label htmlFor="ownership-code">Email code</Label>
                  <Input id="ownership-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} className="h-11 tracking-widest" />
                  <Button disabled={busy || code.length !== 6} onClick={() => void run(() => verifyOwnershipCode(code), "Ownership confirmed")}>Confirm ownership</Button>
                  <p className="text-xs text-muted-foreground">The code expires in 30 minutes. Up to 3 codes per day and 5 wrong attempts.</p>
                </>}
              </div>
            </div>
          )}

          <div className="rounded-xl border border-line p-4">
            <h3 className="flex items-center gap-2 font-semibold"><FileUp className="h-4 w-4" aria-hidden />Upload a business document</h3>
            <p className="mt-1 text-sm text-muted-foreground">A business licence, incorporation paper, insurance certificate, or a utility bill or invoice showing the business name and address.</p>
            <div className="mt-3 grid gap-2">
              <Label htmlFor="ownership-document">PDF, JPG or PNG, up to 10 MB</Label>
              <Input id="ownership-document" type="file" accept="application/pdf,image/jpeg,image/png" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              <Label htmlFor="ownership-note">Note for the reviewer (optional)</Label>
              <Textarea id="ownership-note" maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} />
              <Button variant={state.domain ? "outline" : "default"} disabled={busy || !file} onClick={() => void run(() => submitOwnershipDocument(state.business_id, file!, note), "Document submitted")}>Submit for review</Button>
              <p className="text-xs text-muted-foreground">We review documents within 2 business days. Documents are private.</p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export function OwnershipKitItem({ onGo }: { onGo: (tab: "profile") => void }) {
  const { state, loading } = useOwnershipState();
  if (loading || !state || state.status === "verified") return null;
  return (
    <button type="button" onClick={() => onGo("profile")} data-testid="kit-ownership-step"
      className="flex min-h-11 w-full items-center gap-3 rounded-[14px] border border-line bg-card p-4 text-left font-semibold text-forest hover:border-forest">
      <span aria-hidden className="h-5 w-5 shrink-0 rounded border-2 border-line" />Confirm you own {state.business_name}
    </button>
  );
}
