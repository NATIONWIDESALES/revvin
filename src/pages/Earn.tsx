import SEOHead from "@/components/SEOHead";
import { Check } from "lucide-react";
import LeadCaptureForm from "@/components/marketing/LeadCaptureForm";
import { EARN_COPY } from "@/content/earnPage";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import InviteBusinessForm from "@/components/earn/InviteBusinessForm";
import { liveMetros, submitEarnLead, type EarnMetro } from "@/lib/earn";

const Earn = () => {
  const [metros, setMetros] = useState<EarnMetro[] | null>(null);
  useEffect(() => { void liveMetros().then(setMetros); }, []);
  return (
  <>
    <SEOHead title="Earn money recommending local businesses | Revvin" description={EARN_COPY.sub} path="/earn" />
    <section className="hero-premium relative overflow-hidden border-b border-border">
      <div aria-hidden className="absolute inset-0 grid-faint" />
      <div className="container relative max-w-3xl py-16 md:py-24">
        <h1 className="text-[2.25rem] font-extrabold leading-[1.05] tracking-tight text-foreground sm:text-5xl">{EARN_COPY.h1}</h1>
        <p className="mt-5 text-base leading-relaxed text-muted-foreground sm:text-lg">{EARN_COPY.sub}</p>
      </div>
    </section>
    <section className="border-b border-border">
      <div className="container grid max-w-5xl gap-10 py-16 md:grid-cols-2">
        <div className="min-w-0">
          {metros && metros.length > 0 ? (
            <>
              <h2 className="text-xl font-bold text-foreground">Live cities</h2>
              <ul className="mt-4 space-y-2">
                {metros.map((m) => (
                  <li key={m.slug}><Link to={`/earn/${m.slug}`} className="font-medium text-primary underline underline-offset-4">{m.name}</Link></li>
                ))}
              </ul>
            </>
          ) : (
            <>
          <p className="text-base leading-relaxed text-foreground">{EARN_COPY.rollout}</p>
          <div className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-soft">
            <LeadCaptureForm
              source="earn_waitlist"
              idPrefix="earn"
              extraFields={[{ id: "city", label: "City", autoComplete: "address-level2" }]}
              submitLabel="Join the list"
              onSubmitLead={(email, v) => submitEarnLead({ email, source: "earn_waitlist", city: v.city, metroSlug: /fraser|langley|abbotsford|surrey|chilliwack|mission|maple ridge/i.test(v.city ?? "") ? "fraser-valley" : undefined })}
            />
          </div>
            </>
          )}
        </div>
        <div className="min-w-0">
          <h2 className="text-xl font-bold text-foreground">Three rules</h2>
          <ul className="mt-4 space-y-3">
            {EARN_COPY.rules.map((r) => (
              <li key={r} className="flex items-start gap-2.5 text-sm text-foreground">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" /> {r}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
    <section className="bg-surface-warm">
      <div className="container max-w-xl py-16">
        <h2 className="text-2xl font-extrabold tracking-tight text-foreground">{EARN_COPY.inviteHeading}</h2>
        <div className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-soft">
          <InviteBusinessForm />
        </div>
      </div>
    </section>
  </>
  );
};

export default Earn;
