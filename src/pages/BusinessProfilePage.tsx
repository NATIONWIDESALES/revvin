import { Fragment, Suspense, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { BadgeCheck, Facebook, Globe, Instagram, Linkedin, Phone, Youtube } from "lucide-react";
import { lazyWithChunkRecovery as lazy } from "@/lib/chunkRecovery";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import DirectoryListingPage from "@/pages/DirectoryListingPage";
import Stars from "@/components/profile/Stars";
import TrustBadges from "@/components/profile/TrustBadges";
import { Breadcrumb, Lightbox, NearbyStrip, QuoteForm, RatingBreakdown, ReviewItem } from "@/components/profile/ProfileParts";
import { tradeIcon } from "@/components/marketplace/DirectoryCard";
import { cardRewardAmount } from "@/lib/directory";
import { realTrade, referralSentence } from "@/lib/directory";
import { loadProfile, loadReviews, photoUrls, profileTitle, stateCode, type BusinessProfile, type Hours, type PublicReview } from "@/lib/profile";
import { profileAllows } from "@/config/planFeatures";
import { track } from "@/lib/track";

const DirectoryMap = lazy(() => import("@/components/marketplace/DirectoryMap"));
const noop = () => {};
const DAYS: [keyof Hours, string][] = [["mon", "Mon"], ["tue", "Tue"], ["wed", "Wed"], ["thu", "Thu"], ["fri", "Fri"], ["sat", "Sat"], ["sun", "Sun"]];
const SOCIAL = { facebook: Facebook, instagram: Instagram, linkedin: Linkedin, youtube: Youtube, tiktok: Globe } as const;
const safeUrl = (u: string | null | undefined) => (u && /^https:\/\/[^\s]+$/i.test(u) ? u : null);

export function referralLine(p: Pick<BusinessProfile, "name" | "category" | "has_reward" | "reward_text">) {
  const amount = cardRewardAmount({ kind: "business", category: p.category, has_reward: p.has_reward, reward_text: p.reward_text });
  return amount ? referralSentence(p.name, p.category, amount) : null;
}

export default function BusinessProfilePage() {
  const { slug = "" } = useParams();
  const [profile, setProfile] = useState<BusinessProfile | null | undefined>(undefined);
  const [reviews, setReviews] = useState<PublicReview[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [light, setLight] = useState<number | null>(null);
  const [morePending, setMorePending] = useState(false);

  useEffect(() => {
    let live = true;
    setProfile(undefined);
    loadProfile(slug).then((p) => { if (live) setProfile(p ?? null); }).catch(() => { if (live) setProfile(null); });
    return () => { live = false; };
  }, [slug]);
  useEffect(() => {
    if (!profile) return;
    track("listing_viewed");
    loadReviews(profile.slug, 0, 10).then((r) => setReviews(r ?? [])).catch(() => {});
    photoUrls(profile.photos.map((p) => p.path)).then(setUrls).catch(() => {});
  }, [profile]);

  const photos = useMemo(() => (profile?.photos ?? []).filter((p) => urls[p.path]).map((p) => ({ url: urls[p.path], caption: p.caption })), [profile, urls]);
  if (profile === undefined) return <main className="mk-wrap min-h-[60vh] py-16"><SEOHead title="Business profile | Revvin" description="A local business in the Revvin marketplace." noindex /><div className="h-40 animate-pulse rounded-xl bg-muted motion-reduce:animate-none" /></main>;
  if (profile === null) return <DirectoryListingPage />;

  const p = profile;
  const pro = p.is_pro;
  const place = [p.city, stateCode(p.state)].filter(Boolean).join(", ");
  const refer = referralLine(p);
  const stats = p.reviews;
  const hasStars = stats.count > 0 && stats.avg !== null;
  const Icon = tradeIcon(p.category);
  const tel = p.phone ? `tel:${p.phone.replace(/[^\d+]/g, "")}` : null;
  const site = safeUrl(p.website?.startsWith("http") ? p.website : p.website ? `https://${p.website}` : null);
  const hours = p.hours && DAYS.filter(([d]) => p.hours?.[d]);
  const desc = (p.description ?? "").trim();
  const metaDesc = desc || [p.name, realTrade(p.category), place ? `in ${place}` : ""].filter(Boolean).join(", ").replace(/, in /, " in ") + " on Revvin.";
  const aboutFacts = Boolean(p.service_area || (pro && (p.founded_year || p.license_number || p.social_links)));
  const more = pro && reviews.length < stats.count;
  const loadMore = async () => { setMorePending(true); try { const r = await loadReviews(p.slug, reviews.length, 10); setReviews((x) => [...x, ...(r ?? [])]); } finally { setMorePending(false); } };

  return (
    <main className={`bg-paper ${pro ? "pb-20 lg:pb-0" : ""}`} data-level={pro ? "pro" : "free"}>
      <SEOHead title={profileTitle(p)} description={metaDesc.slice(0, 155)} path={`/b/${p.slug}`} noindex={!p.index_approved || p.is_owner_preview} />
      {p.is_owner_preview && <p className="bg-sign/40 px-4 py-2 text-center text-sm font-medium">Only you can see this preview. It is not listed in the marketplace yet.</p>}
      <header className={pro ? "relative" : "bg-forest text-primary-foreground"}>
        {pro && (
          <div className="relative h-48 w-full bg-forest sm:h-64 lg:h-80">
            {p.cover_image_url && <img src={p.cover_image_url} alt="" className="h-full w-full object-cover" />}
          </div>
        )}
        <div className={`mk-wrap ${pro ? "relative pb-4" : "py-8"}`}>
          {!pro && <div className="text-primary-foreground [&_a]:text-primary-foreground"><Breadcrumb /></div>}
          <div className={`flex gap-4 ${pro ? "items-start" : "mt-2 items-end"}`}>
            <span className={`flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-4 bg-card ${pro ? "-mt-12 border-paper shadow-md" : "border-forest"}`}>
              {p.logo_url ? <img src={p.logo_url} alt={`${p.name} logo`} className="h-full w-full object-contain" /> : <Icon className="h-10 w-10 text-forest/70" strokeWidth={1.5} aria-hidden />}
            </span>
            <div className={`min-w-0 ${pro ? "pt-3" : "pb-1"}`}>
              <h1 className={`break-words font-display text-[clamp(26px,3.6vw,42px)] leading-[1.05] ${pro ? "text-forest" : "text-primary-foreground"}`}>{p.name}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                {pro && <span className="rounded bg-forest px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-primary-foreground">Pro</span>}
                {p.is_verified && <span className="inline-flex items-center gap-1 font-medium"><BadgeCheck className="h-4 w-4" aria-hidden />Verified</span>}
                {pro && hasStars && <span className="inline-flex items-center gap-1.5"><Stars value={Number(stats.avg)} /> {Number(stats.avg).toFixed(1)} ({stats.count})</span>}
                <span className={pro ? "text-muted-foreground" : "opacity-90"}>{[realTrade(p.category), place].filter(Boolean).join(" · ")}</span>
              </div>
            </div>
          </div>
          <TrustBadges className="mt-3" facts={{
            reward: cardRewardAmount({ kind: "business", category: p.category, has_reward: p.has_reward, reward_text: p.reward_text }),
            reviewCount: stats.count, ratingAvg: hasStars ? Number(stats.avg) : null,
            hasLicense: Boolean(pro && p.license_number?.trim()), takesQuotes: pro,
          }} />
          {pro && <div className="mt-3"><Breadcrumb /></div>}
        </div>
      </header>

      <div className="mk-wrap grid gap-8 py-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-8">
          {(desc || aboutFacts) && <section aria-labelledby="about-h">
            <h2 id="about-h" className="text-xl font-bold text-forest">About</h2>
            {desc && <p className="mt-2 whitespace-pre-wrap">{desc}</p>}
            <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
              {pro && p.founded_year && <li>In business since {p.founded_year}</li>}
              {pro && p.license_number && <li>Licence {p.license_number}</li>}
              {p.service_area && <li>Serves {p.service_area}</li>}
            </ul>
            {pro && p.social_links && (
              <ul className="mt-3 flex flex-wrap gap-2">
                {(Object.keys(SOCIAL) as (keyof typeof SOCIAL)[]).map((k) => {
                  const u = safeUrl(p.social_links?.[k]); if (!u) return null; const I = SOCIAL[k];
                  return <li key={k}><a href={u} target="_blank" rel="noopener nofollow" aria-label={k} className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-line bg-card text-forest"><I className="h-5 w-5" /></a></li>;
                })}
              </ul>
            )}
          </section>}

          {pro && p.services && p.services.length > 0 && (
            <section aria-labelledby="svc-h">
              <h2 id="svc-h" className="text-xl font-bold text-forest">Services</h2>
              <ul className="mt-3 flex flex-wrap gap-2">{p.services.map((s) => <li key={s} className="rounded-full border border-line bg-card px-3 py-1 text-sm">{s}</li>)}</ul>
            </section>
          )}

          {photos.length > 0 && (
            <section aria-labelledby="ph-h">
              <h2 id="ph-h" className="text-xl font-bold text-forest">Photos</h2>
              <ul className={`mt-3 grid gap-2 ${pro ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-3"}`}>
                {photos.map((ph, i) => (
                  <li key={ph.url}>
                    {pro ? (
                      <button type="button" onClick={() => setLight(i)} className="block w-full overflow-hidden rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={ph.caption ? `Open photo: ${ph.caption}` : `Open photo ${i + 1}`}>
                        <img src={ph.url} alt={ph.caption ?? ""} loading="lazy" className="aspect-[4/3] w-full object-cover" />
                      </button>
                    ) : <img src={ph.url} alt={ph.caption ?? ""} loading="lazy" className="aspect-[4/3] w-full rounded-lg object-cover" />}
                  </li>
                ))}
              </ul>
              {light !== null && <Lightbox photos={photos} index={light} onClose={() => setLight(null)} onIndex={setLight} />}
            </section>
          )}

          {stats.count > 0 && (
            <section aria-labelledby="rv-h">
              <h2 id="rv-h" className="text-xl font-bold text-forest">Reviews <span className="text-base font-normal text-muted-foreground">({stats.count})</span></h2>
              {profileAllows(pro, "rating_breakdown") && hasStars && (
                <div className="mt-3 grid gap-4 rounded-xl border border-line bg-card p-4 sm:grid-cols-[auto_1fr] sm:items-center">
                  <div className="text-center"><p className="text-4xl font-bold">{Number(stats.avg).toFixed(1)}</p><Stars value={Number(stats.avg)} /><p className="text-xs text-muted-foreground">{stats.count} reviews</p></div>
                  <RatingBreakdown stats={stats} />
                </div>
              )}
              <ul className="mt-3 grid gap-3">{reviews.map((r) => <ReviewItem key={r.id} r={r} businessName={p.name} />)}</ul>
              {more && <Button variant="outline" className="mt-3 h-11" onClick={loadMore} disabled={morePending}>{morePending ? "Loading" : "Show more reviews"}</Button>}
            </section>
          )}
          {safeUrl(p.google_review_url) && <a href={safeUrl(p.google_review_url)!} target="_blank" rel="noopener nofollow" className="inline-flex h-11 items-center rounded-md border border-line bg-card px-4 text-sm font-semibold text-forest">See us on Google</a>}
        </div>

        <aside className="min-w-0 space-y-4 lg:sticky lg:top-24 lg:self-start">
          {(tel || site || (hours && hours.length > 0)) && (
            <div className="rounded-xl border border-line bg-card p-4">
              <h2 className="font-bold text-forest">Contact</h2>
              <div className="mt-3 grid gap-2">
                {tel && <Button asChild className="h-11 justify-start gap-2"><a href={tel}><Phone className="h-4 w-4" aria-hidden />{p.phone}</a></Button>}
                {site && <Button asChild variant="outline" className="h-11 justify-start gap-2"><a href={site} target="_blank" rel="noopener nofollow"><Globe className="h-4 w-4" aria-hidden />Website</a></Button>}
              </div>
              {hours && hours.length > 0 && <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">{hours.map(([d, l]) => <Fragment key={d}><dt className="text-muted-foreground">{l}</dt><dd>{p.hours?.[d]}</dd></Fragment>)}</dl>}
            </div>
          )}
          {refer && (
            <div className="rounded-xl bg-forest p-4 text-primary-foreground" data-testid="referral-box">
              <p className="font-semibold">{refer}</p>
              <Button asChild variant="sign" className="mt-3 h-11 w-full"><Link to={`/r/${p.slug}`} onClick={() => track("cta_clicked", { cta: "profile_refer" })}>{(() => { const a = cardRewardAmount({ kind: "business", category: p.category, has_reward: p.has_reward, reward_text: p.reward_text }); return a ? `Refer someone and earn ${a}` : "Refer someone"; })()}</Link></Button>
              <p className="mt-2 text-xs opacity-90">Paid by the business.</p>
            </div>
          )}
          {pro && (
            <div className="relative rounded-xl border border-line bg-card p-4">
              <h2 className="mb-3 font-bold text-forest">Request a quote</h2>
              <QuoteForm slug={p.slug} businessName={p.name} />
            </div>
          )}
          {p.lat != null && p.lng != null && (
            <div>
              <Suspense fallback={<div className="h-56 rounded-xl border border-line bg-card" />}>
                <DirectoryMap clusters={[]} pins={[]} selected={null} onMove={noop} onSelect={noop} onFail={noop} point={{ lat: p.lat, lng: p.lng }} className="h-56 overflow-hidden rounded-xl border border-line" />
              </Suspense>
              {p.service_area && <p className="mt-1 text-xs text-muted-foreground">Service area: {p.service_area}</p>}
            </div>
          )}
        </aside>
      </div>

      {!profileAllows(pro, "no_competitors") && p.lat != null && p.lng != null && <NearbyStrip lat={p.lat} lng={p.lng} category={p.category} exclude={p.slug} />}

      {pro && (
        <div className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 gap-2 border-t border-line bg-paper p-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] lg:hidden">
          {tel ? <Button asChild variant="outline" className="h-11"><a href={tel}>Call</a></Button> : <span />}
          <Button asChild className="h-11"><a href="#quote">Request a quote</a></Button>
          {refer ? <Button asChild variant="sign" className="h-11"><Link to={`/r/${p.slug}`}>Refer someone</Link></Button> : <span />}
        </div>
      )}
    </main>
  );
}
