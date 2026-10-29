import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { copyText } from "@/lib/clipboard";
import { useToast } from "@/hooks/use-toast";
import { FREE_CONTACT_LIMIT } from "@/config/planFeatures";
import {
  computeStats, leadsToCall, money, nextStep, relativeTime, setupDone,
  type DashTab, type LeadLite, type RewardLite, type SetupState,
} from "@/lib/dashboardHome";

interface ReferrerRow { id: string; name: string; referrals_sent: number; referrals_closed: number; rewards_paid: number }

const STATUS_TAG: Record<string, string> = { new: "New", contacted: "Contacted", in_progress: "Quoted" };

interface Props {
  businessId: string;
  businessName: string;
  slug: string;
  publicUrl: string;
  isPro: boolean;
  isDemo: boolean;
  setup: SetupState;
  leads: LeadLite[];
  onGo: (t: DashTab) => void;
  onPublish: () => void;
  onShared: () => void;
  welcome?: React.ReactNode;
}

const Tile = ({ label, value, sub, warm, children }: { label: string; value: string; sub?: string; warm?: boolean; children?: React.ReactNode }) => (
  <div data-testid="stat-tile" className={`rounded-[14px] border border-line p-4 sm:p-5 ${warm ? "bg-sign/15" : "bg-card"}`}>
    <p className="text-sm font-semibold text-muted-foreground">{label}</p>
    <p className="mt-1 font-display text-[34px] font-bold leading-none text-forest dark:text-foreground">{value}</p>
    {sub && <p className="mt-2 text-sm text-muted-foreground">{sub}</p>}
    {children}
  </div>
);

