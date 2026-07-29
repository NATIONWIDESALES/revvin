import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Send, Users, AlertCircle } from "lucide-react";
import { SEGMENTS, inSegment, segmentByKey, segmentCounts, type RecencyContact } from "@/lib/campaignSegments";

// Reactivation campaigns.
//
// Compliance: email only. Revvin never sends SMS to an imported customer list,
// because referral and marketing texts need prior express written consent under
// the TCPA. This tab is rendered behind AttestationGate, and the attestation is
// what sets campaigns.consent_confirmed. The worker refuses to send without it.
// Every email carries an unsubscribe link and every recipient is checked against
// the suppression lists immediately before the send.

const DAILY_CAP = 500;
const BATCH_SIZE = 40;

interface Contact extends RecencyContact {
  id: string;
  name: string;
  email: string | null;
}

interface TemplateRow {
  id: string;
  name: string;
  subject: string | null;
  body: string;
  is_system: boolean;
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

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  scheduled: "Scheduled",
  sending: "Sending",
  sent: "Finished",
  failed: "Stopped",
  cancelled: "Cancelled",
};

const CampaignsTab = ({ biz, publicUrl }: Props) => {
  const { toast } = useToast();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [attributed, setAttributed] = useState<Record<string, { leads: number; won: number; revenue: number }>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    segment_key: "12_24",
    subject: "",
    body: "",
    scheduled_at: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: c }, { data: t }, { data: camp }] = await Promise.all([
      supabase
        .from("referral_contacts")
        .select("id, name, email, last_job_at, created_at")
        .eq("business_id", biz.id)
        .limit(5000),
      supabase
        .from("campaign_templates")
        .select("id, name, subject, body, is_system")
        .or(`is_system.eq.true,business_id.eq.${biz.id}`)
        .order("is_system", { ascending: false }),
      supabase
        .from("campaigns")
        .select(
          "id, name, subject, body, status, segment_key, segment_label, scheduled_at, started_at, total_recipients, sent_count, failed_count, opted_out_count, created_at",
        )
        .eq("business_id", biz.id)
        .order("created_at", { ascending: false })
        .limit(25),
    ]);
    setContacts((c as Contact[]) ?? []);
    setTemplates((t as TemplateRow[]) ?? []);
    setCampaigns((camp as CampaignRow[]) ?? []);
    setLoading(false);
  }, [biz.id]);

  useEffect(() => { load(); }, [load]);

  // Attribution we can actually observe: referrals submitted by someone who was
  // on the campaign's recipient list, after the campaign started sending.
  useEffect(() => {
    const run = async () => {
      const live = campaigns.filter((c) => c.started_at);
      if (live.length === 0) return;
      const { data: sends } = await supabase
        .from("campaign_sends")
        .select("campaign_id, recipient_email, status")
        .in("campaign_id", live.map((c) => c.id))
        .eq("status", "sent");
      const { data: leads } = await supabase
        .from("leads")
        .select("referrer_email, created_at, status, deal_value")
        .eq("business_id", biz.id)
        .limit(2000);

      const out: Record<string, { leads: number; won: number; revenue: number }> = {};
      for (const c of live) {
        const recipients = new Set(
          (sends ?? [])
            .filter((s) => s.campaign_id === c.id)
            .map((s) => String(s.recipient_email || "").toLowerCase()),
        );
        const matched = (leads ?? []).filter(
          (l) =>
            recipients.has(String(l.referrer_email || "").toLowerCase()) &&
            new Date(l.created_at) >= new Date(c.started_at as string),
        );
        out[c.id] = {
          leads: matched.length,
          won: matched.filter((l) => l.status === "closed_won").length,
          revenue: matched
            .filter((l) => l.status === "closed_won")
            .reduce((sum, l) => sum + Number(l.deal_value ?? 0), 0),
        };
      }
      setAttributed(out);
    };
    run();
  }, [campaigns, biz.id]);

  const emailable = useMemo(() => contacts.filter((c) => (c.email || "").trim()), [contacts]);
  const counts = useMemo(() => segmentCounts(emailable), [emailable]);
  const usingRealDates = useMemo(() => emailable.some((c) => c.last_job_at), [emailable]);

  const selectedSegment = segmentByKey(form.segment_key);
  const recipientCount = selectedSegment
    ? emailable.filter((c) => inSegment(c, selectedSegment)).length
    : 0;

  const applyTemplate = (id: string) => {
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    setForm((f) => ({ ...f, subject: t.subject ?? "", body: t.body, name: f.name || t.name }));
  };

  const tokens: Record<string, string> = {
    first_name: "Alex",
    business_name: biz.name,
    referral_link: publicUrl,
    offer: biz.offer_amount ?? "",
  };
  const render = (s: string) =>
    s.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (_m, k: string) => tokens[k.toLowerCase()] ?? "");

  const submit = async (mode: "now" | "schedule") => {
    if (!form.name.trim()) {
      toast({ title: "Name your campaign", variant: "destructive" });
      return;
    }
    if (!form.subject.trim() || !form.body.trim()) {
      toast({ title: "Add a subject and body", variant: "destructive" });
      return;
    }
    if (recipientCount === 0) {
      toast({ title: "No one in this segment", description: "Pick a different segment or add customers with email addresses first.", variant: "destructive" });
      return;
    }
    if (mode === "schedule" && !form.scheduled_at) {
      toast({ title: "Pick a date and time", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("campaigns").insert({
      business_id: biz.id,
      name: form.name.trim(),
      channel: "email",
      subject: form.subject.trim(),
      body: form.body,
      status: "scheduled",
      segment_key: form.segment_key,
      segment_label: selectedSegment?.label ?? null,
      scheduled_at: mode === "schedule" ? new Date(form.scheduled_at).toISOString() : new Date().toISOString(),
      // Set from the attestation this tab is gated behind.
      consent_confirmed: true,
      created_by: (await supabase.auth.getUser()).data.user?.id,
    });
    setSaving(false);
    if (error) {
      toast({ title: "Could not create campaign", description: error.message, variant: "destructive" });
      return;
    }
    toast({
      title: mode === "now" ? "Campaign queued" : "Campaign scheduled",
      description: `${recipientCount} recipients. We send in batches of ${BATCH_SIZE}, up to ${DAILY_CAP} a day.`,
    });
    setForm({ name: "", segment_key: form.segment_key, subject: "", body: "", scheduled_at: "" });
    load();
  };

  const cancel = async (id: string) => {
    const { error } = await supabase
      .from("campaigns")
      .update({ status: "cancelled" })
      .eq("id", id)
      .in("status", ["draft", "scheduled"]);
    if (error) {
      toast({ title: "Could not cancel", description: error.message, variant: "destructive" });
      return;
    }
    load();
  };

  if (loading) {
    return <div className="p-10 text-center text-sm text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="space-y-6">
      {/* Segments */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
        <h2 className="text-base font-semibold text-foreground">Who has gone quiet</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Your customer list grouped by how long it has been since their last job.{" "}
          {usingRealDates
            ? "Based on the last job date you have recorded, falling back to the date you added the contact where there is none."
            : "You have not recorded a last job date for anyone yet, so these buckets use the date each contact was added to your list."}
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {SEGMENTS.filter((s) => s.key !== "all").map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setForm((f) => ({ ...f, segment_key: s.key }))}
              className={`rounded-xl border p-4 text-left transition ${
                form.segment_key === s.key ? "border-primary bg-primary/5" : "border-border bg-background hover:border-primary/40"
              }`}
            >
              <div className="text-2xl font-semibold text-foreground">{counts[s.key] ?? 0}</div>
              <div className="text-sm font-medium text-foreground">{s.label}</div>
              <div className="text-xs text-muted-foreground">{s.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Composer */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
        <h2 className="text-base font-semibold text-foreground">New campaign</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Email only. Texts to a customer list need written consent, so Revvin never sends them for you.
        </p>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="cp-name" className="text-xs">Campaign name</Label>
            <Input id="cp-name" className="mt-1.5" value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <Label className="text-xs">Segment</Label>
            <Select value={form.segment_key} onValueChange={(v) => setForm((f) => ({ ...f, segment_key: v }))}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                {SEGMENTS.map((s) => (
                  <SelectItem key={s.key} value={s.key}>{s.label} ({counts[s.key] ?? 0})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2">
            <Label className="text-xs">Start from a template</Label>
            <Select onValueChange={applyTemplate}>
              <SelectTrigger className="mt-1.5"><SelectValue placeholder="Choose a template" /></SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}{t.is_system ? "" : " (yours)"}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="cp-subject" className="text-xs">Subject</Label>
            <Input id="cp-subject" className="mt-1.5" value={form.subject}
              onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="cp-body" className="text-xs">Message</Label>
            <Textarea id="cp-body" rows={12} className="mt-1.5 font-mono text-xs" value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} />
            <p className="mt-1.5 text-xs text-muted-foreground">
              Merge tokens: <code>{"{{first_name}}"}</code>, <code>{"{{business_name}}"}</code>,{" "}
              <code>{"{{referral_link}}"}</code>, <code>{"{{offer}}"}</code>. Anything in square brackets is a
              placeholder for you to replace.
            </p>
          </div>
        </div>

        {form.body.trim() && (
          <div className="mt-5 rounded-xl border border-border bg-muted/20 p-5">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Preview</div>
            <div className="mt-3 text-sm font-semibold text-foreground">{render(form.subject) || "(no subject)"}</div>
            <div className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{render(form.body)}</div>
            <div className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
              An unsubscribe link is added to every email automatically.
            </div>
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button onClick={() => submit("now")} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Send className="mr-2 h-3.5 w-3.5" />}
            Send to {recipientCount}
          </Button>
          <div className="flex items-center gap-2">
            <Input type="datetime-local" className="w-auto" value={form.scheduled_at}
              onChange={(e) => setForm((f) => ({ ...f, scheduled_at: e.target.value }))} />
            <Button variant="outline" onClick={() => submit("schedule")} disabled={saving}>Schedule</Button>
          </div>
        </div>
        <p className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
          <Users className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          We send in batches of {BATCH_SIZE} and stop at {DAILY_CAP} campaign emails a day so your sending
          reputation stays intact. Anyone who has unsubscribed or bounced is skipped.
        </p>
      </div>

      {/* Results */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="border-b border-border px-5 py-3 text-sm font-medium text-foreground">Campaigns</div>
        {campaigns.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No campaigns yet. Pick a segment above and write your first one.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {campaigns.map((c) => {
              const a = attributed[c.id];
              return (
                <div key={c.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-medium text-foreground">{c.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {c.segment_label ?? "All contacts"} · {new Date(c.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                        {STATUS_LABEL[c.status] ?? c.status}
                      </span>
                      {["draft", "scheduled"].includes(c.status) && (
                        <Button variant="ghost" size="sm" onClick={() => cancel(c.id)}>Cancel</Button>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-6">
                    <Stat label="Recipients" value={c.total_recipients} />
                    <Stat label="Sent" value={c.sent_count} />
                    <Stat label="Failed" value={c.failed_count} />
                    <Stat label="Opted out" value={c.opted_out_count} />
                    <Stat label="Leads" value={a?.leads ?? 0} />
                    <Stat label="Closed" value={a?.won ?? 0} />
                  </div>
                  {a && a.revenue > 0 && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      ${a.revenue.toLocaleString()} in closed deal value from people on this list since it went out.
                    </p>
                  )}
                  {c.status === "failed" && (
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-destructive">
                      <AlertCircle className="h-3.5 w-3.5" />
                      Stopped before sending. Check that your page is live and you have confirmed the customer
                      relationship.
                    </p>
                  )}
                </div>
              );
            })}
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
