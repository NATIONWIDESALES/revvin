import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { CLARITY_PROJECT_ID } from "@/config/brand";

/**
 * Microsoft Clarity session recording slot. Empty project id means nothing
 * loads anywhere. When set, the script loads only on marketing pages, /start,
 * /preview and signup/onboarding, never on the dashboard, /r/ referral forms
 * or /me, and only after the visitor interacts or has been idle 3 seconds.
 * Clarity masks input content by default; masking is also set explicitly.
 */
const ALLOWED = (path: string) =>
  !path.startsWith("/dashboard") &&
  !path.startsWith("/r/") &&
  !path.startsWith("/me") &&
  !path.startsWith("/__");

const ClarityLoader = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    if (!CLARITY_PROJECT_ID || !ALLOWED(pathname)) return;
    if (document.getElementById("clarity-script")) return;

    let done = false;
    const load = () => {
      if (done) return;
      done = true;
      cleanup();
      const w = window as unknown as { clarity?: (...args: unknown[]) => void };
      w.clarity = w.clarity ?? ((...args: unknown[]) => {
        ((w.clarity as unknown as { q?: unknown[] }).q = (w.clarity as unknown as { q?: unknown[] }).q ?? []).push(args);
      });
      const s = document.createElement("script");
      s.id = "clarity-script";
      s.async = true;
      s.src = `https://www.clarity.ms/tag/${CLARITY_PROJECT_ID}`;
      document.head.appendChild(s);
      w.clarity("set", "masking", "strict");
    };

    const events: (keyof WindowEventMap)[] = ["pointerdown", "keydown", "scroll", "touchstart"];
    const onInteract = () => load();
    events.forEach((e) => window.addEventListener(e, onInteract, { once: true, passive: true }));
    const idle = window.setTimeout(load, 3000);
    const cleanup = () => {
      events.forEach((e) => window.removeEventListener(e, onInteract));
      window.clearTimeout(idle);
    };
    return cleanup;
  }, [pathname]);

  return null;
};

export default ClarityLoader;
