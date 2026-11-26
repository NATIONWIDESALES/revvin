import { TRIAL_SEND_NOTE } from "@/config/planFeatures";
import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import AssetSheet, { type SheetBusiness } from "@/components/print/AssetSheet";
import { OwnershipKitItem } from "@/components/dashboard/OwnershipCard";
import { PRINT_ASSETS } from "@/lib/printAssets";
import { publishPage } from "@/lib/publishPage";
import { track } from "@/lib/track";
import { kitSendAction, type DashTab } from "@/lib/dashboardHome";
import {
  LAUNCH_BUTTON_LABEL, LAUNCH_DEFAULT_BODY, LAUNCH_DEFAULT_SUBJECT, renderLaunchText,
} from "../../../supabase/functions/_shared/referral-launch";

const FLYER = PRINT_ASSETS.find((a) => a.id === "invoice-insert") ?? PRINT_ASSETS[0];
const FRAME_W = 220;
const FRAME_H = 260;
const PX_PER_IN = 96;

interface Props {
  biz: SheetBusiness;
  publicUrl: string;
  displayUrl: string;
  isLive: boolean;
  customersTotal: number;
  onCopy: () => void;
  onGo: (t: DashTab) => void;
  onPublished: () => Promise<void> | void;
  /** The list intake, already wrapped in the customer permission gate. */
  renderIntake: () => React.ReactNode;
  /** Server says the first send would still start the free Pro trial. */
  trialNote?: boolean;
}

const Card = ({ title, children, testId }: { title: string; children: React.ReactNode; testId: string }) => (
  <section data-testid={testId} className="flex min-w-0 flex-col rounded-[14px] border border-line bg-card p-5">
    <h2 className="font-display text-xl font-bold text-forest dark:text-foreground">{title}</h2>
    <div className="mt-3 flex min-w-0 flex-1 flex-col">{children}</div>
  </section>
);

const ReferralKitHome = ({ biz, publicUrl, displayUrl, isLive, customersTotal, onCopy, onGo, onPublished, renderIntake, trialNote = false }: Props) => {
  const { toast } = useToast();
  const [intakeOpen, setIntakeOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const viewed = useRef(false);
  useEffect(() => { if (!viewed.current) { viewed.current = true; track("kit_ready_viewed"); } }, []);

  const action = kitSendAction({ isLive, customersTotal });
  const scale = Math.min(FRAME_W / (FLYER.widthIn * PX_PER_IN), FRAME_H / (FLYER.heightIn * PX_PER_IN));
  const tokens = { first_name: "Dana", business_name: biz.name, reward: biz.offer_amount ?? null };

  const send = async () => {
    track("kit_send_clicked");
    if (action.publishFirst) {
      setPublishing(true);
      const res = await publishPage("home_kit");
      setPublishing(false);
      if (!res.ok) { toast({ title: "Could not publish", description: res.message, variant: "destructive" }); return; }
      await onPublished();
    }
    if (action.target === "composer") onGo("campaigns");
    else setIntakeOpen(true);
  };

  return (
    <div className="space-y-6" data-testid="kit-ready">
      <header>
        <h1 className="font-display text-[30px] font-bold leading-tight text-forest dark:text-foreground sm:text-[40px] break-words">
          {biz.name}, your referral kit is ready.
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">Three things are set up for you. One button sends your ask to every customer.</p>
      </header>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-3">
        <Card title="Your referral page" testId="kit-page">
          <p className="break-all rounded-lg bg-muted/40 px-3 py-2 text-sm font-semibold text-foreground">{displayUrl}</p>
          <div className="mt-auto flex flex-wrap gap-2 pt-4">
            <Button variant="outline" className="h-11" onClick={onCopy}>Copy</Button>
            <Button variant="outline" className="h-11" asChild><a href={publicUrl} target="_blank" rel="noopener noreferrer">View page</a></Button>
          </div>
        </Card>

        <Card title="Your flyer" testId="kit-flyer">
          <div className="mx-auto flex items-center justify-center rounded-md bg-muted/50 p-2" style={{ width: FRAME_W + 16, maxWidth: "100%", height: FRAME_H + 16 }}>
            <div className="overflow-hidden rounded-sm border border-border bg-white shadow-sm" style={{ width: FLYER.widthIn * PX_PER_IN * scale, height: FLYER.heightIn * PX_PER_IN * scale }}>
              <AssetSheet asset={FLYER} biz={biz} url={publicUrl} scale={scale} />
            </div>
          </div>
          <div className="mt-auto pt-4">
            <Button variant="outline" className="h-11" onClick={() => onGo("share")}>Open print kit</Button>
          </div>
        </Card>

        <Card title="Your ask" testId="kit-ask">
          <div className="rounded-lg border border-line bg-muted/20 p-4 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Preview</p>
            <p className="mt-2 font-semibold text-foreground">{renderLaunchText(LAUNCH_DEFAULT_SUBJECT, tokens)}</p>
            <p data-testid="kit-ask-body" className="mt-2 whitespace-pre-wrap text-muted-foreground">{renderLaunchText(LAUNCH_DEFAULT_BODY, tokens)}</p>
            <span className="mt-3 inline-block rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">{LAUNCH_BUTTON_LABEL}</span>
          </div>
        </Card>
      </div>

      <section className="rounded-[14px] bg-forest p-6 text-white sm:p-8">
        <Button variant="sign" size="lg" data-testid="kit-send" className="h-14 w-full text-lg sm:w-auto" onClick={() => void send()} disabled={publishing}>
          {publishing && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}{action.label}
        </Button>
        {trialNote && <p className="mt-3 text-sm font-semibold" data-testid="kit-trial-note">{TRIAL_SEND_NOTE}</p>}
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <a href="?tab=customers" onClick={(e) => { e.preventDefault(); onGo("customers"); }} className="font-semibold text-white underline underline-offset-2">Text it yourself instead</a>
          <a href="?tab=share" onClick={(e) => { e.preventDefault(); onGo("share"); }} className="font-semibold text-white underline underline-offset-2">Print it instead</a>
        </div>
      </section>

      <a href="?tab=profile" onClick={(e) => { e.preventDefault(); onGo("profile"); }} data-testid="kit-profile-step"
        className="flex min-h-11 items-center gap-3 rounded-[14px] border border-line bg-card p-4 font-semibold text-forest hover:border-forest">
        <span aria-hidden className="h-5 w-5 shrink-0 rounded border-2 border-line" />Finish your marketplace profile
      </a>
      <OwnershipKitItem onGo={onGo} />

      {intakeOpen && <div id="kit-intake">{renderIntake()}</div>}
    </div>
  );
};

export default ReferralKitHome;
