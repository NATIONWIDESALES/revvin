import { isRestrictedCategory } from "@/lib/offerUtils";
import { PUBLIC_REFERRAL_PAGE_COLS } from "@/lib/publicReferralCols";
import { showVerifiedBadge } from "@/lib/verifiedBadge";
import { copyText } from "@/lib/clipboard";
import { useEffect, useState } from "react";
import { useParams, Link, useLocation } from "react-router-dom";
import { businessMetro } from "@/lib/earn";
import { activeRef, forgetRef, personalLink, referrerShareText, rememberRef } from "@/lib/referrerLink";
import { loadSupabase } from "@/lib/supabaseLazy";
import { readSsrBusiness } from "@/lib/ssrData";
import { track } from "@/lib/track";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import SEOHead from "@/components/SEOHead";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Loader2, BadgeCheck, Globe, Quote, Eye, Lock } from "lucide-react";
import { friendlyError } from "@/lib/errors";
import { submitPublicReferral, referralSubmitMessage } from "@/lib/referralSubmit";
import AddToHomeScreen from "@/components/pwa/AddToHomeScreen";
import { referrerInstallLine } from "@/config/installCopy";
import { buildBusinessManifest, businessManifestPath } from "@/lib/webManifest";
import { applyPageManifest } from "@/lib/pageManifest";


interface Business {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  user_id?: string | null;
  category: string | null;
  service_area: string | null;
  logo_url: string | null;
  offer_amount: string | null;
  offer_trigger: string | null;
  offer_fine_print: string | null;
  city?: string | null;
  state?: string | null;
  website?: string | null;
  is_verified?: boolean | null;
  brand_color?: string | null;
  cover_image_url?: string | null;
  headline?: string | null;
  welcome_message?: string | null;
  referral_cta_label?: string | null;
  testimonials?: Testimonial[] | null;
}

export interface Testimonial {
  quote: string;
  author?: string;
  role?: string;
}

function isValidHex(v: string | null | undefined): v is string {
  return !!v && /^#[0-9a-f]{6}$/i.test(v.trim());
}

