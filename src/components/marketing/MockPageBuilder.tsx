import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export default function MockPageBuilder({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-xl border border-border bg-card p-5 shadow-soft", className)}>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Step 1 of 3 · Your offer
        </p>
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary">
          <Check className="h-3 w-3" /> Saved
        </span>
      </div>

      <div className="space-y-3">
        <div>
          <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Business name
          </p>
          <div className="flex h-9 items-center rounded-md border border-border bg-background px-3 text-[13px] text-foreground">
            Apex Roofing
          </div>
        </div>
        <div>
          <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Logo
          </p>
          <div className="flex items-center gap-3 rounded-md border border-dashed border-border bg-muted/40 p-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-sm font-bold text-primary">
              A
            </div>
            <p className="text-[11px] text-muted-foreground">apex-logo.png · uploaded</p>
          </div>
        </div>
        <div>
          <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Offer headline
          </p>
          <div className="flex h-9 items-center rounded-md border-2 border-primary/40 bg-primary/5 px-3 text-[13px] font-semibold text-foreground">
            Refer a customer, earn $500
          </div>
        </div>
      </div>
    </div>
  );
}