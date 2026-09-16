import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { X, Download, Share, Plus } from "lucide-react";
import {
  INSTALL_HINT_DAYS,
  INSTALL_HINT_KEY,
  isInAppBrowser,
  isIos,
  isStandalone,
} from "@/config/pwa";
import { canPromptInstall, promptInstall } from "@/components/pwa/InstallAppButton";

const DAY_MS = 24 * 60 * 60 * 1000;

const dismissedRecently = () => {
  try {
    const raw = localStorage.getItem(INSTALL_HINT_KEY);
    if (!raw) return false;
    return Date.now() - Number(raw) < INSTALL_HINT_DAYS * DAY_MS;
  } catch {
    return false;
  }
};

const remember = () => {
  try {
    localStorage.setItem(INSTALL_HINT_KEY, String(Date.now()));
  } catch {
    /* private mode: the hint simply shows again next time */
  }
};

/**
 * Mobile only install hint, at most once every 14 days. Android and Edge get the
 * real install prompt; iPhone and iPad get the Add to Home Screen steps, since
 * Safari has no install API. Nothing shows inside an app already installed, and
 * inside Instagram or Facebook the only useful advice is to open Safari.
 */
const InstallPrompt = () => {
  const [visible, setVisible] = useState(false);
  const [installable, setInstallable] = useState(canPromptInstall());

  useEffect(() => {
    const onReady = () => setInstallable(true);
    window.addEventListener("revvin:installable", onReady);
    return () => window.removeEventListener("revvin:installable", onReady);
  }, []);

  useEffect(() => {
    if (isStandalone() || dismissedRecently()) return;
    const mobile = window.matchMedia("(max-width: 767px)").matches;
    if (!mobile) return;
    if (!installable && !isIos()) return;
    const timer = setTimeout(() => setVisible(true), 3000);
    return () => clearTimeout(timer);
  }, [installable]);

  if (!visible) return null;

  const close = () => {
    remember();
    setVisible(false);
  };

  const inApp = isInAppBrowser();

  return (
    <div
      role="dialog"
      aria-label="Install the Revvin app"
      className="fixed inset-x-0 bottom-0 z-50 md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-3 mb-3 rounded-2xl border border-border bg-card p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <img src="/icons/icon-192.png" alt="" className="h-10 w-10 rounded-xl" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-foreground">Install the Revvin app</p>
            {inApp ? (
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Open revvin.co in Safari first, then add it to your Home Screen.
              </p>
            ) : installable ? (
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Get your leads and referral page from your home screen, full screen.
              </p>
            ) : (
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Tap{" "}
                <Share className="inline h-3.5 w-3.5 align-[-2px] text-foreground" aria-label="Share" />{" "}
                Share, then{" "}
                <Plus className="inline h-3.5 w-3.5 align-[-2px] text-foreground" aria-hidden />{" "}
                Add to Home Screen.
              </p>
            )}
            {installable && !inApp && (
              <Button
                size="sm"
                className="mt-3"
                onClick={async () => {
                  await promptInstall();
                  close();
                }}
              >
                <Download className="mr-2 h-4 w-4" />
                Install
              </Button>
            )}
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Dismiss"
            className="rounded-md p-1 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default InstallPrompt;
