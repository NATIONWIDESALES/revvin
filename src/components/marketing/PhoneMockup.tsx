import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface PhoneMockupProps {
  children: ReactNode;
  className?: string;
  rotate?: number;
}

export default function PhoneMockup({ children, className, rotate = 3 }: PhoneMockupProps) {
  return (
    <div className={cn("relative", className)} style={{ perspective: "1200px" }}>
      {/* green glow */}
      <div
        aria-hidden
        className="absolute -inset-10 -z-10 rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle at 50% 40%, hsl(var(--primary) / 0.18), transparent 60%)",
        }}
      />
      <div
        className="relative mx-auto shadow-product"
        style={{
          width: 320,
          height: 660,
          borderRadius: 48,
          background: "#0A0A0A",
          padding: 10,
          transform: `rotate(${rotate}deg)`,
        }}
      >
        {/* notch */}
        <div
          aria-hidden
          className="absolute left-1/2 top-3 z-10 -translate-x-1/2 rounded-full bg-black"
          style={{ width: 110, height: 28 }}
        />
        <div
          className="relative h-full w-full overflow-hidden bg-background"
          style={{ borderRadius: 38 }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}