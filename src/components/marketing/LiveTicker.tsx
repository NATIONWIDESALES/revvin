import { useReducedMotion } from "framer-motion";

const events = [
  "New referral · Apex Roofing · Denver, CO",
  "Deal closed · $8,400 job · Summit HVAC",
  "Page launched · Cascade Plumbing · Portland, OR",
  "New referral · Northstar Solar · Calgary, AB",
  "Deal closed · $14,200 contract · Ironclad Contracting",
  "Page launched · Bluewater Pools · Tampa, FL",
  "New referral · Ridgeline Painting · Toronto, ON",
  "Deal closed · $3,900 install · BrightSpark Electrical",
  "Page launched · True North Roofing · Edmonton, AB",
  "New referral · Coastal Landscaping · San Diego, CA",
];

export default function LiveTicker({
  variant = "dark",
  speed = 60,
}: {
  variant?: "dark" | "light";
  speed?: number;
}) {
  const prefersReduced = useReducedMotion();
  const row = events.join("    ");

  const isDark = variant === "dark";
  const fadeFrom = isDark ? "from-ink" : "from-surface-warm";
  const fadeTo = isDark ? "to-ink" : "to-surface-warm";

  return (
    <div className={isDark ? "bg-ink text-white" : "bg-surface-warm text-foreground"}>
      <div className="container flex items-center gap-5 py-3.5">
        <span
          className={`inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${
            isDark ? "bg-white/10 text-white/90" : "bg-primary/10 text-primary"
          }`}
        >
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
          </span>
          Example feed
        </span>
        <div className="relative flex-1 overflow-hidden">
          <div aria-hidden className={`pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r ${fadeFrom} to-transparent`} />
          <div aria-hidden className={`pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l ${fadeFrom} to-transparent`} />
          <div
            className="flex whitespace-nowrap"
            style={{
              animation: prefersReduced ? "none" : `live-ticker ${speed}s linear infinite`,
            }}
          >
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className={`px-6 text-sm font-medium ${isDark ? "text-white/80" : "text-foreground/80"}`}
              >
                {row}    
              </span>
            ))}
          </div>
        </div>
      </div>
      <style>{`
        @keyframes live-ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-33.333%); }
        }
      `}</style>
    </div>
  );
}