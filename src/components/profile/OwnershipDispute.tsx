import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { fileOwnershipDispute } from "@/lib/ownership";

export default function OwnershipDispute({ slug }: { slug: string }) {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [details, setDetails] = useState("");
  const [proof, setProof] = useState<File | null>(null);

  if (sent) return <p className="text-sm text-muted-foreground" role="status">Thanks. Revvin received the ownership report for review.</p>;
  return (
    <div className="text-sm">
      <button type="button" className="text-left text-muted-foreground underline underline-offset-4" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        Is this your business and not you who claimed it? Report it.
      </button>
      {open && (
        <form className="mt-4 grid gap-3 rounded-xl border border-line bg-card p-4" onSubmit={async (e) => {
          e.preventDefault(); setBusy(true); setError("");
          try { await fileOwnershipDispute({ slug, name, role, email, phone, details, proof }); setSent(true); }
          catch (err) { const m = String((err as Error).message); setError(m.includes("rate_limited") ? "Too many reports from this connection today. Try again tomorrow." : "That report did not go through. Check your details and try again."); }
          finally { setBusy(false); }
        }}>
          <p className="font-semibold text-forest">Report an ownership problem</p>
          <div className="grid gap-1.5"><Label htmlFor="od-name">Your name</Label><Input id="od-name" required maxLength={120} value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="grid gap-1.5"><Label htmlFor="od-role">Your role at the business</Label><Input id="od-role" required maxLength={80} value={role} onChange={(e) => setRole(e.target.value)} /></div>
          <div className="grid gap-1.5"><Label htmlFor="od-email">Your email</Label><Input id="od-email" required type="email" maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div className="grid gap-1.5"><Label htmlFor="od-phone">Phone (optional)</Label><Input id="od-phone" type="tel" maxLength={40} value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
          <div className="grid gap-1.5"><Label htmlFor="od-details">What happened?</Label><Textarea id="od-details" required minLength={5} maxLength={3000} value={details} onChange={(e) => setDetails(e.target.value)} /></div>
          <div className="grid gap-1.5"><Label htmlFor="od-proof">Optional proof (PDF, JPG or PNG, up to 10 MB)</Label><Input id="od-proof" type="file" accept="application/pdf,image/jpeg,image/png" onChange={(e) => setProof(e.target.files?.[0] ?? null)} /></div>
          <p className="text-xs text-muted-foreground">We use these details only to review this report. See our <Link to="/privacy" className="underline">Privacy policy</Link>.</p>
          {error && <p role="alert" className="text-destructive">{error}</p>}
          <Button type="submit" variant="outline" disabled={busy}>{busy ? "Sending" : "Send ownership report"}</Button>
        </form>
      )}
    </div>
  );
}
