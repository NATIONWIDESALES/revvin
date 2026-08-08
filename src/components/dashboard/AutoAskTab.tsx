import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CheckCircle2, Clock, XCircle, MessageSquare, Star, ThumbsUp } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { friendlyError } from "@/lib/errors";

// "Job done" auto-ask. The owner logs a finished job, we schedule a single
// personalised referral ask about two hours later.
//
// Compliance: automatic sending is EMAIL ONLY. SMS here is device-native only
// (the owner taps and their own Messages app sends it), because referral texts
// are marketing under the TCPA.
//
// Review requests go to EVERY customer with the same public review link. There
// is no survey in front of it and no routing based on how someone feels: review
// gating breaks Google's policies and is an FTC deception risk. Only the
// referral follow-up may be conditioned on a positive signal, and that signal
// has to be one we actually observed (the customer said so, or you marked it).

const DELAY_HOURS = 2;

interface TriggerRow {
  id: string;
  customer_first_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  service_description: string | null;
  technician_name: string | null;
  amount_paid: number | null;
  status: string;
  scheduled_send_at: string;
  sent_at: string | null;
  failure_reason: string | null;
  review_request_status: string;
  review_requested_at: string | null;
  review_failure_reason: string | null;
  satisfaction_signal: string | null;
  referral_requires_positive_signal: boolean;
}

const STATUS_META: Record<string, { label: string; className: string }> = {
  scheduled: { label: "Scheduled", className: "bg-muted text-muted-foreground" },
  queued: { label: "Scheduled", className: "bg-muted text-muted-foreground" },
  sending: { label: "Sending", className: "bg-muted text-muted-foreground" },
  sent: { label: "Sent", className: "bg-primary/10 text-primary" },
  failed: { label: "Failed", className: "bg-destructive/10 text-destructive" },
  suppressed: { label: "Unsubscribed", className: "bg-muted text-muted-foreground" },
  canceled: { label: "Canceled", className: "bg-muted text-muted-foreground" },
  duplicate: { label: "Duplicate", className: "bg-muted text-muted-foreground" },
};

interface Props {
  biz: { id: string; name: string; offer_amount: string | null; google_review_url: string | null };
  publicUrl: string;
}