const HomeView = ({ businessId, businessName, slug, publicUrl, isPro, isDemo, setup, leads, onGo, onPublish, onShared, welcome }: Props) => {
  const { toast } = useToast();
  const [rewards, setRewards] = useState<RewardLite[]>([]);
  const [referrers, setReferrers] = useState<ReferrerRow[] | null>(null);

  useEffect(() => {
    let live = true;
    void (supabase as any).from("rewards").select("status, amount, referrer_name, referrer_contact").eq("business_id", businessId)
      .then(({ data }: { data: RewardLite[] | null }) => { if (live) setRewards(data ?? []); });
    void supabase.rpc("fn_business_referrers" as never).then(({ data }) => {
      if (live) setReferrers(((data as ReferrerRow[] | null) ?? []));
    });
    return () => { live = false; };
  }, [businessId]);

  const step = nextStep(setup);
  const done = setupDone(setup);
  const doneCount = done.filter(Boolean).length;
  const stats = computeStats(leads, rewards);
  const toCall = leadsToCall(leads);
  const top = [...(referrers ?? [])].sort((a, b) => b.referrals_sent - a.referrals_sent).filter((r) => r.referrals_sent > 0).slice(0, 3);
  const displayUrl = `revvin.co/r/${slug}`;

  const runStep = () => (step.tab ? onGo(step.tab) : onPublish());

  const copy = async () => {
    if (await copyText(publicUrl)) { toast({ title: "Link copied" }); onShared(); }
  };
  const share = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try { await navigator.share({ title: businessName, url: publicUrl }); onShared(); } catch { /* cancelled */ }
    } else { await copy(); }
  };

  return (
    <div className="space-y-6">
      {welcome}
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="font-display text-[34px] font-bold leading-none text-forest dark:text-foreground sm:text-[44px] break-words">{businessName}</h1>
        <div className="flex min-w-0 items-center gap-1 rounded-full border border-line bg-card py-1 pl-4 pr-1">
          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">{displayUrl}</span>
          <Button size="sm" variant="ghost" className="rounded-full" onClick={copy}>Copy</Button>
          <Button size="sm" className="rounded-full" onClick={share}>Share</Button>
        </div>
      </header>

      <section data-testid="next-step" data-step={step.key} className="rounded-[14px] bg-forest p-6 text-white sm:p-8">
        <p className="text-sm font-semibold text-white/70">Your next step</p>
        <h2 className="mt-1 font-display text-[30px] font-bold leading-tight sm:text-[36px]">{step.title}</h2>
        <p className="mt-2 max-w-xl text-white/85">{step.body}</p>
        <Button variant="sign" size="lg" className="mt-5 w-full sm:w-auto" onClick={runStep}>{step.button}</Button>
        <div className="mt-6 flex gap-1.5" aria-hidden>
          {done.map((d, i) => <span key={i} className={`h-2 flex-1 rounded-full ${d ? "bg-sign" : "bg-white/20"}`} />)}
        </div>
        <p className="mt-2 text-sm text-white/80">{doneCount} of 5 setup steps done</p>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4 sm:gap-4" aria-label="Your numbers">
        <Tile label="Referrals this month" value={String(stats.referralsThisMonth)} />
        <Tile label="Jobs closed from referrals" value={String(stats.jobsClosed)} />
        <Tile label="Revenue from referred jobs" value={money(stats.revenue)} sub={stats.revenue === 0 ? "Add a job value when you close a lead" : undefined} />
        <Tile label="Rewards owed" value={money(stats.owed)} warm={stats.owed > 0}
          sub={stats.owed > 0 ? `to ${stats.owedPeople} ${stats.owedPeople === 1 ? "person" : "people"}` : undefined}>
          {stats.owed > 0 && (
            <button type="button" onClick={() => onGo("payouts")} className="mt-1 text-sm font-semibold text-primary underline underline-offset-2">Mark as paid</button>
          )}
        </Tile>
      </section>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section className="min-w-0 rounded-[14px] border border-line bg-card p-5">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h2 className="font-display text-2xl font-bold text-forest dark:text-foreground">Leads to call</h2>
            <button type="button" onClick={() => onGo("leads")} className="whitespace-nowrap text-sm font-semibold text-primary">All leads</button>
          </div>
          {toCall.length === 0 ? (
            <div className="py-4">
              <p className="text-muted-foreground">No leads yet. Your first one usually comes after you ask your customers.</p>
              <Button className="mt-4" onClick={runStep}>{step.button}</Button>
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {toCall.map((l) => (
                <li key={l.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 font-semibold text-foreground">
                      {l.lead_name}
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">{STATUS_TAG[l.status]}</span>
                    </p>
                    <p className="truncate text-sm text-foreground/80">{l.lead_need}</p>
                    <p className="text-sm text-muted-foreground">From {l.referrer_name}, {relativeTime(l.created_at)}</p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    {l.stale ? (
                      <Button size="sm" asChild><a href={`sms:${l.lead_phone}`}>Follow up</a></Button>
                    ) : (
                      <>
                        <Button size="sm" asChild><a href={`tel:${l.lead_phone}`}>Call</a></Button>
                        <Button size="sm" variant="outline" asChild><a href={`sms:${l.lead_phone}`}>Text</a></Button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="min-w-0 rounded-[14px] border border-line bg-card p-5">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h2 className="font-display text-2xl font-bold text-forest dark:text-foreground">Top referrers</h2>
            <button type="button" onClick={() => onGo("referrers")} className="whitespace-nowrap text-sm font-semibold text-primary">All referrers</button>
          </div>
          {referrers !== null && top.length === 0 ? (
            <p className="py-4 text-muted-foreground">Your referrers will show up here.</p>
          ) : (
            <ul className="divide-y divide-line">
              {top.map((r) => (
                <li key={r.id} className="py-3">
                  <p className="font-semibold text-foreground">{r.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {r.referrals_sent} {r.referrals_sent === 1 ? "referral" : "referrals"}, {r.referrals_closed} closed, {money(Number(r.rewards_paid || 0))} paid
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {!isPro && !isDemo && (
        <div data-testid="free-upsell" className="flex flex-col gap-3 rounded-[14px] border-2 border-dashed border-line p-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-foreground">
            Free covers {FREE_CONTACT_LIMIT} customers. You've added {setup.customersTotal}. Pro asks your whole list and follows up for you.
          </p>
          <Button variant="line" asChild className="shrink-0"><a href="/pricing">See Pro</a></Button>
        </div>
      )}
    </div>
  );
};

export default HomeView;
