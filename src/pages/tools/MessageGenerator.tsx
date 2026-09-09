import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ToolShell from "@/components/toolkit/ToolShell";
import { track } from "@/lib/track";
import { TOOLKIT_CTAS } from "@/lib/toolkit/analytics";
import { copyText } from "@/lib/clipboard";
import {
  generateMessages,
  TIMING_OPTIONS,
  TONE_OPTIONS,
  TRADE_OPTIONS,
  type MessageTiming,
  type MessageTone,
} from "@/lib/toolkit/messages";
import { Check, Copy } from "lucide-react";

const selectClass =
  "mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

/**
 * Every output below is composed by the pure module and rendered as React text,
 * never as HTML. Nothing typed here is stored, sent, put in the address bar or
 * included in analytics, and Revvin does not send any of these messages: the
 * copy buttons put text on your own clipboard so you can send it yourself.
 */
const MessageGenerator = () => {
  const [trade, setTrade] = useState(TRADE_OPTIONS[0].value);
  const [customerFirstName, setCustomerFirstName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [rewardDisplay, setRewardDisplay] = useState("");
  const [referralPageLink, setReferralPageLink] = useState("");
  const [timing, setTiming] = useState<MessageTiming>("just_completed");
  const [tone, setTone] = useState<MessageTone>("direct");
  const [started, setStarted] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const messages = useMemo(
    () =>
      generateMessages({
        trade,
        customerFirstName,
        businessName,
        ownerName,
        jobDescription,
        rewardDisplay,
        referralPageLink,
        timing,
        tone,
      }),
    [
      trade,
      customerFirstName,
      businessName,
      ownerName,
      jobDescription,
      rewardDisplay,
      referralPageLink,
      timing,
      tone,
    ],
  );

  useEffect(() => {
    if (started) track("cta_clicked", { cta: TOOLKIT_CTAS.generatorStarted });
  }, [started]);

  const edit = (setter: (value: string) => void) => (value: string) => {
    setStarted(true);
    setter(value);
  };

  const copy = async (key: string, text: string) => {
    const ok = await copyText(text);
    if (ok) {
      setCopiedKey(key);
      track("cta_clicked", { cta: TOOLKIT_CTAS.generatorCompleted });
      window.setTimeout(() => setCopiedKey((current) => (current === key ? null : current)), 2000);
    }
  };

  const outputs = [
    { key: "sms", title: "Text message", subject: null, body: messages.sms },
    { key: "email", title: "Email", subject: messages.emailSubject, body: messages.emailBody },
    { key: "in_person", title: "In person", subject: null, body: messages.inPerson },
  ];

  return (
    <ToolShell
      path="/tools/referral-message-generator"
      metaTitle="Referral Message Generator | Write Your Referral Ask | Revvin"
      metaDescription="Generate a text, an email and a spoken script for asking a customer for a referral, written around your trade, your timing and your reward. Free, no account, nothing saved."
      eyebrow="Free tool"
      h1="Write the referral ask you will actually send."
      intro="Fill in as much or as little as you like and you get three versions of the same ask: a text, an email with a subject line, and something you can say out loud. Every field is optional except the trade, and you send the messages yourself from your own phone or email app."
      appName="Referral Message Generator"
      appDescription="Composes a text message, an email with subject line and a spoken script for asking a past customer for a referral, based on trade, timing, tone and an optional reward and link. Runs in the browser with no account and no saved input."
      ctaHeading="Give the ask somewhere to land."
      ctaCta={TOOLKIT_CTAS.generatorSignup}
    >
      <div className="rounded-2xl border border-border bg-background p-6 md:p-8">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="trade" className="text-sm font-semibold">
              Your trade or service
            </Label>
            <select
              id="trade"
              className={selectClass}
              value={trade}
              onChange={(e) => edit(setTrade)(e.target.value)}
            >
              {TRADE_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="first-name" className="text-sm font-semibold">
              Customer first name (optional)
            </Label>
            <Input
              id="first-name"
              value={customerFirstName}
              placeholder="Dana"
              onChange={(e) => edit(setCustomerFirstName)(e.target.value)}
              className="mt-2"
            />
          </div>

          <div>
            <Label htmlFor="business" className="text-sm font-semibold">
              Business name (optional)
            </Label>
            <Input
              id="business"
              value={businessName}
              placeholder="Northside Roofing"
              onChange={(e) => edit(setBusinessName)(e.target.value)}
              className="mt-2"
            />
          </div>

          <div>
            <Label htmlFor="owner" className="text-sm font-semibold">
              Your name or team name (optional)
            </Label>
            <Input
              id="owner"
              value={ownerName}
              placeholder="Sam"
              onChange={(e) => edit(setOwnerName)(e.target.value)}
              className="mt-2"
            />
          </div>

          <div>
            <Label htmlFor="job" className="text-sm font-semibold">
              What the job was (optional)
            </Label>
            <Input
              id="job"
              value={jobDescription}
              placeholder="the garage roof"
              onChange={(e) => edit(setJobDescription)(e.target.value)}
              className="mt-2"
            />
          </div>

          <div>
            <Label htmlFor="reward" className="text-sm font-semibold">
              Reward as you want it written (optional)
            </Label>
            <Input
              id="reward"
              value={rewardDisplay}
              placeholder="$150"
              onChange={(e) => edit(setRewardDisplay)(e.target.value)}
              className="mt-2"
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              This is wording only. It goes into the message exactly as you type it.
            </p>
          </div>

          <div>
            <Label htmlFor="link" className="text-sm font-semibold">
              Referral page link (optional)
            </Label>
            <Input
              id="link"
              value={referralPageLink}
              placeholder="revvin.co/r/your-business"
              onChange={(e) => edit(setReferralPageLink)(e.target.value)}
              className="mt-2"
            />
          </div>

          <div>
            <Label htmlFor="timing" className="text-sm font-semibold">
              When are you asking?
            </Label>
            <select
              id="timing"
              className={selectClass}
              value={timing}
              onChange={(e) => {
                setStarted(true);
                setTiming(e.target.value as MessageTiming);
              }}
            >
              {TIMING_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="tone" className="text-sm font-semibold">
              Tone
            </Label>
            <select
              id="tone"
              className={selectClass}
              value={tone}
              onChange={(e) => {
                setStarted(true);
                setTone(e.target.value as MessageTone);
              }}
            >
              {TONE_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-10 space-y-5">
          <h2 className="text-lg font-bold tracking-tight text-foreground">Your three versions</h2>
          {outputs.map((out) => (
            <article key={out.key} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-bold text-foreground">{out.title}</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copy(out.key, out.subject ? `${out.subject}\n\n${out.body}` : out.body)}
                >
                  {copiedKey === out.key ? (
                    <>
                      <Check className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" /> Copy
                    </>
                  )}
                </Button>
              </div>
              {out.subject && (
                <p className="mt-3 text-sm font-semibold text-foreground">Subject: {out.subject}</p>
              )}
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                {out.body}
              </p>
            </article>
          ))}
        </div>

        <div className="mt-8 rounded-xl border border-border p-5">
          <h3 className="text-sm font-bold text-foreground">Before you send it</h3>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted-foreground">
            <li>Ask once. A second ask to the same customer reads as pressure, not a favour.</li>
            <li>Say what actually earns the reward, so nobody feels moved once a job closes.</li>
            <li>
              Only use a phone number or email address the customer gave you for contact like this.
            </li>
          </ul>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button size="lg" className="h-12 sm:px-7" asChild>
            <Link
              to="/signup"
              onClick={() => track("cta_clicked", { cta: TOOLKIT_CTAS.generatorSignup })}
            >
              Build my referral page free
            </Link>
          </Button>
          <Button size="lg" variant="outline" className="h-12 sm:px-7" asChild>
            <Link to="/ask-kit">See more example scripts</Link>
          </Button>
        </div>
      </div>
    </ToolShell>
  );
};

export default MessageGenerator;
