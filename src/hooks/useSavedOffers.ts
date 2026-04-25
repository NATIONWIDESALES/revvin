import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "revvin:saved-offers";

function readIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

function writeIds(ids: string[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    /* no-op */
  }
}

const EVENT_NAME = "revvin:saved-offers-changed";

/**
 * Persistent bookmarks for referral offers stored in localStorage.
 * Synchronises across components (and tabs) via a custom event + the
 * native `storage` event so multiple OfferCards stay in sync instantly.
 */
export function useSavedOffers() {
  const [ids, setIds] = useState<string[]>(readIds);

  useEffect(() => {
    const sync = () => setIds(readIds());
    window.addEventListener(EVENT_NAME, sync);
    window.addEventListener("storage", (e) => {
      if (e.key === STORAGE_KEY) sync();
    });
    return () => {
      window.removeEventListener(EVENT_NAME, sync);
      window.removeEventListener("storage", sync as any);
    };
  }, []);

  const persist = useCallback((next: string[]) => {
    writeIds(next);
    setIds(next);
    window.dispatchEvent(new Event(EVENT_NAME));
  }, []);

  const isSaved = useCallback((id: string) => ids.includes(id), [ids]);

  const toggle = useCallback(
    (id: string) => {
      const next = ids.includes(id) ? ids.filter((x) => x !== id) : [id, ...ids];
      persist(next);
      return next.includes(id);
    },
    [ids, persist],
  );

  const remove = useCallback(
    (id: string) => {
      if (!ids.includes(id)) return;
      persist(ids.filter((x) => x !== id));
    },
    [ids, persist],
  );

  const clear = useCallback(() => persist([]), [persist]);

  return { ids, isSaved, toggle, remove, clear };
}
