import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Inbox, Trash2, Upload, Check, Undo2, MessageSquare, Mail, Share2, Loader2, UserPlus, PlayCircle, ChevronRight,
} from "lucide-react";

export interface CustomersTabBusiness {
  id: string;
  name: string;
  offer_amount: string | null;
  offer_trigger: string | null;
}

export interface ReferralContact {
  id: string;
  business_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: "pending" | "sent";
  last_sent_at: string | null;
  send_channel: "sms" | "email" | "share" | null;
  is_mock: boolean;
  created_at: string;
}

// Default editable message template. Placeholders are filled from real business data.
// No em dashes (project rule).
const DEFAULT_TEMPLATE =
  "Hi {firstName}, {businessName} here. I'm paying {reward} for referrals right now. If you know anyone who needs {offer}, share my link and you get paid when the deal closes: {referralLink}";

// Three short, plain, first-person templates the business can pick as a starting point.
// No hype, no em dashes. Placeholders fill in from real business data.
const TEMPLATE_PRESETS: Array<{ id: string; label: string; body: string }> = [
  {
    id: "short",
    label: "Short and direct",
    body:
      "Hi {firstName}, {businessName} here. If you know anyone who needs {offer}, send them my link and I'll pay you {reward} when the job closes: {referralLink}",
  },
  {
    id: "thanks",
    label: "Thank you first",
    body:
      "Hi {firstName}, thanks for being a customer. If someone you know needs {offer}, share this link and you get {reward} when the deal closes: {referralLink}",
  },
  {
    id: "casual",
    label: "Casual heads up",
    body:
      "Hey {firstName}, quick heads up from {businessName}. I'm paying {reward} per referral right now. If anyone comes to mind for {offer}, here's the link: {referralLink}",
  },
];

const TEMPLATE_STORAGE_KEY = "revvin_customer_msg_template_v1";

function parsePastedLines(text: string): Array<{ name: string; email?: string; phone?: string }> {
  const out: Array<{ name: string; email?: string; phone?: string }> = [];
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneRe = /^[+()\d][\d\s().\-]{5,}$/;
  for (const line of lines) {
    const parts = line.split(/[,;\t]+/).map((p) => p.trim()).filter(Boolean);
    if (parts.length === 0) continue;
    let name = parts[0];
    let email: string | undefined;
    let phone: string | undefined;
    for (const p of parts.slice(1)) {
      if (!email && emailRe.test(p)) email = p;
      else if (!phone && phoneRe.test(p)) phone = p;
    }
    // Single token: if it looks like email/phone, name fallback
    if (parts.length === 1) {
      if (emailRe.test(name)) { email = name; name = name.split("@")[0]; }
      else if (phoneRe.test(name)) { phone = name; name = "(no name)"; }
    }
    if (name && (email || phone)) out.push({ name, email, phone });
  }
  return out;
}

function parseCsv(text: string): Array<{ name: string; email?: string; phone?: string }> {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];
  const header = lines[0].toLowerCase().split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  const hasHeader = header.some((h) => ["name", "email", "phone"].includes(h));
  const idx = {
    name: hasHeader ? header.indexOf("name") : 0,
    email: hasHeader ? header.indexOf("email") : 1,
    phone: hasHeader ? header.indexOf("phone") : 2,
  };
  const rows = hasHeader ? lines.slice(1) : lines;
  const out: Array<{ name: string; email?: string; phone?: string }> = [];
  for (const r of rows) {
    const cells = r.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
    const name = idx.name >= 0 ? cells[idx.name] : "";
    const email = idx.email >= 0 ? cells[idx.email] : "";
    const phone = idx.phone >= 0 ? cells[idx.phone] : "";
    if (name && (email || phone)) out.push({ name, email: email || undefined, phone: phone || undefined });
  }
  return out;
}

function firstName(full: string) {
  return (full || "").trim().split(/\s+/)[0] || "there";
}

function renderTemplate(tpl: string, vars: Record<string, string>) {
  return tpl.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
}

