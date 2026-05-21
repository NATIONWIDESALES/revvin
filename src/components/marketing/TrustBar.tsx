import { useReducedMotion } from "framer-motion";

const industries = [
  "Roofers",
  "HVAC techs",
  "General contractors",
  "Mortgage brokers",
  "Real estate agents",
  "Plumbers",
  "Solar installers",
  "Home services",
  "Auto detailing",
  "Insurance brokers",
  "Painters",
  "Landscapers",
];

export default function TrustBar() {
  const prefersReduced = useReducedMotion();
  const row = industries.join("  ·  ");

  return (
    <div className="relative border-y border-border bg-surface-warm">
      <div className="container flex items-center gap-6 py-5">
        <p className="hidden shrink-0 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground md:block">
          Built for
        </p>
        <div className="relative flex-1 overflow-hidden">
          {/* fade edges */}
          <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-surface-warm to-transparent" />
          <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-surface-warm to-transparent" />
          <div
            className="flex whitespace-nowrap"
            style={{
              animation: prefersReduced ? "none" : `marquee-x 38s linear infinite`,
            }}
          >
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="px-6 text-[12px] font-semibold uppercase tracking-[0.18em] text-foreground/70"
              >
                {row}  ·  
              </span>
            ))}
          </div>
        </div>
      </div>
      <style>{`
        @keyframes marquee-x {
          0% { transform: translateX(0); }
          100% { transform: translateX(-33.333%); }
        }
      `}</style>
    </div>
  );
}