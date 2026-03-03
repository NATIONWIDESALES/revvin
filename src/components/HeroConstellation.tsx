import { useEffect, useRef, useCallback } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

interface Dot {
  x: number;
  y: number;
  r: number;
  ox: number;
  oy: number;
  dx: number;
  dy: number;
  dur: number;
  phase: number;
  color: string;
  opacity: number;
}

const makeDots = (): Dot[] => {
  const raw: { x: number; y: number; r: number; anchor?: boolean; green?: boolean }[] = [
    { x: 620, y: 120, r: 11, anchor: true, green: true },
    { x: 820, y: 280, r: 10, anchor: true },
    { x: 380, y: 350, r: 12, anchor: true, green: true },
    { x: 750, y: 420, r: 10, anchor: true },
    { x: 500, y: 60, r: 11, anchor: true, green: true },
    { x: 50, y: 80, r: 4 }, { x: 120, y: 200, r: 3 }, { x: 180, y: 320, r: 5 },
    { x: 90, y: 420, r: 3 }, { x: 220, y: 100, r: 6 }, { x: 280, y: 250, r: 4 },
    { x: 200, y: 440, r: 3 }, { x: 330, y: 150, r: 5 }, { x: 350, y: 40, r: 3 },
    { x: 400, y: 200, r: 7 }, { x: 420, y: 460, r: 4 }, { x: 460, y: 130, r: 3 },
    { x: 480, y: 300, r: 5 }, { x: 510, y: 400, r: 4 }, { x: 540, y: 180, r: 6 },
    { x: 560, y: 350, r: 3 }, { x: 580, y: 250, r: 5 }, { x: 600, y: 440, r: 4 },
    { x: 630, y: 310, r: 7 }, { x: 650, y: 50, r: 3 }, { x: 670, y: 200, r: 5 },
    { x: 690, y: 380, r: 4 }, { x: 710, y: 100, r: 6 }, { x: 730, y: 460, r: 3 },
    { x: 760, y: 160, r: 5 }, { x: 780, y: 340, r: 4 }, { x: 800, y: 60, r: 7 },
    { x: 830, y: 200, r: 3 }, { x: 850, y: 400, r: 5 }, { x: 870, y: 130, r: 4 },
    { x: 890, y: 320, r: 6 }, { x: 910, y: 450, r: 3 }, { x: 930, y: 80, r: 5 },
    { x: 950, y: 250, r: 4 }, { x: 970, y: 370, r: 7 }, { x: 440, y: 350, r: 3 },
    { x: 300, y: 400, r: 5 }, { x: 160, y: 150, r: 4 }, { x: 550, y: 470, r: 6 },
    { x: 700, y: 440, r: 3 }, { x: 850, y: 480, r: 4 }, { x: 250, y: 50, r: 5 },
    { x: 770, y: 240, r: 3 }, { x: 640, y: 400, r: 5 }, { x: 480, y: 480, r: 4 },
  ];

  return raw.map((d, i) => {
    const angle = ((i * 137.5) % 360) * (Math.PI / 180);
    const dist = 5 + (i % 6);
    return {
      x: d.x, y: d.y, r: d.r,
      ox: d.x, oy: d.y,
      dx: Math.cos(angle) * dist,
      dy: Math.sin(angle) * dist,
      dur: 6 + (i % 5),
      phase: (i * 0.7) % (2 * Math.PI),
      color: d.green ? "#15803D" : "#94A3B8",
      opacity: d.anchor ? 0.3 : 0.2,
    };
  });
};

const DOTS = makeDots();
const CONNECTION_DIST = 180;

const HeroConstellation = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const isMobile = useIsMobile();

  const draw = useCallback((time: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.scale(dpr, dpr);
    }

    ctx.clearRect(0, 0, w, h);

    const mobile = w < 768;
    const scaleX = w / 1000;
    const scaleY = h / 500;
    const driftScale = mobile ? 0.5 : 1;
    const opacityScale = mobile ? 0.5 : 0.7;

    const t = time / 1000;

    const positions = DOTS.map((dot) => {
      const progress = Math.sin(t / dot.dur * Math.PI * 2 + dot.phase);
      return {
        x: (dot.ox + dot.dx * progress * driftScale) * scaleX,
        y: (dot.oy + dot.dy * progress * driftScale) * scaleY,
        r: dot.r * Math.min(scaleX, scaleY),
        color: dot.color,
        opacity: dot.opacity * opacityScale,
      };
    });

    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const dx = positions[i].x - positions[j].x;
        const dy = positions[i].y - positions[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const threshold = CONNECTION_DIST * Math.min(scaleX, scaleY);
        if (dist < threshold) {
          const fade = 1 - dist / threshold;
          ctx.beginPath();
          ctx.moveTo(positions[i].x, positions[i].y);
          ctx.lineTo(positions[j].x, positions[j].y);
          ctx.strokeStyle = `rgba(148, 163, 184, ${0.15 * fade * opacityScale})`;
          ctx.lineWidth = 0.75;
          ctx.stroke();
        }
      }
    }

    for (const p of positions) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.color === "#15803D"
        ? `rgba(21, 128, 61, ${p.opacity})`
        : `rgba(148, 163, 184, ${p.opacity})`;
      ctx.fill();
    }

    animRef.current = requestAnimationFrame(draw);
  }, []);

  useEffect(() => {
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="absolute inset-0 w-full h-full pointer-events-none z-0"
      style={{ left: isMobile ? "0%" : "15%" }}
    />
  );
};

export default HeroConstellation;