function isIOS() {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

const CustomersTab = ({ biz, publicUrl }: { biz: CustomersTabBusiness; publicUrl: string }) => {
  const { toast } = useToast();
  const [contacts, setContacts] = useState<ReferralContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [paste, setPaste] = useState("");
  const [preview, setPreview] = useState<Array<{ name: string; email?: string; phone?: string }>>([]);
  const [importing, setImporting] = useState(false);
  const [template, setTemplate] = useState<string>(
    () => (typeof window !== "undefined" && localStorage.getItem(TEMPLATE_STORAGE_KEY)) || DEFAULT_TEMPLATE,
  );
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [lastSent, setLastSent] = useState<{ id: string; prev: ReferralContact } | null>(null);

  const reward = biz.offer_amount?.trim() || "a reward";
  const offer = biz.offer_trigger?.trim() || "our service";

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("referral_contacts")
      .select("*")
      .eq("business_id", biz.id)
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Failed to load contacts", description: error.message, variant: "destructive" });
    } else {
      setContacts((data as ReferralContact[]) ?? []);
    }
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [biz.id]);

  // Re-parse paste as user types
  useEffect(() => {
    setPreview(parsePastedLines(paste));
  }, [paste]);

  const existingKey = useMemo(() => {
    const s = new Set<string>();
    for (const c of contacts) {
      if (c.email) s.add("e:" + c.email.toLowerCase());
      if (c.phone) s.add("p:" + c.phone.replace(/\D/g, ""));
    }
    return s;
  }, [contacts]);

  const dedupedPreview = useMemo(() => {
    const seen = new Set<string>();
    const out: typeof preview = [];
    for (const p of preview) {
      const k = (p.email ? "e:" + p.email.toLowerCase() : "") + "|" + (p.phone ? "p:" + p.phone.replace(/\D/g, "") : "");
      if (seen.has(k)) continue;
      const dup =
        (p.email && existingKey.has("e:" + p.email.toLowerCase())) ||
        (p.phone && existingKey.has("p:" + p.phone.replace(/\D/g, "")));
      if (dup) continue;
      seen.add(k);
      out.push(p);
    }
    return out;
  }, [preview, existingKey]);

  const handleImport = async () => {
    if (dedupedPreview.length === 0) return;
    setImporting(true);
    const rows = dedupedPreview.map((p) => ({
      business_id: biz.id,
      name: p.name,
      email: p.email || null,
      phone: p.phone || null,
    }));
    const { error } = await (supabase as any).from("referral_contacts").insert(rows);
    setImporting(false);
    if (error) {
      toast({ title: "Import failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: `Imported ${rows.length} contact${rows.length === 1 ? "" : "s"}` });
    setPaste("");
    setPreview([]);
    load();
  };

  const handleCsv = async (file: File) => {
    const text = await file.text();
    const parsed = parseCsv(text);
    if (parsed.length === 0) {
      toast({ title: "No rows found in CSV", variant: "destructive" });
      return;
    }
    setPaste(parsed.map((p) => [p.name, p.email, p.phone].filter(Boolean).join(", ")).join("\n"));
    toast({ title: `Loaded ${parsed.length} rows into preview` });
  };

  const messageFor = (c: ReferralContact) =>
    renderTemplate(template, {
      firstName: firstName(c.name),
      businessName: biz.name,
      reward,
      offer,
      referralLink: publicUrl,
    });

  const markSent = async (c: ReferralContact, channel: "sms" | "email" | "share") => {
    const prev = { ...c };
    setContacts((cs) =>
      cs.map((x) => (x.id === c.id ? { ...x, status: "sent", last_sent_at: new Date().toISOString(), send_channel: channel } : x)),
    );
    setLastSent({ id: c.id, prev });
    const { error } = await (supabase as any)
      .from("referral_contacts")
      .update({ status: "sent", last_sent_at: new Date().toISOString(), send_channel: channel })
      .eq("id", c.id);
    if (error) {
      // revert on failure
      setContacts((cs) => cs.map((x) => (x.id === c.id ? prev : x)));
      toast({ title: "Could not save sent status", description: error.message, variant: "destructive" });
      return;
    }
    // Append a history row so re-asks and nudges can reason over real sends later.
    // Each row records ONLY that the business tapped Send on a channel; Revvin never
    // sends, so this is not proof of delivery. Failure here is non-fatal.
    void (supabase as any)
      .from("referral_contact_sends")
      .insert({ business_id: c.business_id, contact_id: c.id, channel });
  };

  const undoSend = async () => {
    if (!lastSent) return;
    const { prev } = lastSent;
    setContacts((cs) => cs.map((x) => (x.id === prev.id ? prev : x)));
    await (supabase as any)
      .from("referral_contacts")
      .update({ status: prev.status, last_sent_at: prev.last_sent_at, send_channel: prev.send_channel })
      .eq("id", prev.id);
    setLastSent(null);
  };

  const sendSms = (c: ReferralContact) => {
    if (!c.phone) return;
    const body = encodeURIComponent(messageFor(c));
    // iOS historically uses &body= when there is a phone number, Android accepts ?body=.
    // We use the separator that matches the platform; both modern OSes accept either.
    const sep = isIOS() ? "&" : "?";
    const href = `sms:${c.phone}${sep}body=${body}`;
    setSendingId(c.id);
    window.location.href = href;
    markSent(c, "sms").finally(() => setSendingId(null));
  };

  const sendEmail = (c: ReferralContact) => {
    if (!c.email) return;
    const subject = encodeURIComponent(`A referral opportunity from ${biz.name}`);
    const body = encodeURIComponent(messageFor(c));
    const href = `mailto:${c.email}?subject=${subject}&body=${body}`;
    setSendingId(c.id);
    window.location.href = href;
    markSent(c, "email").finally(() => setSendingId(null));
  };

  const sendShare = async (c: ReferralContact) => {
    setSendingId(c.id);
    const text = messageFor(c);
    try {
      if (typeof navigator !== "undefined" && (navigator as any).share) {
        await (navigator as any).share({ title: biz.name, text });
        await markSent(c, "share");
      } else {
        await navigator.clipboard.writeText(text);
        toast({ title: "Message copied", description: "Paste it wherever you want to send it." });
        await markSent(c, "share");
      }
    } catch {
      // user cancelled share sheet, do not mark sent
    } finally {
      setSendingId(null);
    }
  };

  const removeContact = async (id: string) => {
    const { error } = await (supabase as any).from("referral_contacts").delete().eq("id", id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    setContacts((cs) => cs.filter((c) => c.id !== id));
  };

  const saveTemplate = () => {
    localStorage.setItem(TEMPLATE_STORAGE_KEY, template);
    toast({ title: "Default message saved" });
  };

  const resetTemplate = () => {
    setTemplate(DEFAULT_TEMPLATE);
    localStorage.removeItem(TEMPLATE_STORAGE_KEY);
  };

  const pending = contacts.filter((c) => c.status === "pending");
  const sent = contacts.filter((c) => c.status === "sent");

  return (
    <div className="space-y-6">
      {/* Import */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <h3 className="text-sm font-semibold text-foreground">Import customers</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Paste your customer list. One per line, like <span className="font-mono">Name, phone</span> or{" "}
          <span className="font-mono">Name, email</span>. We will dedupe against contacts you already have.
        </p>
        <Textarea
          value={paste}
          onChange={(e) => setPaste(e.target.value)}
          placeholder={"Jane Smith, 555-123-4567\nMike Lee, mike@example.com\nSara Patel, 555-987-6543, sara@example.com"}
          rows={6}
          className="mt-4 font-mono text-xs"
        />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button
            size="sm"
            onClick={handleImport}
            disabled={importing || dedupedPreview.length === 0}
          >
            {importing ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
            Add {dedupedPreview.length || ""} contact{dedupedPreview.length === 1 ? "" : "s"}
          </Button>
          <label className="inline-flex">
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleCsv(f);
                e.currentTarget.value = "";
              }}
            />
            <span className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border border-border px-3 text-xs font-medium hover:bg-muted">
              <Upload className="h-3.5 w-3.5" /> CSV upload
            </span>
          </label>
          <span className="text-xs text-muted-foreground">
            {preview.length > 0
              ? `${preview.length} parsed, ${preview.length - dedupedPreview.length} duplicate${preview.length - dedupedPreview.length === 1 ? "" : "s"}`
              : ""}
          </span>
        </div>

        {dedupedPreview.length > 0 && (
          <div className="mt-4 rounded-xl border border-border bg-muted/30 overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Name</th>
                  <th className="text-left px-3 py-2 font-medium">Phone</th>
                  <th className="text-left px-3 py-2 font-medium">Email</th>
                </tr>
              </thead>
              <tbody>
                {dedupedPreview.slice(0, 50).map((p, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="px-3 py-2 text-foreground">{p.name}</td>
                    <td className="px-3 py-2 text-muted-foreground">{p.phone || "·"}</td>
                    <td className="px-3 py-2 text-muted-foreground">{p.email || "·"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {dedupedPreview.length > 50 && (
              <div className="px-3 py-2 text-xs text-muted-foreground border-t border-border">
                Showing first 50 of {dedupedPreview.length}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Template */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Your invite message</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Edit before sending. Placeholders fill in automatically.
            </p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={resetTemplate}>Reset</Button>
            <Button size="sm" onClick={saveTemplate}>Save as default</Button>
          </div>
        </div>
        <Textarea
          value={template}
          onChange={(e) => setTemplate(e.target.value)}
          rows={4}
          className="mt-3 text-sm"
        />
        <p className="mt-2 text-[11px] text-muted-foreground">
          Available: <span className="font-mono">{"{firstName}"}</span>,{" "}
          <span className="font-mono">{"{businessName}"}</span>,{" "}
          <span className="font-mono">{"{reward}"}</span>, <span className="font-mono">{"{offer}"}</span>,{" "}
          <span className="font-mono">{"{referralLink}"}</span>
        </p>
      </div>

      {/* List */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Your customers</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {pending.length} pending · {sent.length} sent
            </p>
          </div>
          {lastSent && (
            <Button size="sm" variant="ghost" onClick={undoSend} className="gap-1.5">
              <Undo2 className="h-3.5 w-3.5" /> Undo
            </Button>
          )}
        </div>

        {loading ? (
          <div className="p-10 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : contacts.length === 0 ? (
          <div className="p-12 text-center">
            <Inbox className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-foreground font-medium">No contacts yet</p>
            <p className="text-xs text-muted-foreground mt-1">Paste a list above to get started.</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {contacts.map((c) => {
              const isSending = sendingId === c.id;
              return (
                <li key={c.id} className="flex flex-wrap items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-foreground truncate">{c.name}</span>
                      {c.status === "sent" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                          <Check className="h-3 w-3" /> Sent
                        </span>
                      ) : (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                          Pending
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 truncate">
                      {[c.phone, c.email].filter(Boolean).join(" · ") || "No contact info"}
                      {c.last_sent_at && (
                        <span className="ml-2">
                          · {c.send_channel || "sent"} {new Date(c.last_sent_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {c.phone && (
                      <Button size="sm" variant={c.status === "pending" ? "default" : "outline"} onClick={() => sendSms(c)} disabled={isSending} className="h-8 text-xs gap-1.5">
                        <MessageSquare className="h-3.5 w-3.5" /> Text
                      </Button>
                    )}
                    {c.email && (
                      <Button size="sm" variant="outline" onClick={() => sendEmail(c)} disabled={isSending} className="h-8 text-xs gap-1.5">
                        <Mail className="h-3.5 w-3.5" /> Email
                      </Button>
                    )}
                    {!c.phone && !c.email && (
                      <Button size="sm" variant="outline" onClick={() => sendShare(c)} disabled={isSending} className="h-8 text-xs gap-1.5">
                        <Share2 className="h-3.5 w-3.5" /> Share
                      </Button>
                    )}
                    {(c.phone || c.email) && (
                      <Button size="sm" variant="ghost" onClick={() => sendShare(c)} disabled={isSending} className="h-8 w-8 p-0" aria-label="Share">
                        <Share2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => removeContact(c.id)} className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive" aria-label="Remove">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <p className="text-[11px] text-muted-foreground">
        Note: each invite opens in your own Messages or Mail app. Revvin never sends messages on your behalf.
        You review and send each one from your phone.
      </p>
    </div>
  );
};

export default CustomersTab;