import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { copyText } from "@/lib/clipboard";
import { getEarnLink, type EarnBusiness } from "@/lib/earn";
import { personalLink, referrerShareText } from "@/lib/referrerLink";

/** Name and email (or the signed-in session), then the personal link for one business. */
const GetMyLink = ({ biz, onDone }: { biz: EarnBusiness; onDone: () => void }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);

  const go = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setBusy(true); setError(null);
    const res = await getEarnLink(biz.slug, name, user?.email ?? email);
    setBusy(false);
    if (res.token) setLink(personalLink(window.location.origin, biz.slug, res.token));
    else setError(res.error);
  };

  if (link) {
    const text = referrerShareText(biz.name, biz.trade, link);
    return (
      <div className="space-y-3" data-testid="earn-link">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Your personal link</p>
        <input readOnly aria-label={`Your link for ${biz.name}`} value={link} className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs" />
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => void copyText(link).then((ok) => toast(ok ? { title: "Link copied" } : { title: "Could not copy", variant: "destructive" as const }))}>Copy</Button>
          <Button size="sm" onClick={async () => {
            if (navigator.share) { try { await navigator.share({ text }); } catch { /* closed */ } return; }
            window.location.href = `sms:?&body=${encodeURIComponent(text)}`;
          }}>Share</Button>
          <Button size="sm" variant="ghost" onClick={onDone}>Get links for more businesses</Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={go} noValidate className="space-y-3">
      {user ? (
        <p className="text-sm text-muted-foreground">Signed in as {user.email}.</p>
      ) : (
        <>
          <div><Label htmlFor={`gl-name-${biz.slug}`}>Your name</Label><Input id={`gl-name-${biz.slug}`} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5" /></div>
          <div><Label htmlFor={`gl-email-${biz.slug}`}>Your email</Label><Input id={`gl-email-${biz.slug}`} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5" /></div>
        </>
      )}
      {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Show my link"}</Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDone}>Cancel</Button>
      </div>
    </form>
  );
};
export default GetMyLink;
