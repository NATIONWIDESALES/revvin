import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { applyServiceWorkerUpdate, initServiceWorker } from "@/pwa/register";

/**
 * Registers the service worker and, when a newer version is waiting, offers a
 * refresh. The app never reloads on its own: a reload in the middle of writing a
 * lead would lose work.
 */
const UpdateToast = () => {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void initServiceWorker(() => setReady(true));
  }, []);

  if (!ready) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-0 bottom-0 z-[60] flex justify-center px-3"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 12px)" }}
    >
      <div className="flex items-center gap-3 rounded-full border border-border bg-card px-4 py-2 shadow-lg">
        <span className="text-sm text-foreground">A new version of Revvin is ready</span>
        <Button size="sm" onClick={() => void applyServiceWorkerUpdate()}>
          Refresh
        </Button>
      </div>
    </div>
  );
};

export default UpdateToast;
