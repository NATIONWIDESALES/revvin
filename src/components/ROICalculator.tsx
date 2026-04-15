import { useState } from "react";
import { Slider } from "@/components/ui/slider";
import { motion } from "framer-motion";
import AnimatedCounter from "./AnimatedCounter";

const ROICalculator = () => {
  const [adSpend, setAdSpend] = useState(2000);
  const [adCustomers, setAdCustomers] = useState(3);
  const [revvinPayout, setRevvinPayout] = useState(500);

  const adCostPerCustomer = adCustomers > 0 ? Math.round(adSpend / adCustomers) : 0;
  const platformFee = Math.round(revvinPayout * 0.25);
  const revvinCost = revvinPayout + platformFee;
  const savings = Math.max(0, adCostPerCustomer - revvinCost);
  const monthlySavings = savings * adCustomers;

  return (
    <div className="rounded-2xl border border-border bg-card p-6 md:p-8">
      <h3 className="text-xl font-bold text-foreground mb-6">Compare your cost per customer</h3>

      <div className="space-y-6">
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">Monthly ad spend</span>
            <span className="font-bold text-foreground">${adSpend.toLocaleString()}</span>
          </div>
          <Slider value={[adSpend]} onValueChange={([v]) => setAdSpend(v)} min={500} max={10000} step={250} />
        </div>

        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">Customers from ads per month</span>
            <span className="font-bold text-foreground">{adCustomers}</span>
          </div>
          <Slider value={[adCustomers]} onValueChange={([v]) => setAdCustomers(v)} min={1} max={20} step={1} />
        </div>

        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">Your REVVIN payout per customer</span>
            <span className="font-bold text-foreground">${revvinPayout}</span>
          </div>
          <Slider value={[revvinPayout]} onValueChange={([v]) => setRevvinPayout(v)} min={100} max={2000} step={50} />
        </div>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-muted/30 p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">Your ad cost per customer</p>
          <p className="text-2xl font-bold text-foreground">${adCostPerCustomer.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">REVVIN cost per customer</p>
          <p className="text-2xl font-bold text-primary">${revvinCost.toLocaleString()}</p>
        </div>
      </div>

      {savings > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 rounded-xl border-2 border-primary/20 bg-primary/5 p-5 text-center"
        >
          <p className="text-sm text-muted-foreground">You save</p>
          <p className="text-3xl font-bold text-primary">${savings.toLocaleString()}</p>
          <p className="text-sm text-muted-foreground">per customer</p>
          {monthlySavings > 0 && (
            <p className="text-sm font-semibold text-foreground mt-2">
              That's <span className="text-primary">${monthlySavings.toLocaleString()}/month</span> in savings
            </p>
          )}
        </motion.div>
      )}

      <p className="text-xs text-muted-foreground mt-4">
        On the Pro plan ($250/mo), your platform fee drops to 1% — saving you even more.
      </p>
    </div>
  );
};

export default ROICalculator;
