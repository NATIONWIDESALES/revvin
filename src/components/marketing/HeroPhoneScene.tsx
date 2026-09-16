import { Check, Gift, Signal, UserRound } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import PhoneMockup from "@/components/marketing/PhoneMockup";
import MockReferralPage from "@/components/marketing/MockReferralPage";

const cardTransition = { duration: 0.5, ease: "easeOut" as const };

export default function HeroPhoneScene() {
  const prefersReduced = useReducedMotion();

  return (
    <motion.figure
      className="relative mx-auto w-full max-w-[300px] md:max-w-[320px]"
      initial={prefersReduced ? false : { opacity: 0, x: 56, rotate: 2 }}
      animate={{ opacity: 1, x: 0, rotate: 0 }}
      transition={{ duration: 0.68, ease: [0.22, 1, 0.36, 1], delay: 0.16 }}
    >
      <PhoneMockup tiltX={6} tiltY={-16} tiltZ={-2} interactive>
        <MockReferralPage />
      </PhoneMockup>

      <motion.div
        aria-hidden="true"
        className="hero-float-card absolute -left-16 top-20 z-20 hidden w-56 items-center gap-3 p-3 md:flex"
        initial={prefersReduced ? false : { opacity: 0, x: -16, y: 8 }}
        animate={prefersReduced ? { opacity: 1 } : { opacity: [0, 1, 1, 0, 0], x: [-16, 0, 0, -8, -16], y: [8, 0, 0, -4, 8] }}
        transition={prefersReduced ? cardTransition : { duration: 8, times: [0, 0.16, 0.72, 0.88, 1], repeat: Infinity, delay: 1.2 }}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-soft">
          <UserRound className="h-4 w-4" />
        </span>
        <span className="min-w-0 text-left">
          <span className="block text-[10px] font-semibold text-muted-foreground">New referral · Jordan M.</span>
          <span className="mt-0.5 block text-xs font-semibold leading-tight text-foreground">Roof leak over the garage</span>
        </span>
      </motion.div>

      <motion.div
        aria-hidden="true"
        className="hero-float-card absolute -right-20 top-[42%] z-20 hidden items-center gap-2 px-3 py-2 md:flex"
        initial={prefersReduced ? false : { opacity: 0, x: 12 }}
        animate={prefersReduced ? { opacity: 1 } : { opacity: [0, 0, 1, 1, 0], x: [12, 12, 0, 0, 8] }}
        transition={prefersReduced ? cardTransition : { duration: 8, times: [0, 0.2, 0.3, 0.78, 1], repeat: Infinity, delay: 1.2 }}
      >
        <Gift className="h-4 w-4 text-primary" />
        <motion.span
          className="whitespace-nowrap text-xs font-semibold text-foreground"
          animate={prefersReduced ? undefined : { opacity: [1, 1, 0, 0, 1] }}
          transition={{ duration: 8, times: [0, 0.35, 0.43, 0.72, 1], repeat: Infinity, delay: 1.2 }}
        >
          Reward owed $500
        </motion.span>
        <motion.span
          className="absolute inset-0 flex items-center justify-center gap-1.5 rounded-lg bg-card text-xs font-bold text-primary"
          initial={{ opacity: 0 }}
          animate={prefersReduced ? { opacity: 1 } : { opacity: [0, 0, 1, 1, 0] }}
          transition={prefersReduced ? cardTransition : { duration: 8, times: [0, 0.42, 0.5, 0.72, 1], repeat: Infinity, delay: 1.2 }}
        >
          <Check className="h-4 w-4" /> Paid
        </motion.span>
      </motion.div>

      <motion.div
        aria-hidden="true"
        className="hero-float-card absolute -left-8 bottom-24 z-20 flex items-center gap-2 px-3 py-2 md:-left-14"
        initial={prefersReduced ? false : { opacity: 0, y: 12 }}
        animate={prefersReduced ? { opacity: 1 } : { opacity: [0, 0, 1, 1, 0], y: [12, 12, 0, 0, 8] }}
        transition={prefersReduced ? cardTransition : { duration: 8, times: [0, 0.34, 0.44, 0.82, 1], repeat: Infinity, delay: 1.2 }}
      >
        <span className="h-2 w-2 rounded-full bg-primary" />
        <span className="whitespace-nowrap text-xs font-semibold text-foreground">Lead status: Closed won</span>
      </motion.div>

      <figcaption className="relative z-30 mt-3 text-center text-xs text-muted-foreground">
        Example of a published referral page. Not a real business.
      </figcaption>
    </motion.figure>
  );
}