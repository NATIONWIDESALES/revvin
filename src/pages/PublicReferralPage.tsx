import { copyText } from "@/lib/clipboard";
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { track } from "@/lib/track";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import SEOHead from "@/components/SEOHead";
import PromoBlock from "@/components/promo/PromoBlock";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Loader2, BadgeCheck, MapPin, Globe, ShieldCheck, Handshake, HandCoins, Quote, Eye, Lock } from "lucide-react";
import { friendlyError } from "@/lib/errors";

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
  verified?: boolean | null;
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

function brandHueFromName(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return Math.abs(hash) % 360;
}

/** Lighten or darken a hex/hsl color to derive soft/border/ink variants. */
function tint(hex: string, mode: "soft" | "border" | "ink"): string {
  // accept #rrggbb or hsl()
  const m = hex.trim().match(/^#?([0-9a-f]{6})$/i);
  if (m) {
    const r = parseInt(m[1].slice(0, 2), 16);
    const g = parseInt(m[1].slice(2, 4), 16);
    const b = parseInt(m[1].slice(4, 6), 16);
    const mix = (c: number, t: number, amt: number) => Math.round(c + (t - c) * amt);
    if (mode === "soft") {
      const rr = mix(r, 255, 0.92), gg = mix(g, 255, 0.92), bb = mix(b, 255, 0.92);
      return `rgb(${rr} ${gg} ${bb})`;
    }
    if (mode === "border") {
      const rr = mix(r, 255, 0.78), gg = mix(g, 255, 0.78), bb = mix(b, 255, 0.78);
      return `rgb(${rr} ${gg} ${bb})`;
    }
    const rr = mix(r, 0, 0.45), gg = mix(g, 0, 0.45), bb = mix(b, 0, 0.45);
    return `rgb(${rr} ${gg} ${bb})`;
  }
  return hex;
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
  const [biz, setBiz] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [statusUrl, setStatusUrl] = useState<string | null>(null);
  /** True when the viewer is the owner looking at their own unpublished page. */
  const [ownerPreview, setOwnerPreview] = useState(false);

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

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const COLS =
        "id,name,slug,description,category,service_area,logo_url,offer_amount,offer_trigger,offer_fine_print,city,state,website,verified,brand_color,cover_image_url,headline,welcome_message,referral_cta_label,testimonials";

      const { data } = await supabase
        .from("businesses_public" as any)
        .select(COLS)
        .eq("slug", slug)
        .limit(1);

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
    if (!biz) return;
    if (ownerPreview) return; // preview only, never writes a lead
    if (form.website) return; // honeypot
    if (!form.consent_given) {
      toast({ title: "Consent required", description: "Please confirm you have permission to share this lead's info.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { data: sess } = await supabase.auth.getSession();
    const referrerUserId = sess.session?.user?.id ?? null;
    const { data: inserted, error } = await supabase
      .from("leads")
      .insert(({
        business_id: biz.id,
        referrer_name: form.referrer_name.trim(),
        referrer_email: form.referrer_email.trim(),
        referrer_phone: form.referrer_phone.trim() || null,
        lead_name: form.lead_name.trim(),
        lead_phone: form.lead_phone.trim(),
        lead_email: form.lead_email.trim() || null,
        lead_need: form.lead_need.trim(),
        relationship_to_lead: form.relationship_to_lead.trim() || null,
        consent_given: true,
        lead_source: "public_page",
        status: "new",
        referrer_user_id: referrerUserId,
      } as any))
      .select("id, status_token")
      .limit(1);
    setSubmitting(false);
    if (error) {
      toast({ title: "Could not submit", description: friendlyError(error), variant: "destructive" });
      return;
    }
    const newLeadId = inserted?.[0]?.id;
    const token = (inserted?.[0] as any)?.status_token as string | undefined;
    if (token) {
      setStatusUrl(`${window.location.origin}/r/status/${token}`);
    }
    if (newLeadId) {
      // Fire-and-forget email notification to business owner
      supabase.functions
        .invoke("notify-new-lead", { body: { lead_id: newLeadId } })
        .catch((err) => console.warn("[notify-new-lead] failed", err));
    }
    track("referral_submitted");
    setSubmitted(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
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
            <h1 className="mt-4 text-2xl font-semibold text-foreground">This referral page is not live</h1>
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
  const customBrand = isValidHex(biz.brand_color) ? biz.brand_color.trim() : null;
  let brand: string;
  let brandSoft: string;
  let brandBorder: string;
  let brandInk: string;
  if (customBrand) {
    brand = customBrand;
    brandSoft = tint(customBrand, "soft");
    brandBorder = tint(customBrand, "border");
    brandInk = tint(customBrand, "ink");
  } else {
    const hue = brandHueFromName(biz.name);
    brand = `hsl(${hue} 70% 38%)`;
    brandSoft = `hsl(${hue} 70% 96%)`;
    brandBorder = `hsl(${hue} 60% 88%)`;
    brandInk = `hsl(${hue} 75% 22%)`;
  }
  const locationLabel = [biz.city, biz.state].filter(Boolean).join(", ") || biz.service_area || null;
  const websiteUrl = biz.website ? normalizeWebsite(biz.website) : null;
  const testimonials = Array.isArray(biz.testimonials)
    ? biz.testimonials.filter((t) => t && typeof t.quote === "string" && t.quote.trim().length > 0)
    : [];
  const ctaLabel = (biz.referral_cta_label ?? "").trim() || "Submit a referral";
  const hasCover = !!(biz.cover_image_url && biz.cover_image_url.trim().length > 0);

  return (
    <>
      <SEOHead
        title={`Refer a customer to ${biz.name}${biz.offer_amount ? `, earn ${biz.offer_amount}` : ""}`}
        description={`${biz.name} pays for warm referrals.${biz.offer_amount ? ` Earn ${biz.offer_amount}${biz.offer_trigger ? " " + biz.offer_trigger : ""}.` : ""}`}
        path={`/r/${biz.slug}`}
        noindex={ownerPreview}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "LocalBusiness",
          name: biz.name,
          description: biz.description ?? undefined,
          areaServed: biz.service_area ?? undefined,
          category: biz.category ?? undefined,
          image: biz.logo_url ?? undefined,
          url: `https://revvin.co/r/${biz.slug}`,
        }}
      />
      <div className="min-h-screen bg-[#FAFAF7]">
        {ownerPreview && (
          <div className="sticky top-0 z-50 border-b border-amber-300 bg-amber-50 px-4 py-3">
            <div className="mx-auto flex max-w-3xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="flex items-start gap-2 text-sm text-amber-900">
                <Eye className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>
                  <strong className="font-semibold">Preview only.</strong> This page is in draft, so nobody else can
                  see it and the form does not accept referrals yet.
                </span>
              </p>
              <Button asChild size="sm" className="shrink-0">
                <Link to="/dashboard" onClick={() => track("go_live_clicked")}>
                  Go live
                </Link>
              </Button>
            </div>
            <div className="mx-auto mt-2 max-w-3xl">
              <PromoBlock variant="compact" plan="both" />
            </div>
          </div>
        )}
        {/* Branded hero */}
        <div
          className="relative overflow-hidden"
          style={
            hasCover
              ? { borderBottom: `1px solid ${brandBorder}` }
              : {
                  background: `linear-gradient(135deg, ${brandSoft} 0%, #ffffff 65%)`,
                  borderBottom: `1px solid ${brandBorder}`,
                }
          }
        >
          {hasCover && (
            <>
              <img
                src={biz.cover_image_url!}
                alt=""
                aria-hidden
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div
                aria-hidden
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(180deg, rgba(15,23,42,0.15) 0%, rgba(255,255,255,0.92) 70%, #ffffff 100%)`,
                }}
              />
            </>
          )}
          <div
            aria-hidden
            className={`pointer-events-none absolute inset-0 ${hasCover ? "opacity-0" : "opacity-[0.07]"}`}
            style={{
              backgroundImage: `radial-gradient(${brand} 1px, transparent 1px)`,
              backgroundSize: "22px 22px",
            }}
          />
          <div className="relative mx-auto max-w-2xl px-5 pt-10 pb-8 md:pt-14 md:pb-10">
            <div className="flex items-center gap-4">
              {biz.logo_url ? (
                <img
                  src={biz.logo_url}
                  alt={`${biz.name} logo`}
                  className="h-16 w-16 rounded-2xl object-cover border bg-white"
                  style={{ borderColor: brandBorder }}
                />
              ) : (
                <div
                  className="h-16 w-16 rounded-2xl flex items-center justify-center font-semibold text-2xl text-white shadow-sm"
                  style={{ background: brand }}
                >
                  {initial}
                </div>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl md:text-3xl font-semibold text-foreground leading-tight tracking-tight">
                    {biz.name}
                  </h1>
                  {biz.verified && (
                    <span
                      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                      style={{ background: brandSoft, color: brandInk, border: `1px solid ${brandBorder}` }}
                    >
                      <BadgeCheck className="h-3 w-3" /> Verified
                    </span>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  {biz.category && <span>{biz.category}</span>}
                  {locationLabel && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {locationLabel}
                    </span>
                  )}
                  {websiteUrl && (
                    <a
                      href={websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 hover:text-foreground"
                    >
                      <Globe className="h-3 w-3" /> Website
                    </a>
                  )}
                </div>
              </div>
            </div>

            {biz.headline && (
              <p className="mt-6 text-[22px] md:text-[26px] font-semibold leading-[1.2] tracking-tight text-foreground max-w-xl">
                {biz.headline}
              </p>
            )}

            {biz.welcome_message ? (
              <p className="mt-4 text-[15px] leading-relaxed text-foreground/80 max-w-xl whitespace-pre-line">
                {biz.welcome_message}
              </p>
            ) : biz.description ? (
              <p className="mt-5 text-[15px] leading-relaxed text-foreground/80 max-w-xl">
                {biz.description}
              </p>
            ) : null}

            {/* Offer */}
            {biz.offer_amount && (
              <div
                className="mt-6 rounded-2xl p-6 shadow-sm"
                style={{
                  background: "white",
                  border: `1px solid ${brandBorder}`,
                  borderTop: `3px solid ${brand}`,
                }}
              >
                <p
                  className="text-[10px] font-semibold uppercase tracking-[0.14em] mb-2"
                  style={{ color: brand }}
                >
                  {biz.name} referral program
                </p>
                <p className="text-[28px] md:text-3xl font-semibold text-foreground leading-[1.15] tracking-tight">
                  Refer a customer and earn{" "}
                  <span style={{ color: brand }}>{biz.offer_amount}</span>
                </p>
                {biz.offer_trigger && (
                  <p className="text-sm text-muted-foreground mt-2">{biz.offer_trigger}</p>
                )}
                {biz.offer_fine_print && (
                  <p className="text-[11px] text-muted-foreground mt-3 italic">
                    {biz.offer_fine_print}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="mx-auto max-w-2xl px-5 py-8 md:py-10">
          {/* Trust strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { icon: Handshake, label: "Paid directly", sub: `By ${biz.name}, not a middleman` },
              { icon: HandCoins, label: "No fees taken out", sub: "100% of the reward is yours" },
              { icon: ShieldCheck, label: "Your info stays private", sub: "Only shared with the business" },
            ].map(({ icon: Icon, label, sub }) => (
              <div
                key={label}
                className="rounded-xl border border-border bg-white p-3.5"
              >
                <div
                  className="h-7 w-7 rounded-md flex items-center justify-center mb-2"
                  style={{ background: brandSoft, color: brand }}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <p className="text-[13px] font-semibold text-foreground leading-tight">{label}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>
              </div>
            ))}
          </div>

          {/* How it works */}
          <div className="mt-8">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-3">
              How it works
            </p>
            <ol className="space-y-3">
              {[
                `Submit your referral using the form below.`,
                `${biz.name} reaches out to the lead directly.`,
                `When the deal closes, ${biz.name} pays you${biz.offer_amount ? ` ${biz.offer_amount}` : ""} directly.`,
              ].map((step, i) => (
                <li key={i} className="flex gap-3 items-start">
                  <span
                    className="flex-shrink-0 h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-semibold"
                    style={{ background: brand, color: "white" }}
                  >
                    {i + 1}
                  </span>
                  <span className="text-sm text-foreground/85 leading-relaxed pt-0.5">{step}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Testimonials */}
          {testimonials.length > 0 && (
            <div className="mt-8">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-3">
                What customers say
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {testimonials.map((t, i) => (
                  <figure
                    key={i}
                    className="rounded-xl border bg-white p-4"
                    style={{ borderColor: "hsl(var(--border))" }}
                  >
                    <Quote className="h-4 w-4 mb-2" style={{ color: brand }} />
                    <blockquote className="text-sm text-foreground/85 leading-relaxed">
                      "{t.quote}"
                    </blockquote>
                    {(t.author || t.role) && (
                      <figcaption className="mt-2 text-xs text-muted-foreground">
                        {[t.author, t.role].filter(Boolean).join(" · ")}
                      </figcaption>
                    )}
                  </figure>
                ))}
              </div>
            </div>
          )}

          {/* Form card */}
          <div
            className="mt-8 rounded-2xl bg-white border shadow-sm overflow-hidden"
            style={{ borderColor: "hsl(var(--border))" }}
          >
            <div
              className="h-1 w-full"
              style={{ background: brand }}
            />
            <div className="p-6 md:p-8">
          {submitted ? (
            <div className="text-center py-4">
              <div
                className="h-12 w-12 mx-auto rounded-full flex items-center justify-center mb-3"
                style={{ background: brandSoft }}
              >
                <CheckCircle2 className="h-7 w-7" style={{ color: brand }} />
              </div>
              <h2 className="text-lg font-semibold text-foreground">Referral submitted</h2>
              <p className="text-sm text-muted-foreground mt-1.5 max-w-sm mx-auto">
                {biz.name} will be in touch with your lead soon. You'll hear from them directly when the deal closes.
              </p>
              {statusUrl && (
                <div className="mt-5 mx-auto max-w-sm rounded-xl border border-border bg-muted/30 p-4 text-left">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Track this referral</p>
                  <p className="mt-1 text-xs text-muted-foreground">Bookmark this private link to check the stage and reward status anytime.</p>
                  <div className="mt-2 flex items-center gap-2">
                    <input readOnly value={statusUrl} className="flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground" />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(statusUrl);
                        toast({ title: "Link copied" });
                      }}
                    >
                      Copy
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <fieldset disabled={ownerPreview} className={ownerPreview ? "space-y-4 opacity-60" : "space-y-4"}>
              <h2 className="text-lg font-semibold text-foreground leading-tight">
                Submit a referral
              </h2>
              <p className="text-sm text-muted-foreground -mt-2">
                {ownerPreview ? "This is how the form will look to your customers." : "Takes about 30 seconds."}
              </p>
              <input type="text" name="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => update("website", e.target.value)} className="hidden" />

              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">About you</div>
              <div><Label>Your name</Label><Input required value={form.referrer_name} onChange={(e) => update("referrer_name", e.target.value)} className="mt-1.5" /></div>
              <div><Label>Your email</Label><Input required type="email" value={form.referrer_email} onChange={(e) => update("referrer_email", e.target.value)} className="mt-1.5" /></div>
              <div><Label>Your phone <span className="text-muted-foreground text-xs">(optional)</span></Label><Input type="tel" value={form.referrer_phone} onChange={(e) => update("referrer_phone", e.target.value)} className="mt-1.5" /></div>

              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pt-2">The lead</div>
              <div><Label>Lead's name</Label><Input required value={form.lead_name} onChange={(e) => update("lead_name", e.target.value)} className="mt-1.5" /></div>
              <div><Label>Lead's phone</Label><Input required type="tel" value={form.lead_phone} onChange={(e) => update("lead_phone", e.target.value)} className="mt-1.5" /></div>
              <div><Label>Lead's email <span className="text-muted-foreground text-xs">(optional)</span></Label><Input type="email" value={form.lead_email} onChange={(e) => update("lead_email", e.target.value)} className="mt-1.5" /></div>
              <div><Label>What do they need?</Label><Textarea required value={form.lead_need} onChange={(e) => update("lead_need", e.target.value)} className="mt-1.5" rows={3} /></div>
              <div><Label>How do you know them? <span className="text-muted-foreground text-xs">(optional)</span></Label><Input value={form.relationship_to_lead} onChange={(e) => update("relationship_to_lead", e.target.value)} className="mt-1.5" /></div>

              <label className="flex items-start gap-3 pt-2 text-sm text-foreground cursor-pointer">
                <Checkbox checked={form.consent_given} onCheckedChange={(v) => update("consent_given", !!v)} className="mt-0.5" />
                <span>I confirm I have permission to share this lead's contact information.</span>
              </label>

              <Button
                type="submit"
                size="lg"
                className="w-full h-12 text-white hover:opacity-90 transition-opacity"
                style={{ background: brand }}
                disabled={submitting}
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>{ctaLabel}</>
                )}
              </Button>
              </fieldset>
            </form>
          )}
            </div>
          </div>

          <div className="mt-8 text-center">
            <Link
              to="/"
              className="text-[10px] tracking-[0.16em] uppercase text-muted-foreground/70 hover:text-foreground"
            >
              Powered by Revvin
            </Link>
          </div>
        </div>
      </div>
    </>
  );
};

export default PublicReferralPage;