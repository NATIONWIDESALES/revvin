import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Send, Users, AlertCircle, CheckCircle2 } from "lucide-react";
import { inSegment, segmentByKey, type RecencyContact } from "@/lib/campaignSegments";
import { friendlyError } from "@/lib/errors";

const SEGMENT_ORDER = ["m24_plus", "m12_24", "m6_12", "recent", "unknown"];
const MAX_CAMPAIGN_RECIPIENTS = 500;

interface Contact extends RecencyContact {
  id: string;
  name: string;
  email: string | null;
}

interface SegmentRow {
  segment_key: string;
  segment_label: string;
  contacts: number;
}

interface Readiness {
  ready: boolean;
  missing: string[];
  business_id: string;
}

interface CampaignRow {
  id: string;
  name: string;
  subject: string | null;
  body: string;
  status: string;
  segment_key: string | null;
  segment_label: string | null;
  scheduled_at: string | null;
  started_at: string | null;
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  opted_out_count: number;
  created_at: string;
}

interface Props {
  biz: { id: string; name: string; offer_amount: string | null };
  publicUrl: string;
}

const STARTER_TEMPLATES = [
  {
    id: "seasonal",
    label: "Seasonal check-in",
    name: "Seasonal check-in",
    subject: "A quick seasonal check-in from {business_name}",
    body: "Hi {first_name},\n\nI hope you are doing well. I am checking in with a few customers before the season gets busy. If there is anything around your home or property you would like me to look at, reply to this email and I will be happy to help.\n\nBest,\n{business_name}",
  },
  {
    id: "been-a-while",
    label: "It has been a while",
    name: "It has been a while",
    subject: "It has been a while, {first_name}",
    body: "Hi {first_name},\n\nIt has been a while since I worked with you, so I wanted to check in. If something needs attention or you have been putting off a project, reply here and I can take a look.\n\nBest,\n{business_name}",
  },
  {
    id: "specific-service",
    label: "Specific service reminder",
    name: "Specific service reminder",
    subject: "A reminder about your next service",
    body: "Hi {first_name},\n\nI am reaching out because this is a good time to think about your next service. If you would like help with a tune-up, inspection, or another {business_name} service, reply to this email and I will get back to you.\n\nBest,\n{business_name}",
  },
];

const missingLabels: Record<string, string> = {
  street_address: "Street address",
  city: "City",
  postal_code: "Postal code",
  country: "Country",
  business_email: "Reply-to email",
};

const emptyReadinessForm = {
  street_address: "",
  city: "",
  postal_code: "",
  country: "",
  business_email: "",
};

