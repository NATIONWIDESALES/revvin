import { useReducedMotion } from "framer-motion";

const stats = [
  { v: "$200–$600", l: "avg cost of a paid lead" },
  { v: "$0", l: "extra fee per referral" },
  { v: "10 min", l: "to launch your page" },
  { v: "100%", l: "of payout goes to your referrer" },
  { v: "1 plan", l: "no upsells, no add-ons" },
  { v: "US + CA", l: "live in both countries" },
];

export default function StatsMarquee() {
  const prefersReduced = useReducedMotion();
  return (
    <section className="relative overflow-hidden border-y border-border bg-ink text-white">
      <div aria-hidden className="aurora opacity-50" />
      <div className="relative">
        <div
          className="flex whitespace-nowrap py-7"
          style={{ animation: prefersReduced ? "none" : "stats-x 50s linear infinite" }}
        >
          {[0, 1, 2].map((g) => (
            <div key={g} className="flex shrink-0 items-center gap-16 px-8">
              {stats.map((s, i) => (
                <div key={i} className="flex items-baseline gap-3">
                  <span className="text-3xl font-extrabold tracking-tight text-white md:text-4xl">
                    {s.v}
                  </span>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50">
                    {s.l}
                  </span>
                  <span aria-hidden className="ml-8 inline-block h-1.5 w-1.5 rounded-full bg-primary/80" />
                </div>
              ))}
            </div>
          ))}
        </div>
        <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-ink to-transparent" />
        <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-ink to-transparent" />
      </div>
      <style>{`
        @keyframes stats-x {
          0% { transform: translateX(0); }
          100% { transform: translateX(-33.333%); }
        }
      `}</style>
    </section>
  );
}