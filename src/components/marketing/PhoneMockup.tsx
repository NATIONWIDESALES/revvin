import { cn } from "@/lib/utils";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "framer-motion";
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

export default function PhoneMockup({
  children,
  className,
  rotate = 3,
  tiltX = 0,
  tiltY = 0,
  tiltZ,
  interactive = false,
}: PhoneMockupProps) {
  const prefersReduced = useReducedMotion();
  const [finePointer, setFinePointer] = useState(false);
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const extraX = useSpring(pointerY, { stiffness: 90, damping: 18, mass: 0.7 });
  const extraY = useSpring(pointerX, { stiffness: 90, damping: 18, mass: 0.7 });
  const rotateX = useTransform(extraX, (value) => baseX + value);
  const rotateY = useTransform(extraY, (value) => baseY + value);

  useEffect(() => {
    const query = window.matchMedia("(pointer: fine)");
    const update = () => setFinePointer(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  const desktopMotion = interactive && finePointer && !prefersReduced;
  const baseX = finePointer ? tiltX : tiltX * 0.45;
  const baseY = finePointer ? tiltY : tiltY * 0.45;
  const baseZ = tiltZ ?? rotate;

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!desktopMotion) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    pointerX.set(((event.clientX - bounds.left) / bounds.width - 0.5) * 12);
    pointerY.set(-((event.clientY - bounds.top) / bounds.height - 0.5) * 12);
  };

  const resetPointer = () => {
    pointerX.set(0);
    pointerY.set(0);
  };

  return (
    <div
      className={cn("phone-stage relative", className)}
      onPointerMove={handlePointerMove}
      onPointerLeave={resetPointer}
    >
      <div aria-hidden className="phone-aura absolute -inset-10 -z-10 rounded-full blur-3xl" />
      <div aria-hidden className="phone-ground-shadow absolute -bottom-8 left-1/2 -z-10 h-10 w-56 -translate-x-1/2 rounded-full" />
      <motion.div
        className="mx-auto"
        animate={desktopMotion ? { y: [0, -8, 0] } : { y: 0 }}
        transition={desktopMotion ? { duration: 6, ease: "easeInOut", repeat: Infinity } : { duration: 0 }}
      >
        <motion.div
          className="phone-frame relative mx-auto h-[660px] w-[320px] p-[7px]"
          style={{
            rotateX: desktopMotion ? rotateX : baseX,
            rotateY: desktopMotion ? rotateY : baseY,
            rotateZ: baseZ,
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
        </motion.div>
      </motion.div>
    </div>
  );
}