import SEOHead from "@/components/SEOHead";
import { Check } from "lucide-react";
import LeadCaptureForm from "@/components/marketing/LeadCaptureForm";
import { EARN_COPY } from "@/content/earnPage";

const Earn = () => (
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
          <p className="text-base leading-relaxed text-foreground">{EARN_COPY.rollout}</p>
          <div className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-soft">
            <LeadCaptureForm
              source="earn_waitlist"
              idPrefix="earn"
              extraFields={[{ id: "city", label: "City", autoComplete: "address-level2" }]}
              submitLabel="Join the list"
            />
          </div>
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
          <LeadCaptureForm
            source="business_invite"
            idPrefix="invite"
            emailLabel="Your email"
            extraFields={[
              { id: "biz", label: "Business name", autoComplete: "organization" },
              { id: "contact", label: "Their email or phone" },
            ]}
            submitLabel="Send"
          />
        </div>
      </div>
    </section>
  </>
);

export default Earn;
