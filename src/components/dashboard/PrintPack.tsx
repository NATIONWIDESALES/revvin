import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Download, Loader2, Mail, Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { PRINT_ASSETS, type PrintAsset } from "@/lib/printAssets";
import AssetSheet, { type SheetBusiness } from "@/components/print/AssetSheet";
import { kitZipName, printFileName } from "@/lib/printKit";
import { track } from "@/lib/track";
import {
  PRINT_KIT_BUCKET, PRINT_KIT_NOTE_MAX, sanitizeNote, validPrintShopEmail,
} from "../../../supabase/functions/_shared/print-kit";

// Every preview sits in the same fixed frame, scaled to fit and centered, so a
// landscape sign does not leave a tall empty card beside the door hanger.
const FRAME_W = 300; // px
const FRAME_H = 260; // px
const PX_PER_IN = 96;

interface Props {
  biz: SheetBusiness & { slug?: string | null };
  publicUrl: string;
  /** Needed to email the kit; without it the email form is hidden. */
  businessId?: string;
  /** Called after the first successful PDF or kit download. */
  onDownloaded?: () => void | Promise<void>;
}

const REFUSAL_COPY: Record<string, string> = {
  invalid_recipient: "Check the print shop's email address.",
  recipient_suppressed: "That address has asked not to get email from Revvin. Use a different address.",
  rate_limited_day: "You can email your kit 5 times a day. Try again tomorrow.",
  rate_limited_month: "You can email your kit 20 times in 30 days. Download the PDFs and send them yourself for now.",
  business_disabled: "This account is paused, so the kit cannot be emailed.",
  demo_account: "The demo account cannot email print shops.",
  files_missing: "The files did not finish uploading. Try again.",
  invalid_folder: "The files did not finish uploading. Try again.",
  send_failed: "The email did not go out. Try again in a minute.",
};

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
const randomFolderId = () => Array.from(crypto.getRandomValues(new Uint8Array(16))).map((b) => b.toString(16).padStart(2, "0")).join("");

interface SendRow { id: string; recipient_email: string; created_at: string }

