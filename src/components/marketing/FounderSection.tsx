import { Button } from "@/components/ui/button";
import { FOUNDER } from "@/config/brand";
import { FOUNDER_BIO } from "@/content/aboutPage";
import { SETUP_CALL_URL } from "@/config/setupCall";
import { track } from "@/lib/track";

// Picks up src/assets/karm.jpg automatically once it is added; until then a
// monogram stands in.
const photos = import.meta.glob("../../assets/karm.jpg", { eager: true, import: "default" }) as Record<string, string>;
const photo = Object.values(photos)[0];

const FounderSection = () => (
  <section aria-labelledby="founder-heading" className="border-b border-border bg-surface-warm">
    <div className="container max-w-4xl py-16 md:py-24">
      <div className="grid items-start gap-8 md:grid-cols-[auto_minmax(0,1fr)] md:gap-12">
        {photo ? (
          <img src={photo} alt={FOUNDER.name} width={128} height={128} className="h-28 w-28 rounded-full object-cover md:h-32 md:w-32" />
        ) : (
          <div aria-hidden className="flex h-28 w-28 items-center justify-center rounded-full bg-primary text-3xl font-extrabold tracking-tight text-primary-foreground md:h-32 md:w-32">
            KS
          </div>
        )}
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Why Revvin exists</p>
          <h2 id="founder-heading" className="mt-3 text-2xl font-extrabold tracking-tight text-foreground md:text-4xl">
            Built by a sales guy, not a software company.
          </h2>
          <p className="mt-5 text-base leading-relaxed text-muted-foreground md:text-lg">{FOUNDER_BIO}</p>
          <p className="mt-5 text-sm font-semibold text-foreground">{FOUNDER.name}, {FOUNDER.jobTitle}</p>
          {SETUP_CALL_URL && (
            <Button size="lg" className="mt-6 h-auto min-h-12 w-full whitespace-normal px-6 py-3 sm:w-auto" asChild>
              <a href={SETUP_CALL_URL} target="_blank" rel="noopener noreferrer" onClick={() => track("cta_clicked", { cta: "home_founder_call" })}>
                Book a setup call with Karm
              </a>
            </Button>
          )}
        </div>
      </div>
    </div>
  </section>
);

export default FounderSection;
