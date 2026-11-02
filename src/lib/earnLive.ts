import { useEffect, useState } from "react";
import { liveMetros } from "@/lib/earn";

/**
 * Whether the Earn network has at least one live metro. Marketing chrome
 * (homepage, nav, footer) hides Earn links until then; /earn routes themselves
 * stay live and indexable. Defaults to hidden so prerendered HTML and first
 * paint never show a network that has not launched.
 */
let cached: boolean | null = null;
let pending: Promise<boolean> | null = null;

export function earnLive(): Promise<boolean> {
  if (cached !== null) return Promise.resolve(cached);
  if (!pending) {
    pending = liveMetros()
      .then((metros) => {
        cached = metros.length > 0;
        return cached;
      })
      .catch(() => {
        cached = false;
        return false;
      });
  }
  return pending;
}

export function useEarnLive(): boolean {
  const [live, setLive] = useState(cached === true);
  useEffect(() => {
    let on = true;
    void earnLive().then((v) => {
      if (on) setLive(v);
    });
    return () => {
      on = false;
    };
  }, []);
  return live;
}
