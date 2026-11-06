import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { track } from "@/lib/track";
import { publishPage, type PublishSurface } from "@/lib/publishPage";

export const PUBLISH_COPY = {
  title: "Finish your page to make it live",
  body: "Publishing is free. It is what makes your referral page reachable at your link.",
  button: "Publish my page",
  finish: "Finish setup",
  shareBody: "Your link and QR code only work once your page is live, so they are hidden until you publish.",
} as const;

const FIELD_LABELS: Record<string, string> = { slug: "your page link", name: "your business name", offer_amount: "the reward you pay" };

/** Required fields still empty, in the same order the server checks them. */
export function missingForPublish(b: { slug?: string | null; name?: string | null; offer_amount?: string | null }): string[] {
  return (["slug", "name", "offer_amount"] as const).filter((k) => !(b[k] ?? "").trim());
}

function listLabels(keys: string[]): string {
  const l = keys.map((k) => FIELD_LABELS[k] ?? k);
  return l.length <= 1 ? l.join("") : `${l.slice(0, -1).join(", ")} and ${l[l.length - 1]}`;
}

interface Props {
  surface: PublishSurface;
  onPublished: () => void;
  /** Extra line under the headline, for surfaces that hide something. */
  note?: string;
  /**
   * Dashboard banner only: required fields still empty. When none are missing
   * the page is published automatically once, with no action from the owner.
   */
  missing?: string[];
}

const PublishPrompt = ({ surface, onPublished, note, missing }: Props) => {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoTried = useRef(false);
  const auto = surface === "dashboard_banner" && missing !== undefined;
  const incomplete = (missing ?? []).length > 0;

  const goLive = async () => {
    setBusy(true);
    setError(null);
    const result = await publishPage(surface);
    setBusy(false);
    if (!result.ok) { setError(result.message ?? null); return; }
    toast({ title: "Your referral page is live" });
    onPublished();
  };

  useEffect(() => {
    if (!auto || incomplete || autoTried.current) return;
    autoTried.current = true;
    void goLive();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, incomplete]);

  if (auto && !incomplete && !error) {
    return busy ? <p className="mb-6 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Making your page live</p> : null;
  }

  return (
    <div role="region" aria-label="Your page is not live yet" className="mb-6 rounded-2xl border border-line bg-card p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">{PUBLISH_COPY.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {auto && incomplete ? `Add ${listLabels(missing!)} and your page goes live.` : note ?? PUBLISH_COPY.body}
          </p>
        </div>
        {auto && incomplete ? (
          <Button asChild size="lg" className="w-full shrink-0 sm:w-auto"><Link to="/welcome">{PUBLISH_COPY.finish}</Link></Button>
        ) : (
          <Button onClick={() => { track("go_live_clicked"); void goLive(); }} disabled={busy} size="lg" className="w-full shrink-0 sm:w-auto">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : PUBLISH_COPY.button}
          </Button>
        )}
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-foreground">{error}</p>}
    </div>
  );
};

export default PublishPrompt;