const CampaignsTab = ({ biz, publicUrl }: Props) => {
  const { toast } = useToast();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [segments, setSegments] = useState<SegmentRow[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [readiness, setReadiness] = useState<Readiness | null>(null);
  const [readinessForm, setReadinessForm] = useState(emptyReadinessForm);
  const [loading, setLoading] = useState(true);
  const [savingReadiness, setSavingReadiness] = useState(false);
  const [sending, setSending] = useState(false);
  const [consent, setConsent] = useState(false);
  const [form, setForm] = useState({
    name: "",
    segment_key: "m24_plus",
    subject: "",
    body: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: readyRows, error: readyError }, { data: segmentRows }, { data: contactRows }, { data: campaignRows }] = await Promise.all([
      supabase.rpc("fn_campaign_readiness"),
      supabase.rpc("fn_contact_segments"),
      supabase
        .from("referral_contacts")
        .select("id, name, email, last_job_at, created_at")
        .eq("business_id", biz.id)
        .limit(5000),
      supabase
        .from("campaigns")
        .select("id, name, subject, body, status, segment_key, segment_label, scheduled_at, started_at, total_recipients, sent_count, failed_count, opted_out_count, created_at")
        .eq("business_id", biz.id)
        .order("created_at", { ascending: false })
        .limit(25),
    ]);

    if (readyError) {
      toast({ title: "Could not check campaign readiness", description: friendlyError(readyError), variant: "destructive" });
    }
    const ready = (readyRows?.[0] as Readiness | undefined) ?? null;
    setReadiness(ready);
    setSegments(((segmentRows ?? []) as SegmentRow[]).sort((a, b) => SEGMENT_ORDER.indexOf(a.segment_key) - SEGMENT_ORDER.indexOf(b.segment_key)));
    setContacts((contactRows ?? []) as Contact[]);
    setCampaigns((campaignRows ?? []) as CampaignRow[]);
    setLoading(false);
  }, [biz.id, toast]);

  useEffect(() => { void load(); }, [load]);

  const segmentCounts = useMemo(() => Object.fromEntries(segments.map((s) => [s.segment_key, s.contacts])), [segments]);
  const selectedSegment = segmentByKey(form.segment_key);
  const previewContact = useMemo(() => {
    if (!selectedSegment) return null;
    return contacts.find((c) => !!c.email && inSegment(c, selectedSegment)) ?? null;
  }, [contacts, selectedSegment]);
  const recipientCount = segmentCounts[form.segment_key] ?? 0;

  const renderTokens = (value: string, contact: Contact | null) => {
    const firstName = contact?.name.trim().split(/\s+/)[0] || "there";
    return value.replace(/\{\{?\s*(first_name|business_name)\s*\}\}?/gi, (_match, key: string) =>
      key.toLowerCase() === "first_name" ? firstName : biz.name,
    );
  };

  const applyTemplate = (template: typeof STARTER_TEMPLATES[number]) => {
    setForm((current) => ({
      ...current,
      name: template.name,
      subject: template.subject,
      body: template.body,
    }));
  };

  const saveReadiness = async () => {
    if (!readiness) return;
    const missing = readiness.missing;
    const incomplete = missing.find((field) => !readinessForm[field as keyof typeof readinessForm].trim());
    if (incomplete) {
      toast({ title: `${missingLabels[incomplete] ?? incomplete} is required`, description: "Every campaign email includes your business address and a reply-to email.", variant: "destructive" });
      return;
    }
    setSavingReadiness(true);
    const { error } = await supabase
      .from("businesses")
      .update(Object.fromEntries(missing.map((field) => [field, readinessForm[field as keyof typeof readinessForm].trim()])))
      .eq("id", biz.id);
    setSavingReadiness(false);
    if (error) {
      toast({ title: "Could not save business details", description: friendlyError(error), variant: "destructive" });
      return;
    }
    toast({ title: "Business details saved" });
    await load();
  };

  const sendCampaign = async () => {
    if (!readiness?.ready) return;
    if (!form.name.trim() || !form.subject.trim() || !form.body.trim()) {
      toast({ title: "Complete the campaign", description: "Add a name, subject, and message.", variant: "destructive" });
      return;
    }
    if (!consent) {
      toast({ title: "Confirm your customer relationship", description: "You must confirm these are your own past customers before sending.", variant: "destructive" });
      return;
    }
    if (recipientCount === 0) {
      toast({ title: "No customers in this segment", description: "Choose another segment or add customers with email addresses.", variant: "destructive" });
      return;
    }
    setSending(true);
    const { data, error } = await supabase.functions.invoke("send-campaign", {
      body: {
        name: form.name.trim(),
        segment_key: form.segment_key,
        subject: form.subject.trim(),
        body: form.body,
        consent_confirmed: true,
      },
    });
    setSending(false);
    if (error) {
      toast({ title: "Could not queue campaign", description: friendlyError(error), variant: "destructive" });
      return;
    }
    const queued = Number(data?.queued ?? 0);
    const skipped = Number(data?.skipped ?? 0);
    toast({
      title: "Campaign queued",
      description: `${queued} email${queued === 1 ? "" : "s"} queued${skipped ? `, ${skipped} skipped` : ""}. Campaign email is sent by Revvin from your business name.`,
    });
    setConsent(false);
    setForm((current) => ({ ...current, name: "", subject: "", body: "" }));
    await load();
  };

  if (loading) {
    return <div className="p-10 text-center text-sm text-muted-foreground"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></div>;
  }

  const readinessFields = readiness?.missing ?? [];

  return (
    <div className="space-y-6">
      {!readiness?.ready ? (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <h2 className="text-base font-semibold text-foreground">Finish your sending details</h2>
              <p className="mt-1 text-sm text-muted-foreground">Anti-spam law requires your business address in every campaign email. Add the missing details below before composing a campaign.</p>
            </div>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {readinessFields.map((field) => (
              <div key={field}>
                <Label htmlFor={`campaign-${field}`} className="text-xs">{missingLabels[field] ?? field}</Label>
                <Input
                  id={`campaign-${field}`}
                  type={field === "business_email" ? "email" : "text"}
                  value={readinessForm[field as keyof typeof readinessForm]}
                  onChange={(e) => setReadinessForm((current) => ({ ...current, [field]: e.target.value }))}
                  className="mt-1.5"
                  autoComplete={field === "business_email" ? "email" : "street-address"}
                />
              </div>
            ))}
          </div>
          <Button className="mt-5" onClick={saveReadiness} disabled={savingReadiness}>
            {savingReadiness ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Save details
          </Button>
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-foreground">Who could use a return visit</h2>
                <p className="mt-1 text-sm text-muted-foreground">Choose a customer group by time since their last job. A missing last job date uses the date they were added to your list.</p>
              </div>
              <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {SEGMENT_ORDER.map((key) => {
                const row = segments.find((segment) => segment.segment_key === key);
                if (!row) return null;
                const selected = form.segment_key === key;
                return (
                  <Button
                    key={key}
                    type="button"
                    variant="outline"
                    onClick={() => setForm((current) => ({ ...current, segment_key: key }))}
                    className={`h-auto min-h-[116px] justify-start whitespace-normal p-4 text-left ${selected ? "border-primary bg-primary/5" : ""}`}
                  >
                    <span>
                      <span className="block text-2xl font-semibold text-foreground">{row.contacts}</span>
                      <span className="mt-1 block text-sm font-medium text-foreground">{row.segment_label}</span>
                      <span className="mt-1 block text-xs font-normal text-muted-foreground">{key === "m24_plus" ? "Biggest opportunity" : key === "unknown" ? "No date recorded" : "Past customers"}</span>
                    </span>
                  </Button>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
            <h2 className="text-base font-semibold text-foreground">New reactivation campaign</h2>
            <p className="mt-1 text-sm text-muted-foreground">Email only. Referral asks still open your own email or messaging app. Reactivation campaigns are sent by Revvin from your business name, with replies going to your reply-to email.</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {STARTER_TEMPLATES.map((template) => (
                <Button key={template.id} type="button" size="sm" variant="outline" onClick={() => applyTemplate(template)}>{template.label}</Button>
              ))}
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="cp-name" className="text-xs">Campaign name</Label>
                <Input id="cp-name" className="mt-1.5" value={form.name} onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))} maxLength={100} />
              </div>
              <div>
                <Label className="text-xs">Customer group</Label>
                <div className="mt-1.5 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-foreground">{segments.find((s) => s.segment_key === form.segment_key)?.segment_label ?? "Choose a segment"} · {recipientCount}</div>
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="cp-subject" className="text-xs">Subject</Label>
                <Input id="cp-subject" className="mt-1.5" value={form.subject} onChange={(e) => setForm((current) => ({ ...current, subject: e.target.value }))} maxLength={200} placeholder="A quick note from {business_name}" />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="cp-body" className="text-xs">Message</Label>
                <Textarea id="cp-body" rows={10} className="mt-1.5 text-sm" value={form.body} onChange={(e) => setForm((current) => ({ ...current, body: e.target.value }))} maxLength={20000} placeholder="Hi {first_name}," />
                <p className="mt-1.5 text-xs text-muted-foreground">Use <code>{"{first_name}"}</code> and <code>{"{business_name}"}</code>. Every email includes your address and an unsubscribe link.</p>
              </div>
            </div>

            {form.body.trim() && (
              <div className="mt-5 rounded-xl border border-border bg-muted/20 p-5">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Preview for {previewContact?.name ?? "a customer"}</div>
                <div className="mt-3 text-sm font-semibold text-foreground">{renderTokens(form.subject, previewContact) || "(no subject)"}</div>
                <div className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{renderTokens(form.body, previewContact)}</div>
                <div className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">Your business address and unsubscribe link will be added automatically.</div>
              </div>
            )}

            <div className="mt-5 flex items-start gap-3 rounded-lg border border-border bg-muted/20 p-4">
              <Checkbox id="campaign-consent" checked={consent} onCheckedChange={(value) => setConsent(value === true)} className="mt-0.5" />
              <Label htmlFor="campaign-consent" className="cursor-pointer text-sm leading-snug text-foreground">These are my own past customers and they gave me their email during business with me.</Label>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button onClick={sendCampaign} disabled={sending || recipientCount === 0}>
                {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Send to {Math.min(recipientCount, MAX_CAMPAIGN_RECIPIENTS)}
              </Button>
              <span className="text-sm text-muted-foreground"><Users className="mr-1 inline h-4 w-4" />Up to {MAX_CAMPAIGN_RECIPIENTS} recipients per campaign{recipientCount > MAX_CAMPAIGN_RECIPIENTS ? ", extra contacts will be skipped" : ""}.</span>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">This sends real email. Revvin checks suppression and opt-out records immediately before queueing each recipient.</p>
          </div>
        </>
      )}

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="border-b border-border px-5 py-3 text-sm font-medium text-foreground">Campaign history</div>
        {campaigns.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Your sent campaigns will appear here.</div>
        ) : (
          <div className="divide-y divide-border">
            {campaigns.map((campaign) => (
              <div key={campaign.id} className="px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-medium text-foreground">{campaign.name}</div>
                    <div className="text-xs text-muted-foreground">{campaign.segment_label ?? "Customer group"} · {new Date(campaign.created_at).toLocaleDateString()}</div>
                  </div>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">{campaign.status}</span>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-5">
                  <Stat label="Recipients" value={campaign.total_recipients} />
                  <Stat label="Sent" value={campaign.sent_count} />
                  <Stat label="Failed" value={campaign.failed_count} />
                  <Stat label="Opted out" value={campaign.opted_out_count} />
                  <Stat label="Segment" value={campaign.segment_key ? 1 : 0} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const Stat = ({ label, value }: { label: string; value: number }) => (
  <div>
    <div className="text-lg font-semibold text-foreground">{value}</div>
    <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
  </div>
);

export default CampaignsTab;
