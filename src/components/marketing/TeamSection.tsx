import { Button } from "@/components/ui/button";
import { TEAM_HEADING, TEAM_BIO } from "@/config/brand";
import { SETUP_CALL_URL } from "@/config/setupCall";
import { track } from "@/lib/track";

const TeamSection = () => (
  <section id="team" aria-labelledby="team-heading" className="mk-section scroll-mt-20">
    <div className="mk-wrap grid items-center gap-10 md:grid-cols-[auto_minmax(0,1fr)] md:gap-14">
      <div aria-hidden className="grid h-36 w-36 place-items-center rounded-[18px] bg-green font-display text-2xl font-extrabold text-primary-foreground md:h-[200px] md:w-[200px] md:text-3xl">
        REVVIN.CO
      </div>
      <div className="min-w-0">
        <h2 id="team-heading" className="max-w-[24ch] font-display text-[clamp(30px,3.2vw,44px)] font-bold leading-[1.08] text-forest">{TEAM_HEADING}</h2>
        <p className="mt-6 max-w-[36em] text-lg leading-relaxed text-muted-foreground">{TEAM_BIO}</p>
        <p className="mt-6 font-bold text-foreground">The Revvin team</p>
        {SETUP_CALL_URL && (
          <Button size="lg" variant="line" className="mt-7 h-auto min-h-14 w-full whitespace-normal py-3 sm:w-auto" asChild>
            <a href={SETUP_CALL_URL} target="_blank" rel="noopener noreferrer" onClick={() => track("cta_clicked", { cta: "home_founder_call" })}>
              Book a free 30-minute setup call
            </a>
          </Button>
        )}
      </div>
    </div>
  </section>
);

export default TeamSection;
