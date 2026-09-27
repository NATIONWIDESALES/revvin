import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { track } from "@/lib/track";
import { publishPage, type PublishSurface } from "@/lib/publishPage";

export const PUBLISH_COPY = {
  title: "Your page isn't live yet. Nobody can see it or send you referrals.",
  body: "Publishing is free. It is what makes your referral page reachable at your link.",
  button: "Publish my page",
  shareBody: "Your link and QR code only work once your page is live, so they are hidden until you publish.",
} as const;

interface Props {
  surface: PublishSurface;
  onPublished: () => void;
  /** Extra line under the headline, for surfaces that hide something. */
  note?: string;
}

/**
 * Non-dismissible not-live notice. There is deliberately no close button:
 * a page nobody can reach is the one state the owner must not miss.
 */
const PublishPrompt = ({ surface, onPublished, note }: Props) => {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ message: string; needsSetup: boolean } | null>(null);
  const seen = useRef(false);

  useEffect(() => {
    if (seen.current || surface !== "dashboard_banner") return;
    seen.current = true;
    track("publish_banner_seen");
  }, [surface]);

  const goLive = async () => {
    track("go_live_clicked");
    setBusy(true);
    setError(null);
    const result = await publishPage(surface);
    setBusy(false);
    if (!result.ok) {
      setError({ message: result.message ?? "", needsSetup: !!result.missing });
      return;
    }
    toast({ title: "Your referral page is live" });
    onPublished();
  };

  return (
    <div role="region" aria-label="Your page is not live" className="mb-6 rounded-2xl border-2 border-destructive/40 bg-destructive/5 p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <div>
            <h2 className="text-base font-semibold text-foreground">{PUBLISH_COPY.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{note ?? PUBLISH_COPY.body}</p>
          </div>
        </div>
        <Button onClick={goLive} disabled={busy} size="lg" className="w-full shrink-0 sm:w-auto">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : PUBLISH_COPY.button}
        </Button>
      </div>
      {error && (
        <p role="alert" className="mt-3 text-sm font-medium text-destructive">
          {error.message}{" "}
          {error.needsSetup && <Link to="/welcome?step=publish" className="underline">Add it now</Link>}
        </p>
      )}
    </div>
  );
};

export default PublishPrompt;
