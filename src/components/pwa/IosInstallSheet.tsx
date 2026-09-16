import { Share, Plus, X } from "lucide-react";
import { isInAppBrowser } from "@/config/pwa";

interface Props {
  open: boolean;
  onClose: () => void;
}

/** The Add to Home Screen steps for iPhone and iPad, where Safari has no install API. */
const IosInstallSheet = ({ open, onClose }: Props) => {
  if (!open) return null;
  const inApp = isInAppBrowser();

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={onClose}>
      <div
        role="dialog"
        aria-label="Add Revvin to your Home Screen"
        className="w-full rounded-t-2xl border-t border-border bg-card p-5"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 20px)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="/icons/icon-192.png" alt="" className="h-10 w-10 rounded-xl" />
            <p className="text-base font-bold text-foreground">Add Revvin to your Home Screen</p>
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
          <p className="text-sm leading-relaxed text-muted-foreground">
            You are inside another app's browser, which cannot add to the Home Screen. Open
            revvin.co in Safari, then come back to these steps.
          </p>
        ) : (
          <ol className="space-y-3 text-sm text-foreground">
            <li className="flex items-center gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                1
              </span>
              <span className="flex items-center gap-2">
                Tap <Share className="h-4 w-4" aria-label="the Share button" /> Share in Safari
              </span>
            </li>
            <li className="flex items-center gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                2
              </span>
              <span className="flex items-center gap-2">
                Choose <Plus className="h-4 w-4" aria-hidden /> Add to Home Screen
              </span>
            </li>
            <li className="flex items-center gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                3
              </span>
              <span>Open Revvin from your home screen, then turn on notifications</span>
            </li>
          </ol>
        )}
      </div>
    </div>
  );
};

export default IosInstallSheet;
