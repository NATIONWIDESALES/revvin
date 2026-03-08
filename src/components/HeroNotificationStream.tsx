import React from "react";

const leads = [
  "New lead — Roofing",
  "New lead — Solar Installation",
  "New lead — Mortgage",
  "New lead — Auto Detailing",
  "New lead — Real Estate",
  "New lead — Daycare",
  "New lead — Fitness",
  "New lead — Landscaping",
  "New lead — HVAC",
  "New lead — Insurance",
];

const payouts = [
  "$750 payout — Solar Installation",
  "$400 payout — Roofing",
  "$500 payout — Mortgage",
  "$200 payout — Auto Detailing",
  "$1,200 payout — Real Estate",
  "$300 payout — Daycare",
  "$150 payout — Fitness",
  "$350 payout — Landscaping",
  "$600 payout — HVAC",
  "$450 payout — Insurance",
];

// Duplicate for seamless loop
const leadCards = [...leads, ...leads];
const payoutCards = [...payouts, ...payouts];

const CARD_HEIGHT = 52; // px per card including gap
const GAP = 12;
const TOTAL_CARDS = leadCards.length;
const TOTAL_HEIGHT = TOTAL_CARDS * (CARD_HEIGHT + GAP);
const DURATION = 22; // seconds for full loop

interface CardProps {
  text: string;
  type: "lead" | "payout";
  index: number;
  direction: "down" | "up";
}

const NotificationCard: React.FC<CardProps> = ({ text, type, index, direction }) => {
  const delay = -(index * (DURATION / TOTAL_CARDS));

  return (
    <div
      className="notification-card"
      style={{
        animationDelay: `${delay}s`,
        animationDuration: `${DURATION}s`,
        animationName: direction === "down" ? "scrollDown" : "scrollUp",
        animationTimingFunction: "linear",
        animationIterationCount: "infinite",
        animationFillMode: "none",
        willChange: "transform",
      }}
    >
      <span
        className="dot"
        style={{
          background: type === "payout"
            ? "hsl(142 64% 32%)"
            : "hsl(213 94% 48%)",
        }}
      />
      <span className="card-text">{text}</span>
    </div>
  );
};

const HeroNotificationStream: React.FC = () => {
  return (
    <>
      <style>{`
        @keyframes scrollDown {
          0%   { transform: translateY(0); }
          100% { transform: translateY(${TOTAL_HEIGHT / 2}px); }
        }
        @keyframes scrollUp {
          0%   { transform: translateY(0); }
          100% { transform: translateY(-${TOTAL_HEIGHT / 2}px); }
        }
        .hero-stream-col {
          position: absolute;
          top: 0;
          bottom: 0;
          width: 210px;
          overflow: hidden;
          pointer-events: none;
          mask-image: linear-gradient(
            to bottom,
            transparent 0%,
            black 28%,
            black 72%,
            transparent 100%
          );
          -webkit-mask-image: linear-gradient(
            to bottom,
            transparent 0%,
            black 28%,
            black 72%,
            transparent 100%
          );
        }
        .hero-stream-col.left  { left: 3%; }
        .hero-stream-col.right { right: 3%; }
        .stream-inner {
          display: flex;
          flex-direction: column;
          gap: ${GAP}px;
          position: absolute;
          top: -${TOTAL_HEIGHT / 2}px;
          width: 100%;
        }
        .notification-card {
          display: flex;
          align-items: center;
          gap: 8px;
          background: hsl(var(--card));
          border: 1px solid hsl(var(--border));
          border-radius: 10px;
          padding: 9px 12px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.06);
          width: 100%;
          flex-shrink: 0;
          height: ${CARD_HEIGHT}px;
          box-sizing: border-box;
        }
        .dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .card-text {
          font-size: 12px;
          font-weight: 500;
          color: hsl(var(--foreground));
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          line-height: 1.4;
        }
      `}</style>

      {/* Left column — leads, scrolling down */}
      <div className="hero-stream-col left hidden md:block">
        <div className="stream-inner">
          {leadCards.map((text, i) => (
            <NotificationCard key={`lead-${i}`} text={text} type="lead" index={i} direction="down" />
          ))}
        </div>
      </div>

      {/* Right column — payouts, scrolling up */}
      <div className="hero-stream-col right hidden md:block">
        <div className="stream-inner">
          {payoutCards.map((text, i) => (
            <NotificationCard key={`payout-${i}`} text={text} type="payout" index={i} direction="up" />
          ))}
        </div>
      </div>
    </>
  );
};

export default HeroNotificationStream;
