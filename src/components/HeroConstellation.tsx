import { motion } from "framer-motion";

const dots = [
  { x: 85, y: 60, r: 4 }, { x: 190, y: 35, r: 3 }, { x: 310, y: 80, r: 5 },
  { x: 420, y: 45, r: 3.5 }, { x: 530, y: 90, r: 4.5 }, { x: 145, y: 150, r: 3 },
  { x: 260, y: 180, r: 5.5 }, { x: 380, y: 140, r: 4 }, { x: 500, y: 170, r: 3 },
  { x: 70, y: 250, r: 5 }, { x: 200, y: 280, r: 3.5 }, { x: 340, y: 260, r: 4.5 },
  { x: 460, y: 240, r: 3 }, { x: 560, y: 270, r: 5 }, { x: 120, y: 340, r: 4 },
  { x: 250, y: 360, r: 3 }, { x: 400, y: 330, r: 5 }, { x: 520, y: 350, r: 4 },
  { x: 170, y: 110, r: 3.5 }, { x: 440, y: 310, r: 4.5 },
];

const PROXIMITY = 160;

const lines: { x1: number; y1: number; x2: number; y2: number }[] = [];
for (let i = 0; i < dots.length; i++) {
  for (let j = i + 1; j < dots.length; j++) {
    const dx = dots[i].x - dots[j].x;
    const dy = dots[i].y - dots[j].y;
    if (Math.sqrt(dx * dx + dy * dy) < PROXIMITY) {
      lines.push({ x1: dots[i].x, y1: dots[i].y, x2: dots[j].x, y2: dots[j].y });
    }
  }
}

// Seeded drift offsets for each dot
const drifts = [
  { dx: 3, dy: -2 }, { dx: -2, dy: 3 }, { dx: 4, dy: 2 }, { dx: -3, dy: -3 },
  { dx: 2, dy: 4 }, { dx: -4, dy: 2 }, { dx: 3, dy: -3 }, { dx: -2, dy: -4 },
  { dx: 4, dy: 3 }, { dx: -3, dy: 2 }, { dx: 2, dy: -3 }, { dx: -4, dy: -2 },
  { dx: 3, dy: 4 }, { dx: -2, dy: -3 }, { dx: 4, dy: -2 }, { dx: -3, dy: 3 },
  { dx: 2, dy: -4 }, { dx: -4, dy: 3 }, { dx: 3, dy: 2 }, { dx: -2, dy: -2 },
];

const HeroConstellation = () => (
  <div className="absolute inset-0 pointer-events-none hidden md:flex items-center justify-center z-0">
    <svg
      width="600"
      height="400"
      viewBox="0 0 600 400"
      className="translate-x-[10%]"
      aria-hidden="true"
    >
      {lines.map((l, i) => (
        <line
          key={i}
          x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
          stroke="#D1D5DB"
          strokeWidth={0.75}
          opacity={0.15}
        />
      ))}
      {dots.map((dot, i) => (
        <motion.circle
          key={i}
          cx={dot.x}
          cy={dot.y}
          r={dot.r}
          fill="#D1D5DB"
          opacity={0.3}
          animate={{
            cx: [dot.x, dot.x + drifts[i].dx, dot.x],
            cy: [dot.y, dot.y + drifts[i].dy, dot.y],
          }}
          transition={{
            duration: 10 + (i % 3),
            repeat: Infinity,
            repeatType: "mirror",
            ease: "easeInOut",
          }}
        />
      ))}
    </svg>
  </div>
);

export default HeroConstellation;
