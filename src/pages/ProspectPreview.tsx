import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import SEOHead from "@/components/SEOHead";
import Wordmark from "@/components/brand/Wordmark";
import SimpleQRCode from "@/components/marketplace/SimpleQRCode";
import { Loader2 } from "lucide-react";
import { previewQuestion, storePreview, previewSignupUrl } from "@/lib/instantPreview";
import { loadProspectPreview, removeProspectPage, prospectClaimPreview, prospectReward, type ProspectPreview } from "@/lib/prospects";
import { PREVIEW_TRADES } from "@/content/previewTrades";

const tradeLabel = (slug: string) => PREVIEW_TRADES.find((t) => t.slug === slug)?.label ?? "Home services";

/**
 * Prebuilt referral-page preview for outbound sales. Never a live page: no
 * referral form, no contact form, no reviews or ratings. The banner stays
 * visible until the owner claims or removes it.
 */
const ProspectPreviewPage = () => {
  const { code = "" } = useParams();
  const navigate = useNavigate();
  const [prospect, setProspect] = useState<ProspectPreview | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "unavailable" | "removed">("loading");
  const [reward, setReward] = useState(100);
  const [headline, setHeadline] = useState("");
  const [removeOpen, setRemoveOpen] = useState(false);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    let on = true;
    void loadProspectPreview(code).then(({ prospect: p, error }) => {
      if (!on) return;
      if (!p || error) {
        setState("unavailable");
        return;
      }
      setProspect(p);
      setReward(prospectReward(p));
      setHeadline(p.headline_override ?? previewQuestion(p.trade, p.name));
      setState("ready");
    });
    return () => {
      on = false;
    };
  }, [code]);

  const url = useMemo(() => `https://revvin.co/preview/${code}`, [code]);

  const claim = () => {
    if (!prospect) return;
    const data = prospectClaimPreview(prospect, code, null, reward, headline);
    storePreview(data);
    navigate(previewSignupUrl(data));
  };

  const confirmRemove = async () => {
    setRemoving(true);
    await removeProspectPage(code);
    setRemoving(false);
    setRemoveOpen(false);
    setState("removed");
  };

  return (
    <div className="min-h-screen bg-paper">
      <SEOHead
        title="Preview"
        description="A private preview page."
        noindex
        follow={false}
      />

      {state === "loading" && (
        <div className="grid min-h-screen place-items-center">
          <Loader2 className="h-8 w-8 animate-spin text-forest" aria-label="Loading preview" />
        </div>
      )}

      {state === "unavailable" && (
        <div className="grid min-h-screen place-items-center px-6 text-center">
          <div>
            <Wordmark size="md" />
            <h1 className="mt-8 font-display text-4xl font-extrabold text-forest">This preview isn't available</h1>
            <p className="mt-3 text-muted-foreground">It may have been claimed, removed or expired.</p>
            <Button className="mt-8" asChild>
              <Link to="/">Go to Revvin</Link>
            </Button>
          </div>
        </div>
      )}

      {state === "removed" && (
        <div className="grid min-h-screen place-items-center px-6 text-center">
          <div>
            <Wordmark size="md" />
            <h1 className="mt-8 font-display text-4xl font-extrabold text-forest">Removed. Sorry for the bother.</h1>
            <p className="mt-3 text-muted-foreground">This preview is deleted and the link no longer works.</p>
          </div>
        </div>
      )}

      {state === "ready" && prospect && (
        <>
          {/* Always-visible affiliation banner. Not dismissable. */}
          <div role="note" className="bg-sign px-4 py-2.5 text-center text-sm font-semibold text-forest">
            Preview built by Revvin for {prospect.name}. Not active and not affiliated with {prospect.name} until they claim it.
          </div>

          <header className="border-b border-line bg-paper">
            <div className="mk-wrap flex h-16 items-center justify-between">
              <Wordmark size="md" />
              <Button onClick={claim}>Claim it free</Button>
            </div>
          </header>

          <main className="mk-wrap py-12 sm:py-16">
            <p className="text-sm font-semibold text-green">{tradeLabel(prospect.trade)}{prospect.city ? ` in ${prospect.city}` : ""}</p>
            <h1 className="mt-2 font-display text-5xl font-extrabold leading-[.95] text-forest sm:text-6xl">
              {prospect.name}, your referral page is built.
            </h1>
            <p className="mt-4 max-w-xl text-lg text-muted-foreground">
              We put this together from your public business listing so you can see it before deciding. Nothing is live and nobody can send you a referral until you claim it.
            </p>

            {/* Referral page mock with a disabled form */}
            <section className="mt-14" aria-labelledby="mock-heading">
              <h2 id="mock-heading" className="font-display text-3xl font-extrabold text-forest">Your referral page</h2>
              <div className="mt-6 rounded-2xl border-[1.5px] border-line bg-card p-7 sm:p-10">
                <p className="font-display text-2xl font-extrabold text-forest">{prospect.name}</p>
                <Input
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value.slice(0, 120))}
                  aria-label="Referral page headline"
                  className="mt-3 max-w-lg font-display text-xl font-bold text-forest"
                />
                <p className="mt-2 text-sm text-muted-foreground">
                  {prospect.city ? `${prospect.city}${prospect.region ? `, ${prospect.region}` : ""}` : "Your city"} · Reward:{" "}
                  <label className="inline-flex items-center gap-1 font-semibold text-forest">
                    $
                    <Input
                      type="number"
                      min={1}
                      max={1000000}
                      value={reward}
                      onChange={(e) => setReward(Math.max(1, Math.min(1000000, Number(e.target.value) || 1)))}
                      aria-label="Reward amount in dollars"
                      className="h-7 w-24 px-2 py-0"
                    />
                  </label>{" "}
                  when a referred job closes
                </p>
                <fieldset disabled className="mt-6 opacity-60" aria-label="Referral form preview, disabled">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input placeholder="Your name" tabIndex={-1} />
                    <Input placeholder="Your email" tabIndex={-1} />
                    <Input placeholder="Their name" tabIndex={-1} />
                    <Input placeholder="Their phone" tabIndex={-1} />
                  </div>
                  <Button className="mt-4" tabIndex={-1}>Send the referral</Button>
                </fieldset>
                <p className="mt-3 text-xs text-muted-foreground">The form is off in this preview. It switches on when you claim the page.</p>
              </div>
            </section>

            {/* Yard sign with QR back to this preview */}
            <section className="mt-14" aria-labelledby="sign-heading">
              <h2 id="sign-heading" className="font-display text-3xl font-extrabold text-forest">Your yard sign</h2>
              <div className="mt-6 max-w-md">
                <figure className="yard-scene yard-compact" aria-label="Yard sign preview">
                  <div className="yard-sign">
                    <div className="yard-sign-panel">
                      <p className="yard-sign-biz">{prospect.name}</p>
                      <p className="yard-sign-q">{headline}</p>
                      <p className="yard-sign-sub">Scan to send them our way. We pay you ${reward} when the job closes.</p>
                      <div className="yard-sign-foot">
                        <span className="yard-sign-url">revvin.co/preview/{code}</span>
                        <div className="yard-qr" aria-hidden="true">
                          <SimpleQRCode url={url} size={78} color="#0F4A2A" />
                        </div>
                      </div>
                    </div>
                  </div>
                </figure>
              </div>
            </section>

            {/* First ask text */}
            <section className="mt-14" aria-labelledby="ask-heading">
              <h2 id="ask-heading" className="font-display text-3xl font-extrabold text-forest">The first ask you would send</h2>
              <div className="mt-6 max-w-xl rounded-2xl border-[1.5px] border-line bg-card p-6">
                <p className="text-forest">
                  Hi, it's {prospect.name}. Thanks for having us out. If a neighbour or friend needs {tradeLabel(prospect.trade).toLowerCase()} work, would you send them our way? It takes a minute here, and we pay you ${reward} when their job closes: your link
                </p>
                <p className="mt-3 text-xs text-muted-foreground">Sent from your own phone or email app, to customers you choose.</p>
              </div>
            </section>

            {/* What happens when you claim it */}
            <section className="mt-14" aria-labelledby="claim-steps-heading">
              <h2 id="claim-steps-heading" className="font-display text-3xl font-extrabold text-forest">What happens when you claim it</h2>
              <ol className="mt-6 grid gap-4 sm:grid-cols-3">
                {[
                  { t: "Create your free account", b: "Everything on this page is carried over: name, trade, reward and city." },
                  { t: "Publish in one tap", b: "Your page goes live on your own Revvin link, free for your first 100 customers." },
                  { t: "Send your first ask", b: "Every new account gets Pro free for 14 days, no card. Ask a past customer today." },
                ].map((s, i) => (
                  <li key={s.t} className="rounded-2xl border-[1.5px] border-line bg-card p-6">
                    <p className="font-display text-3xl font-extrabold text-green">{i + 1}</p>
                    <p className="mt-2 font-semibold text-forest">{s.t}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{s.b}</p>
                  </li>
                ))}
              </ol>
              <Button size="lg" className="mt-8" onClick={claim}>Claim it free</Button>
            </section>

            {/* FAQ */}
            <section className="mt-14 max-w-2xl" aria-labelledby="faq-heading">
              <h2 id="faq-heading" className="font-display text-3xl font-extrabold text-forest">Questions</h2>
              <dl className="mt-6 space-y-6">
                <div>
                  <dt className="font-semibold text-forest">Who built this?</dt>
                  <dd className="mt-1 text-muted-foreground">Revvin's team made this preview from your public business listing so you can see it before deciding.</dd>
                </div>
                <div>
                  <dt className="font-semibold text-forest">Is it live?</dt>
                  <dd className="mt-1 text-muted-foreground">No, nothing is live and nobody can submit referrals until you claim it.</dd>
                </div>
                <div>
                  <dt className="font-semibold text-forest">How do I remove it?</dt>
                  <dd className="mt-1 text-muted-foreground">One tap below, it's deleted right away.</dd>
                </div>
              </dl>
            </section>

            <div className="mt-14 border-t border-line pt-8">
              <button
                onClick={() => setRemoveOpen(true)}
                className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
              >
                Not my business / remove this page
              </button>
            </div>
          </main>

          <AlertDialog open={removeOpen} onOpenChange={setRemoveOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove this preview?</AlertDialogTitle>
                <AlertDialogDescription>
                  The page is deleted right away and the link stops working. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep it</AlertDialogCancel>
                <AlertDialogAction onClick={confirmRemove} disabled={removing}>
                  {removing ? "Removing..." : "Remove it"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </div>
  );
};

export default ProspectPreviewPage;
