import type { ReactNode } from "react";

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
}

// The design system has no per-section scroll motion. Kept as a plain wrapper
// so existing pages keep their markup without animating.
const ScrollReveal = ({ children, className }: ScrollRevealProps) => (
  <div className={className}>{children}</div>
);

export default ScrollReveal;