const PrintPack = ({ biz, publicUrl, businessId, onDownloaded }: Props) => {
  const { toast } = useToast();
  const slug = biz.slug || "revvin";
  const [busy, setBusy] = useState<string | null>(null);
  const [failed, setFailed] = useState<Record<string, boolean>>({});
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [copyMe, setCopyMe] = useState(false);
  const [sending, setSending] = useState(false);
  const [lastSent, setLastSent] = useState<{ email: string; at: string } | null>(null);
  const [sends, setSends] = useState<SendRow[]>([]);

  const loadSends = async () => {
    if (!businessId) return;
    const { data } = await (supabase as any).from("print_kit_sends").select("id, recipient_email, created_at").eq("business_id", businessId).order("created_at", { ascending: false }).limit(5);
    setSends((data as SendRow[] | null) ?? []);
  };
  useEffect(() => { void loadSends(); /* eslint-disable-next-line */ }, [businessId]);

  const fail = (key: string, asset?: PrintAsset) => {
    track("print_pdf_failed", asset ? { asset: asset.id } : undefined);
    setFailed((f) => ({ ...f, [key]: true }));
    toast({ title: "Could not make the PDF here", description: "Open the print view, choose Print, then Save as PDF.", variant: "destructive" });
  };

  const downloadOne = async (asset: PrintAsset) => {
    setBusy(asset.id);
    try {
      const { renderAssetPdf } = await import("@/lib/printPdf");
      const bytes = await renderAssetPdf(asset, biz, publicUrl);
      saveBlob(new Blob([bytes as BlobPart], { type: "application/pdf" }), printFileName(slug, asset.id));
      track("print_pdf_downloaded", { asset: asset.id });
      await onDownloaded?.();
    } catch { fail(asset.id, asset); }
    setBusy(null);
  };

  const downloadKit = async () => {
    setBusy("kit");
    try {
      const { renderKit, kitZip } = await import("@/lib/printPdf");
      const files = await renderKit(PRINT_ASSETS, biz, publicUrl, slug);
      saveBlob(new Blob([kitZip(files, PRINT_ASSETS, slug) as BlobPart], { type: "application/zip" }), kitZipName(slug));
      track("print_kit_downloaded");
      await onDownloaded?.();
    } catch { fail("kit"); }
    setBusy(null);
  };

  const emailKit = async () => {
    if (!businessId) return;
    if (!validPrintShopEmail(email)) { toast({ title: "Check the print shop's email address", variant: "destructive" }); return; }
    setSending(true);
    try {
      const { renderKit } = await import("@/lib/printPdf");
      const files = await renderKit(PRINT_ASSETS, biz, publicUrl, slug);
      const folder = `${businessId}/${randomFolderId()}`;
      for (const f of files) {
        const { error } = await supabase.storage.from(PRINT_KIT_BUCKET).upload(`${folder}/${f.name}`, new Blob([f.bytes as BlobPart], { type: "application/pdf" }), { contentType: "application/pdf", upsert: false });
        if (error) throw new Error("upload_failed");
      }
      const { data, error } = await supabase.functions.invoke("send-print-kit", {
        body: { recipient: email.trim(), note: sanitizeNote(note), copy_to_me: copyMe, folder },
      });
      if (error) {
        let code = "send_failed";
        try { code = (await (error as { context?: Response }).context?.json())?.code ?? code; } catch { /* not JSON */ }
        toast({ title: "Kit not sent", description: REFUSAL_COPY[code] ?? REFUSAL_COPY.send_failed, variant: "destructive" });
      } else {
        track("print_kit_emailed");
        setLastSent({ email: data?.recipient ?? email.trim(), at: data?.sent_at ?? new Date().toISOString() });
        setEmail(""); setNote("");
        await loadSends();
      }
    } catch {
      toast({ title: "Kit not sent", description: "We could not prepare the files. Download the kit and attach it to an email instead.", variant: "destructive" });
    }
    setSending(false);
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 max-w-2xl">
          <h3 className="text-sm font-semibold text-foreground">Print pack</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Five print-ready pieces with your logo, your offer, your link and your QR code. Download the PDFs and send them to any print shop, or print them yourself.
            Nothing here is fabricated: the offer text is whatever you set up on your page.
          </p>
        </div>
        <Button onClick={() => void downloadKit()} disabled={busy !== null} className="h-11">
          {busy === "kit" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
          Download the whole kit
        </Button>
      </div>
      {failed.kit && <p className="mt-2 text-sm text-muted-foreground">Open each piece below, choose Print, then Save as PDF.</p>}

      <div className="mt-5 grid items-start gap-5 sm:grid-cols-2">
        {PRINT_ASSETS.map((asset) => {
          const scale = Math.min(FRAME_W / (asset.widthIn * PX_PER_IN), FRAME_H / (asset.heightIn * PX_PER_IN));
          const w = asset.widthIn * PX_PER_IN * scale;
          const h = asset.heightIn * PX_PER_IN * scale;
          return (
            <div key={asset.id} className="rounded-xl border border-border bg-background p-4">
              <div className="mx-auto flex items-center justify-center rounded-md bg-muted/50" style={{ width: FRAME_W, maxWidth: "100%", height: FRAME_H }}>
                <div className="overflow-hidden rounded-sm border border-border bg-white shadow-sm" style={{ width: w, height: h }}>
                  <AssetSheet asset={asset} biz={biz} url={publicUrl} scale={scale} />
                </div>
              </div>
              <div className="mt-3 min-w-0">
                <p className="text-sm font-medium text-foreground">{asset.name}</p>
                <p className="text-xs text-muted-foreground">
                  {asset.widthIn} by {asset.heightIn} in · {asset.qrIn} in QR for {asset.scanDistance}
                </p>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" className="h-10" onClick={() => void downloadOne(asset)} disabled={busy !== null}>
                  {busy === asset.id ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Download className="mr-1.5 h-3.5 w-3.5" />} Download PDF
                </Button>
                <Button variant="outline" size="sm" className="h-10" asChild>
                  <Link to={`/print/${asset.id}`} target="_blank" rel="noopener noreferrer">
                    <Printer className="mr-1.5 h-3.5 w-3.5" /> Open
                  </Link>
                </Button>
              </div>
              {failed[asset.id] && (
                <p className="mt-2 text-xs text-foreground" role="status">
                  <Link to={`/print/${asset.id}`} target="_blank" rel="noopener noreferrer" className="font-semibold underline">Open the print view</Link>, choose Print, then Save as PDF.
                </p>
              )}
              <p className="mt-2 text-xs text-muted-foreground">{asset.where}</p>
            </div>
          );
        })}
      </div>

      {businessId && (
        <section aria-labelledby="print-email-heading" className="mt-6 rounded-xl border border-border bg-background p-4 sm:p-5">
          <h4 id="print-email-heading" className="text-sm font-semibold text-foreground">Email my kit to a print shop</h4>
          <p className="mt-1 text-xs text-muted-foreground">We email the five PDFs from your business name. Replies go to you.</p>
          <div className="mt-4 grid gap-3">
            <div>
              <Label htmlFor="print-shop-email" className="text-xs">Print shop's email</Label>
              <Input id="print-shop-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5" maxLength={254} autoComplete="off" />
            </div>
            <div>
              <Label htmlFor="print-shop-note" className="text-xs">Your note (optional)</Label>
              <Textarea id="print-shop-note" rows={3} value={note} maxLength={PRINT_KIT_NOTE_MAX} onChange={(e) => setNote(e.target.value.slice(0, PRINT_KIT_NOTE_MAX))} className="mt-1.5 text-sm" />
              <p className="mt-1 text-xs text-muted-foreground">{note.length} of {PRINT_KIT_NOTE_MAX}. Plain text only, links are removed.</p>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="print-copy-me" checked={copyMe} onCheckedChange={(v) => setCopyMe(v === true)} />
              <Label htmlFor="print-copy-me" className="cursor-pointer text-sm">Send me a copy</Label>
            </div>
            <div>
              <Button onClick={() => void emailKit()} disabled={sending} className="h-11">
                {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />} Email my kit
              </Button>
            </div>
          </div>
          {lastSent && (
            <p className="mt-3 text-sm font-semibold text-foreground" role="status">
              Sent to {lastSent.email} at {new Date(lastSent.at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
            </p>
          )}
          {sends.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-semibold text-muted-foreground">Recent sends</p>
              <ul className="mt-1 space-y-1 text-sm text-foreground">
                {sends.map((s) => (
                  <li key={s.id} className="flex flex-wrap justify-between gap-2">
                    <span className="min-w-0 break-all">{s.recipient_email}</span>
                    <span className="text-muted-foreground">{new Date(s.created_at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}
    </div>
  );
};

export default PrintPack;
