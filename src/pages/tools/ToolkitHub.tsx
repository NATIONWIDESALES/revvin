import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { PRICE_TEXT } from "@/config/pricing";
import { track } from "@/lib/track";
import { TOOLKIT_CTAS } from "@/lib/toolkit/analytics";
import { ArrowRight, ClipboardCheck, Calculator, MessageSquare, FileText, Hammer, Store } from "lucide-react";

const BASE = "https://revvin.co";

const TOOLS = [
  {
    to: "/tools/referral-program-grader",
    icon: ClipboardCheck,
    name: "Referral Program Grader",
    body: "Eight questions about how your referrals work today. You get a score out of 100 and the three things to fix first.",
    action: "Grade my program",
  },
  {
    to: "/tools/referral-reward-calculator",
    icon: Calculator,
    name: "Referral Reward Calculator",
    body: "Put in your average job and your margin, and see what a reward leaves you per closed referred job.",
    action: "Check the numbers",
  },
  {
    to: "/tools/referral-message-generator",
    icon: MessageSquare,
    name: "Referral Message Generator",
    body: "A text, an email and a spoken script for the ask, written around your trade, your timing and your reward.",
    action: "Write my ask",
  },
  {
    to: "/ask-kit",
    icon: FileText,
    name: "Referral Ask Kit",
    body: "The scripts owners actually use, for each moment: at the end of the job, two hours later, and a year later.",
    action: "Open the ask kit",
  },
  {
    to: "/referral-programs",
    icon: Hammer,
    name: "Referral Programs by Trade",
    body: "How referrals, repeat work and reviews run in your trade, from roofing and HVAC to cleaning and detailing.",
    action: "Find your trade",
  },
] as const;

const FLOW = [
  "Choose the offer",
  "Create the page",
  "Share the link and QR code",
  "Track the referral",
  "Close the job",
  "Record the reward",
];

const FAQS = [
  {
    q: "Are these tools really free?",
    a: "Yes. All three tools run in your browser with no account, no card and no email required. Building and publishing your referral page on Revvin is free too.",
  },
  {
    q: "Do you save what I type into the tools?",
    a: "No. Nothing you type is sent to us, saved, put in the web address or included in our analytics. Close the tab and it is gone. We only count anonymous facts such as a tool being opened and finished.",
  },
  {
    q: "Do these work if I am not a contractor?",
    a: "Yes. The wording is written first for home-service businesses, because that is who asks us most, but the checklist, the reward arithmetic and the messages work for any service business with past customers.",
  },
  {
    q: "What does Revvin Pro add?",
    a: `Your referral page, lead inbox, QR code and print pack are free. Revvin Pro is ${PRICE_TEXT.monthlyPerMonth} USD, or ${PRICE_TEXT.annualPerYear} billed once, and adds importing your past-customer list, preparing the ask for that whole list, reactivation email campaigns, ROI reporting and custom page branding.`,
  },
];

