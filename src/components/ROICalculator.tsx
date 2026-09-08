import { useState } from "react";
import { Slider } from "@/components/ui/slider";
import { motion } from "framer-motion";

/**
 * Cost-per-customer comparison.
 *
 * Honesty rules this component follows:
 *  - Zero customers from ads is a real answer, so the slider allows it and the
 *    output says the number cannot be computed rather than dividing by zero.
 *  - A referral is only cheaper under an assumption (that it would replace a
 *    customer you currently buy). The assumption is stated, not hidden.
 *  - When Revvin costs more, that is shown too. Suppressing the negative case
 *    turns a calculator into an advert.
 */
const ROICalculator = () => {
  const [adSpend, setAdSpend] = useState(2000);
  const [adCustomers, setAdCustomers] = useState(3);
  const [revvinPayout, setRevvinPayout] = useState(500);

  const monthlySubscription = 49;
  const hasAdCustomers = adCustomers > 0;
  const adCostPerCustomer = hasAdCustomers ? Math.round(adSpend / adCustomers) : null;
  const subscriptionShare = hasAdCustomers
    ? Math.round(monthlySubscription / adCustomers)
    : monthlySubscription;
  const revvinCost = revvinPayout + subscriptionShare;
  const difference = adCostPerCustomer === null ? null : adCostPerCustomer - revvinCost;
  const monthlyDifference = difference === null ? null : difference * adCustomers;

  const money = (n: number) => `$${Math.abs(n).toLocaleString("en-US")}`;

  return (
    <div className="rounded-2xl border border-border bg-card p-6 md:p-8">
      <h3 className="mb-2 text-xl font-bold text-foreground">Compare your cost per customer</h3>
      <p className="mb-6 text-sm text-muted-foreground">
        Your numbers, your assumptions. Nothing here is a promise of results.
      </p>

      <div className="space-y-6">
        <div>
          <div className="mb-2 flex justify-between text-sm">
            <span className="text-muted-foreground">Monthly ad spend</span>
            <span className="font-bold text-foreground">${adSpend.toLocaleString()}</span>
          </div>
          <Slider
            value={[adSpend]}
            onValueChange={([v]) => setAdSpend(v)}
            min={0}
            max={10000}
            step={250}
            aria-label="Monthly ad spend in dollars"
          />
        </div>

        <div>
          <div className="mb-2 flex justify-between text-sm">
            <span className="text-muted-foreground">Customers that spend won you last month</span>
            <span className="font-bold text-foreground">{adCustomers}</span>
          </div>
          <Slider
            value={[adCustomers]}
            onValueChange={([v]) => setAdCustomers(v)}
            min={0}
            max={20}
            step={1}
            aria-label="Customers won from ads per month"
          />
        </div>

        <div>
          <div className="mb-2 flex justify-between text-sm">
            <span className="text-muted-foreground">Reward you would pay per referral</span>
            <span className="font-bold text-foreground">${revvinPayout}</span>
          </div>
          <Slider
            value={[revvinPayout]}
            onValueChange={([v]) => setRevvinPayout(v)}
            min={0}
            max={2000}
            step={50}
            aria-label="Reward paid per referral in dollars"
          />
        </div>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-muted/30 p-4 text-center">
          <p className="mb-1 text-xs text-muted-foreground">Your ad cost per customer</p>
          <p className="text-2xl font-bold text-foreground">
            {adCostPerCustomer === null ? "n/a" : `$${adCostPerCustomer.toLocaleString()}`}
          </p>
        </div>
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-center">
          <p className="mb-1 text-xs text-muted-foreground">Cost of one paid referral</p>
          <p className="text-2xl font-bold text-primary">${revvinCost.toLocaleString()}</p>
        </div>
      </div>

      {adCostPerCustomer === null && (
        <div className="mt-4 rounded-xl border border-border bg-muted/30 p-5 text-center">
          <p className="text-sm text-foreground">
            With zero customers from ads there is no cost per customer to compare against.
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            A paid referral would cost you {money(revvinCost)}: the {money(revvinPayout)} reward
            plus ${monthlySubscription} for Pro that month.
          </p>
        </div>
      )}

      {difference !== null && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          aria-live="polite"
          className={`mt-4 rounded-xl border-2 p-5 text-center ${
            difference > 0 ? "border-primary/20 bg-primary/5" : "border-border bg-muted/30"
          }`}
        >
          <p className="text-sm text-muted-foreground">
            {difference > 0
              ? "Cheaper per customer by"
              : difference < 0
                ? "More expensive per customer by"
                : "Same cost per customer"}
          </p>
          {difference !== 0 && (
            <p
              className={`text-3xl font-bold ${difference > 0 ? "text-primary" : "text-foreground"}`}
            >
              {money(difference)}
            </p>
          )}
          {monthlyDifference !== null && difference !== 0 && (
            <p className="mt-2 text-sm text-foreground">
              {monthlyDifference > 0 ? "A difference of " : "A shortfall of "}
              <span className={difference > 0 ? "text-primary" : ""}>
                {money(monthlyDifference)}
              </span>{" "}
              across {adCustomers} customer{adCustomers === 1 ? "" : "s"} a month
            </p>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            Assumes each referral replaces one customer you currently buy with ads. If referrals
            come on top of your ads instead, this is added cost for added revenue, not a saving.
          </p>
        </motion.div>
      )}

      <p className="mt-4 text-xs text-muted-foreground">
        Publishing your page is free. Revvin Pro is $49/month USD with no per-referral fees. You
        pay the referrer directly when the deal closes: Revvin never handles the money.
      </p>
    </div>
  );
};

export default ROICalculator;
