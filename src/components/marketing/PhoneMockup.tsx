import { cn } from "@/lib/utils";
import { BatteryFull, Signal, Wifi } from "lucide-react";
import { ReactNode, useEffect, useState } from "react";

interface PhoneMockupProps {
  children: ReactNode;
  className?: string;
  rotate?: number;
  tiltX?: number;
  tiltY?: number;
  tiltZ?: number;
  interactive?: boolean;
}

/** Decorative phone frame. Pointer tilt and float are plain CSS, off under reduced motion. */
export default function PhoneMockup({
  children,
  className,
  rotate = 3,
  tiltX = 0,
  tiltY = 0,
  tiltZ,
  interactive = false,
}: PhoneMockupProps) {
  const [finePointer, setFinePointer] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [extra, setExtra] = useState({ x: 0, y: 0 });
  const desktopMotion = interactive && finePointer && !reduced;
  const baseX = finePointer ? tiltX : tiltX * 0.45;
  const baseY = finePointer ? tiltY : tiltY * 0.45;
  const baseZ = tiltZ ?? rotate;

  useEffect(() => {
    const pointer = window.matchMedia("(pointer: fine)");
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      setFinePointer(pointer.matches);
      setReduced(motion.matches);
    };
    update();
    pointer.addEventListener("change", update);
    motion.addEventListener("change", update);
    return () => {
      pointer.removeEventListener("change", update);
      motion.removeEventListener("change", update);
    };
  }, []);

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!desktopMotion) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    setExtra({
      x: -((event.clientY - bounds.top) / bounds.height - 0.5) * 12,
      y: ((event.clientX - bounds.left) / bounds.width - 0.5) * 12,
    });
  };

  const resetPointer = () => setExtra({ x: 0, y: 0 });

  return (
    <div
      className={cn("phone-stage relative", className)}
      onPointerMove={handlePointerMove}
      onPointerLeave={resetPointer}
    >
      <div aria-hidden className="phone-aura absolute -inset-10 -z-10 rounded-full blur-3xl" />
      <div aria-hidden className="phone-ground-shadow absolute -bottom-8 left-1/2 -z-10 h-10 w-56 -translate-x-1/2 rounded-full" />
      <div className={cn("mx-auto", desktopMotion && "phone-float")}>
        <div
          className="phone-frame relative mx-auto h-[660px] w-[320px] p-[7px] transition-transform duration-300 ease-out"
          style={{
            transform: `rotateX(${baseX + (desktopMotion ? extra.x : 0)}deg) rotateY(${baseY + (desktopMotion ? extra.y : 0)}deg) rotateZ(${baseZ}deg)`,
            transformStyle: "preserve-3d",
          }}
        >
          <span aria-hidden className="phone-button phone-action" />
          <span aria-hidden className="phone-button phone-volume-up" />
          <span aria-hidden className="phone-button phone-volume-down" />
          <span aria-hidden className="phone-button phone-power" />
          <div className="phone-screen relative h-full w-full overflow-hidden bg-background">
            <div aria-hidden className="absolute left-1/2 top-[10px] z-30 h-[26px] w-[28%] -translate-x-1/2 rounded-full bg-ink shadow-soft" />
            <div aria-hidden className="absolute inset-x-0 top-0 z-20 flex h-11 items-center justify-between px-5 text-[10px] font-bold text-foreground">
              <span>9:41</span>
              <span className="flex items-center gap-1">
                <Signal className="h-3 w-3" />
                <Wifi className="h-3 w-3" />
                <BatteryFull className="h-3.5 w-3.5" />
              </span>
            </div>
            <div className="absolute inset-x-0 bottom-0 top-11 overflow-hidden">{children}</div>
            <div aria-hidden className="phone-sheen pointer-events-none absolute inset-0 z-40" />
          </div>
        </div>
      </div>
    </div>
  );
}