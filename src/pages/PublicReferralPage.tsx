import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import SEOHead from "@/components/SEOHead";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Loader2 } from "lucide-react";

interface Business {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string | null;
  service_area: string | null;
  logo_url: string | null;
  offer_amount: string | null;
  offer_trigger: string | null;
  offer_fine_print: string | null;
}

const PublicReferralPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { toast } = useToast();
  const [biz, setBiz] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [form, setForm] = useState({
    referrer_name: "",
    referrer_email: "",
    referrer_phone: "",
    lead_name: "",
    lead_phone: "",
    lead_email: "",
    lead_need: "",
    relationship_to_lead: "",
    consent_given: false,
    // honeypot
    website: "",
  });

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const { data } = await supabase
        .from("businesses_public" as any)
        .select("id,name,slug,description,category,service_area,logo_url,offer_amount,offer_trigger,offer_fine_print")
        .eq("slug", slug)
        .limit(1);
      setBiz(((data?.[0] as unknown) as Business) ?? null);
      setLoading(false);
    })();
  }, [slug]);

  const update = (k: keyof typeof form, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!biz) return;
    if (form.website) return; // honeypot
    if (!form.consent_given) {
      toast({ title: "Consent required", description: "Please confirm you have permission to share this lead's info.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { data: inserted, error } = await supabase
      .from("leads")
      .insert({
        business_id: biz.id,
        referrer_name: form.referrer_name.trim(),
        referrer_email: form.referrer_email.trim(),
        referrer_phone: form.referrer_phone.trim() || null,
        lead_name: form.lead_name.trim(),
        lead_phone: form.lead_phone.trim(),
        lead_email: form.lead_email.trim() || null,
        lead_need: form.lead_need.trim(),
        relationship_to_lead: form.relationship_to_lead.trim() || null,
        consent_given: true,
        lead_source: "public_page",
        status: "new",
      })
      .select("id")
      .limit(1);
    setSubmitting(false);
    if (error) {
      toast({ title: "Could not submit", description: error.message, variant: "destructive" });
      return;
    }
    const newLeadId = inserted?.[0]?.id;
    if (newLeadId) {
      // Fire-and-forget email notification to business owner
      supabase.functions
        .invoke("notify-new-lead", { body: { lead_id: newLeadId } })
        .catch((err) => console.warn("[notify-new-lead] failed", err));
    }
    setSubmitted(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (!biz) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-center">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Page not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">This referral page is not available.</p>
        </div>
      </div>
    );
  }

  const initial = biz.name.charAt(0).toUpperCase();

  return (
    <>
      <SEOHead
        title={`Refer a customer to ${biz.name}${biz.offer_amount ? ` — earn ${biz.offer_amount}` : ""}`}
        description={`${biz.name} pays for warm referrals.${biz.offer_amount ? ` Earn ${biz.offer_amount}${biz.offer_trigger ? " " + biz.offer_trigger : ""}.` : ""}`}
        path={`/r/${biz.slug}`}
      />
      <div className="min-h-screen bg-muted/30 py-8 px-4">
        <div className="mx-auto max-w-md rounded-3xl border border-border bg-background p-6 md:p-8 shadow-sm">
          {/* Header */}
          <div className="flex items-center gap-4">
            {biz.logo_url ? (
              <img src={biz.logo_url} alt={`${biz.name} logo`} className="h-14 w-14 rounded-xl object-cover border border-border" />
            ) : (
              <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-semibold text-xl">{initial}</div>
            )}
            <div>
              <h1 className="text-xl font-semibold text-foreground leading-tight">{biz.name}</h1>
              {biz.description && <p className="text-sm text-muted-foreground">{biz.description}</p>}
            </div>
          </div>
          {(biz.service_area || biz.category) && (
            <p className="mt-3 text-xs text-muted-foreground">
              {[biz.category, biz.service_area].filter(Boolean).join(" · ")}
            </p>
          )}

          {/* Offer */}
          {biz.offer_amount && (
            <div className="mt-6 rounded-xl bg-primary/5 border border-primary/20 p-5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-primary mb-1">Referral offer</p>
              <p className="text-2xl font-semibold text-foreground leading-tight">Refer a customer, earn {biz.offer_amount}</p>
              {biz.offer_trigger && <p className="text-sm text-muted-foreground mt-1">{biz.offer_trigger}</p>}
              {biz.offer_fine_print && <p className="text-[11px] text-muted-foreground mt-2 italic">{biz.offer_fine_print}</p>}
            </div>
          )}

          {/* How it works */}
          <div className="mt-6 space-y-2 text-sm text-foreground">
            <p>1. Submit the referral below.</p>
            <p>2. {biz.name} contacts the lead.</p>
            <p>3. When the deal closes, {biz.name} pays you directly.</p>
          </div>

          {submitted ? (
            <div className="mt-8 rounded-2xl border border-primary/30 bg-primary/5 p-6 text-center">
              <CheckCircle2 className="h-10 w-10 mx-auto text-primary mb-3" />
              <h2 className="text-lg font-semibold text-foreground">Referral submitted</h2>
              <p className="text-sm text-muted-foreground mt-1">{biz.name} will be in touch with your lead soon. You'll hear from them directly when the deal closes.</p>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-8 space-y-4">
              <input type="text" name="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => update("website", e.target.value)} className="hidden" />

              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">About you</div>
              <div><Label>Your name</Label><Input required value={form.referrer_name} onChange={(e) => update("referrer_name", e.target.value)} className="mt-1.5" /></div>
              <div><Label>Your email</Label><Input required type="email" value={form.referrer_email} onChange={(e) => update("referrer_email", e.target.value)} className="mt-1.5" /></div>
              <div><Label>Your phone <span className="text-muted-foreground text-xs">(optional)</span></Label><Input type="tel" value={form.referrer_phone} onChange={(e) => update("referrer_phone", e.target.value)} className="mt-1.5" /></div>

              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pt-2">The lead</div>
              <div><Label>Lead's name</Label><Input required value={form.lead_name} onChange={(e) => update("lead_name", e.target.value)} className="mt-1.5" /></div>
              <div><Label>Lead's phone</Label><Input required type="tel" value={form.lead_phone} onChange={(e) => update("lead_phone", e.target.value)} className="mt-1.5" /></div>
              <div><Label>Lead's email <span className="text-muted-foreground text-xs">(optional)</span></Label><Input type="email" value={form.lead_email} onChange={(e) => update("lead_email", e.target.value)} className="mt-1.5" /></div>
              <div><Label>What do they need?</Label><Textarea required value={form.lead_need} onChange={(e) => update("lead_need", e.target.value)} className="mt-1.5" rows={3} /></div>
              <div><Label>How do you know them? <span className="text-muted-foreground text-xs">(optional)</span></Label><Input value={form.relationship_to_lead} onChange={(e) => update("relationship_to_lead", e.target.value)} className="mt-1.5" /></div>

              <label className="flex items-start gap-3 pt-2 text-sm text-foreground cursor-pointer">
                <Checkbox checked={form.consent_given} onCheckedChange={(v) => update("consent_given", !!v)} className="mt-0.5" />
                <span>I confirm I have permission to share this lead's contact information.</span>
              </label>

              <Button type="submit" size="lg" className="w-full h-12" disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit referral"}
              </Button>
            </form>
          )}

          <div className="mt-8 text-center">
            <Link to="/" className="text-[10px] text-muted-foreground hover:text-foreground">Powered by REVVIN.CO</Link>
          </div>
        </div>
      </div>
    </>
  );
};

export default PublicReferralPage;