function normalizeWebsite(url: string): string {
  if (!url) return "";
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

const PublicReferralPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { toast } = useToast();
  // A prerendered page carries the business it was built with, so the first
  // render (on the server and in the browser) shows the real page. The live
  // fetch below still runs and replaces it with current data.
  const [ssr] = useState(() => readSsrBusiness<Business>(slug));
  const [biz, setBiz] = useState<Business | null>(ssr?.business ?? null);
  const [loading, setLoading] = useState(!ssr);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [statusUrl, setStatusUrl] = useState<string | null>(null);
  /** True when the viewer is the owner looking at their own unpublished page. */
  const [ownerPreview, setOwnerPreview] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const location = useLocation();
  // Personal link: the token from ?ref or the one remembered for this page.
  const [refToken, setRefToken] = useState<string | null>(null);
  const [refPerson, setRefPerson] = useState<{ first_name: string; has_email: boolean } | null>(null);
  const [myLink, setMyLink] = useState<string | null>(null);
  const [earnMetro, setEarnMetro] = useState<string | null>(ssr?.earnMetro ?? null);
  useEffect(() => { if (slug) void businessMetro(slug).then(setEarnMetro); }, [slug]);

  useEffect(() => {
    if (!slug) return;
    const token = activeRef(slug, location.search);
    if (!token) return;
    (async () => {
      const supabase = await loadSupabase();
      const { data } = await supabase.rpc("fn_resolve_referrer" as never, { p_slug: slug, p_token: token } as never);
      const person = data as unknown as { first_name: string; has_email: boolean } | null;
      if (person?.first_name) { setRefToken(token); setRefPerson(person); }
      else forgetRef(slug); // Unknown or another business's token: ignored.
    })();
  }, [slug, location.search]);

  const clearRef = () => {
    if (slug) forgetRef(slug);
    setRefToken(null);
    setRefPerson(null);
    if (location.search.includes("ref=")) window.history.replaceState(null, "", `/r/${slug}`);
  };

  const [form, setForm] = useState({
    referrer_name: "",
    referrer_email: "",
    referrer_phone: "",
    lead_name: "",
    lead_phone: "",
    lead_email: "",
    lead_need: "",
    relationship_to_lead: "",
    consent_given: false,
    // honeypot
    website: "",
  });

  // A shortcut saved from this page must reopen this page, not the dashboard,
  // so the page swaps in its own app metadata while it is open.
  useEffect(() => {
    if (!biz?.slug) return;
    return applyPageManifest({
      staticHref: businessManifestPath(biz.slug),
      manifest: buildBusinessManifest({ slug: biz.slug, name: biz.name, logoUrl: biz.logo_url }),
    });
  }, [biz?.slug, biz?.name, biz?.logo_url]);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const COLS = PUBLIC_REFERRAL_PAGE_COLS;
      const supabase = await loadSupabase();

      const { data, error } = await supabase
        .from("businesses_public" as any)
        .select(COLS)
        .eq("slug", slug)
        .limit(1);

      // A failed query is not the same as a page that is not live. Show a
      // retry state, log the real error in development and record the failure.
      if (error) {
        if (import.meta.env.DEV) console.error("[PublicReferralPage] businesses_public query failed", error);
        track("referral_page_load_failed");
        setLoadFailed(true);
        setLoading(false);
        return;
      }

      if (data?.[0]) {
        setBiz((data[0] as unknown) as Business);
        setLoading(false);
        return;
      }

      // Not live. If the signed-in viewer owns this page, show it in preview
      // mode so they can see exactly what customers will see once they go live.
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user?.id;
      if (uid) {
        const { data: own } = await supabase
          .from("businesses")
          .select(`${COLS},user_id`)
          .eq("slug", slug)
          .eq("user_id", uid)
          .limit(1);
        if (own?.[0]) {
          setBiz((own[0] as unknown) as Business);
          setOwnerPreview(true);
          setLoading(false);
          return;
        }
      }

      setBiz(null);
      setLoading(false);
    })();
  }, [slug]);

  const update = (k: keyof typeof form, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!biz || !slug) return;
    if (ownerPreview) return; // preview only, never writes a lead
    if (form.website) return; // honeypot
    if (!form.consent_given) {
      toast({ title: "Consent required", description: "Please confirm you have permission to share this lead's info.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { receipt, error } = await submitPublicReferral({ slug, ...form, ref_token: refToken });
    setSubmitting(false);
    if (error || !receipt) {
      toast({
        title: "Could not submit",
        description: referralSubmitMessage(error) ?? friendlyError(error),
        variant: "destructive",
      });
      return;
    }
    setStatusUrl(`${window.location.origin}/r/status/${receipt.status_token}`);
    if (receipt.referrer_token) {
      rememberRef(slug, receipt.referrer_token);
      setMyLink(personalLink(window.location.origin, slug, receipt.referrer_token));
    }
    // The owner's email is NOT sent from here. The submit RPC commits a durable
    // notification job alongside the lead, and the worker delivers it, so
    // closing this tab or a provider outage can no longer lose the notification.
    if (!receipt.replay) {
      // No PII and no receipt token in instrumentation.
      track("referral_submitted");
    }
    setSubmitted(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };


  if (loading) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (!biz && loadFailed) {
    return (
      <>
        <SEOHead title="Referral page unavailable · Revvin" description="This referral page could not load." noindex />
        <div className="flex min-h-screen items-center justify-center p-6 text-center">
          <div className="max-w-sm">
            <h1 className="text-2xl">This page did not load</h1>
            <p className="mt-2 text-sm text-muted-foreground">Something went wrong on our side. Try again in a moment.</p>
            <button type="button" onClick={() => window.location.reload()} className="mt-6 text-sm font-medium text-foreground underline">
              Try again
            </button>
          </div>
        </div>
      </>
    );
  }

  if (!biz) {
    return (
      <>
        <SEOHead title="Referral page unavailable · Revvin" description="This referral page is not live." noindex />
        <div className="flex min-h-screen items-center justify-center p-6 text-center">
          <div className="max-w-sm">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Lock className="h-5 w-5" />
            </div>
            <h1 className="mt-4 text-2xl">This referral page is not live</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              It may not have launched yet, or the link may be wrong. Double-check the address with the business.
            </p>
            <Link to="/" className="mt-6 inline-block text-sm font-medium text-foreground underline">
              Go to Revvin
            </Link>
          </div>
        </div>
      </>
    );
  }

  const initial = biz.name.charAt(0).toUpperCase();
  // Pro branding: a valid brand colour replaces forest in the header.
  const headerBg = isValidHex(biz.brand_color) ? biz.brand_color.trim() : "hsl(var(--forest))";
  const locationLabel = [biz.city, biz.state].filter(Boolean).join(", ") || biz.service_area || null;
  const whereLine = biz.category && biz.city ? `${biz.category} in ${biz.city}` : biz.category || locationLabel;
  const websiteUrl = biz.website ? normalizeWebsite(biz.website) : null;
  const testimonials = Array.isArray(biz.testimonials)
    ? biz.testimonials.filter((t) => t && typeof t.quote === "string" && t.quote.trim().length > 0)
    : [];
  const ctaLabel = (biz.referral_cta_label ?? "").trim() || "Send referral";
  const hasCover = !!(biz.cover_image_url && biz.cover_image_url.trim().length > 0);
  const amount = biz.offer_amount?.trim() || null;
  const reward = amount ?? "a reward";
  const label = "mb-1.5 block text-[15px] font-semibold text-foreground";

  return (
    <>
      <SEOHead
        title={`Refer a customer to ${biz.name}${biz.city ? ` in ${biz.city}` : ""}, earn ${biz.offer_amount?.trim() || "a reward"}`}
        description={`${biz.name} pays ${biz.offer_amount?.trim() || "a reward"} when your referral turns into a job. Submit a referral or get your own link.`}
        path={`/r/${biz.slug}`}
        noindex={ownerPreview || !!(biz as { is_demo?: boolean | null }).is_demo || isRestrictedCategory(biz.category)}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "LocalBusiness",
          name: biz.name,
          url: `https://revvin.co/r/${biz.slug}`,
          ...(biz.city ? { areaServed: { "@type": "City", name: biz.city } } : {}),
          makesOffer: {
            "@type": "Offer",
            name: "Referral reward",
            description: `${biz.name} pays ${biz.offer_amount?.trim() || "a reward"} when a referral turns into a job.`,
          },
        }}
      />
      <div className="min-h-screen bg-paper">
        {ownerPreview && (
          <div className="sticky top-0 z-50 border-b border-sign bg-sign px-4 py-3 text-forest">
            <div className="mx-auto flex max-w-3xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="flex items-start gap-2 text-sm">
                <Eye className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>
                  <strong className="font-semibold">Preview only.</strong> This page is in draft, so nobody else can
                  see it and the form does not accept referrals yet.
                </span>
              </p>
              <Button asChild size="sm" className="shrink-0 bg-forest hover:bg-forest/90">
                <Link to="/dashboard" onClick={() => track("publish_page_clicked")}>
                  Publish page
                </Link>
              </Button>
            </div>
          </div>
        )}

        {/* Header */}
        <header className="relative overflow-hidden text-primary-foreground" style={{ background: headerBg }}>
          {hasCover && (
            <img src={biz.cover_image_url!} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover opacity-15" />
          )}
          <div className="relative mx-auto max-w-[1080px] px-5 pb-10 pt-7 md:px-6 md:pb-[120px] md:pt-10">
            <div className="flex items-center gap-4">
              {biz.logo_url ? (
                <img src={biz.logo_url} alt={`${biz.name} logo`} className="h-[72px] w-[72px] shrink-0 rounded-[14px] bg-card object-cover" />
              ) : (
                <div aria-hidden className="grid h-[72px] w-[72px] shrink-0 place-items-center rounded-[14px] bg-card font-display text-[34px] font-extrabold text-forest">
                  {initial}
                </div>
              )}
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-display text-[34px] leading-none md:text-[44px]">{biz.name}</h1>
                  {showVerifiedBadge(biz) && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary-foreground/15 px-2 py-0.5 text-xs font-semibold">
                      <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" /> Verified
                    </span>
                  )}
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[15px] text-primary-foreground/85">
                  {whereLine && <span>{whereLine}</span>}
                  {websiteUrl && (
                    <a href={websiteUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline underline-offset-4">
                      <Globe className="h-3.5 w-3.5" aria-hidden="true" /> Website
                    </a>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-8 max-w-[640px] md:mt-10">
              <h2 className="font-display text-[clamp(40px,6vw,72px)] leading-[.94]">
                {biz.headline?.trim() || <>{refQuestion(biz.category, biz.name)}</>}
                {amount && (
                  <>
                    {" "}
                    <b className="inline-block -rotate-2 rounded-lg bg-sign px-3 text-forest">Get {amount}.</b>
                  </>
                )}
              </h2>
              <p className="mt-5 max-w-[34em] text-lg leading-snug text-primary-foreground/90">
                Send them our way. When your referral books a job with {biz.name}, they pay you {reward}.
              </p>
              {biz.welcome_message && (
                <p className="mt-3 max-w-[34em] whitespace-pre-line text-base text-primary-foreground/85">{biz.welcome_message}</p>
              )}
              <ul className="rf-facts mt-6 flex flex-col gap-2 text-base font-semibold sm:flex-row sm:flex-wrap sm:gap-x-6">
                <li>Paid by {biz.name} directly</li>
                <li>No fees taken out</li>
                <li>Takes about 30 seconds</li>
              </ul>
            </div>
          </div>
        </header>

        {/* Main */}
        <div className="relative mx-auto grid max-w-[1080px] gap-8 px-4 pb-12 pt-0 md:-mt-[88px] md:grid-cols-[minmax(0,1fr)_440px] md:px-6 md:pb-16">
          {/* Form card: first on mobile, right column on desktop */}
          <div className="order-1 -mt-4 min-w-0 md:order-2 md:mt-0">
            <div className="rounded-[18px] border border-line bg-card p-[22px] shadow-[0_30px_60px_-40px_rgba(15,74,42,.5)] md:p-8">
          {submitted ? (
            <div className="py-2">
              <CheckCircle2 className="h-10 w-10 text-green" aria-hidden="true" />
              <h2 className="mt-3 font-display text-[30px] leading-none text-forest">Thanks. {biz.name} will reach out to them.</h2>
              {myLink && (
                <div className="mt-5 rounded-xl border border-line bg-paper p-4">
                  <p className="text-sm font-bold text-forest">Your personal link</p>
                  <input readOnly aria-label="Your personal link" value={myLink} className="rf-input mt-2 text-sm" />
                  <div className="mt-3 flex gap-2">
                    <Button type="button" variant="line" className="flex-1" onClick={() => {
                      void copyText(myLink).then((ok) => toast(ok ? { title: "Link copied" } : { title: "Could not copy the link", description: "Select the link and copy it manually.", variant: "destructive" as const }));
                    }}>Copy</Button>
                    <Button type="button" className="flex-1" onClick={async () => {
                      const text = referrerShareText(biz.name, biz.category, myLink);
                      if (navigator.share) { try { await navigator.share({ text }); return; } catch { return; } }
                      window.location.href = `sms:?&body=${encodeURIComponent(text)}`;
                    }}>Share</Button>
                  </div>
                </div>
              )}
              {statusUrl && (
                <div className="mt-4 rounded-xl border border-line p-4">
                  <p className="text-sm font-bold text-forest">Track this referral</p>
                  <p className="mt-1 text-sm text-muted-foreground">Bookmark this private link to check the stage and reward status anytime.</p>
                  <div className="mt-2 flex items-center gap-2">
                    <input readOnly aria-label="Referral status link" value={statusUrl} className="rf-input flex-1 text-sm" />
                    <Button
                      type="button"
                      variant="line"
                      onClick={() => {
                        void copyText(statusUrl).then((ok) =>
                          toast(
                            ok
                              ? { title: "Link copied" }
                              : {
                                  title: "Could not copy the link",
                                  description: "Select the link and copy it manually.",
                                  variant: "destructive" as const,
                                }
                          )
                        );
                      }}
                    >
                      Copy
                    </Button>
                  </div>
                </div>
              )}
              <div className="mt-5">
                <AddToHomeScreen surface="referral_success" line={referrerInstallLine(biz.name)} />
              </div>
            </div>
          ) : (
            <form onSubmit={submit}>
              <fieldset disabled={ownerPreview} className={ownerPreview ? "space-y-4 opacity-60" : "space-y-4"}>
              <h2 className="font-display text-[34px] leading-none text-forest">Who should we call?</h2>
              <p className="-mt-1 text-[15px] text-muted-foreground">
                {ownerPreview ? "This is how the form will look to your customers." : "Only refer people who asked for help or said it's okay."}
              </p>
              <input type="text" name="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => update("website", e.target.value)} className="hidden" />

              {refPerson ? (
                <>
                  <p className="rounded-[10px] bg-[#E8F2EA] px-3.5 py-3 font-semibold text-forest" data-testid="referring-as">
                    Referring as {refPerson.first_name}.{" "}
                    <button type="button" onClick={clearRef} className="font-semibold underline underline-offset-4">Not you?</button>
                  </p>
                  {!refPerson.has_email && (
                    <div><label htmlFor="rf-remail" className={label}>Your email</label><input id="rf-remail" required type="email" value={form.referrer_email} onChange={(e) => update("referrer_email", e.target.value)} className="rf-input" /></div>
                  )}
                </>
              ) : (
                <>
                  <div><label htmlFor="rf-rname" className={label}>Your name</label><input id="rf-rname" required value={form.referrer_name} onChange={(e) => update("referrer_name", e.target.value)} className="rf-input" /></div>
                  <div><label htmlFor="rf-remail" className={label}>Your email</label><input id="rf-remail" required type="email" value={form.referrer_email} onChange={(e) => update("referrer_email", e.target.value)} className="rf-input" /></div>
                  <div><label htmlFor="rf-rphone" className={label}>Your phone <span className="font-normal text-muted-foreground">(optional)</span></label><input id="rf-rphone" type="tel" value={form.referrer_phone} onChange={(e) => update("referrer_phone", e.target.value)} className="rf-input" /></div>
                  <hr className="border-line" />
                </>
              )}

              <div><label htmlFor="rf-lname" className={label}>Their name</label><input id="rf-lname" required value={form.lead_name} onChange={(e) => update("lead_name", e.target.value)} className="rf-input" /></div>
              <div><label htmlFor="rf-lphone" className={label}>Their phone</label><input id="rf-lphone" required type="tel" value={form.lead_phone} onChange={(e) => update("lead_phone", e.target.value)} className="rf-input" /></div>
              <div><label htmlFor="rf-lemail" className={label}>Their email <span className="font-normal text-muted-foreground">(optional)</span></label><input id="rf-lemail" type="email" value={form.lead_email} onChange={(e) => update("lead_email", e.target.value)} className="rf-input" /></div>
              <div><label htmlFor="rf-need" className={label}>What do they need?</label><textarea id="rf-need" required value={form.lead_need} onChange={(e) => update("lead_need", e.target.value)} className="rf-input" rows={3} /></div>
              <div><label htmlFor="rf-rel" className={label}>How do you know them? <span className="font-normal text-muted-foreground">(optional)</span></label><input id="rf-rel" value={form.relationship_to_lead} onChange={(e) => update("relationship_to_lead", e.target.value)} className="rf-input" /></div>

              <label className="flex cursor-pointer items-start gap-3 pt-1 text-[15px] text-foreground">
                <Checkbox checked={form.consent_given} onCheckedChange={(v) => update("consent_given", !!v)} className="mt-0.5 h-5 w-5" />
                <span>They said it's okay to share their details with {biz.name}.</span>
              </label>

              <button
                type="submit"
                className="flex h-[58px] w-full items-center justify-center rounded-xl text-[19px] font-bold text-primary-foreground transition-colors hover:brightness-95 disabled:opacity-60"
                style={{ background: isValidHex(biz.brand_color) ? biz.brand_color!.trim() : "hsl(var(--green))" }}
                disabled={submitting}
              >
                {submitting ? <Loader2 className="h-5 w-5 animate-spin" aria-label="Sending" /> : ctaLabel}
              </button>
              <p className="text-center text-sm text-muted-foreground">You'll get your own link to share, and a note when the job closes.</p>
              </fieldset>
            </form>
          )}
            </div>
          </div>

          {/* Side cards */}
          <div className="order-2 flex min-w-0 flex-col gap-8 md:order-1 md:pt-[120px]">
            <section className="rounded-[18px] border border-line bg-card p-[22px] md:p-8" aria-labelledby="rf-how">
              <h2 id="rf-how" className="font-display text-[30px] font-extrabold leading-none text-forest">How it works</h2>
              <ol className="rf-steps mt-6 space-y-5">
                <li><b className="block text-forest">You send their details</b><span className="text-muted-foreground">Here, or by sharing your personal link with them.</span></li>
                <li><b className="block text-forest">{biz.name} calls them</b><span className="text-muted-foreground">They reach out directly. You don't have to do anything else.</span></li>
                <li><b className="block text-forest">The job closes, you get paid</b><span className="text-muted-foreground">{biz.name} pays you {reward} directly and you get a note when it's marked paid.</span></li>
              </ol>
            </section>

            {testimonials.length > 0 && (
              <section className="rounded-[18px] border border-line bg-card p-[22px] md:p-8" aria-labelledby="rf-say">
                <h2 id="rf-say" className="font-display text-[30px] font-extrabold leading-none text-forest">What customers say</h2>
                <div className="mt-5 space-y-5">
                  {testimonials.map((t, i) => (
                    <figure key={i}>
                      <Quote className="mb-2 h-4 w-4 text-green" aria-hidden="true" />
                      <blockquote className="text-base leading-relaxed text-foreground">"{t.quote}"</blockquote>
                      {(t.author || t.role) && (
                        <figcaption className="mt-1.5 text-sm text-muted-foreground">{[t.author, t.role].filter(Boolean).join(", ")}</figcaption>
                      )}
                    </figure>
                  ))}
                </div>
              </section>
            )}

            <section className="rounded-[18px] border border-line bg-card p-[22px] md:p-8" aria-labelledby="rf-about">
              <h2 id="rf-about" className="font-display text-[30px] font-extrabold leading-none text-forest">About {biz.name}</h2>
              {biz.description && <p className="mt-4 text-base leading-relaxed text-foreground">{biz.description}</p>}
              {biz.offer_trigger && <p className="mt-3 text-base text-muted-foreground">{biz.offer_trigger}</p>}
              <p className="mt-4 text-sm text-muted-foreground">
                {biz.offer_fine_print?.trim()
                  ? `${biz.offer_fine_print.trim()} `
                  : `Reward paid per closed job, not per referral. ${biz.name} decides when a job counts as closed. `}
                Revvin keeps the record and never takes a cut.
              </p>
            </section>
          </div>
        </div>

        <footer className="border-t border-line py-8 text-center text-sm text-muted-foreground">
          {earnMetro && (
            <p className="mb-3">
              <Link to={`/earn/${earnMetro}`} className="font-semibold text-forest underline underline-offset-4">Find more local businesses that pay for referrals</Link>
            </p>
          )}
          <Link to="/" className="hover:text-foreground">
            Referral page by <span className="wordmark text-base text-green">REVVIN.CO</span>
          </Link>
        </footer>
      </div>
    </>
  );
};

/** Short trade phrase for the referral question, by category. */
export const TRADE_PHRASES: Record<string, string> = {
  roofing: "a roof",
  hvac: "heating or cooling work",
  plumbing: "a plumber",
  electrical: "an electrician",
  landscaping: "a landscaper",
  painting: "a painter",
  solar: "solar",
  "windows and doors": "new windows",
  "pest control": "pest control",
  "home security": "home security",
  remodeling: "a renovation",
  cleaning: "a cleaner",
};
export const tradePhrase = (category: string | null | undefined, name: string) =>
  TRADE_PHRASES[(category ?? "").trim().toLowerCase().replace(/\s*&\s*/g, " and ")] ?? name;

/** Falls back to a sentence that reads naturally when the trade has no phrase. */
export const refQuestion = (category: string | null | undefined, name: string) => {
  const key = (category ?? "").trim().toLowerCase().replace(/\s*&\s*/g, " and ");
  return TRADE_PHRASES[key] ? `Know someone who needs ${TRADE_PHRASES[key]}?` : `Know someone who could use ${name}?`;
};

export default PublicReferralPage;
