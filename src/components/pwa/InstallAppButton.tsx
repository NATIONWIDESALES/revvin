import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Share } from "lucide-react";
import { isInAppBrowser, isIos, isStandalone } from "@/config/pwa";
import { track } from "@/lib/track";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/** Chrome and Edge only fire this once per page load, so it is captured globally. */
let capturedPrompt: BeforeInstallPromptEvent | null = null;
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    capturedPrompt = event as BeforeInstallPromptEvent;
    window.dispatchEvent(new Event("revvin:installable"));
  });
  window.addEventListener("appinstalled", () => {
    capturedPrompt = null;
    track("pwa_installed");
  });
}

export const canPromptInstall = () => capturedPrompt !== null;

export const promptInstall = async () => {
  if (!capturedPrompt) return false;
  track("pwa_install_prompted");
  await capturedPrompt.prompt();
  const choice = await capturedPrompt.userChoice;
  capturedPrompt = null;
  return choice.outcome === "accepted";
};

interface Props {
  onIosSteps?: () => void;
  className?: string;
}

/**
 * The install action for the dashboard. Hidden when the app is already
 * installed, and on iPhone it opens the Add to Home Screen steps instead,
 * because Safari has no install API.
 */
const InstallAppButton = ({ onIosSteps, className }: Props) => {
  const [installable, setInstallable] = useState(canPromptInstall());
  const standalone = isStandalone();

  useEffect(() => {
    const onReady = () => setInstallable(true);
    window.addEventListener("revvin:installable", onReady);
    return () => window.removeEventListener("revvin:installable", onReady);
  }, []);

  if (standalone) return null;

  const iosSafari = isIos() && !isInAppBrowser();

  if (!installable && !iosSafari) return null;

  return (
    <Button
      variant="outline"
      className={className}
      onClick={() => {
        if (installable) {
          void promptInstall();
          return;
        }
        onIosSteps?.();
      }}
    >
      {installable ? <Download className="mr-2 h-4 w-4" /> : <Share className="mr-2 h-4 w-4" />}
      Install the Revvin app
    </Button>
  );
};

export default InstallAppButton;
