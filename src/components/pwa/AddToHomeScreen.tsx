import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Share, Smartphone } from "lucide-react";
import { isInAppBrowser, isIos, isStandalone } from "@/config/pwa";
import { INSTALL_COPY, type InstallSurface } from "@/config/installCopy";
import { canPromptInstall, promptInstall } from "@/components/pwa/InstallAppButton";
import IosInstallSheet from "@/components/pwa/IosInstallSheet";
import { track } from "@/lib/track";

interface Props {
  surface: InstallSurface;
  /** Replaces the standard supporting line, for example the referrer sentence. */
  line?: string;
  className?: string;
  /** A desktop visitor cannot add anything to a phone, so nothing renders there by default. */
  showOnDesktop?: boolean;
}

/**
 * One prompt for every surface. Android and Edge get the real install prompt,
 * iPhone gets the Add to Home Screen steps, and inside Instagram or Facebook the
 * only honest advice is to open Safari or Chrome. It renders nothing once the app
 * is already running from a home screen.
 */
const AddToHomeScreen = ({ surface, line, className, showOnDesktop = false }: Props) => {
  const [installable, setInstallable] = useState(canPromptInstall());
  const [showSteps, setShowSteps] = useState(false);
  const standalone = isStandalone();
  const ios = isIos();
  const inApp = isInAppBrowser();
  const visible = !standalone && (installable || ios || showOnDesktop);

  useEffect(() => {
    const onReady = () => setInstallable(true);
    window.addEventListener("revvin:installable", onReady);
    return () => window.removeEventListener("revvin:installable", onReady);
  }, []);

  useEffect(() => {
    if (visible) track("pwa_install_cta_shown", { surface });
  }, [visible, surface]);

  if (!visible) return null;

  const onClick = () => {
    track("pwa_install_cta_clicked", { surface });
    if (installable && !inApp) {
      void promptInstall();
      return;
    }
    setShowSteps(true);
  };

  const label = installable && !inApp ? INSTALL_COPY.androidButton : INSTALL_COPY.mainLabel;

  return (
    <div className={className}>
      <Button variant="outline" className="h-11 w-full sm:h-10 sm:w-auto" onClick={onClick}>
        {installable && !inApp ? (
          <Smartphone className="mr-2 h-4 w-4" />
        ) : (
          <Share className="mr-2 h-4 w-4" />
        )}
        {label}
      </Button>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        {inApp ? INSTALL_COPY.inAppBrowser : line ?? INSTALL_COPY.supportingLine}
      </p>
      <IosInstallSheet open={showSteps} onClose={() => setShowSteps(false)} />
    </div>
  );
};

export default AddToHomeScreen;
