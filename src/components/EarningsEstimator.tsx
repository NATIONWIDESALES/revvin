import { useState } from "react";
import { Slider } from "@/components/ui/slider";
import { motion } from "framer-motion";

const EarningsEstimator = () => {
  const [referrals, setReferrals] = useState(3);
  const [avgPayout, setAvgPayout] = useState(400);

  const monthly = referrals * avgPayout;
  const annual = monthly * 12;

  return (
    <div className="rounded-2xl border border-border bg-card p-6 md:p-8">
      <h3 className="text-xl font-bold text-foreground mb-6">See what you could earn</h3>

      <div className="space-y-6">
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">Referrals you send per month</span>
            <span className="font-bold text-foreground">{referrals}</span>
          </div>
          <Slider value={[referrals]} onValueChange={([v]) => setReferrals(v)} min={1} max={10} step={1} />
        </div>

        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">Average payout per referral</span>
            <span className="font-bold text-foreground">${avgPayout}</span>
          </div>
          <Slider value={[avgPayout]} onValueChange={([v]) => setAvgPayout(v)} min={75} max={1000} step={25} />
        </div>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <motion.div
          key={monthly}
          initial={{ scale: 0.95, opacity: 0.5 }}
          animate={{ scale: 1, opacity: 1 }}
          className="rounded-xl border border-earnings/20 bg-earnings/5 p-5 text-center"
        >
          <p className="text-xs text-muted-foreground mb-1">Monthly earnings</p>
          <p className="text-3xl font-bold text-earnings">${monthly.toLocaleString()}</p>
        </motion.div>
        <motion.div
          key={annual}
          initial={{ scale: 0.95, opacity: 0.5 }}
          animate={{ scale: 1, opacity: 1 }}
          className="rounded-xl border border-earnings/20 bg-earnings/5 p-5 text-center"
        >
          <p className="text-xs text-muted-foreground mb-1">Annual earnings</p>
          <p className="text-3xl font-bold text-earnings">${annual.toLocaleString()}</p>
        </motion.div>
      </div>

      <p className="text-xs text-muted-foreground mt-4">
        Most referrers earn their first payout within 2 weeks of joining.
      </p>
    </div>
  );
};

export default EarningsEstimator;
