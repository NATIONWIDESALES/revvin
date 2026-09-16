import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Bell, BellOff, Loader2, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  currentSubscription,
  disablePush,
  enablePush,
  readPushState,
  sendTestPush,
  type PushState,
} from "@/lib/push";
import IosInstallSheet from "@/components/pwa/IosInstallSheet";

interface Props {
  businessId?: string | null;
  /** Compact card for the dashboard; the settings page uses the full version. */
  compact?: boolean;
}

/**
 * Turn notifications on or off for this device. Permission is always requested
 * from the tap itself, which is what iOS requires, and on iPhone in a normal
 * Safari tab the only honest answer is to install the app first.
 */
const PushSettings = ({ businessId = null, compact = false }: Props) => {
  const { toast } = useToast();
  const [state, setState] = useState<PushState | "loading">("loading");
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showSteps, setShowSteps] = useState(false);

  const refresh = async () => {
    setState(await readPushState());
    setSubscribed(Boolean(await currentSubscription()));
  };

  useEffect(() => {
    void refresh();
  }, []);

  const turnOn = async () => {
    setBusy(true);
    const result = await enablePush(businessId);
    setBusy(false);
    await refresh();
    if (result.ok) {
      toast({ title: "Notifications on", description: "This device will get new referral alerts." });
      return;
    }
    if (result.message) {
      toast({ title: "Not turned on", description: result.message, variant: "destructive" });
    }
  };

  const turnOff = async () => {
    setBusy(true);
    const ok = await disablePush();
    setBusy(false);
    await refresh();
    toast({
      title: ok ? "Notifications off" : "Could not turn them off",
      description: ok
        ? "This device will not get push notifications."
        : "Please try again in a moment.",
      variant: ok ? undefined : "destructive",
    });
  };

  const test = async () => {
    setBusy(true);
    const result = await sendTestPush();
    setBusy(false);
    toast({
      title: result.ok ? "Test sent" : "Could not send",
      description: result.message,
      variant: result.ok ? undefined : "destructive",
    });
  };

  const body = () => {
    if (state === "loading") {
      return <p className="text-sm text-muted-foreground">Checking this device.</p>;
    }
    if (state === "needs-install") {
      return (
        <>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Add Revvin to your Home Screen first, then turn on notifications here.
          </p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => setShowSteps(true)}>
            Show me how
          </Button>
        </>
      );
    }
    if (state === "unsupported") {
      return (
        <p className="text-sm leading-relaxed text-muted-foreground">
          This browser cannot show push notifications. Your email alerts still work.
        </p>
      );
    }
    if (state === "no-worker") {
      return (
        <p className="text-sm leading-relaxed text-muted-foreground">
          Notifications work on the published Revvin app at revvin.co, not in this preview.
        </p>
      );
    }
    if (state === "denied") {
      return (
        <p className="text-sm leading-relaxed text-muted-foreground">
          Notifications are blocked for Revvin. Open your browser's site settings for revvin.co, set
          Notifications to Allow, then come back and turn them on.
        </p>
      );
    }
    if (state === "granted" && subscribed) {
      return (
        <>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Notifications are on for this device. You get one when a new referral arrives.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={test} disabled={busy}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Send me a test notification
            </Button>
            <Button variant="ghost" size="sm" onClick={turnOff} disabled={busy}>
              <BellOff className="mr-2 h-4 w-4" />
              Turn off
            </Button>
          </div>
        </>
      );
    }
    return (
      <>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Get a notification on this device the moment a referral comes in.
        </p>
        <Button size="sm" className="mt-4" onClick={turnOn} disabled={busy}>
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bell className="mr-2 h-4 w-4" />}
          Turn on notifications
        </Button>
      </>
    );
  };

  return (
    <div className={compact ? "rounded-xl border border-border bg-card p-5" : "rounded-xl border border-border bg-card p-6"}>
      <div className="mb-3 flex items-center gap-2">
        <Bell className="h-5 w-5 text-primary" />
        <h2 className={compact ? "text-base font-bold" : "text-lg font-bold"}>Notifications</h2>
      </div>
      {body()}
      <IosInstallSheet open={showSteps} onClose={() => setShowSteps(false)} />
    </div>
  );
};

export default PushSettings;
