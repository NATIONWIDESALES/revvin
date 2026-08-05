import { useEffect, useState } from "react";
import { promoTimeLeft, type PromoTimeLeft } from "@/config/promo";

// Live countdown to the real, fixed deadline. Nothing here resets per visitor.
export function usePromoCountdown(): PromoTimeLeft {
  const [left, setLeft] = useState<PromoTimeLeft>(() => promoTimeLeft());
  useEffect(() => {
    const t = window.setInterval(() => setLeft(promoTimeLeft()), 1000);
    return () => window.clearInterval(t);
  }, []);
  return left;
}

const pad = (n: number) => String(n).padStart(2, "0");

const PromoCountdown = ({ className = "" }: { className?: string }) => {
  const left = usePromoCountdown();
  if (left.expired) return null;
  return (
    <p className={className}>
      <span className="font-semibold tabular-nums">
        {left.days}d {pad(left.hours)}h {pad(left.minutes)}m {pad(left.seconds)}s
      </span>{" "}
      left
    </p>
  );
};

export default PromoCountdown;
