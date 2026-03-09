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
    className="mx-auto w-[280px] max-w-[280px]"
  >
    {/* Outer device shell */}
    <div className="relative h-[605px] rounded-[44px] bg-[#1a1a1a] p-[3px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)]">
      {/* Side buttons — left */}
      <div className="absolute -left-[2.5px] top-[72px] h-5 w-[3px] rounded-l-sm bg-[#2a2a2a]" />
      <div className="absolute -left-[2.5px] top-[100px] h-8 w-[3px] rounded-l-sm bg-[#2a2a2a]" />
      <div className="absolute -left-[2.5px] top-[136px] h-8 w-[3px] rounded-l-sm bg-[#2a2a2a]" />
      {/* Side button — right (power) */}
      <div className="absolute -right-[2.5px] top-[110px] h-12 w-[3px] rounded-r-sm bg-[#2a2a2a]" />

      {/* Specular highlight / gloss */}
      <div className="pointer-events-none absolute inset-y-4 left-[1px] w-[6px] rounded-l-[44px] bg-gradient-to-r from-white/[0.12] to-transparent" />

      {/* Screen area */}
      <div className="relative flex h-full flex-col overflow-hidden rounded-[40px] bg-white">
        {/* Dynamic Island */}
        <div className="absolute top-[10px] left-1/2 -translate-x-1/2 z-20 h-[18px] w-[98px] rounded-full bg-black" />

        {/* Status bar */}
        <div className="relative z-10 flex items-center justify-between px-7 pt-[14px] pb-1">
          <span className="text-[11px] font-semibold text-black">9:41</span>
          <div className="flex items-center gap-[3px]">
            <Signal className="h-[11px] w-[11px] text-black" />
            <Wifi className="h-[11px] w-[11px] text-black" />
            <Battery className="h-[11px] w-[11px] text-black" />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-3 pt-4 pb-6">
          {variant === "business" ? <BusinessNotification /> : <ReferrerNotification />}
        </div>
      </div>
    </div>
  </motion.div>
);

export default PhoneNotification;
