import { useState } from "react";
import { Link } from "react-router-dom";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { friendlyError } from "@/lib/errors";
import {
  AUDIENCE_SIZES,
  PARTNER_AUDIENCE,
  PARTNER_COPY,
  PARTNER_EARNINGS,
  PARTNER_EARNINGS_NOTE,
  PARTNER_FAQS,
  PARTNER_HOW_IT_WORKS,
  PARTNER_WHAT_YOU_SHARE,
} from "@/config/partners";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";

const BASE = "https://revvin.co";

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${BASE}/partners#faq`,
    mainEntity: PARTNER_FAQS.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  },
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Revvin", item: `${BASE}/` },
      { "@type": "ListItem", position: 2, name: "Partner Program", item: `${BASE}/partners` },
    ],
  },
];

const Partners = () => {
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    country: "",
    channels: "",
    audience_size: "",
    promo_plan: "",
    payout_method: "paypal",
    website_url: "",
    agreed: false,
  });

  const [lostEmail, setLostEmail] = useState("");
  const [lostBusy, setLostBusy] = useState(false);
  const [lostSent, setLostSent] = useState("");

  const set = (key: keyof typeof form, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const apply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.agreed) {
      toast({ title: "One more thing", description: "Please agree to the Partner Terms.", variant: "destructive" });
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("partner-apply", {
      body: {
        name: form.name,
        email: form.email,
        country: form.country,
        channels: form.channels,
        audience_size: form.audience_size,
        promo_plan: form.promo_plan,
        payout_method: form.payout_method,
        website_url: form.website_url,
        agreed_to_terms: form.agreed,
      },
    });
    setBusy(false);
    if (error || (data && data.error)) {
      toast({
        title: "Could not send your application",
        description: data?.error || friendlyError(error),
        variant: "destructive",
      });
      return;
    }
    setSubmitted(true);
  };

  const resendLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLostBusy(true);
    const { data } = await supabase.functions.invoke("partner-resend-link", {
      body: { email: lostEmail },
    });
    setLostBusy(false);
    setLostSent(
      data?.message ||
        "If that email belongs to an approved partner, the dashboard link is on its way.",
    );
  };

  return (
    <>
      <SEOHead
        title="Revvin Partner Program | Earn 40% on every business you refer"
        description="Share Revvin with contractors and home-service owners. Approved partners earn 40% of what their referred customers pay, for as long as they stay."
        path="/partners"
        jsonLd={jsonLd}
      />

      {/* Hero */}
      <section className="border-b border-border bg-background">
        <div className="container py-20 sm:py-24">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            {PARTNER_COPY.eyebrow}
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            {PARTNER_COPY.headline}
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            {PARTNER_COPY.subhead}
          </p>
          <div className="mt-8">
            <Button size="lg" asChild>
              <a href="#apply">
                {PARTNER_COPY.applyButton}
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* What you earn */}
      <section className="border-b border-border">
        <div className="container py-16">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">What you earn</h2>
          <div className="mt-6 overflow-hidden rounded-xl border border-border">
            <table className="w-full text-left text-sm">
              <tbody>
                {PARTNER_EARNINGS.map((row, i) => (
                  <tr key={row.product} className={i > 0 ? "border-t border-border" : undefined}>
                    <th scope="row" className="px-5 py-4 font-medium text-foreground">
                      {row.product}
                    </th>
                    <td className="px-5 py-4 font-semibold text-primary">{row.earn}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">{PARTNER_EARNINGS_NOTE}</p>
        </div>
      </section>

      {/* How it works */}
      <section className="border-b border-border bg-muted/30">
        <div className="container py-16">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">How it works</h2>
          <ol className="mt-8 grid gap-6 md:grid-cols-3">
            {PARTNER_HOW_IT_WORKS.map((step, i) => (
              <li key={step.title} className="rounded-xl border border-border bg-card p-6">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                  Step {i + 1}
                </span>
                <h3 className="mt-3 text-lg font-semibold text-foreground">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Who it's for and what you share */}
      <section className="border-b border-border">
        <div className="container grid gap-12 py-16 md:grid-cols-2">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">Who it's for</h2>
            <ul className="mt-6 space-y-3">
              {PARTNER_AUDIENCE.map((who) => (
                <li key={who} className="flex gap-3 text-sm leading-relaxed text-muted-foreground">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  {who}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              What you're sharing
            </h2>
            <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
              {PARTNER_WHAT_YOU_SHARE}
            </p>
            <p className="mt-6 text-sm">
              <Link to="/partners/terms" className="font-medium text-primary hover:underline">
                Read the Partner Terms
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* Application form */}
      <section id="apply" className="border-b border-border bg-muted/30">
        <div className="container py-16">
          <div className="mx-auto max-w-xl rounded-2xl border border-border bg-card p-6 sm:p-8">
            {submitted ? (
              <div className="text-center">
                <CheckCircle2 className="mx-auto h-10 w-10 text-primary" />
                <h2 className="mt-4 text-2xl font-semibold tracking-tight text-foreground">
                  Application sent
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {PARTNER_COPY.applySuccess}
                </p>
              </div>
            ) : (
              <form onSubmit={apply} className="space-y-5">
                <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                  Apply to become a partner
                </h2>

                <div className="space-y-2">
                  <Label htmlFor="p-name">Full name</Label>
                  <Input id="p-name" required value={form.name} onChange={(e) => set("name", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="p-email">Email</Label>
                  <Input id="p-email" type="email" required value={form.email} onChange={(e) => set("email", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="p-country">Country</Label>
                  <Input id="p-country" required value={form.country} onChange={(e) => set("country", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="p-channels">Where you'll share Revvin</Label>
                  <Textarea
                    id="p-channels"
                    required
                    rows={3}
                    placeholder="Links to your channels or website"
                    value={form.channels}
                    onChange={(e) => set("channels", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="p-audience">Approximate audience size</Label>
                  <Select value={form.audience_size} onValueChange={(v) => set("audience_size", v)}>
                    <SelectTrigger id="p-audience">
                      <SelectValue placeholder="Choose a range" />
                    </SelectTrigger>
                    <SelectContent>
                      {AUDIENCE_SIZES.map((size) => (
                        <SelectItem key={size} value={size}>
                          {size}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="p-plan">How you plan to promote Revvin</Label>
                  <Textarea
                    id="p-plan"
                    rows={3}
                    value={form.promo_plan}
                    onChange={(e) => set("promo_plan", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="p-payout">Payout preference</Label>
                  <Select value={form.payout_method} onValueChange={(v) => set("payout_method", v)}>
                    <SelectTrigger id="p-payout">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="paypal">PayPal</SelectItem>
                      <SelectItem value="bank">Bank transfer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Honeypot: hidden from people, filled by bots. */}
                <div className="hidden" aria-hidden="true">
                  <label htmlFor="p-website">Website</label>
                  <input
                    id="p-website"
                    tabIndex={-1}
                    autoComplete="off"
                    value={form.website_url}
                    onChange={(e) => set("website_url", e.target.value)}
                  />
                </div>

                <div className="flex items-start gap-3">
                  <Checkbox
                    id="p-terms"
                    checked={form.agreed}
                    onCheckedChange={(v) => set("agreed", v === true)}
                  />
                  <Label htmlFor="p-terms" className="text-sm font-normal leading-relaxed">
                    I agree to the{" "}
                    <Link to="/partners/terms" className="font-medium text-primary hover:underline">
                      Partner Terms
                    </Link>
                    .
                  </Label>
                </div>

                <Button type="submit" size="lg" className="w-full" disabled={busy}>
                  {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {PARTNER_COPY.finalButton}
                </Button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-b border-border">
        <div className="container py-16">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            Partner questions
          </h2>
          <div className="mt-8 grid gap-8 md:grid-cols-2">
            {PARTNER_FAQS.map((faq) => (
              <div key={faq.q}>
                <h3 className="text-base font-semibold text-foreground">{faq.q}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Lost your dashboard link */}
      <section>
        <div className="container py-16">
          <div className="mx-auto max-w-md rounded-2xl border border-border bg-card p-6">
            <h2 className="text-lg font-semibold text-foreground">Lost your dashboard link?</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Enter the email you applied with and we will send it again.
            </p>
            {lostSent ? (
              <p className="mt-4 text-sm text-foreground">{lostSent}</p>
            ) : (
              <form onSubmit={resendLink} className="mt-4 flex flex-col gap-3 sm:flex-row">
                <Input
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={lostEmail}
                  onChange={(e) => setLostEmail(e.target.value)}
                />
                <Button type="submit" variant="outline" disabled={lostBusy}>
                  {lostBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send my link"}
                </Button>
              </form>
            )}
          </div>
        </div>
      </section>
    </>
  );
};

export default Partners;
