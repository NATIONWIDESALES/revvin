import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Quote, Sparkles } from "lucide-react";

export interface Testimonial {
  quote: string;
  name: string;
  business: string;
  location?: string;
  avatarUrl?: string;
}

/**
 * Drop real testimonials into the `testimonials` array below as you collect
 * them. When the array is empty, the section renders an honest founding-
 * customer CTA instead of fake quotes. NEVER add invented or AI-generated
 * quotes here.
 */
const testimonials: Testimonial[] = [
  // { quote: "...", name: "First Last", business: "Their Business", location: "City, ST", avatarUrl: "/path.jpg" },
];

const initials = (name: string) =>
  name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

const Testimonials = () => {
  if (testimonials.length === 0) {
    return (
      <section className="border-b border-border bg-background">
        <div className="container py-20 md:py-24">
          <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-card p-8 text-center shadow-soft md:p-12">
            <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Sparkles className="h-5 w-5" aria-hidden="true" />
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              Founding businesses
            </p>
            <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-foreground md:text-4xl">
              Be one of the first businesses on Revvin.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
              We are onboarding our founding group now. Founding businesses get
              direct access to the founder and their feedback shapes what we
              build next.
            </p>
            <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button size="lg" className="h-11 px-6 shadow-soft hover:bg-primary-deep" asChild>
                <Link to="/signup">Start your referral program</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="border-b border-border bg-background">
      <div className="container py-20 md:py-24">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            What businesses say
          </p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-foreground md:text-5xl">
            Real businesses, real referrals.
          </h2>
        </div>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((t, i) => (
            <figure
              key={i}
              className="flex flex-col rounded-2xl border border-border bg-card p-6 shadow-soft"
            >
              <Quote className="h-5 w-5 text-primary/60" aria-hidden="true" />
              <blockquote className="mt-3 flex-1 text-sm leading-relaxed text-foreground">
                "{t.quote}"
              </blockquote>
              <figcaption className="mt-5 flex items-center gap-3 border-t border-border pt-4">
                {t.avatarUrl ? (
                  <img
                    src={t.avatarUrl}
                    alt=""
                    className="h-9 w-9 rounded-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {initials(t.name)}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{t.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {t.business}
                    {t.location ? ` · ${t.location}` : ""}
                  </p>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;