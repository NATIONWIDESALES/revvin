import { useEffect, useRef } from "react";
import QRCodeStyling from "qr-code-styling";
import { cn } from "@/lib/utils";

export default function MockQRCard({
  url = "https://apex-roofing.revvin.co",
  label = "apex-roofing.revvin.co",
  className,
}: {
  url?: string;
  label?: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = "";
    const qr = new QRCodeStyling({
      width: 180,
      height: 180,
      type: "svg",
      data: url,
      dotsOptions: { color: "#15803D", type: "rounded" },
      cornersSquareOptions: { color: "#0F5E2D", type: "extra-rounded" },
      cornersDotOptions: { color: "#15803D", type: "dot" },
      backgroundOptions: { color: "transparent" },
    });
    qr.append(ref.current);
  }, [url]);

  return (
    <div className={cn("flex flex-col items-center rounded-xl border border-border bg-card p-5 shadow-soft", className)}>
      <div ref={ref} className="flex items-center justify-center" style={{ width: 180, height: 180 }} />
      <p className="mt-3 font-mono text-[11px] text-foreground">{label}</p>
      <p className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">Scan to refer</p>
    </div>
  );
}