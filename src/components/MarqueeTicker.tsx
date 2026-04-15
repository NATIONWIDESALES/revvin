import { useReducedMotion } from "framer-motion";

interface MarqueeTickerProps {
  items: string[];
  speed?: number;
  reverse?: boolean;
  className?: string;
}

const MarqueeTicker = ({ items, speed = 40, reverse = false, className = "" }: MarqueeTickerProps) => {
  const prefersReduced = useReducedMotion();
  const content = items.join("  ·  ");
  const duration = (content.length * 0.6) * (40 / speed);

  return (
    <div className={`overflow-hidden whitespace-nowrap group ${className}`}>
      <div
        className="inline-flex gap-0"
        style={{
          animation: prefersReduced ? "none" : `marquee-scroll ${duration}s linear infinite`,
          animationDirection: reverse ? "reverse" : "normal",
        }}
      >
        {[0, 1, 2].map((i) => (
          <span key={i} className="inline-block px-4 text-sm text-muted-foreground font-medium">
            {content}
          </span>
        ))}
      </div>
      <style>{`
        @keyframes marquee-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-33.333%); }
        }
        .group:hover > div {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
};

export default MarqueeTicker;
