import { Star } from "lucide-react";

/** Read-only stars for a rating from 1 to 5, rounded to the nearest half. */
export default function Stars({ value, size = 16 }: { value: number; size?: number }) {
  const v = Math.round(value * 2) / 2;
  return (
    <span className="inline-flex items-center" role="img" aria-label={`${value.toFixed(1)} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className="relative inline-block" style={{ width: size, height: size }}>
          <Star className="absolute inset-0 text-line" style={{ width: size, height: size }} aria-hidden />
          {v >= i - 0.5 && (
            <span className="absolute inset-0 overflow-hidden" style={{ width: v >= i ? size : size / 2 }}>
              <Star className="fill-sign text-sign" style={{ width: size, height: size }} aria-hidden />
            </span>
          )}
        </span>
      ))}
    </span>
  );
}
