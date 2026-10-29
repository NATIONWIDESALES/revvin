import SEOHead from "@/components/SEOHead";
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
    <section className="surface-forest">
      <div className="container max-w-5xl pb-28 pt-16 md:pb-32 md:pt-24">
        <h1 className="max-w-3xl text-[2.6rem] font-extrabold leading-[0.98] sm:text-6xl">{EARN_COPY.h1}</h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">{EARN_COPY.sub}</p>
      </div>
    </section>
    <section>
      <div className="container -mt-20 grid max-w-5xl grid-cols-[minmax(0,1fr)] gap-10 pb-16 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className="min-w-0 rounded-[18px] border border-line bg-card p-6 shadow-soft sm:p-8">
          {metros && metros.length > 0 ? (
            <>
              <h2 className="text-3xl">Live cities</h2>
              <ul className="mt-4 divide-y divide-line">
                {metros.map((m) => (
                  <li key={m.slug} className="flex items-center justify-between gap-4 py-3">
                    <span className="font-semibold text-foreground">{m.name}</span>
                    <Link to={`/earn/${m.slug}`} className="font-semibold text-primary underline underline-offset-4">See businesses</Link>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <>
              <p className="text-base leading-relaxed text-foreground">{EARN_COPY.rollout}</p>
              <div className="mt-6">
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
        <div className="min-w-0 pt-4 md:pt-28">
          <h2 className="text-3xl">Three rules</h2>
          <ol className="mt-4 space-y-4">
            {EARN_COPY.rules.map((r, i) => (
              <li key={r} className="flex items-start gap-3 text-base text-foreground">
                <span aria-hidden className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-forest font-display text-lg font-extrabold text-primary-foreground">{i + 1}</span>
                <span className="pt-1">{r}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
    <section className="border-t border-line">
      <div className="container max-w-xl py-16">
        <h2 className="text-3xl">{EARN_COPY.inviteHeading}</h2>
        <div className="mt-6 rounded-[14px] border border-line p-6">
          <InviteBusinessForm />
        </div>
      </div>
    </section>
  </>
  );
};

export default Earn;