const AutoAskTab = ({ biz, publicUrl }: Props) => {
  const { toast } = useToast();
  const [rows, setRows] = useState<TriggerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    first_name: "",
    email: "",
    phone: "",
    service: "",
    technician: "",
    amount: "",
    review_request: false,
    gate_referral: false,
  });
  const [showReviewLinkHint, setShowReviewLinkHint] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("referral_triggers")
      .select(
        "id, customer_first_name, customer_email, customer_phone, service_description, technician_name, amount_paid, status, scheduled_send_at, sent_at, failure_reason, review_request_status, review_requested_at, review_failure_reason, satisfaction_signal, referral_requires_positive_signal",
      )
      .eq("business_id", biz.id)
      .order("created_at", { ascending: false })
      .limit(50);
    setRows((data as TriggerRow[]) ?? []);
    setLoading(false);
  }, [biz.id]);

  useEffect(() => { load(); }, [load]);

  const reset = () =>
    setForm((f) => ({
      first_name: "", email: "", phone: "", service: "", technician: "", amount: "",
      review_request: f.review_request, gate_referral: f.gate_referral,
    }));

  const submit = async () => {
    const first = form.first_name.trim();
    const email = form.email.trim().toLowerCase();
    const phone = form.phone.trim();
    if (!first) {
      toast({ title: "Add a first name", description: "The ask is personalised, so we need it.", variant: "destructive" });
      return;
    }
    if (!email && !phone) {
      toast({ title: "Add an email or phone", description: "We need at least one way to reach them.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const scheduledAt = new Date(Date.now() + DELAY_HOURS * 60 * 60 * 1000).toISOString();
    const amount = form.amount.trim() ? Number(form.amount.trim()) : null;
    const { error } = await supabase.from("referral_triggers").insert({
      business_id: biz.id,
      source: "manual",
      source_event_id: crypto.randomUUID(),
      customer_first_name: first,
      customer_email: email || null,
      customer_phone: phone || null,
      service_description: form.service.trim() || null,
      technician_name: form.technician.trim() || null,
      amount_paid: amount != null && !Number.isNaN(amount) ? amount : null,
      review_request_status: email && form.review_request && biz.google_review_url ? "scheduled" : "off",
      referral_requires_positive_signal: form.review_request && form.gate_referral,
      status: email ? "scheduled" : "canceled",
      channel: email ? "email" : null,
      failure_reason: email ? null : "no_email_send_by_text_from_your_phone",
      scheduled_send_at: scheduledAt,
    });
    setSaving(false);
    if (error) {
      toast({ title: "Could not save", description: friendlyError(error), variant: "destructive" });
      return;
    }
    toast({
      title: email ? "Ask scheduled" : "Job logged",
      description: email
        ? `We will email ${first} in about ${DELAY_HOURS} hours.`
        : `No email on file, so use Text from my phone below to ask ${first}.`,
    });
    reset();
    load();
  };

  const cancel = async (id: string) => {
    const { error } = await supabase
      .from("referral_triggers")
      .update({ status: "canceled" })
      .eq("id", id)
      .in("status", ["scheduled", "queued"]);
    if (error) {
      toast({ title: "Could not cancel", description: friendlyError(error), variant: "destructive" });
      return;
    }
    load();
  };

  // Owner-observed signal only. This records that the owner marked the customer
  // happy, which is a real observation. It is never inferred from a review.
  const markHappy = async (id: string) => {
    const { error } = await supabase
      .from("referral_triggers")
      .update({ satisfaction_signal: "happy", satisfaction_at: new Date().toISOString() })
      .eq("id", id)
      .is("satisfaction_signal", null);
    if (error) {
      toast({ title: "Could not save", description: friendlyError(error), variant: "destructive" });
      return;
    }
    load();
  };

  const smsHref = (row: TriggerRow) => {
    const num = (row.customer_phone || "").replace(/[^\d+]/g, "");
    const body = encodeURIComponent(
      `Hi ${row.customer_first_name || "there"}, thanks again for your business${row.service_description ? ` with your ${row.service_description}` : ""}. If you know anyone else who needs the same, you can send them here: ${publicUrl}`,
    );
    return `sms:${num}?&body=${body}`;
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
        <h2 className="text-base font-semibold text-foreground">Job done</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Log a finished job and we send that customer one personalised referral ask about {DELAY_HOURS} hours
          later, using their first name, the service and who did the work. Automatic asks go by email only.
          Texts are sent from your own phone.
        </p>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="ja-first" className="text-xs">Customer first name</Label>
            <Input id="ja-first" className="mt-1.5" value={form.first_name}
              onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))} />
          </div>
          <div>
            <Label htmlFor="ja-service" className="text-xs">What was the service</Label>
            <Input id="ja-service" className="mt-1.5" placeholder="e.g. water heater replacement" value={form.service}
              onChange={(e) => setForm((f) => ({ ...f, service: e.target.value }))} />
          </div>
          <div>
            <Label htmlFor="ja-email" className="text-xs">Customer email</Label>
            <Input id="ja-email" type="email" className="mt-1.5" value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          </div>
          <div>
            <Label htmlFor="ja-phone" className="text-xs">Customer phone (optional)</Label>
            <Input id="ja-phone" type="tel" className="mt-1.5" value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
          </div>
          <div>
            <Label htmlFor="ja-tech" className="text-xs">Who did the work (optional)</Label>
            <Input id="ja-tech" className="mt-1.5" value={form.technician}
              onChange={(e) => setForm((f) => ({ ...f, technician: e.target.value }))} />
          </div>
          <div>
            <Label htmlFor="ja-amount" className="text-xs">Amount paid (optional)</Label>
            <Input id="ja-amount" type="number" min="0" step="0.01" inputMode="decimal" className="mt-1.5"
              value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-border bg-muted/20 p-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox
              checked={form.review_request}
              onCheckedChange={(v) => {
                // Stay tappable without a review link so the tap explains itself
                // instead of doing nothing.
                if (v === true && !biz.google_review_url) {
                  setShowReviewLinkHint(true);
                  return;
                }
                setShowReviewLinkHint(false);
                setForm((f) => ({ ...f, review_request: v === true }));
              }}
              aria-invalid={showReviewLinkHint}
              className="mt-0.5 h-5 w-5"
            />
            <span className="text-sm text-foreground">
              Also ask for a review
              <span className="mt-0.5 block text-xs text-muted-foreground">
                Every customer gets the same request and the same public review link. We never filter who gets
                asked based on how they feel about the job.
              </span>
            </span>
          </label>
          {!biz.google_review_url && (
            <p
              className={`mt-2 text-xs ${showReviewLinkHint ? "font-medium text-destructive" : "text-muted-foreground"}`}
              role={showReviewLinkHint ? "alert" : undefined}
            >
              Add your Google review link under My Page first, then you can turn this on.
            </p>
          )}
          {form.review_request && (
            <label className="mt-3 flex items-start gap-3 cursor-pointer border-t border-border pt-3">
              <Checkbox
                checked={form.gate_referral}
                onCheckedChange={(v) => setForm((f) => ({ ...f, gate_referral: v === true }))}
                className="mt-0.5"
              />
              <span className="text-sm text-foreground">
                Hold the referral ask until they say they were happy
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  The referral follow-up goes out about two days after the review request. With this on, it only
                  sends if the customer clicks "I was happy" or you mark them happy here. Revvin does not read
                  your reviews and cannot tell you what anyone rated you.
                </span>
              </span>
            </label>
          )}
        </div>

        <Button className="mt-5" onClick={submit} disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
          Schedule the ask
        </Button>
        <p className="mt-3 text-xs text-muted-foreground">
          Every automatic email carries an unsubscribe link, and we skip anyone who has unsubscribed or bounced.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="border-b border-border px-5 py-3 text-sm font-medium text-foreground">Recent asks</div>
        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Nothing scheduled yet. Log a finished job above.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Customer</th>
                  <th className="px-4 py-3 text-left font-medium">Service</th>
                  <th className="px-4 py-3 text-left font-medium">Review ask</th>
                  <th className="px-4 py-3 text-left font-medium">Referral ask</th>
                  <th className="px-4 py-3 text-left font-medium">When</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const meta = STATUS_META[r.status] ?? { label: r.status, className: "bg-muted text-muted-foreground" };
                  const pending = r.status === "scheduled" || r.status === "queued";
                  return (
                    <tr key={r.id} className="border-t border-border">
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{r.customer_first_name || "Customer"}</div>
                        <div className="text-xs text-muted-foreground">{r.customer_email || r.customer_phone || "·"}</div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {r.service_description || "·"}
                        {r.technician_name ? <div className="text-xs">by {r.technician_name}</div> : null}
                      </td>
                      <td className="px-4 py-3">
                        {r.review_request_status === "off" ? (
                          <span className="text-xs text-muted-foreground">Not asked</span>
                        ) : (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                              <Star className="h-3 w-3" />
                              {r.review_request_status === "sent" ? "Review request sent" : r.review_request_status === "scheduled" || r.review_request_status === "sending" ? "Scheduled" : r.review_request_status}
                            </span>
                            {r.review_failure_reason ? (
                              <div className="text-[11px] text-muted-foreground">{r.review_failure_reason}</div>
                            ) : null}
                            <div className="text-[11px] text-muted-foreground">
                              {r.satisfaction_signal === "happy"
                                ? "Customer said they were happy"
                                : r.satisfaction_signal === "unhappy"
                                  ? "Customer said something was not right"
                                  : "No answer yet"}
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${meta.className}`}>
                          {r.status === "sent" ? <CheckCircle2 className="h-3 w-3" /> : r.status === "failed" ? <XCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                          {meta.label}
                        </span>
                        {r.failure_reason ? (
                          <div className="mt-1 text-[11px] text-muted-foreground">{r.failure_reason}</div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {r.sent_at
                          ? new Date(r.sent_at).toLocaleString()
                          : new Date(r.scheduled_send_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {r.customer_phone && (
                            <Button variant="ghost" size="sm" asChild>
                              <a href={smsHref(r)}>
                                <MessageSquare className="mr-1.5 h-3.5 w-3.5" /> Text from my phone
                              </a>
                            </Button>
                          )}
                          {r.referral_requires_positive_signal && !r.satisfaction_signal && pending && (
                            <Button variant="ghost" size="sm" onClick={() => markHappy(r.id)}>
                              <ThumbsUp className="mr-1.5 h-3.5 w-3.5" /> Mark happy
                            </Button>
                          )}
                          {pending && (
                            <Button variant="ghost" size="sm" onClick={() => cancel(r.id)}>Cancel</Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AutoAskTab;