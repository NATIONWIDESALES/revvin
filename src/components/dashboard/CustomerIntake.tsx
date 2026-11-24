import { useEffect, useRef, useState } from "react";
import { ChevronDown, ClipboardPaste, FileUp, Loader2, Mail, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { FREE_CONTACT_LIMIT, FREE_LIMIT_COPY, isFreeContactLimitError } from "@/config/planFeatures";
import { parseCsv, parsePastedLines, type ImportResult } from "@/lib/contactImport";
import {
  excelToCsv, INTAKE_FILE_ACCEPT, intakeFileKind, planIntake, sendUsMailto, skipLines,
  type IntakeMethod, type IntakePlan,
} from "@/lib/customerIntake";
import { friendlyError } from "@/lib/errors";
import { reportFailure } from "@/lib/reportFailure";
import { track } from "@/lib/track";
import { recipientBucket } from "@/lib/analyticsPrivacy";

interface Props {
  businessId: string;
  businessName: string;
  isPro: boolean;
  isDemo: boolean;
  /** Called after rows were saved, with the new total on the list. */
  onImported?: (total: number) => void;
  /** Opens the referral launch composer. */
  onAskAll: (total: number) => void;
}

type Done = { added: number; total: number; plan: IntakePlan };

const Row = ({ icon, title, sub, onClick, open, testId }: { icon: React.ReactNode; title: string; sub?: string; onClick: () => void; open?: boolean; testId: string }) => (
  <button type="button" data-testid={testId} onClick={onClick} aria-expanded={open}
    className="flex min-h-[56px] w-full items-center gap-3 rounded-xl border border-line bg-card px-4 py-3 text-left hover:bg-muted/40">
    <span className="shrink-0 text-primary">{icon}</span>
    <span className="min-w-0 flex-1">
      <span className="block font-semibold text-foreground">{title}</span>
      {sub && <span className="block text-sm text-muted-foreground">{sub}</span>}
    </span>
    {open !== undefined && <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />}
  </button>
);

const CustomerIntake = ({ businessId, businessName, isPro, isDemo, onImported, onAskAll }: Props) => {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [existing, setExisting] = useState<Array<{ email: string | null; phone: string | null }> | null>(null);
  const [open, setOpen] = useState<IntakeMethod | null>(null);
  const [paste, setPaste] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Done | null>(null);

  const loadExisting = async () => {
    const { data } = await (supabase as any).from("referral_contacts").select("email, phone").eq("business_id", businessId).limit(10000);
    const rows = (data ?? []) as Array<{ email: string | null; phone: string | null }>;
    setExisting(rows);
    return rows;
  };
  useEffect(() => { void loadExisting(); /* eslint-disable-next-line */ }, [businessId]);

  const capped = !isPro && !isDemo;
  const choose = (m: IntakeMethod) => {
    track("intake_opened", { method: m });
    if (m === "upload") { fileRef.current?.click(); return; }
    setOpen((cur) => (cur === m ? null : m));
  };

  const save = async (parsed: ImportResult) => {
    setBusy(true);
    const list = existing ?? await loadExisting();
    const remaining = capped ? Math.max(0, FREE_CONTACT_LIMIT - list.length) : Infinity;
    const plan = planIntake(parsed, list, remaining);
    if (plan.toAdd.length > 0) {
      const rows = plan.toAdd.map((p) => ({ business_id: businessId, name: p.name, email: p.email || null, phone: p.phone || null, last_job_at: p.last_job_at || null }));
      const { error } = await (supabase as any).from("referral_contacts").insert(rows);
      if (error) {
        setBusy(false);
        reportFailure("customer_import", { error, business_id: businessId });
        toast({ title: "Import failed", description: isFreeContactLimitError(error) ? FREE_LIMIT_COPY.error : friendlyError(error), variant: "destructive" });
        return;
      }
    }
    const after = await loadExisting();
    setBusy(false);
    setPaste("");
    setOpen(null);
    setDone({ added: plan.toAdd.length, total: after.length, plan });
    if (plan.toAdd.length > 0) {
      track("intake_import_succeeded", { recipients: recipientBucket(plan.toAdd.length) });
      onImported?.(after.length);
    }
  };

  const onFile = async (file: File) => {
    const kind = intakeFileKind(file.name);
    if (!kind) { toast({ title: "Use a CSV or Excel file", description: "Save your list as .csv or .xlsx, then upload it here.", variant: "destructive" }); return; }
    try {
      const text = kind === "csv" ? await file.text() : await excelToCsv(await file.arrayBuffer());
      await save(parseCsv(text));
    } catch {
      setBusy(false);
      toast({ title: "Could not read that file", description: "Try saving it as CSV and uploading again.", variant: "destructive" });
    }
  };

  return (
    <section aria-labelledby="intake-heading" data-testid="customer-intake" className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <h2 id="intake-heading" className="font-display text-2xl font-bold text-forest dark:text-foreground">Bring your customers</h2>
      {capped && <p className="mt-1 text-sm text-muted-foreground">Free includes {FREE_CONTACT_LIMIT} customers.</p>}

      {done && (
        <div data-testid="intake-done" role="status" className="mt-4 rounded-xl border border-line bg-muted/30 p-4">
          <p className="font-semibold text-foreground">
            {done.added > 0 ? `Added ${done.added} ${done.added === 1 ? "customer" : "customers"}.` : "No new customers were added."} You now have {done.total}.
          </p>
          <ul className="mt-1 space-y-0.5 text-sm text-muted-foreground">
            {skipLines(done.plan.skipped, FREE_CONTACT_LIMIT).map((l) => <li key={l}>Skipped: {l}</li>)}
            {done.plan.firstProblems.map((p) => <li key={p.line}>Line {p.line}: {p.reason}</li>)}
          </ul>
          {done.total > 0 && (
            <Button size="lg" className="mt-4 w-full sm:w-auto" onClick={() => onAskAll(done.total)}>Ask all {done.total} customers</Button>
          )}
        </div>
      )}

      <div className="mt-4 grid gap-2">
        <input ref={fileRef} type="file" accept={INTAKE_FILE_ACCEPT} className="hidden" aria-label="Upload a customer file"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) void onFile(f); e.currentTarget.value = ""; }} />
        <Row testId="intake-upload" icon={busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />} title="Upload a file" sub="CSV or Excel (.csv, .xlsx, .xls)" onClick={() => choose("upload")} />

        <Row testId="intake-paste" icon={<ClipboardPaste className="h-5 w-5" />} title="Paste a list" sub="One customer per line" open={open === "paste"} onClick={() => choose("paste")} />
        {open === "paste" && (
          <div className="rounded-xl border border-line p-4">
            <Textarea value={paste} onChange={(e) => setPaste(e.target.value)} rows={6} className="font-mono text-xs" aria-label="Paste your customer list"
              placeholder={"Jane Smith, jane@example.com, 555-123-4567\nMike Lee, 555-987-6543"} />
            <Button className="mt-3 h-11" disabled={busy || !paste.trim()} onClick={() => void save(parsePastedLines(paste))}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Add these customers
            </Button>
          </div>
        )}

        <Row testId="intake-export" icon={<FileUp className="h-5 w-5" />} title="Export from your job software" open={open === "export_help"} onClick={() => choose("export_help")} />
        {open === "export_help" && (
          <p className="rounded-xl border border-line p-4 text-sm text-foreground">
            Open your customer or client list in QuickBooks, Jobber, Housecall Pro, ServiceTitan or whatever you use, choose Export, and save it as CSV or Excel. Then upload that file here. Name, email and phone are all we need.
          </p>
        )}

        <a data-testid="intake-send-us" href={sendUsMailto(businessName)} onClick={() => { track("intake_opened", { method: "send_us" }); track("intake_send_us_clicked"); }}
          className="flex min-h-[56px] w-full items-center gap-3 rounded-xl border border-line bg-card px-4 py-3 text-left hover:bg-muted/40">
          <Mail className="h-5 w-5 shrink-0 text-primary" />
          <span className="min-w-0 flex-1">
            <span className="block font-semibold text-foreground">Send us your list and we load it</span>
            <span className="block text-sm text-muted-foreground">Send it from the email you signed up with. We load it within one business day.</span>
          </span>
        </a>
      </div>
    </section>
  );
};

export default CustomerIntake;
