import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminMfaAllowed, type AdminMfaState } from "@/lib/adminMfa";

export default function AdminMfaGate({ children, settingsOnly = false }: { children?: ReactNode; settingsOnly?: boolean }) {
  const { user, userRole, session, loading } = useAuth();
  const [state, setState] = useState<AdminMfaState>({ checked: false, required: false, aal: null });
  const [enrollment, setEnrollment] = useState<{ id: string; qr: string } | null>(null);
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const refresh = useCallback(async () => {
    if (userRole !== "admin") return;
    try {
      const [factors, assurance] = await Promise.all([supabase.auth.mfa.listFactors(), supabase.auth.mfa.getAuthenticatorAssuranceLevel()]);
      if (factors.error || assurance.error) throw new Error("MFA unavailable");
      const verified = factors.data.totp.find(f => f.status === "verified");
      setState({ checked: true, required: Boolean(verified), factorId: verified?.id, aal: assurance.data.currentLevel });
    } catch { setState({ checked: true, required: true, aal: null, error: true }); }
  }, [userRole, user?.id]);
  useEffect(() => { void refresh(); }, [refresh, session?.access_token]);
  const enroll = async () => {
    setBusy(true); setMessage("");
    try {
      const result = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: `Revvin admin ${Date.now()}`, issuer: "Revvin" });
      if (result.error) throw result.error;
      setEnrollment({ id: result.data.id, qr: result.data.totp.qr_code });
    } catch { setMessage("Could not start setup. Please try again."); }
    finally { setBusy(false); }
  };
  const verify = async (event: React.FormEvent) => {
    event.preventDefault();
    const factorId = enrollment?.id ?? state.factorId;
    if (!factorId || !/^\d{6}$/.test(code)) return;
    setBusy(true); setMessage("");
    try {
      const result = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
      if (result.error) throw result.error;
      setEnrollment(null); setCode(""); await refresh();
    } catch { setMessage("That code could not be verified. Try a fresh code from your authenticator."); }
    finally { setBusy(false); }
  };
  const cancel = async () => {
    if (enrollment) await supabase.auth.mfa.unenroll({ factorId: enrollment.id });
    setEnrollment(null); setCode("");
  };
  if (loading || (user && !userRole)) return <div role="status" className="p-6">Checking account security...</div>;
  if (userRole !== "admin") return settingsOnly ? null : <>{children}</>;
  if (!state.checked) return <div role="status" className="p-6">Checking account security...</div>;
  const allowed = adminMfaAllowed(state);
  const showControls = settingsOnly || !state.required || !allowed || enrollment;
  return <>
    {showControls && <section aria-label="Admin account security" className="border border-border bg-card p-6 space-y-4">
      <h2 className="text-lg font-bold">{state.required ? "Two-factor login" : "Turn on two-factor login to protect the admin account"}</h2>
      {state.error ? <><p>Account security could not be checked. Admin access is paused until it can be verified.</p><Button onClick={() => void refresh()}>Try again</Button></> : <>
        {!state.required && !enrollment && <Button onClick={() => void enroll()} disabled={busy}>Enroll authenticator</Button>}
        {state.required && allowed && <p>Your authenticator is verified. Two-factor login protects admin access.</p>}
        {enrollment && <img src={enrollment.qr} alt="Authenticator enrollment QR code" className="h-48 w-48" />}
        {(enrollment || (state.required && !allowed)) && <form onSubmit={verify} className="space-y-3 max-w-sm">
          <Label htmlFor="admin-totp">Authenticator code</Label>
          <Input id="admin-totp" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ""))} required />
          <Button type="submit" disabled={busy || code.length !== 6}>Verify code</Button>
          {enrollment && <Button type="button" variant="ghost" onClick={() => void cancel()}>Cancel setup</Button>}
        </form>}
      </>}
      <p className="text-sm text-muted-foreground">Keep an encrypted backup of your authenticator or transfer it to a spare device before replacing your phone. Password reset does not remove two-factor login. If you lose every copy, a verified project owner must arrange removal of the lost factor. Revvin does not generate recovery codes. Do not enable it until you have a backup.</p>
      {message && <p role="alert" className="text-destructive">{message}</p>}
    </section>}
    {!settingsOnly && allowed && children}
  </>;
}