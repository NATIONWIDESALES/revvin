import { motion } from "framer-motion";
import { Bell, Check, Signal, Wifi, Battery, MessageSquare } from "lucide-react";

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
        <div className="relative h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
          R
          <div className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full flex items-center justify-center">
            <span className="text-[8px] text-white font-bold">1</span>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold text-foreground">Revvin</p>
            <Bell className="h-3 w-3 text-primary" />
          </div>
          <p className="text-[10px] text-muted-foreground">now</p>
        </div>
        <div className="flex items-center gap-1">
          <MessageSquare className="h-3 w-3 text-muted-foreground" />
          <span className="text-[9px] text-muted-foreground">View</span>
        </div>
      </div>
      <p className="text-sm font-medium text-foreground mb-1">New referral received 🎉</p>
      <p className="text-xs text-muted-foreground leading-relaxed">Sarah M. was referred to you by James K. for residential roofing. Tap to review.</p>
      <div className="flex gap-2 mt-3">
        <button className="flex-1 bg-primary/10 text-primary text-xs py-1.5 px-3 rounded-lg font-medium">
          View Details
        </button>
        <button className="bg-muted text-muted-foreground text-xs py-1.5 px-3 rounded-lg">
          Later
        </button>
      </div>
    </motion.div>
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.95 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ type: "spring", damping: 20, stiffness: 300, delay: 0.8 }}
      className="rounded-2xl bg-card border border-border p-4 shadow-lg"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
          R
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold text-foreground">Revvin</p>
            <Check className="h-3 w-3 text-green-500" />
          </div>
          <p className="text-[10px] text-muted-foreground">2m</p>
        </div>
        <div className="h-2 w-2 bg-green-500 rounded-full"></div>
      </div>
      <p className="text-sm font-medium text-foreground mb-1">Deal marked as closed ✅</p>
      <p className="text-xs text-muted-foreground leading-relaxed">Sarah M. signed. $500 payout queued to James K.</p>
      <div className="flex gap-2 mt-3">
        <button className="flex-1 bg-green-500/10 text-green-600 text-xs py-1.5 px-3 rounded-lg font-medium">
          View Payout
        </button>
      </div>
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
        <div className="relative h-8 w-8 rounded-lg bg-earnings/10 flex items-center justify-center text-xs font-bold text-earnings">
          R
          <div className="absolute -top-1 -right-1 h-3 w-3 bg-earnings rounded-full flex items-center justify-center">
            <span className="text-[8px] text-earnings-foreground font-bold">$</span>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold text-foreground">Revvin</p>
            <div className="h-2 w-2 bg-earnings rounded-full"></div>
          </div>
          <p className="text-[10px] text-muted-foreground">now</p>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[9px] font-bold text-earnings">$500</span>
        </div>
      </div>
      <p className="text-sm font-medium text-foreground mb-1">You just got paid 💰</p>
      <p className="text-xs text-muted-foreground leading-relaxed">$500.00 deposited for your referral to Peak Roofing Co.</p>
      <div className="flex gap-2 mt-3">
        <button className="flex-1 bg-earnings/10 text-earnings text-xs py-1.5 px-3 rounded-lg font-medium">
          View Wallet
        </button>
        <button className="bg-muted text-muted-foreground text-xs py-1.5 px-3 rounded-lg">
          Share
        </button>
      </div>
    </motion.div>
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.95 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ type: "spring", damping: 20, stiffness: 300, delay: 0.8 }}
      className="rounded-2xl bg-card border border-border p-4 shadow-lg"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="h-8 w-8 rounded-lg bg-earnings/10 flex items-center justify-center text-xs font-bold text-earnings">
          <div className="h-4 w-4 rounded-full bg-earnings/20 flex items-center justify-center">
            <span className="text-[8px] font-bold">6</span>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold text-foreground">Revvin</p>
            <div className="flex items-center gap-0.5">
              <div className="h-1 w-1 bg-earnings rounded-full"></div>
              <div className="h-1 w-1 bg-earnings rounded-full"></div>
              <div className="h-1 w-1 bg-earnings rounded-full"></div>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground">1m</p>
        </div>
        <span className="text-[10px] font-bold text-earnings">$2,340</span>
      </div>
      <p className="text-sm font-medium text-foreground mb-1">Lifetime earnings: $2,340</p>
      <p className="text-xs text-muted-foreground leading-relaxed">You've closed 6 referrals this month. Keep it up!</p>
      <div className="flex gap-2 mt-3">
        <button className="flex-1 bg-primary/10 text-primary text-xs py-1.5 px-3 rounded-lg font-medium">
          View Stats
        </button>
      </div>
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
          <Signal className="h-3 w-3 text-foreground/60" />
          <Wifi className="h-3 w-3 text-foreground/60" />
          <Battery className="h-3 w-3 text-foreground/60" />
        </div>
      </div>
      {/* Notch */}
      <div className="mx-auto mb-4 h-6 w-28 rounded-full bg-foreground/5" />
      {/* Content */}
      <div className="px-2 pb-6 min-h-[280px]">
        {variant === "business" ? <BusinessNotification /> : <ReferrerNotification />}
      </div>
    </div>
  </motion.div>
);

export default PhoneNotification;
