import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { useMockListing, formatPriceRange } from "@/hooks/useMockListings";
import {
  Star, MapPin, BadgeCheck, Phone, Mail, Globe, Clock,
  ArrowLeft, ArrowRight, Sparkles,
} from "lucide-react";
import ReviewList from "@/components/marketplace/ReviewList";
import ServiceAreaMap from "@/components/marketplace/ServiceAreaMap";
import ContactBusinessDialog from "@/components/marketplace/ContactBusinessDialog";

export default function BusinessProfile() {
  const { slug } = useParams();
  const { data: listing, isLoading } = useMockListing(slug);

  if (isLoading) {
    return <div className="container py-24 text-sm text-muted-foreground">Loading…</div>;
  }
  if (!listing) {
    return (
      <div className="container py-24">
        <p className="text-sm text-muted-foreground">We couldn't find that business.</p>
        <Button asChild className="mt-4"><Link to="/browse">Back to browse</Link></Button>
      </div>
    );
  }

  const priceRange = formatPriceRange(listing.price_min, listing.price_max, listing.currency);

  return (
    <>
      <SEOHead
        title={`${listing.name} — ${listing.category} in ${listing.city}, ${listing.region}`}
        description={listing.tagline ?? listing.about?.slice(0, 150) ?? ""}
        path={`/business/${listing.slug}`}
        ogImage={listing.hero_image}
      />

      {/* Hero */}
      <section className="relative">
        <div className="relative h-[44vh] min-h-[320px] w-full overflow-hidden bg-muted">
          <img src={listing.hero_image} alt={listing.name} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        </div>
        <div className="container -mt-24 relative">
          <Link to="/browse" className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-white/90 hover:text-white">
            <ArrowLeft className="h-3 w-3" /> Back to businesses
          </Link>
          <div className="mt-3 rounded-2xl border border-border bg-card p-6 shadow-product md:p-8">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full bg-muted px-2.5 py-1 font-semibold uppercase tracking-wider text-foreground/70">
                    {listing.category}
                  </span>
                  {listing.verified && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 font-semibold text-primary">
                      <BadgeCheck className="h-3 w-3" /> Verified business
                    </span>
                  )}
                </div>
                <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">{listing.name}</h1>
                {listing.tagline && <p className="mt-1 text-base text-muted-foreground">{listing.tagline}</p>}
                <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {listing.city}, {listing.region}</span>
                  <span className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-accent text-accent" />
                    <span className="font-semibold text-foreground">{listing.rating.toFixed(1)}</span>
                    ({listing.review_count} reviews)
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                <ContactBusinessDialog
                  slug={listing.slug}
                  businessName={listing.name}
                  kind="contact"
                  trigger={
                    <Button size="lg" className="h-11 hover:bg-primary-deep">
                      Contact this business <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  }
                />
                <Button size="lg" variant="outline" className="h-11" asChild>
                  <Link to={`/refer/${listing.slug}`}>View referral program</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Body */}
      <section className="container grid gap-10 py-12 lg:grid-cols-12 lg:py-16">
        <div className="space-y-12 lg:col-span-8">
          {/* About */}
          {listing.about && (
            <section>
              <h2 className="text-2xl font-bold tracking-tight text-foreground">About</h2>
              <p className="mt-4 whitespace-pre-line text-base leading-relaxed text-foreground/85">
                {listing.about}
              </p>
            </section>
          )}

          {/* Services */}
          <section>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Services</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {listing.services.map((s) => (
                <div key={s.name} className="rounded-xl border border-border bg-card p-4">
                  <p className="text-sm font-semibold text-foreground">{s.name}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{s.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Gallery */}
          {listing.gallery.length > 0 && (
            <section>
              <h2 className="text-2xl font-bold tracking-tight text-foreground">Gallery</h2>
              <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 md:gap-3">
                {listing.gallery.map((src, i) => (
                  <div key={i} className={`overflow-hidden rounded-lg bg-muted ${i === 0 ? "col-span-2 row-span-2 aspect-square" : "aspect-[4/3]"}`}>
                    <img src={src} alt={`${listing.name} work ${i + 1}`} loading="lazy" className="h-full w-full object-cover transition-transform hover:scale-[1.02]" />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Reviews */}
          <section>
            <div className="flex items-baseline justify-between">
              <h2 className="text-2xl font-bold tracking-tight text-foreground">Reviews</h2>
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{listing.rating.toFixed(1)}</span> · {listing.review_count} reviews
              </p>
            </div>
            <div className="mt-3">
              <ReviewList reviews={listing.reviews} />
            </div>
          </section>

          {/* Pricing */}
          <section>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Pricing</h2>
            {priceRange ? (
              <div className="mt-4 rounded-xl border border-border bg-card p-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Typical project range</p>
                <p className="mt-1 text-2xl font-extrabold tracking-tight text-foreground">{priceRange}</p>
                <p className="mt-2 text-xs text-muted-foreground">Final pricing depends on scope, materials, and site conditions. Request a quote for an exact estimate.</p>
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">Contact the business for pricing.</p>
            )}
          </section>

          {/* Service area */}
          {listing.lat != null && listing.lng != null && (
            <section>
              <h2 className="text-2xl font-bold tracking-tight text-foreground">Service area</h2>
              <p className="mt-2 text-sm text-muted-foreground">Serving {listing.city} and surrounding areas.</p>
              <div className="mt-4">
                <ServiceAreaMap lat={listing.lat} lng={listing.lng} city={listing.city} />
              </div>
            </section>
          )}

          {/* Referral program preview */}
          <section className="rounded-2xl border border-primary/20 bg-primary/5 p-6 md:p-8">
            <div className="flex items-center gap-2 text-primary">
              <Sparkles className="h-4 w-4" />
              <p className="text-xs font-semibold uppercase tracking-wider">Referral program</p>
            </div>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground">
              Know someone who needs {listing.category.toLowerCase()} work?
            </h2>
            <p className="mt-3 text-base text-foreground/85">
              This business pays <span className="font-bold text-foreground">${listing.referral_fee.toLocaleString()}</span> {listing.referral_fee_unit} through their Revvin referral program. Refer a friend or family member and {listing.name} will pay you directly when the deal closes.
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Revvin provides the referral page and lead tracking. The business sets the fee and pays referrers directly — Revvin does not process or guarantee payouts.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <ContactBusinessDialog
                slug={listing.slug}
                businessName={listing.name}
                kind="referral"
                title="Submit a referral"
                description={`Tell ${listing.name} who you're referring.`}
                trigger={<Button size="lg" className="h-11 hover:bg-primary-deep">Refer someone you know</Button>}
              />
              <Button size="lg" variant="outline" className="h-11" asChild>
                <Link to={`/refer/${listing.slug}`}>See the full referral page</Link>
              </Button>
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <aside className="lg:col-span-4">
          <div className="lg:sticky lg:top-20 space-y-4">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contact</p>
              <div className="mt-3 space-y-2.5 text-sm">
                {listing.phone && (
                  <a href={`tel:${listing.phone}`} className="flex items-center gap-2 text-foreground hover:text-primary">
                    <Phone className="h-4 w-4 text-muted-foreground" /> {listing.phone}
                  </a>
                )}
                {listing.email && (
                  <a href={`mailto:${listing.email}`} className="flex items-center gap-2 text-foreground hover:text-primary">
                    <Mail className="h-4 w-4 text-muted-foreground" /> {listing.email}
                  </a>
                )}
                {listing.website && (
                  <a href={listing.website} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-foreground hover:text-primary">
                    <Globe className="h-4 w-4 text-muted-foreground" /> Visit website
                  </a>
                )}
              </div>
            </div>

            {listing.hours && (
              <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" /> Hours
                </p>
                <ul className="mt-3 space-y-1.5 text-sm">
                  {Object.entries(listing.hours).map(([day, val]) => (
                    <li key={day} className="flex items-center justify-between">
                      <span className="text-muted-foreground">{day}</span>
                      <span className="font-medium text-foreground">{val}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Request a quote</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Get a free, no-obligation estimate from {listing.name}.
              </p>
              <ContactBusinessDialog
                slug={listing.slug}
                businessName={listing.name}
                kind="quote"
                title={`Request a quote from ${listing.name}`}
                trigger={<Button className="mt-4 w-full hover:bg-primary-deep">Request quote</Button>}
              />
            </div>
          </div>
        </aside>
      </section>
    </>
  );
}