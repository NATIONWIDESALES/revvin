import { useState } from "react";
import { Copy, Check, X, MessageSquare, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { copyText } from "@/lib/clipboard";
import SimpleQRCode from "@/components/marketplace/SimpleQRCode";
import AddToHomeScreen from "@/components/pwa/AddToHomeScreen";

interface Props {
  businessName: string;
  offerAmount: string | null;
  publicUrl: string;
  onShared: () => void;
  onOpenPrintPack: () => void;
  onDismiss: () => void;
}

/**
 * The message the owner sends is built here so it is the same text everywhere.
 * The reward sentence is dropped entirely when no reward has been set, so we
 * never promise a payment the business has not stated.
 */
export const firstAskMessage = (businessName: string, publicUrl: string, offerAmount: string | null) => {
  const base = `Hi, it's ${businessName}. Thanks again for having us out. If anyone you know needs the same work, this link comes straight to me: ${publicUrl}.`;
  const reward = offerAmount?.trim();
  return reward ? `${base} I pay ${reward} if it turns into a job.` : base;
};

const WelcomeLiveCard = ({ businessName, offerAmount, publicUrl, onShared, onOpenPrintPack, onDismiss }: Props) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const message = firstAskMessage(businessName, publicUrl, offerAmount);

  const copyLink = async () => {
    onShared();
    const ok = await copyText(publicUrl);
    if (!ok) {
      toast({ title: "Could not copy the link", description: "Select the link and copy it manually.", variant: "destructive" });
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const sendFirstAsk = async () => {
    onShared();
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({ text: message });
        return;
      } catch {
        /* a cancelled share falls through to the messages app */
      }
    }
    window.location.href = `sms:?&body=${encodeURIComponent(message)}`;
  };

  return (
    <div className="relative mb-8 rounded-2xl border border-primary/30 bg-primary/5 p-6">
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="absolute right-3 top-3 rounded-md p-1.5 text-muted-foreground hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>

      <h2 className="text-lg font-semibold tracking-tight text-foreground">You're live</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Your referral page is published. The fastest first win is texting the customers you finished with recently.
      </p>

      <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-start">
        <div className="rounded-xl border border-border bg-background p-3">
          <SimpleQRCode url={publicUrl} size={140} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm text-foreground break-all">
            {publicUrl}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={copyLink}>
              {copied ? <><Check className="mr-2 h-3.5 w-3.5" /> Copied</> : <><Copy className="mr-2 h-3.5 w-3.5" /> Copy link</>}
            </Button>
          </div>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button className="h-11 sm:h-10" onClick={sendFirstAsk}>
              <MessageSquare className="mr-2 h-3.5 w-3.5" /> Text my last 5 customers
            </Button>
            <Button variant="outline" className="h-11 sm:h-10" onClick={onOpenPrintPack}>
              <Printer className="mr-2 h-3.5 w-3.5" /> Download print pack
            </Button>
          </div>
          <AddToHomeScreen surface="welcome_card" className="mt-4" />
        </div>
      </div>
    </div>
  );
};

export default WelcomeLiveCard;
