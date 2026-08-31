import { useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Copy, Check, FileText, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import SEOHead from "@/components/SEOHead";

const ease = [0.16, 1, 0.3, 1] as const;

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.6, ease },
  }),
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const scripts = [
  {
    title: "In person, as you're packing up",
    body: "Before I take off - if this went well and someone asks who did it, would you mind passing my name on? I'll look after them the same way I looked after you.",
    why: "Ask at the end of the job, not two weeks later. It is the only moment you are still fresh in their mind and they are still pleased with you.",
  },
  {
    title: "The text, two hours after you leave",
    body: "Hi {first name} - {your name} from {business}. Thanks for having us out today. If anyone you know needs {trade} work, this link comes straight to me: {your link}. There's {reward} in it for you if it turns into a job.",
    why: "Two hours is deliberate. Same day you are a person they just met. Two weeks later you are a stranger asking for a favour.",
  },
  {
    title: "The 30-day check-in, for jobs already finished",
    subject: "Quick one, {first name}",
    body: "Hi {first name} - {your name} from {business}. We did your {job} back in {month}. No catch, just checking it is all still holding up. If it is, and you know anyone who needs {trade}: {your link}. I pay {reward} for anyone who turns into a job.",
    why: "Checking the work still stands earns the right to ask. Leading with the ask does not.",
  },
  {
    title: "The dormant list, people you have not spoken to in a year",
    subject: "Still here if you need us",
    body: "Hi {first name} - {your name} from {business}. You had us out for {job} a while back and I do not think we have spoken since. Nothing to sell you. If you ever need {trade} again, or someone asks you who to call, here is where to send them: {your link}.",
    why: "Send this to twenty people before you top up an ad budget. It costs nothing and they already know your work.",
  },
  {
    title: "When they send someone",
    body: "{referrer} said you might call - happy to help.",
    why: "Say the referrer's name in the first sentence. It is the whole reason that lead trusts you before you have done anything.",
  },
  {
    title: "Paying out, in plain English",
    body: `What counts as a referral - a new customer who books a paid job.

What you pay - {reward}.

When you pay it - within {n} days of the job being paid in full.

What voids it - cancelled jobs, refunds, and anyone already in your pipeline.`,
    why: "Put it in writing before the first payout, not after the first argument.",
  },
];

const rules = [
  "Ask once, in a way that is easy to say no to. Never chase twice.",
  "Name the reward - \"I'd appreciate referrals\" gets nothing, \"{reward} per job\" gets acted on.",
  "Give them a link, not an instruction. Nobody relays a phone number correctly.",
  "Thank them the day the referral lands, not the day it closes.",
];

async function writeToClipboard(text: string) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return;
    }
  } catch {
    // fall through to legacy fallback
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  textarea.style.top = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  try {
    document.execCommand("copy");
  } finally {
    document.body.removeChild(textarea);
  }
}

const CopyButton = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await writeToClipboard(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }, [text]);

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={handleCopy}
      className="absolute right-3 top-3 h-8 gap-1.5 px-2.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
      aria-label={copied ? "Copied" : "Copy script"}
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5 text-primary" />
          Copied
        </>
      ) : (
        <>
          <Copy className="h-3.5 w-3.5" />
          Copy
        </>
      )}
    </Button>
  );
};

const AskKit = () => {
  return (
    <div>
      <SEOHead
        title="The Referral Ask Kit"
        description="The exact words to use, and when to use them. Copy any of these referral scripts, swap the braces for your own details, and send it today. Free, no sign-up needed."
        path="/ask-kit"
      />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border hero-radial">
        <div aria-hidden className="absolute inset-0 grid-faint" />
        <div className="container relative max-w-3xl py-24">
          <motion.div initial="hidden" animate="visible" variants={stagger}>
            <motion.div variants={fadeUp} custom={0}>
              <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary">
                <FileText className="h-3.5 w-3.5" /> Free resource
              </span>
            </motion.div>
            <motion.h1
              variants={fadeUp}
              custom={1}
              className="text-4xl font-extrabold tracking-tight text-foreground md:text-6xl"
            >
              The Referral Ask Kit
            </motion.h1>
            <motion.p
              variants={fadeUp}
              custom={2}
              className="mt-5 text-lg text-muted-foreground"
            >
              The exact words to use, and when to use them. Copy any of these,
              swap the braces for your own details, and send it today. Free, no
              sign-up needed.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Scripts */}
      <section className="border-b border-border bg-surface-warm">
        <div className="container py-24">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={stagger}
            className="mx-auto max-w-3xl space-y-10"
          >
            {scripts.map((s, i) => (
              <motion.div key={s.title} variants={fadeUp} custom={i}>
                <Card className="overflow-hidden">
                  <CardHeader className="pb-4">
                    <h2 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
                      {s.title}
                    </h2>
                    {s.subject && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        Subject: {s.subject}
                      </p>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="relative rounded-xl border border-border bg-muted/50 p-5">
                      <CopyButton text={s.body} />
                      <pre className="whitespace-pre-wrap pr-20 font-mono text-sm leading-relaxed text-foreground">
                        {s.body}
                      </pre>
                    </div>
                    <p className="text-sm leading-relaxed text-muted-foreground md:text-base">
                      {s.why}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Four rules */}
      <section className="border-b border-border">
        <div className="container py-24">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={stagger}
            className="mx-auto max-w-3xl"
          >
            <motion.h2
              variants={fadeUp}
              custom={0}
              className="text-2xl font-bold tracking-tight text-foreground md:text-3xl"
            >
              Four rules that make any of this work
            </motion.h2>
            <motion.ol
              variants={fadeUp}
              custom={1}
              className="mt-8 list-decimal space-y-4 pl-5 text-base leading-relaxed text-foreground md:text-lg"
            >
              {rules.map((rule) => (
                <li key={rule} className="pl-2 marker:font-semibold marker:text-primary">
                  {rule}
                </li>
              ))}
            </motion.ol>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-surface">
        <div className="container py-24">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={stagger}
            className="mx-auto max-w-2xl text-center"
          >
            <motion.h2
              variants={fadeUp}
              custom={0}
              className="text-3xl font-bold tracking-tight text-foreground md:text-4xl"
            >
              Put these scripts to work
            </motion.h2>
            <motion.p
              variants={fadeUp}
              custom={1}
              className="mt-4 text-lg text-muted-foreground"
            >
              Revvin gives you the link, the QR code and the inbox these scripts
              point at. Publishing your page is free.
            </motion.p>
            <motion.div variants={fadeUp} custom={2} className="mt-8">
              <Button
                size="lg"
                className="h-12 px-8 text-sm gap-2"
                asChild
              >
                <Link to="/signup">
                  Create your free page <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default AskKit;
