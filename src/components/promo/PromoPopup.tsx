import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { X, Timer } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { track } from "@/lib/track";
import {
  PROMO_TEXT,
  PROMO_END_DATE_TEXT,
  PROMO_TERMS,
  isPromoLive,
} from "@/config/promo";
import PromoCountdown, { usePromoCountdown } from "@/components/promo/PromoCountdown";

const DISMISS_KEY = "revvin_promo_dismissed_at";
const DISMISS_DAYS = 7;
const DELAY_MS = 6000;
const SCROLL_THRESHOLD = 0.4;

// Pages where the popup must never appear. A business owner's own customers
// must never see Revvin's pricing popup on a referral page.
const BLOCKED_PREFIXES = ["/dashboard", "/welcome", "/auth", "/login", "/signup", "/r/"];

const recentlyDismissed = () => {
  try {
    const raw = window.localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const at = Number(raw);
    if (!Number.isFinite(at)) return false;
    return Date.now() - at < DISMISS_DAYS * 86_400_000;
  } catch {
    return false;
  }
};

const PromoPopup = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const left = usePromoCountdown();
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const restoreFocusTo = useRef<Element | null>(null);

  const blocked =
    !!user ||
    !isPromoLive() ||
    left.expired ||
    BLOCKED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p));

  // Arm the triggers: ~6s, or 40% scroll, whichever comes first. Never instant.
  useEffect(() => {
    if (blocked || open) return;
    if (recentlyDismissed()) return;

    let done = false;
    const fire = () => {
      if (done) return;
      done = true;
      setOpen(true);
    };
    const timer = window.setTimeout(fire, DELAY_MS);
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (max > 0 && window.scrollY / max >= SCROLL_THRESHOLD) fire();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
    };
  }, [blocked, open, pathname]);

  const close = useCallback(() => {
    setOpen(false);
    try {
      window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
    const el = restoreFocusTo.current;
    if (el instanceof HTMLElement) el.focus();
  }, []);

  // Focus management + focus trap + Escape.
  useEffect(() => {
    if (!open) return;
    restoreFocusTo.current = document.activeElement;
    track("promo_popup_shown");
    closeRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      }
      if (e.key !== "Tab") return;
      const nodes = dialogRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!nodes || nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, close]);

  if (!open || blocked) return null;

  const onCta = () => {
    track("promo_cta_clicked");
    try {
      window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
    setOpen(false);
    navigate("/signup?plan=monthly");
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center">
      <div
        className="absolute inset-0 bg-foreground/50 motion-safe:animate-in motion-safe:fade-in"
        onClick={close}
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="promo-popup-title"
        aria-describedby="promo-popup-terms"
        className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-product motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95"
      >
        <button
          ref={closeRef}
          type="button"
          onClick={close}
          aria-label="Close launch promotion"
          className="absolute right-3 top-3 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>

        <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
          <Timer className="h-3.5 w-3.5" aria-hidden="true" /> Launch promotion
        </p>
        <h2 id="promo-popup-title" className="mt-2 pr-6 text-2xl font-extrabold tracking-tight text-foreground">
          Publish for {PROMO_TEXT.pricePerMonth} until {PROMO_END_DATE_TEXT}
        </h2>

        <div className="mt-4 flex flex-wrap items-baseline gap-3">
          <span className="text-4xl font-extrabold tracking-tight text-foreground">{PROMO_TEXT.price}</span>
          <span className="text-sm text-muted-foreground">/month USD</span>
          <span className="text-xl font-semibold text-muted-foreground line-through">
            {PROMO_TEXT.regularPerMonth}
          </span>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
            {PROMO_TEXT.discount} off
          </span>
        </div>

        <PromoCountdown className="mt-3 text-xs text-muted-foreground" />

        <p id="promo-popup-terms" className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {PROMO_TERMS}
        </p>

        <button
          type="button"
          onClick={onCta}
          className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-soft transition-colors hover:bg-primary-deep"
        >
          Build your page free
        </button>
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          Building and previewing your page is still free. The promotion only changes what publishing costs.
        </p>
      </div>
    </div>
  );
};

export default PromoPopup;
