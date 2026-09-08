import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { track } from "@/lib/track";
import { ArrowRight, Check, HandCoins, Inbox, RotateCcw, Send } from "lucide-react";
import { MONTHLY_PRICE, PRICE_TEXT } from "@/config/pricing";

/**
 * Interactive demo of the referral loop.
 *
 * Everything is synthetic and lives in React state: no database writes, no
 * leads, no notifications, no email, no SMS, no checkout. Nothing typed here is
 * saved or transmitted, and nothing typed here is ever put into an analytics
 * event: the only events are `demo_started` and `demo_completed`, fired at most
 * once per run, with no payload. Those are marketing events and never feed
 * commercial totals.
 *
 * The fields arrive pre-filled so a visitor can press one button and watch the
 * whole loop.
 */

type Stage = "form" | "inbox" | "won" | "paid";

const DEMO_BUSINESS = "Summit Roofing (demo)";
const DEMO_REWARD = 250;
const DEMO_JOB_VALUE = 6400;
const DEFAULT_MARGIN = 40;

const PREFILL = {
  name: "Dana Whitfield",
  lead: "Chris Alvarez",
  need: "Roof leak above the garage after last week's storm",
} as const;

const STEPS: { id: Stage; label: string }[] = [
  { id: "form", label: "Referral sent" },
  { id: "inbox", label: "Owner inbox" },
  { id: "won", label: "Job won" },
  { id: "paid", label: "Reward paid" },
];

const money = (n: number) =>
  `${n < 0 ? "-" : ""}$${Math.abs(Math.round(n)).toLocaleString("en-US")}`;

const DemoBadge = ({ className = "" }: { className?: string }) => (
  <span
    className={`inline-flex items-center rounded-full bg-foreground px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-background ${className}`}
  >
    Demo
  </span>
);

