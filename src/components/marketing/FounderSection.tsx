import { Button } from "@/components/ui/button";
import { FOUNDER } from "@/config/brand";
import { SETUP_CALL_URL } from "@/config/setupCall";
import { track } from "@/lib/track";

// Picks up src/assets/karm.jpg automatically once it is added; until then a
// monogram stands in.
const photos = import.meta.glob("../../assets/karm.jpg", { eager: true, import: "default" }) as Record<string, string>;
const photo = Object.values(photos)[0];

const FounderSection = () => (
  <section aria-labelledby="founder-heading" className="mk-section">
    <div className="mk-wrap grid items-center gap-10 md:grid-cols-[auto_minmax(0,1fr)] md:gap-14">
      {photo ? (
        <img src={photo} alt={FOUNDER.name} width={200} height={200} className="h-36 w-36 rounded-full object-cover md:h-[200px] md:w-[200px]" />
      ) : (
        <div aria-hidden className="grid h-36 w-36 place-items-center rounded-full bg-green font-display text-5xl font-extrabold text-primary-foreground md:h-[200px] md:w-[200px] md:text-[64px]">
          KS
        </div>
      )}
      <div className="min-w-0">
        <h2 id="founder-heading" className="sr-only">Why Revvin exists</h2>
        <blockquote className="max-w-[24ch] font-display text-[clamp(30px,3.2vw,44px)] font-bold leading-[1.08] text-forest">
          The cheapest jobs we ever closed came from happy customers. Revvin lets every home-service business run that play without a sales team.
        </blockquote>
        <p className="mt-6 max-w-[36em] text-lg leading-relaxed text-muted-foreground">
          I started selling door to door in 2016 and went on to run a 120-rep sales team doing $5.5M a year. I built Revvin for the owners I used to sell beside. Book 30 minutes and I'll set yours up with you.
        </p>
        <p className="mt-6 font-bold text-foreground">{FOUNDER.name}</p>
        <p className="text-muted-foreground">{FOUNDER.jobTitle}, Revvin</p>
        {SETUP_CALL_URL && (
          <Button size="lg" variant="line" className="mt-7 h-auto min-h-14 w-full whitespace-normal py-3 sm:w-auto" asChild>
            <a href={SETUP_CALL_URL} target="_blank" rel="noopener noreferrer" onClick={() => track("cta_clicked", { cta: "home_founder_call" })}>
              Book a setup call with Karm
            </a>
          </Button>
        )}
      </div>
    </div>
  </section>
);

export default FounderSection;
