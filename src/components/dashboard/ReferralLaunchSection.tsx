import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Loader2, Send } from "lucide-react";
import ProUpsell from "@/components/dashboard/ProUpsell";
import SenderLine from "@/components/dashboard/SenderLine";
import { friendlyError } from "@/lib/errors";
import { track } from "@/lib/track";
import { recipientBucket } from "@/lib/analyticsPrivacy";
import type { DashTab } from "@/lib/dashboardHome";
import {
  firstNameOf,
  followupDates,
  LAUNCH_BUTTON_LABEL,
  LAUNCH_DEFAULT_BODY,
  LAUNCH_DEFAULT_SUBJECT,
  LAUNCH_MAX_RECIPIENTS,
  launchAudience,
  launchLink,
  renderLaunchText,
  type SkipReason,
} from "../../../supabase/functions/_shared/referral-launch";

interface LaunchContact {
  id: string;
  name: string;
  email: string | null;
  status: string | null;
  is_mock: boolean | null;
  referrers?: { token: string } | null;
}

interface LaunchCampaign { id: string; created_at: string; started_at: string | null; followups_enabled: boolean; followups_done: number; status: string }

interface LaunchResults {
  started_at: string;
  followups_enabled: boolean;
  followups_done: number;
  total: number;
  sent: number;
  clicked: number;
  referrals: number;
  followup_sends: Record<string, number> | null;
  recipients: Array<{ contact_id: string; name: string | null; email: string | null; state: "sent" | "clicked" | "referred" | "opted_out" | "failed" | "pending" }>;
}

interface Props {
  biz: { id: string; name: string; slug: string | null; offer_amount: string | null; business_email: string | null };
  publicUrl: string;
  isPro: boolean;
  ready: boolean;
  onGo?: (tab: DashTab) => void;
  onLaunchSent?: () => void;
}

const SKIP_LABELS: Partial<Record<SkipReason, string>> = {
  no_email: "no email",
  opted_out: "opted out",
  duplicate_email: "duplicate email",
  undeliverable_email: "email that cannot receive mail",
  mock_contact: "sample customer",
  over_500_campaign_cap: `over the ${LAUNCH_MAX_RECIPIENTS} per send limit`,
};

const STATE_LABELS: Record<LaunchResults["recipients"][number]["state"], string> = {
  sent: "Sent", clicked: "Clicked", referred: "Referred", opted_out: "Opted out", failed: "Failed", pending: "Sending",
};

const originOf = (url: string) => { try { return new URL(url).origin; } catch { return window.location.origin; } };
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

