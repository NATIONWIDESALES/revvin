import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { copyText } from "@/lib/clipboard";
import { personalLink, referrerShareText } from "@/lib/referrerLink";
import { loadMyReferrals, sendMeSignInLink, type MyBusiness } from "@/lib/myReferrals";

const STATUS_LABEL: Record<string, string> = { new: "New", contacted: "Contacted", quoted: "Quoted", closed: "Closed", lost: "Lost" };
const usd = (n: number) => `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;

/** Referrer home. Sign in by email link, then a read-only view of every business they refer for. */
const Me = () => {
  const { user, loading: authLoading } = useAuth() as { user: { email?: string } | null; loading?: boolean };
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [rows, setRows] = useState<MyBusiness[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { setRows(null); return; }
    void loadMyReferrals().then((r) => { setRows(r.data); setError(r.error); });
  }, [user]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) { setError("Enter a valid email address."); return; }
    setSending(true); setError(null);
    const { error: err } = await sendMeSignInLink(email);
    setSending(false);
    if (err) setError("We could not send the link. Try again in a minute.");
    else setSent(true);
  };

  return (
    <main className="container max-w-3xl py-12">
      <SEOHead title="Your referrals | Revvin" description="Private referrer home." path="/me" noindex />
      <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Your referrals</h1>

      {authLoading ? (
        <Loader2 className="mt-8 h-5 w-5 animate-spin text-muted-foreground" />
      ) : !user ? (
        <div className="mt-6 max-w-md rounded-2xl border border-border bg-card p-6">
          {sent ? (
            <p role="status" className="text-sm text-foreground">Check your email. We sent a sign-in link to {email.trim()}.</p>
          ) : (
            <form onSubmit={send} className="space-y-3" noValidate>
              <p className="text-sm text-muted-foreground">Enter the email you use when you refer. We'll send you a sign-in link.</p>
              <div><Label htmlFor="me-email">Email</Label><Input id="me-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5" /></div>
              {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}
              <Button type="submit" disabled={sending}>{sending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Email me a sign-in link"}</Button>
            </form>
          )}
        </div>
      ) : rows === null ? (
        <Loader2 className="mt-8 h-5 w-5 animate-spin text-muted-foreground" />
      ) : (
        <>
          <p className="mt-2 text-sm text-muted-foreground">Signed in as {user.email}.</p>
          {error && <p role="alert" className="mt-4 text-sm font-medium text-destructive">{error}</p>}
          {rows.length === 0 && !error && (
            <p className="mt-8 text-sm text-muted-foreground">No referrals for this email yet. Referrals you send from a Revvin page with this email show up here.</p>
          )}
          <div className="mt-8 space-y-6">
            {rows.map((b) => {
              const link = personalLink(window.location.origin, b.slug, b.token);
              const owed = b.referrals.filter((r) => r.reward_status === "owed").reduce((s, r) => s + Number(r.reward_amount ?? 0), 0);
              const paid = b.referrals.filter((r) => r.reward_status === "paid").reduce((s, r) => s + Number(r.reward_amount ?? 0), 0);
              return (
                <section key={b.token} className="rounded-2xl border border-border bg-card p-6" data-testid="me-business">
                  <h2 className="text-lg font-bold text-foreground">{b.business_name}</h2>
                  {b.reward && <p className="mt-1 text-sm text-muted-foreground">Reward: {b.reward} per closed job</p>}
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    <input readOnly aria-label={`Your link for ${b.business_name}`} value={link} className="min-w-0 flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-xs" />
                    <Button size="sm" variant="outline" onClick={() => void copyText(link).then((ok) => toast(ok ? { title: "Link copied" } : { title: "Could not copy", variant: "destructive" as const }))}>Copy</Button>
                    <Button size="sm" onClick={async () => {
                      const text = referrerShareText(b.business_name, null, link);
                      if (navigator.share) { try { await navigator.share({ text }); } catch { /* closed */ } return; }
                      window.location.href = `sms:?&body=${encodeURIComponent(text)}`;
                    }}>Share</Button>
                  </div>
                  <p className="mt-4 text-sm text-foreground">Owed {usd(owed)} · Paid {usd(paid)}</p>
                  {b.referrals.length > 0 && (
                    <ul className="mt-3 divide-y divide-border text-sm">
                      {b.referrals.map((r, i) => (
                        <li key={i} className="flex flex-wrap items-center justify-between gap-2 py-2">
                          <span className="text-foreground">{r.lead_first_name} <span className="text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span></span>
                          <span className="text-muted-foreground">
                            {STATUS_LABEL[r.status] ?? r.status}
                            {r.reward_status && r.reward_amount != null ? `, ${usd(Number(r.reward_amount))} ${r.reward_status}` : ""}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              );
            })}
          </div>
        </>
      )}
    </main>
  );
};

export default Me;
