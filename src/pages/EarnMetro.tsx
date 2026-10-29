import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import LeadCaptureForm from "@/components/marketing/LeadCaptureForm";
import InviteBusinessForm from "@/components/earn/InviteBusinessForm";
import GetMyLink from "@/components/earn/GetMyLink";
import { EARN_COPY } from "@/content/earnPage";
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
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">City not found</h1>
        <p className="mt-3 text-muted-foreground"><Link to="/earn" className="underline underline-offset-4">See where Revvin is live</Link></p>
      </main>
    );
  }

  return (
    <main>
      <SEOHead title={earnTitle(info.name)} description={earnDescription(info.name)} path={`/earn/${info.slug}`} noindex={!info.is_live} />
      <section className="border-b border-border">
        <div className="container max-w-4xl py-14">
          <h1 className="text-[2rem] font-extrabold leading-tight tracking-tight text-foreground sm:text-4xl">Get paid for referrals in {info.name}</h1>
          {info.is_live ? (
            <p className="mt-4 text-muted-foreground">Local businesses that pay a reward when your referral turns into a job. Get your own link to each one.</p>
          ) : (
            <p className="mt-4 text-muted-foreground">{info.name} is not live yet. Join the list and we'll tell you when businesses near you are live.</p>
          )}
        </div>
      </section>

      <section className="border-b border-border">
        <div className="container max-w-4xl py-12">
          {info.is_live ? (
            <>
              {trades.length > 1 && (
                <div className="mb-6 flex flex-wrap gap-2" role="group" aria-label="Filter by trade">
                  <Button size="sm" variant={trade === null ? "default" : "outline"} aria-pressed={trade === null} onClick={() => setTrade(null)}>All</Button>
                  {trades.map((t) => (
                    <Button key={t} size="sm" variant={trade === t ? "default" : "outline"} aria-pressed={trade === t} onClick={() => setTrade(t)}>{t}</Button>
                  ))}
                </div>
              )}
              {shown.length === 0 ? (
                <p className="text-muted-foreground">No businesses listed here yet.</p>
              ) : (
                <ul className="grid gap-4 sm:grid-cols-2">
                  {shown.map((b) => (
                    <li key={b.slug} className="min-w-0 rounded-2xl border border-border bg-card p-5" data-testid="earn-business">
                      <h2 className="text-lg font-bold text-foreground">{b.name}</h2>
                      <p className="mt-1 text-sm text-muted-foreground">{[b.trade, b.city].filter(Boolean).join(" · ")}</p>
                      <p className="mt-2 text-sm font-medium text-foreground">Reward: {b.reward}</p>
                      <div className="mt-4">
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
            <div className="max-w-md rounded-2xl border border-border bg-card p-6">
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
        </div>
      </section>

      <section className="bg-surface-warm">
        <div className="container max-w-xl py-14">
          <h2 className="text-2xl font-extrabold tracking-tight text-foreground">{EARN_COPY.inviteHeading}</h2>
          <div className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-soft"><InviteBusinessForm metroSlug={info.slug} /></div>
        </div>
      </section>
    </main>
  );
};
export default EarnMetro;
