import { Star } from "lucide-react";
import type { MockReview } from "@/hooks/useMockListings";

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}

export default function ReviewList({ reviews }: { reviews: MockReview[] }) {
  if (!reviews.length) return <p className="text-sm text-muted-foreground">No reviews yet.</p>;
  return (
    <ul className="divide-y divide-border">
      {reviews.map((r, i) => (
        <li key={i} className="py-5">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-foreground">{r.name}</p>
            <p className="text-xs text-muted-foreground">{fmtDate(r.date)}</p>
          </div>
          <div className="mt-1 flex items-center gap-0.5">
            {Array.from({ length: 5 }).map((_, j) => (
              <Star
                key={j}
                className={`h-3.5 w-3.5 ${j < r.rating ? "fill-accent text-accent" : "text-muted-foreground/30"}`}
              />
            ))}
          </div>
          <p className="mt-2 text-sm leading-relaxed text-foreground/85">{r.body}</p>
        </li>
      ))}
    </ul>
  );
}