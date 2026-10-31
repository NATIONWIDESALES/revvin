import { useParams } from "react-router-dom";
import { INDUSTRIES } from "@/content/industries";
import { START_FAQS, startHeadline } from "@/content/startPages";
import { SETUP_CALL_URL } from "@/config/setupCall";
import SEOHead from "@/components/SEOHead";
import InstantPreview from "@/components/marketing/InstantPreview";
import { Button } from "@/components/ui/button";
import NotFound from "./NotFound";

export default function Start() {
  const { trade } = useParams();
  if (trade && !INDUSTRIES.some(i => i.slug === trade)) return <NotFound />;
  const headline = startHeadline(trade);
  return <div className="min-h-screen bg-background">
    <SEOHead title={`Free ${trade ? INDUSTRIES.find(i => i.slug === trade)?.label : "home service"} referral page | Revvin`} description="Set your reward, create your free account and publish your referral page. Every new account gets Pro free for 14 days. No card required." path={trade ? `/start/${trade}` : "/start"} noindex follow jsonLd={{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: START_FAQS.map(f => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) }} />
    <header className="mk-wrap py-6"><a href="/" className="font-display text-3xl font-extrabold text-forest" aria-label="Revvin home">REVVIN.CO</a></header>
    <main>
      <section className="mk-wrap grid items-center gap-10 py-10 lg:grid-cols-2">
        <div><h1 className="font-display text-5xl leading-none text-forest sm:text-6xl">{headline}</h1><div id="start-preview"><InstantPreview lockedTrade={trade} showSign /></div>
        {SETUP_CALL_URL && <a href={SETUP_CALL_URL} className="mt-4 inline-block text-sm font-semibold text-forest underline">Book a free 30-minute setup call</a>}</div>
        <div className="space-y-8">{["Set your reward", "Customers refer", "Pay only when the job closes"].map((s, i) => <div key={s}><p className="font-display text-4xl text-forest">{i + 1}</p><h2 className="text-3xl">{s}</h2></div>)}</div>
      </section>
      <section className="mk-wrap border-y border-line py-8"><h2 className="text-3xl">Free and Pro</h2><p className="mt-3">Free: referral page, personal links, QR code, lead inbox, reward tracking and asks for your first 100 customers.</p><p className="mt-2">Pro: unlimited customers, reactivation email campaigns, ROI reporting and custom branding. $49/month or $450/year after your trial.</p></section>
      <section className="mk-wrap py-12"><h2 className="text-4xl">Questions before you start</h2><div className="mt-6 space-y-6">{START_FAQS.map(f => <div key={f.q}><h3 className="text-2xl">{f.q}</h3><p className="mt-2 text-muted-foreground">{f.a}</p></div>)}</div></section>
      <section className="mk-wrap pb-16"><Button size="lg" onClick={() => { document.getElementById("start-preview")?.scrollIntoView({ behavior: "auto", block: "center" }); document.querySelector<HTMLInputElement>("#start-preview input")?.focus(); }}>Make it live, free</Button></section>
    </main>
  </div>;
}