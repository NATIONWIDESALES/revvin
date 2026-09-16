import { Share, Plus, X } from "lucide-react";
import { isInAppBrowser } from "@/config/pwa";
import { INSTALL_COPY } from "@/config/installCopy";

interface Props {
  open: boolean;
  onClose: () => void;
}

/** The Add to Home Screen steps for iPhone and iPad, where Safari has no install API. */
const IosInstallSheet = ({ open, onClose }: Props) => {
  if (!open) return null;
  const inApp = isInAppBrowser();
  const stepIcons = [
    <Share key="share" className="h-4 w-4" aria-label="the Share button" />,
    <Plus key="plus" className="h-4 w-4" aria-hidden />,
    null,
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={onClose}>
      <div
        role="dialog"
        aria-label={INSTALL_COPY.iosTitle}
        className="w-full rounded-t-2xl border-t border-border bg-card p-5"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 20px)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="/icons/icon-192.png" alt="" className="h-10 w-10 rounded-xl" />
            <p className="text-base font-bold text-foreground">{INSTALL_COPY.iosTitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {inApp ? (
          <p className="text-sm leading-relaxed text-muted-foreground">{INSTALL_COPY.inAppBrowser}</p>
        ) : (
          <>
            <ol className="space-y-3 text-sm text-foreground">
              {INSTALL_COPY.iosSteps.map((step, i) => (
                <li key={step} className="flex items-center gap-2">
                  <span>{step}</span>
                  {stepIcons[i]}
                </li>
              ))}
            </ol>
            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">{INSTALL_COPY.iosNote}</p>
          </>
        )}
      </div>
    </div>
  );
};

export default IosInstallSheet;
