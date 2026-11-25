import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Star } from "lucide-react";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { loadSupabase } from "@/lib/supabaseLazy";

type Info = { state: "open" | "used" | "expired" | "invalid"; business_name: string | null; logo_url: string | null; display_name: string | null };
export const reviewPublicLine = (business: string) => `Your review will be public on ${business}'s Revvin profile. Your email is never shown.`;
const LINK = /(https?:|www\.|[a-z0-9-]+\.(com|net|org|co|io|ca|us|info|biz|xyz|app|site|online)(\b|\/))/i;

const ERRORS: Record<string, string> = {
  invalid_body: "Write between 20 and 1,500 characters.",
  body_not_allowed: "Please remove links or offensive words and try again.",
  invalid_rating: "Pick a star rating.",
  invalid_name: "Add the name to show with your review.",
  already_used: "This link has already been used. Thank you.",
  rate_limited: "Too many tries from here. Try again later.",
};

export default function ReviewPage() {
  const { token = "" } = useParams();
  const [info, setInfo] = useState<Info | null>(null);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [body, setBody] = useState("");
  const [name, setName] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");

  useEffect(() => {
    (async () => {
      try {
        const db = await loadSupabase();
        const { data } = await db.rpc("fn_review_token_info" as never, { p_token: token } as never);
        const row = (data as Info[] | null)?.[0] ?? { state: "invalid", business_name: null, logo_url: null, display_name: null };
        setInfo(row);
        setName(row.display_name ?? "");
      } catch { setInfo({ state: "invalid", business_name: null, logo_url: null, display_name: null }); }
    })();
  }, [token]);

  const shell = (children: React.ReactNode) => (
    <main className="mk-wrap max-w-xl py-12">
      <SEOHead title="Leave a review | Revvin" description="Leave a review for a local business." noindex />
      {info?.business_name && (
        <div className="mb-6 flex items-center gap-3">
          {info.logo_url && <img src={info.logo_url} alt="" className="h-14 w-14 rounded-xl border border-line object-contain" />}
          <p className="text-xl font-bold text-forest">{info.business_name}</p>
        </div>
      )}
      {children}
    </main>
  );

  if (!info) return shell(<div className="h-40 animate-pulse rounded-xl bg-muted motion-reduce:animate-none" />);
  if (state === "done") return shell(<div role="status"><h1 className="text-2xl font-bold text-forest">Thank you</h1><p className="mt-2">Your review is now on {info.business_name}'s Revvin profile.</p></div>);
  if (info.state !== "open") return shell(
    <div><h1 className="text-2xl font-bold text-forest">{info.state === "used" ? "This review is already in" : "This link is not available"}</h1>
      <p className="mt-2 text-muted-foreground">{info.state === "used" ? "Each invitation can be used once. Thank you for taking the time." : "The link may be old or incomplete. If the business asked you for a review, ask them to send a new invitation."}</p></div>,
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!rating) return setErr(ERRORS.invalid_rating);
    if (body.trim().length < 20 || body.trim().length > 1500) return setErr(ERRORS.invalid_body);
    if (LINK.test(body)) return setErr(ERRORS.body_not_allowed);
    setState("sending");
    try {
      const db = await loadSupabase();
      const { error } = await db.rpc("fn_review_submit" as never, { p_token: token, p_rating: rating, p_body: body, p_display_name: name } as never);
      if (error) { setErr(ERRORS[Object.keys(ERRORS).find((k) => error.message.includes(k)) ?? ""] ?? "That did not go through. Try again."); setState("idle"); return; }
      setState("done");
    } catch { setErr("That did not go through. Try again."); setState("idle"); }
  };

  return shell(
    <form onSubmit={submit} className="grid gap-5">
      <h1 className="text-2xl font-bold text-forest">How did {info.business_name} do?</h1>
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Your rating</legend>
        <div className="flex gap-1" role="radiogroup" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} star${n > 1 ? "s" : ""}`}
              onClick={() => setRating(n)} onMouseEnter={() => setHover(n)}
              className="rounded p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Star className={`h-9 w-9 ${(hover || rating) >= n ? "fill-sign text-sign" : "text-line"}`} aria-hidden />
            </button>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-1.5">
        <Label htmlFor="rv-body">Your review</Label>
        <Textarea id="rv-body" rows={6} maxLength={1500} value={body} onChange={(e) => setBody(e.target.value)} />
        <p className="text-xs text-muted-foreground">{body.trim().length} of 1,500 characters. At least 20.</p>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="rv-name">Name shown with your review</Label>
        <Input id="rv-name" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} className="h-11" />
        <p className="text-xs text-muted-foreground">Shown as first name and last initial.</p>
      </div>
      <p className="text-sm">{reviewPublicLine(info.business_name ?? "this business")}</p>
      {err && <p role="alert" className="text-sm text-destructive">{err}</p>}
      <Button type="submit" className="h-12" disabled={state === "sending"}>{state === "sending" ? "Sending" : "Post my review"}</Button>
    </form>,
  );
}
