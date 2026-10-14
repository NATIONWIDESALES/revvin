import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
}

const ScrollReveal = ({ children, className, delay = 0, y = 30 }: ScrollRevealProps) => {
  const prefersReduced = useReducedMotion();

  if (prefersReduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      // Content is never hidden: only a small offset animates, so copy is
      // readable at first paint even before the section scrolls into view.
      initial={{ y }}
      whileInView={{ y: 0 }}
      viewport={{ once: true, margin: "-15%" }}
      transition={{ duration: 0.5, ease: "easeOut", delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

export default ScrollReveal;