const ToolkitHub = () => (
  <>
    <SEOHead
      title="Contractor Growth Toolkit | Free Referral Tools | Revvin"
      description="Three free tools for service businesses: grade your referral program out of 100, check what a referral reward leaves you per job, and write the ask. No account, no card, nothing saved."
      path="/tools"
      jsonLd={[
        {
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Contractor Growth Toolkit",
          url: `${BASE}/tools`,
          description:
            "Free interactive referral tools for home-service and other service businesses: a program grader, a reward calculator and a message generator, plus referral scripts and trade guides.",
          hasPart: TOOLS.map((t) => ({
            "@type": "WebPage",
            name: t.name,
            url: `${BASE}${t.to}`,
          })),
        },
        {
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: `${BASE}/` },
            { "@type": "ListItem", position: 2, name: "Free tools", item: `${BASE}/tools` },
          ],
        },
        {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQS.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        },
      ]}
    />

    <section className="relative overflow-hidden border-b border-border hero-radial">
      <div aria-hidden className="absolute inset-0 grid-faint" />
      <div className="container relative max-w-3xl py-16 md:py-24">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
          Free tools for service businesses
        </p>
        <h1 className="mt-4 text-[2rem] font-extrabold leading-[1.08] tracking-tight text-foreground sm:text-4xl md:text-5xl">
          Turn the customers you already have into the next job.
        </h1>
        <p className="mt-5 text-base leading-relaxed text-muted-foreground md:text-lg">
          Free, practical tools to design the offer, check the economics, write the ask and put the
          system live. Written first for home-service contractors, and useful for any service
          business with a list of past customers.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button size="lg" className="h-12 w-full px-6 text-base sm:w-auto" asChild>
            <a href="#tools">
              Start with a tool
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </a>
          </Button>
          <Button size="lg" variant="outline" className="h-12 w-full px-6 text-base sm:w-auto" asChild>
            <Link to="/signup" onClick={() => track("cta_clicked", { cta: TOOLKIT_CTAS.hubSignup })}>
              Build my referral page free
            </Link>
          </Button>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          No account, no card, and nothing you type is saved or sent.
        </p>
      </div>
    </section>

    <section id="tools" className="scroll-mt-16 border-b border-border bg-surface-warm">
      <div className="container py-16 md:py-20">
        <h2 className="text-2xl font-extrabold tracking-tight text-foreground md:text-3xl">
          Pick the one that matches where you are stuck.
        </h2>
        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {TOOLS.map((tool) => (
            <article
              key={tool.to}
              className="flex flex-col rounded-2xl border border-border bg-background p-6 shadow-soft"
            >
              <tool.icon className="h-5 w-5 text-primary" aria-hidden="true" />
              <h3 className="mt-4 text-lg font-bold tracking-tight text-foreground">
                <Link to={tool.to} className="hover:text-primary">
                  {tool.name}
                </Link>
              </h3>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">{tool.body}</p>
              <Link
                to={tool.to}
                className="mt-5 inline-flex items-center text-sm font-semibold text-primary hover:underline"
              >
                {tool.action}
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </article>
          ))}

          <article className="flex flex-col rounded-2xl border border-dashed border-border bg-background p-6">
            <Store className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
            <h3 className="mt-4 text-lg font-bold tracking-tight text-foreground">
              <Link to="/marketplace" className="hover:text-primary">
                Referral marketplace
              </Link>
            </h3>
            <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">
              Browse the referral offers businesses have published, or publish your own listing for
              free when you create your referral page.
            </p>
            <Link
              to="/marketplace"
              className="mt-5 inline-flex items-center text-sm font-semibold text-primary hover:underline"
            >
              Open the marketplace
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </article>
        </div>
      </div>
    </section>

    <section className="border-b border-border">
      <div className="container py-16 md:py-20">
        <div className="max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            From free tool to working system
          </p>
          <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-foreground md:text-3xl">
            The tools prepare the decisions. Revvin runs the loop.
          </h2>
        </div>
        <ol className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FLOW.map((step, i) => (
            <li
              key={step}
              className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 text-sm text-foreground"
            >
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
        <p className="mt-8 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          You pay your referrer directly when a job closes. Revvin tracks each reward from owed to
          paid, holds no money and takes no cut. Read{" "}
          <Link to="/guides/how-much-to-pay-for-a-referral" className="font-medium text-foreground underline-offset-4 hover:underline">
            how much to pay for a referral
          </Link>{" "}
          or see{" "}
          <Link to="/pricing" className="font-medium text-foreground underline-offset-4 hover:underline">
            what Revvin costs
          </Link>
          .
        </p>
      </div>
    </section>

    <section className="border-b border-border bg-surface-warm">
      <div className="container max-w-3xl py-16 md:py-20">
        <h2 className="text-2xl font-extrabold tracking-tight text-foreground md:text-3xl">
          Common questions
        </h2>
        <div className="mt-8 space-y-6">
          {FAQS.map((f) => (
            <div key={f.q}>
              <h3 className="text-base font-bold text-foreground">{f.q}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    <section className="bg-ink text-white">
      <div className="container max-w-2xl py-16 text-center md:py-20">
        <h2 className="text-2xl font-extrabold tracking-tight md:text-4xl">
          Build the page these tools are preparing.
        </h2>
        <p className="mt-4 text-base text-white/70 md:text-lg">
          {`Publishing your referral page is free, with no card. Revvin Pro is ${PRICE_TEXT.monthlyPerMonth} USD when you want it working your whole customer list.`}
        </p>
        <Button
          size="lg"
          className="mt-8 h-12 px-8 bg-primary text-primary-foreground hover:bg-primary-deep"
          asChild
        >
          <Link to="/signup" onClick={() => track("cta_clicked", { cta: TOOLKIT_CTAS.hubSignup })}>
            Build my referral page free
          </Link>
        </Button>
      </div>
    </section>
  </>
);

export default ToolkitHub;
