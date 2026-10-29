import { useEffect, useState } from "react";
import SimpleQRCode from "@/components/marketplace/SimpleQRCode";

/** Fictional example businesses for the decorative yard sign. */
export const SIGN_EXAMPLES = [
  { biz: "Summit Roofing", q: "Know someone who needs a new roof?", amt: "$250", url: "revvin.co/r/summit-roofing" },
  { biz: "Cedar HVAC", q: "Know someone whose furnace quit?", amt: "$150", url: "revvin.co/r/cedar-hvac" },
  { biz: "Greenline Landscaping", q: "Know a yard that needs us?", amt: "$100", url: "revvin.co/r/greenline" },
] as const;

const prefersReducedMotion = () =>
  typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * The yard sign from the free print pack. The only ambient motion on the
 * homepage: the trade swaps every 4 seconds, and never under reduced motion.
 */
export interface SignExample { biz: string; q: string; amt?: string; url: string }

const HeroYardSign = ({ example, compact = false }: { example?: SignExample; compact?: boolean } = {}) => {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (example || prefersReducedMotion()) return;
    const t = window.setInterval(() => setI((n) => (n + 1) % SIGN_EXAMPLES.length), 4000);
    return () => window.clearInterval(t);
  }, [example]);
  const s: SignExample = example ?? SIGN_EXAMPLES[i];
  return (
    <figure className={compact ? "yard-scene yard-compact" : "yard-scene"} aria-label="Example yard sign">
      <div className="yard-sign">
        <div className="yard-sign-panel">
          <p className="yard-sign-biz">{s.biz}</p>
          <p className="yard-sign-q">{s.q}</p>
          <p className="yard-sign-sub">{s.amt ? <>Scan to send them our way. We pay you {s.amt} when they book.</> : <>Scan to send them our way. We pay a reward when they book.</>}</p>
          <div className="yard-sign-foot">
            <span className="yard-sign-url">{s.url}</span>
            <div className="yard-qr" aria-hidden="true">
              <SimpleQRCode url="https://revvin.co/sample" size={78} color="#0F4A2A" />
            </div>
          </div>
          {s.amt && (
            <div className="yard-sticker" aria-hidden="true">
              <b>{s.amt}</b>
              <small>per job</small>
            </div>
          )}
        </div>
        <div className="yard-stakes" aria-hidden="true"><i /><i /></div>
      </div>
      <div className="yard-lawn" aria-hidden="true" />
      <figcaption className="yard-caption">Example sign from the free print pack. Not a real business.</figcaption>
    </figure>
  );
};

export default HeroYardSign;
