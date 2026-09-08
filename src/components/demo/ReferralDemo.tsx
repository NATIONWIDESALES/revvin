import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { track } from "@/lib/track";
import { ArrowRight, Check, Inbox, RotateCcw, Send, Wallet } from "lucide-react";

/**
 * Interactive demo of the referral loop.
 *
 * Everything here is synthetic and lives in React state. There are no database
 * writes, no notifications, no email, no SMS and no checkout. Nothing typed here
 * leaves the browser. Every stage is labelled DEMO.
 */

type Stage = "form" | "inbox" | "won" | "paid";

const DEMO_BUSINESS = "Summit Roofing (demo)";
const DEMO_REWARD = 250;
const DEMO_JOB_VALUE = 6400;
const PRO_MONTHLY = 49;

const STEPS: { id: Stage; label: string }[] = [
  { id: "form", label: "Referral sent" },
  { id: "inbox", label: "Owner inbox" },
  { id: "won", label: "Job won" },
  { id: "paid", label: "Reward paid" },
];

const money = (n: number) => `$${n.toLocaleString("en-US")}`;

const DemoBadge = ({ className = "" }: { className?: string }) => (
  <span
    className={`inline-flex items-center rounded-full bg-foreground px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-background ${className}`}
  >
    Demo
  </span>
);

const ReferralDemo = () => {
  const [stage, setStage] = useState<Stage>("form");
  const [name, setName] = useState("");
  const [lead, setLead] = useState("");
  const [need, setNeed] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jobValue, setJobValue] = useState(String(DEMO_JOB_VALUE));
  const [started, setStarted] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const liveRef = useRef<HTMLParagraphElement>(null);

  // Move focus to the stage heading on each change so keyboard and screen
  // reader users are not stranded at the bottom of the previous stage.
  useEffect(() => {
    if (stage !== "form") headingRef.current?.focus();
  }, [stage]);

  const referrerName = name.trim() || "Dana (demo referrer)";
  const leadName = lead.trim() || "Chris (demo lead)";
  const parsedJob = Number(jobValue.replace(/[^0-9.]/g, ""));
  const jobAmount = Number.isFinite(parsedJob) && parsedJob > 0 ? parsedJob : 0;
  const contribution = useMemo(() => jobAmount - DEMO_REWARD - PRO_MONTHLY, [jobAmount]);

  const stageIndex = STEPS.findIndex((s) => s.id === stage);

  const beginIfNeeded = () => {
    if (started) return;
    setStarted(true);
    track("demo_started");
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!consent) {
      setError("Tick the consent box to continue. The real form requires it too.");
      return;
    }
    setError(null);
    beginIfNeeded();
    setStage("inbox");
  };

  const reset = () => {
    setStage("form");
    setName("");
    setLead("");
    setNeed("");
    setConsent(false);
    setJobValue(String(DEMO_JOB_VALUE));
    setError(null);
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
            className={
              i <= stageIndex ? "font-semibold text-foreground" : "text-muted-foreground"
            }
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
                Play the customer. Use made-up details: nothing here is saved or sent anywhere.
              </p>
            </div>
            <div>
              <Label htmlFor="demo-name">Your name</Label>
              <Input
                id="demo-name"
                value={name}
                onChange={(e) => {
                  beginIfNeeded();
                  setName(e.target.value);
                }}
                placeholder="Dana (demo referrer)"
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
                placeholder="Chris (demo lead)"
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
                placeholder="Roof leak above the garage"
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
            <Button type="submit" size="lg" className="h-12 w-full gap-2">
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
                {stage === "paid" && "Step 4. Reward marked paid"}
                <DemoBadge className="ml-2 align-middle" />
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {stage === "inbox" && "This is what lands in the owner's dashboard the moment a referral comes in."}
                {stage === "won" && "The owner records what the job was worth. Revvin never touches the money."}
                {stage === "paid" && "The owner pays the referrer directly and records it here."}
              </p>
            </div>

            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-foreground">{leadName}</p>
                <span className="rounded-full bg-background px-2 py-0.5 text-[11px] font-semibold text-foreground">
                  {stage === "inbox" ? "New" : stage === "won" ? "Won" : "Won, reward paid"}
                </span>
              </div>
              <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-muted-foreground">Referred by</dt>
                  <dd className="text-foreground">{referrerName}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">What they need</dt>
                  <dd className="text-foreground">{need.trim() || "Roof leak above the garage"}</dd>
                </div>
              </dl>
            </div>

            {stage === "inbox" && (
              <Button size="lg" className="h-12 w-full gap-2" onClick={() => setStage("won")}>
                <Inbox className="h-4 w-4" aria-hidden="true" />
                Move this job to won
              </Button>
            )}

            {stage !== "inbox" && (
              <div className="space-y-4">
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
                <dl className="grid gap-2 sm:grid-cols-3">
                  <div className="rounded-xl border border-border bg-muted/30 p-3">
                    <dt className="text-xs text-muted-foreground">Job revenue</dt>
                    <dd className="text-lg font-semibold text-foreground">{money(jobAmount)}</dd>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/30 p-3">
                    <dt className="text-xs text-muted-foreground">Referral reward</dt>
                    <dd className="text-lg font-semibold text-foreground">-{money(DEMO_REWARD)}</dd>
                  </div>
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
                    <dt className="text-xs text-muted-foreground">After reward and Pro</dt>
                    <dd className="text-lg font-semibold text-primary">{money(contribution)}</dd>
                  </div>
                </dl>
                <p className="text-xs text-muted-foreground">
                  Contribution after the {money(DEMO_REWARD)} reward and one month of Pro at{" "}
                  {money(PRO_MONTHLY)}. It is not net profit: your own job costs are not in here.
                </p>
              </div>
            )}

            {stage === "won" && (
              <Button
                size="lg"
                className="h-12 w-full gap-2"
                onClick={() => {
                  setStage("paid");
                  track("demo_completed");
                }}
              >
                <Wallet className="h-4 w-4" aria-hidden="true" />
                Mark the {money(DEMO_REWARD)} reward paid
              </Button>
            )}

            {stage === "paid" && (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Check className="h-4 w-4 text-primary" aria-hidden="true" />
                  Loop closed, in the demo
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {referrerName} was paid {money(DEMO_REWARD)} directly by the business. Revvin
                  recorded it. No money moved through Revvin, and nothing in this demo was saved.
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