const ReferralLaunchSection = ({ biz, publicUrl, isPro, ready, onGo, onLaunchSent }: Props) => {
  const { toast } = useToast();
  const [contacts, setContacts] = useState<LaunchContact[]>([]);
  const [launches, setLaunches] = useState<LaunchCampaign[]>([]);
  const [results, setResults] = useState<Record<string, LaunchResults | null>>({});
  const [loading, setLoading] = useState(true);
  const [audience, setAudience] = useState<{ recipients: LaunchContact[]; reasons: Partial<Record<SkipReason, number>> }>({ recipients: [], reasons: {} });
  const [subject, setSubject] = useState(LAUNCH_DEFAULT_SUBJECT);
  const [body, setBody] = useState(LAUNCH_DEFAULT_BODY);
  const [consent, setConsent] = useState(false);
  const [followups, setFollowups] = useState(true);
  const [sending, setSending] = useState(false);
  const [freeUsedByServer, setFreeUsedByServer] = useState(false);

  const load = useCallback(async () => {
    const [{ data: contactRows }, { data: launchRows }] = await Promise.all([
      supabase.from("referral_contacts").select("id, name, email, status, is_mock, referrers(token)").eq("business_id", biz.id).order("created_at", { ascending: true }).limit(10000),
      supabase.from("campaigns").select("id, created_at, started_at, followups_enabled, followups_done, status").eq("business_id", biz.id).eq("kind", "referral_launch").order("created_at", { ascending: false }).limit(10),
    ]);
    const rows = (contactRows ?? []) as unknown as LaunchContact[];
    setContacts(rows);
    setAudience(await launchAudience(rows, () => false));
    const list = ((launchRows ?? []) as LaunchCampaign[]).filter((c) => c && typeof c.id === "string");
    setLaunches(list);
    const entries = await Promise.all(list.map(async (c) => {
      const { data } = await supabase.rpc("fn_launch_campaign_results", { p_campaign_id: c.id });
      const parsed = data && typeof data === "object" && !Array.isArray(data) && Array.isArray((data as { recipients?: unknown }).recipients)
        ? (data as unknown as LaunchResults) : null;
      return [c.id, parsed] as const;
    }));
    setResults(Object.fromEntries(entries));
    setLoading(false);
  }, [biz.id]);

  // Load on every visit and refresh when the owner comes back to the tab.
  useEffect(() => {
    void load();
    const refresh = () => { if (document.visibilityState === "visible") void load(); };
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    return () => { document.removeEventListener("visibilitychange", refresh); window.removeEventListener("focus", refresh); };
  }, [load]);

  const freeUsed = !isPro && (launches.length > 0 || freeUsedByServer);
  const n = audience.recipients.length;
  const showComposer = !loading && ready && contacts.length > 0 && !freeUsed;

  const composerTracked = useRef(false);
  useEffect(() => {
    if (showComposer && !composerTracked.current) { composerTracked.current = true; track("launch_composer_viewed"); }
  }, [showComposer]);
  const resultsTracked = useRef(false);
  useEffect(() => {
    if (launches.length && !resultsTracked.current) { resultsTracked.current = true; track("launch_results_viewed"); }
  }, [launches.length]);

  const previewContact = audience.recipients[0] ?? null;
  const previewLink = previewContact?.referrers?.token && biz.slug
    ? launchLink(originOf(publicUrl), biz.slug, previewContact.referrers.token)
    : null;
  const tokens = { first_name: firstNameOf(previewContact?.name), business_name: biz.name, reward: biz.offer_amount, link: previewLink ?? "" };

  const skipLine = useMemo(() => {
    const parts = (Object.entries(audience.reasons) as Array<[SkipReason, number]>)
      .filter(([, count]) => count > 0)
      .map(([reason, count]) => `${count} ${SKIP_LABELS[reason] ?? reason.replace(/_/g, " ")}`);
    return parts.length ? `Skipped: ${parts.join(", ")}.` : "No one is skipped.";
  }, [audience.reasons]);

  const send = async () => {
    track("launch_send_clicked");
    if (!subject.trim() || !body.trim()) {
      toast({ title: "Add a subject and message", variant: "destructive" });
      return;
    }
    if (!consent) {
      toast({ title: "Confirm your customer relationship", description: "Confirm these are your own customers before sending.", variant: "destructive" });
      return;
    }
    setSending(true);
    const { data, error } = await supabase.functions.invoke("send-campaign", {
      body: { kind: "referral_launch", subject: subject.trim(), body, consent_confirmed: true, followups_enabled: followups },
    });
    setSending(false);
    if (error) {
      track("launch_send_failed");
      let code: string | undefined;
      let message: string | undefined;
      try {
        const payload = await (error as { context?: Response }).context?.json();
        code = payload?.code; message = payload?.error;
      } catch { /* not a JSON error body */ }
      if (code === "free_launch_used") setFreeUsedByServer(true);
      toast({ title: "Could not send", description: message ?? friendlyError(error), variant: "destructive" });
      return;
    }
    const queued = Number(data?.queued ?? 0);
    if (!queued) {
      track("launch_send_failed");
      toast({ title: "No emails went out", description: "Every customer was skipped. Check their emails and opt-outs in Customers.", variant: "destructive" });
      await load();
      return;
    }
    track("launch_sent", { recipients: recipientBucket(queued) });
    toast({ title: `Asking ${plural(queued, "customer", "customers")}`, description: `Emails are going out from ${biz.name}. Replies come to you.` });
    setConsent(false);
    onLaunchSent?.();
    await load();
  };

  const turnOffFollowups = async (id: string) => {
    const { error } = await supabase.from("campaigns").update({ followups_enabled: false }).eq("id", id);
    if (error) { toast({ title: "Could not turn off follow-ups", description: friendlyError(error), variant: "destructive" }); return; }
    toast({ title: "Follow-ups turned off" });
    await load();
  };

  if (loading) return <div className="rounded-2xl border border-border bg-card p-6 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></div>;

  return (
    <section aria-labelledby="launch-heading" className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
        <h2 id="launch-heading" className="text-lg font-semibold text-foreground">Ask all your customers for referrals</h2>
        <p className="mt-1 text-sm text-muted-foreground">Revvin emails every customer their own referral link, from {biz.name}. Replies come to you.</p>

        {contacts.length === 0 ? (
          <div className="mt-5 rounded-xl border border-dashed border-border p-6 text-center">
            <p className="text-sm text-muted-foreground">Add your customers first. Each one gets their own referral link.</p>
            <Button className="mt-4" onClick={() => onGo?.("customers")}>Add your customers</Button>
          </div>
        ) : freeUsed ? (
          <div className="mt-5">
            <ProUpsell title="Ask your customers again" body="Pro keeps asking: every new customer, after every job, and your whole list each quarter." />
          </div>
        ) : !ready ? (
          <p className="mt-4 text-sm text-muted-foreground">Finish your sending details above, then come back here to send.</p>
        ) : (
          <>
            <SenderLine businessName={biz.name} replyTo={biz.business_email} className="mt-2" />
            <div className="mt-4 rounded-xl bg-muted/30 p-4">
              <p className="text-sm font-semibold text-foreground" data-testid="launch-count">{plural(n, "customer with an email will be asked", "customers with an email will be asked")}</p>
              <p className="mt-1 text-xs text-muted-foreground">{skipLine}</p>
            </div>

            <div className="mt-5 grid gap-4">
              <div>
                <Label htmlFor="launch-subject" className="text-xs">Subject</Label>
                <Input id="launch-subject" className="mt-1.5" value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={200} />
              </div>
              <div>
                <Label htmlFor="launch-body" className="text-xs">Message</Label>
                <Textarea id="launch-body" rows={10} className="mt-1.5 text-sm" value={body} onChange={(e) => setBody(e.target.value)} maxLength={20000} />
                <p className="mt-1.5 text-xs text-muted-foreground">Use <code>{"{first_name}"}</code>, <code>{"{business_name}"}</code> and <code>{"{reward}"}</code>. You pay the reward yourself; Revvin never moves money.</p>
              </div>
            </div>

            {previewContact && (
              <div className="mt-5 rounded-xl border border-border bg-muted/20 p-5" data-testid="launch-preview">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Preview for {previewContact.name}</div>
                <div className="mt-3 text-sm font-semibold text-foreground">{renderLaunchText(subject, tokens) || "(no subject)"}</div>
                <div className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{renderLaunchText(body, tokens)}</div>
                {previewLink && (
                  <div className="mt-4">
                    <span className="inline-block rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">{LAUNCH_BUTTON_LABEL}</span>
                    <p className="mt-2 break-all text-xs text-muted-foreground">Goes to {previewContact.name.split(/\s+/)[0]}'s own link: <a data-testid="launch-preview-link" href={previewLink} target="_blank" rel="noopener noreferrer" className="underline">{previewLink}</a></p>
                  </div>
                )}
                <div className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">Your business address and unsubscribe link are added automatically.</div>
              </div>
            )}

            <div className="mt-5 flex items-start gap-3 rounded-lg border border-border bg-muted/20 p-4">
              <Switch id="launch-followups" checked={followups} onCheckedChange={setFollowups} />
              <Label htmlFor="launch-followups" className="cursor-pointer text-sm leading-snug text-foreground">We follow up twice with anyone who has not clicked, on day 4 and day 10.</Label>
            </div>
            <div className="mt-3 flex items-start gap-3 rounded-lg border border-border bg-muted/20 p-4">
              <Checkbox id="launch-consent" checked={consent} onCheckedChange={(value) => setConsent(value === true)} className="mt-0.5" />
              <Label htmlFor="launch-consent" className="cursor-pointer text-sm leading-snug text-foreground">These are my own past customers and they gave me their email during business with me.</Label>
            </div>
            <Button className="mt-4" size="lg" onClick={send} disabled={sending || n === 0}>
              {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Ask all {n} customers
            </Button>
            <p className="mt-3 text-xs text-muted-foreground">This sends real email. Revvin checks opt-outs again right before each email goes out.{!isPro ? " Free includes one launch, with its two follow-ups." : ""}</p>
          </>
        )}
      </div>

      {launches.map((launch) => (
        <LaunchResultsCard key={launch.id} launch={launch} results={results[launch.id] ?? null} onTurnOff={() => void turnOffFollowups(launch.id)} />
      ))}
    </section>
  );
};

const Tile = ({ label, value }: { label: string; value: number }) => (
  <div className="rounded-xl border border-border p-4">
    <div className="text-3xl font-semibold text-foreground">{value}</div>
    <div className="mt-1 text-xs font-medium text-muted-foreground">{label}</div>
  </div>
);

const LaunchResultsCard = ({ launch, results, onTurnOff }: { launch: LaunchCampaign; results: LaunchResults | null; onTurnOff: () => void }) => {
  const started = launch.started_at ?? launch.created_at;
  const dates = followupDates(started);
  const early = Date.now() - new Date(started).getTime() < 48 * 3600_000;
  const quiet = !results || (results.clicked === 0 && results.referrals === 0);
  const followupStatus = (step: 1 | 2) => {
    if ((results?.followups_done ?? launch.followups_done) >= step) {
      const count = results?.followup_sends?.[String(step)] ?? 0;
      return count ? `Sent to ${count}` : "Not needed, everyone clicked or replied";
    }
    return launch.followups_enabled ? "Scheduled" : "Off";
  };
  return (
    <div className="rounded-2xl border border-border bg-card p-6" data-testid="launch-results">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-semibold text-foreground">Referral launch, {new Date(started).toLocaleDateString()}</h3>
        {launch.followups_enabled && launch.followups_done < 2 && (
          <Button size="sm" variant="outline" onClick={onTurnOff}>Turn off follow-ups</Button>
        )}
      </div>
      {/* No open data from the email provider, so there is no Opened tile. */}
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Tile label="Sent" value={results?.sent ?? 0} />
        <Tile label="Clicked their link" value={results?.clicked ?? 0} />
        <Tile label="Referrals received" value={results?.referrals ?? 0} />
      </div>
      {early && quiet && <p className="mt-3 text-sm text-muted-foreground">Emails are going out. Clicks usually start within a day.</p>}

      <div className="mt-5">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Follow-ups</div>
        <ul className="mt-2 space-y-1 text-sm text-foreground">
          {([1, 2] as const).map((step) => (
            <li key={step} className="flex flex-wrap justify-between gap-2">
              <span>Follow-up {step === 1 ? "one" : "two"}{dates[step - 1] ? `, ${new Date(dates[step - 1]).toLocaleDateString()}` : ""}</span>
              <span className="text-muted-foreground">{followupStatus(step)}</span>
            </li>
          ))}
        </ul>
      </div>

      {results && results.recipients.length > 0 && (
        <details className="mt-5">
          <summary className="cursor-pointer text-sm font-semibold text-foreground">Customers asked ({results.recipients.length})</summary>
          <ul className="mt-2 divide-y divide-border text-sm">
            {results.recipients.map((r) => (
              <li key={r.contact_id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span className="min-w-0 break-words text-foreground">{r.name || r.email}</span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">{STATE_LABELS[r.state] ?? r.state}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
};

export default ReferralLaunchSection;