const ReferralDemo = () => {
  const [stage, setStage] = useState<Stage>("form");
  const [name, setName] = useState<string>(PREFILL.name);
  const [lead, setLead] = useState<string>(PREFILL.lead);
  const [need, setNeed] = useState<string>(PREFILL.need);
  const [consent, setConsent] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [jobValue, setJobValue] = useState(String(DEMO_JOB_VALUE));
  const [margin, setMargin] = useState(DEFAULT_MARGIN);
  const [rewardPaid, setRewardPaid] = useState(false);

  // Per-run bookkeeping. Each run fires at most one started and one completed
  // event; Reset arms a fresh run so a second pass is counted once, not twice.
  const runStarted = useRef(false);
  const runCompleted = useRef(false);

  const firstFieldRef = useRef<HTMLInputElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const liveRef = useRef<HTMLParagraphElement>(null);
  const resetRequested = useRef(false);

  // Move focus to the stage heading on each change so keyboard and screen
  // reader users are not stranded at the bottom of the previous stage. After a
  // reset, focus goes back to the first field instead.
  useEffect(() => {
    if (resetRequested.current) {
      resetRequested.current = false;
      firstFieldRef.current?.focus();
      return;
    }
    if (stage !== "form") headingRef.current?.focus();
  }, [stage]);

  const referrerName = name.trim() || PREFILL.name;
  const leadName = lead.trim() || PREFILL.lead;
  const leadNeed = need.trim() || PREFILL.need;

  const parsedJob = Number(jobValue.replace(/[^0-9.]/g, ""));
  const revenue = Number.isFinite(parsedJob) && parsedJob > 0 ? parsedJob : 0;
  // Revenue minus the reward is not what the owner keeps: the job has costs.
  // The margin is the owner's own estimate, exactly as on the ROI calculator.
  const grossProfit = useMemo(() => revenue * (margin / 100), [revenue, margin]);
  const contribution = grossProfit - DEMO_REWARD - MONTHLY_PRICE;

  const stageIndex = STEPS.findIndex((s) => s.id === stage);

  const beginRun = () => {
    if (runStarted.current) return;
    runStarted.current = true;
    track("demo_started");
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!consent) {
      setError("Tick the consent box to continue. The real form requires it too.");
      return;
    }
    setError(null);
    beginRun();
    setStage("inbox");
  };

  const finishRun = () => {
    setRewardPaid(true);
    setStage("paid");
    if (runCompleted.current) return;
    runCompleted.current = true;
    track("demo_completed");
  };

  const reset = () => {
    resetRequested.current = true;
    runStarted.current = false;
    runCompleted.current = false;
    setStage("form");
    setName(PREFILL.name);
    setLead(PREFILL.lead);
    setNeed(PREFILL.need);
    setConsent(true);
    setJobValue(String(DEMO_JOB_VALUE));
    setMargin(DEFAULT_MARGIN);
    setRewardPaid(false);
    setError(null);
    firstFieldRef.current?.focus();
    if (liveRef.current) liveRef.current.textContent = "Demo reset. Back to the referral form.";
  };

  return (
    <div className="rounded-2xl border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2">
          <DemoBadge />
          <p className="text-sm font-semibold text-foreground">{DEMO_BUSINESS}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={reset} className="h-9 gap-1.5 px-3">
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          Reset demo
        </Button>
      </div>

      {/* Stage rail */}
      <ol className="flex flex-wrap gap-x-4 gap-y-1 border-b border-border px-4 py-3 text-xs sm:px-5">
        {STEPS.map((s, i) => (
          <li
            key={s.id}
            aria-current={s.id === stage ? "step" : undefined}
            className={i <= stageIndex ? "font-semibold text-foreground" : "text-muted-foreground"}
          >
            {i + 1}. {s.label}
          </li>
        ))}
      </ol>

      <p ref={liveRef} aria-live="polite" className="sr-only" />

      <div className="p-4 sm:p-6">
        {stage === "form" && (
          <form onSubmit={submit} className="space-y-4" noValidate>
            <div>
              <h3 className="text-base font-semibold text-foreground">
                Step 1. Send a referral <DemoBadge className="ml-1 align-middle" />
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Already filled in with made-up people, so you can just press send. Change anything
                you like: nothing is saved or sent anywhere.
              </p>
            </div>
            <div>
              <Label htmlFor="demo-name">Your name</Label>
              <Input
                id="demo-name"
                ref={firstFieldRef}
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="off"
                className="mt-1.5 h-11"
              />
            </div>
            <div>
              <Label htmlFor="demo-lead">Who are you referring?</Label>
              <Input
                id="demo-lead"
                value={lead}
                onChange={(e) => setLead(e.target.value)}
                autoComplete="off"
                className="mt-1.5 h-11"
              />
            </div>
            <div>
              <Label htmlFor="demo-need">What do they need?</Label>
              <Textarea
                id="demo-need"
                value={need}
                onChange={(e) => setNeed(e.target.value)}
                rows={2}
                className="mt-1.5"
              />
            </div>
            <label className="flex items-start gap-3 text-sm text-foreground">
              <Checkbox
                checked={consent}
                onCheckedChange={(v) => setConsent(!!v)}
                aria-describedby="demo-consent-note"
                className="mt-0.5"
              />
              <span id="demo-consent-note">
                I confirm I have permission to share these (made-up) details.
              </span>
            </label>
            {error && (
              <p role="alert" className="text-sm font-medium text-destructive">
                {error}
              </p>
            )}
            <Button type="submit" size="lg" className="h-auto min-h-12 w-full gap-2 whitespace-normal py-3 text-center leading-tight">
              <Send className="h-4 w-4" aria-hidden="true" />
              Send demo referral
            </Button>
          </form>
        )}

        {stage !== "form" && (
          <div className="space-y-5">
            <div>
              <h3
                ref={headingRef}
                tabIndex={-1}
                className="text-base font-semibold text-foreground outline-none"
              >
                {stage === "inbox" && "Step 2. The owner's lead inbox"}
                {stage === "won" && "Step 3. Job won, reward owed"}
                {stage === "paid" && "Step 4. Reward recorded as paid"}
                <DemoBadge className="ml-2 align-middle" />
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {stage === "inbox" &&
                  "This is what lands in the owner's dashboard when a referral is submitted through the page."}
                {stage === "won" &&
                  "The owner records what the job was worth. The reward is owed at this point, and nothing has been paid yet."}
                {stage === "paid" &&
                  "The owner paid the referrer directly and recorded it here. Revvin recorded the fact, it did not move the money."}
              </p>
            </div>

            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-foreground">{leadName}</p>
                <span className="rounded-full bg-background px-2 py-0.5 text-[11px] font-semibold text-foreground">
                  {stage === "inbox" ? "New" : rewardPaid ? "Won · reward recorded paid" : "Won · reward owed"}
                </span>
              </div>
              <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-muted-foreground">Referred by</dt>
                  <dd className="text-foreground">{referrerName}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">What they need</dt>
                  <dd className="text-foreground">{leadNeed}</dd>
                </div>
              </dl>
            </div>

            {stage === "inbox" && (
              <Button size="lg" className="h-auto min-h-12 w-full gap-2 whitespace-normal py-3 text-center leading-tight" onClick={() => setStage("won")}>
                <Inbox className="h-4 w-4" aria-hidden="true" />
                Move this job to won
              </Button>
            )}

            {stage !== "inbox" && (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="demo-value">Job revenue the owner recorded</Label>
                    <Input
                      id="demo-value"
                      value={jobValue}
                      onChange={(e) => setJobValue(e.target.value)}
                      inputMode="decimal"
                      aria-describedby="demo-value-note"
                      className="mt-1.5 h-11"
                    />
                    <p id="demo-value-note" className="mt-1 text-xs text-muted-foreground">
                      Owner-reported. Revvin does not see invoices or payments.
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="demo-margin">Your profit margin on a job: {margin}%</Label>
                    <Slider
                      id="demo-margin"
                      value={[margin]}
                      min={10}
                      max={80}
                      step={5}
                      onValueChange={([v]) => setMargin(v)}
                      className="mt-4"
                      aria-label={`Profit margin on a job: ${margin} percent`}
                    />
                    <p className="mt-2 text-xs text-muted-foreground">
                      Your own estimate. Revvin has no way to know your job costs.
                    </p>
                  </div>
                </div>

                <dl className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-xl border border-border bg-muted/30 p-3">
                    <dt className="text-xs text-muted-foreground">Job revenue</dt>
                    <dd className="text-lg font-semibold text-foreground">{money(revenue)}</dd>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/30 p-3">
                    <dt className="text-xs text-muted-foreground">Gross profit at {margin}%</dt>
                    <dd className="text-lg font-semibold text-foreground">{money(grossProfit)}</dd>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/30 p-3">
                    <dt className="text-xs text-muted-foreground">
                      Referral reward {rewardPaid ? "(recorded paid)" : "(owed)"}
                    </dt>
                    <dd className="text-lg font-semibold text-foreground">-{money(DEMO_REWARD)}</dd>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/30 p-3">
                    <dt className="text-xs text-muted-foreground">Revvin Pro, one month</dt>
                    <dd className="text-lg font-semibold text-foreground">-{money(MONTHLY_PRICE)}</dd>
                  </div>
                </dl>

                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                  <p className="text-xs text-muted-foreground">
                    Estimated contribution from this one job
                  </p>
                  <p className="text-2xl font-extrabold tracking-tight text-primary">
                    {money(contribution)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {`Gross profit at ${margin}% of ${money(revenue)}, less the ${money(DEMO_REWARD)} reward and one month of Pro at ${PRICE_TEXT.monthlyPerMonth}. An estimate from figures you chose, not a forecast.`}
                  </p>
                </div>
              </div>
            )}

            {stage === "won" && (
              <Button size="lg" className="h-auto min-h-12 w-full gap-2 whitespace-normal py-3 text-center leading-tight" onClick={finishRun}>
                <HandCoins className="h-4 w-4" aria-hidden="true" />
                Record the {money(DEMO_REWARD)} reward as paid
              </Button>
            )}

            {stage === "paid" && (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Check className="h-4 w-4 text-primary" aria-hidden="true" />
                  Loop closed, in the demo
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  The owner marked the {money(DEMO_REWARD)} reward paid to {referrerName}, who is
                  notified when it is owed and again when it is marked paid. No money moved through
                  Revvin, and nothing in this demo was saved.
                </p>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <Button asChild className="h-11 gap-2">
                    <a href="/signup" onClick={() => track("cta_clicked", { cta: "demo_signup" })}>
                      Build my free referral page
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </a>
                  </Button>
                  <Button variant="outline" className="h-11 gap-2" onClick={reset}>
                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                    Run it again
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReferralDemo;
