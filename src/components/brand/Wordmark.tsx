import { cn } from "@/lib/utils";

interface WordmarkProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "green" | "white";
  withDotCo?: boolean;
}

const sizeMap = {
  sm: "text-[22px]",
  md: "text-[28px]",
  lg: "text-[44px]",
  xl: "text-[88px]",
};

export default function Wordmark({
  className,
  size = "md",
  variant = "green",
  withDotCo = true,
}: WordmarkProps) {
  return (
    <span
      className={cn(
        "wordmark select-none",
        sizeMap[size],
        variant === "green" ? "text-primary" : "text-white",
        className,
      )}
      aria-label="REVVIN.CO"
    >
      REVVIN
      {withDotCo && (
        <span className={variant === "green" ? "text-primary/70" : "text-white/70"}>.CO</span>
      )}
    </span>
  );
}