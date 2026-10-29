import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import LeadCaptureForm from "@/components/marketing/LeadCaptureForm";
import InviteBusinessForm from "@/components/earn/InviteBusinessForm";
import GetMyLink from "@/components/earn/GetMyLink";
import { earnDescription, earnTitle, metroBusinesses, metroInfo, submitEarnLead, waitingCount, type EarnBusiness } from "@/lib/earn";

const EarnMetro = () => {
  const { metro = "" } = useParams<{ metro: string }>();
  const [info, setInfo] = useState<{ name: string; slug: string; is_live: boolean } | null | undefined>(undefined);
  const [list, setList] = useState<EarnBusiness[]>([]);
  const [waiting, setWaiting] = useState<number | null>(null);
  const [trade, setTrade] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    void metroInfo(metro).then(async (m) => {
      setInfo(m);
      if (m?.is_live) setList(await metroBusinesses(m.slug));
      else if (m) setWaiting(await waitingCount(m.slug));
    });
  }, [metro]);

  const trades = useMemo(() => [...new Set(list.map((b) => b.trade).filter(Boolean) as string[])].sort(), [list]);
  const shown = trade ? list.filter((b) => b.trade === trade) : list;

  if (info === undefined) return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (info === null) {
    return (
      <main className="container max-w-3xl py-16">
        <SEOHead title="City not found | Revvin" description="This Earn city does not exist." noindex />
        <h1 className="text-3xl">City not found</h1>
        <p className="mt-3 text-muted-foreground"><Link to="/earn" className="underline underline-offset-4">See where Revvin is live</Link></p>
      </main>
    );
  }

  return (
    <main>
      <SEOHead title={earnTitle(info.name)} description={earnDescription(info.name)} path={`/earn/${info.slug}`} noindex={!info.is_live} />
      <section className="surface-forest">
        <div className="container max-w-4xl pb-24 pt-14">
          <h1 className="text-[2.4rem] leading-[0.98] sm:text-6xl">Get paid for referrals in {info.name}</h1>
          {info.is_live ? (
            <p className="mt-4 text-muted-foreground">Local businesses that pay a reward when your referral turns into a job. Get your own link to each one.</p>
          ) : (
            <p className="mt-4 text-muted-foreground">{info.name} is not live yet. Join the list and we'll tell you when businesses near you are live.</p>
          )}
        </div>
      </section>

      <section>
        <div className="container -mt-14 max-w-4xl pb-12"><div className="rounded-[18px] border border-line bg-card p-5 shadow-soft sm:p-8">
          {info.is_live ? (
            <>
              {trades.length > 1 && (
                <div className="mb-6 flex flex-wrap gap-2" role="group" aria-label="Filter by trade">
                  <button type="button" className={chip(trade === null)} aria-pressed={trade === null} onClick={() => setTrade(null)}>All</button>
                  {trades.map((t) => (
                    <button type="button" key={t} className={chip(trade === t)} aria-pressed={trade === t} onClick={() => setTrade(t)}>{t}</button>
                  ))}
                </div>
              )}
              {shown.length === 0 ? (
                <p className="text-muted-foreground">No businesses listed here yet.</p>
              ) : (
                <ul className="divide-y divide-line">
                  {shown.map((b) => (
                    <li key={b.slug} className="flex min-w-0 flex-col gap-3 py-4 sm:flex-row sm:items-center" data-testid="earn-business">
                      <div className="min-w-0 flex-1">
                        <h2 className="text-2xl">{b.name}</h2>
                        <p className="text-sm text-muted-foreground">{[b.trade, b.city].filter(Boolean).join(" · ")}</p>
                      </div>
                      <p className="text-sm font-medium text-foreground"><span className="sr-only">Reward: </span><span className="rounded-md bg-sign px-2 py-1 font-display text-xl font-extrabold text-forest">{b.reward}</span></p>
                      <div className="sm:w-auto">
                        {open === b.slug ? (
                          <GetMyLink biz={b} onDone={() => setOpen(null)} />
                        ) : (
                          <Button size="sm" onClick={() => setOpen(b.slug)}>Get my link</Button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <div className="max-w-md">
              {waiting !== null && <p className="mb-4 text-sm text-muted-foreground">{waiting} {waiting === 1 ? "person" : "people"} waiting in {info.name}</p>}
              <LeadCaptureForm
                source="earn_waitlist"
                idPrefix="earn-metro"
                extraFields={[{ id: "city", label: "City", autoComplete: "address-level2" }]}
                initialValues={{ city: info.name }}
                submitLabel="Join the list"
                onSubmitLead={(email, v) => submitEarnLead({ email, source: "earn_waitlist", city: v.city, metroSlug: info.slug })}
              />
            </div>
          )}
        </div></div>
      </section>

      <section className="border-t border-line">
        <div className="container max-w-xl py-14">
          <h2 className="text-2xl">Know a business that should be here?</h2>
          <div className="mt-6 rounded-[14px] border border-line p-6"><InviteBusinessForm metroSlug={info.slug} /></div>
        </div>
      </section>
    </main>
  );
};
const chip = (on: boolean) =>
  `h-10 rounded-full border px-4 text-sm font-semibold transition-colors ${on ? "border-forest bg-forest text-primary-foreground" : "border-line bg-card text-foreground hover:border-forest"}`;

export default EarnMetro;
