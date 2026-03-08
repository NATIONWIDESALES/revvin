import { motion } from "framer-motion";

const ease = [0.16, 1, 0.3, 1] as const;

interface PhoneNotificationProps {
  variant: "business" | "referrer";
}

const BusinessNotification = () => (
  <div className="space-y-3">
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ type: "spring", damping: 20, stiffness: 300, delay: 0.3 }}
      className="rounded-2xl bg-card border border-border p-4 shadow-lg"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">R</div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-foreground">Revvin</p>
          <p className="text-[10px] text-muted-foreground">Just now</p>
        </div>
      </div>
      <p className="text-sm font-medium text-foreground mb-1">New referral received 🎉</p>
      <p className="text-xs text-muted-foreground leading-relaxed">Sarah M. was referred to you by James K. for residential roofing. Tap to review.</p>
    </motion.div>
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.95 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ type: "spring", damping: 20, stiffness: 300, delay: 0.8 }}
      className="rounded-2xl bg-card border border-border p-4 shadow-lg"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">R</div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-foreground">Revvin</p>
          <p className="text-[10px] text-muted-foreground">2 min ago</p>
        </div>
      </div>
      <p className="text-sm font-medium text-foreground mb-1">Deal marked as closed ✅</p>
      <p className="text-xs text-muted-foreground leading-relaxed">Sarah M. signed. $500 payout queued to James K.</p>
    </motion.div>
  </div>
);

const ReferrerNotification = () => (
  <div className="space-y-3">
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ type: "spring", damping: 20, stiffness: 300, delay: 0.3 }}
      className="rounded-2xl bg-card border border-border p-4 shadow-lg"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="h-8 w-8 rounded-lg bg-earnings/10 flex items-center justify-center text-xs font-bold text-earnings">R</div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-foreground">Revvin</p>
          <p className="text-[10px] text-muted-foreground">Just now</p>
        </div>
      </div>
      <p className="text-sm font-medium text-foreground mb-1">You just got paid 💰</p>
      <p className="text-xs text-muted-foreground leading-relaxed">$500.00 deposited for your referral to Peak Roofing Co.</p>
    </motion.div>
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.95 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ type: "spring", damping: 20, stiffness: 300, delay: 0.8 }}
      className="rounded-2xl bg-card border border-border p-4 shadow-lg"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="h-8 w-8 rounded-lg bg-earnings/10 flex items-center justify-center text-xs font-bold text-earnings">R</div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-foreground">Revvin</p>
          <p className="text-[10px] text-muted-foreground">1 min ago</p>
        </div>
      </div>
      <p className="text-sm font-medium text-foreground mb-1">Lifetime earnings: $2,340</p>
      <p className="text-xs text-muted-foreground leading-relaxed">You've closed 6 referrals this month. Keep it up!</p>
    </motion.div>
  </div>
);

const PhoneNotification = ({ variant }: PhoneNotificationProps) => (
  <motion.div
    initial={{ opacity: 0, y: 40 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-100px" }}
    transition={{ duration: 0.8, ease }}
    className="mx-auto w-full max-w-[300px]"
  >
    {/* Phone frame */}
    <div className="rounded-[2.5rem] border border-border bg-background p-3 shadow-2xl">
      {/* Status bar */}
      <div className="flex items-center justify-between px-5 pt-2 pb-3">
        <span className="text-[10px] font-semibold text-foreground">9:41</span>
        <div className="flex items-center gap-1">
          <div className="h-2.5 w-4 rounded-sm bg-foreground/20" />
          <div className="h-2.5 w-2.5 rounded-full bg-foreground/20" />
        </div>
      </div>
      {/* Notch */}
      <div className="mx-auto mb-4 h-6 w-28 rounded-full bg-foreground/5" />
      {/* Content */}
      <div className="px-2 pb-6 min-h-[260px]">
        {variant === "business" ? <BusinessNotification /> : <ReferrerNotification />}
      </div>
    </div>
  </motion.div>
);

export default PhoneNotification;
