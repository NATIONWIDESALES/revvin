// Revvin Partner Program: the numbers and the page copy, in one place.
//
// The numbers are mirrored from supabase/functions/_shared/partner-config.ts so
// the edge functions and the pages can never quote different figures. The parity
// test in src/test/partners.test.ts fails if they drift.

import { ANNUAL_PRICE, MONTHLY_PRICE } from "@/config/pricing";

/** The optional one-time Launch Package. Mirrors _shared/pricing-copy.ts. */
export const LAUNCH_PACKAGE_PRICE = 297;

export const COMMISSION_RATE = 0.4;
export const COMMISSION_MONTHS: number | null = null;
export const HOLD_DAYS = 30;
export const ATTRIBUTION_WINDOW_DAYS = 60;
export const MIN_PAYOUT_USD = 50;

export const COMMISSION_PCT = Math.round(COMMISSION_RATE * 100); // 40

const money = (n: number) => (n % 1 === 0 ? `$${n}` : `$${n.toFixed(2)}`);

export const PARTNER_EARNINGS = [
  {
    product: `Revvin Pro, monthly (${money(MONTHLY_PRICE)})`,
    earn: `${money(MONTHLY_PRICE * COMMISSION_RATE)} every month they pay`,
  },
  {
    product: `Revvin Pro, yearly (${money(ANNUAL_PRICE)})`,
    earn: `${money(ANNUAL_PRICE * COMMISSION_RATE)} every year they pay`,
  },
  {
    product: `Launch Package (${money(LAUNCH_PACKAGE_PRICE)})`,
    earn: money(LAUNCH_PACKAGE_PRICE * COMMISSION_RATE),
  },
] as const;

export const PARTNER_EARNINGS_NOTE =
  "Earnings depend entirely on the customers you refer. There is no base pay and no guaranteed income.";

export const PARTNER_HOW_IT_WORKS = [
  {
    title: "Apply",
    body: "Tell us where you'll share Revvin. We review every application personally.",
  },
  {
    title: "Share your link",
    body: `You get a personal link and a partner code. Anyone who signs up within ${ATTRIBUTION_WINDOW_DAYS} days of clicking it is yours.`,
  },
  {
    title: "Get paid monthly",
    body: `Commissions clear ${HOLD_DAYS} days after your customer pays. We pay on the 15th of each month once your balance reaches $${MIN_PAYOUT_USD}.`,
  },
] as const;

export const PARTNER_AUDIENCE = [
  "Creators who make content for contractors, trades and home-service owners",
  "Marketing agencies and business coaches with home-service clients",
  "Sales trainers and team leaders",
  "Anyone whose audience runs a service business",
] as const;

export const PARTNER_WHAT_YOU_SHARE =
  `Revvin gives home-service businesses a free referral page, QR code and print pack. Revvin Pro (${money(MONTHLY_PRICE)}/month) asks their whole customer list for them.`;

export const PARTNER_FAQS = [
  {
    q: "Do I need to be a Revvin customer?",
    a: "No, but you should understand the product before you talk about it. Build a free page yourself so you can show it honestly.",
  },
  {
    q: "When do I get paid?",
    a: `Each commission becomes payable ${HOLD_DAYS} days after the customer's payment clears. We pay on the 15th of each month once your approved balance is $${MIN_PAYOUT_USD} or more.`,
  },
  {
    q: "What happens if a customer gets a refund?",
    a: "No commission is paid on refunded or disputed payments. If a refund happens after we've paid you, it's taken off your next payout.",
  },
  {
    q: "How do I get paid?",
    a: "PayPal or bank transfer, in US dollars. US partners provide a W-9 before their first payout. Partners outside the US provide the matching tax form.",
  },
  {
    q: "Can I run ads?",
    a: 'Yes, on your own content. You can\'t bid on "Revvin" or "revvin.co" as search or social keywords.',
  },
  {
    q: "What can't I say?",
    a: "You can't claim results Revvin hasn't produced, promise anyone income, or pretend to be a customer if you aren't one. Always say you earn a commission.",
  },
  {
    q: "Is there a cost to join?",
    a: "No. It's free, with no minimum sales.",
  },
] as const;

export const AUDIENCE_SIZES = [
  "Under 1,000",
  "1,000 to 10,000",
  "10,000 to 50,000",
  "50,000+",
] as const;

export const PARTNER_COPY = {
  eyebrow: "Revvin Partner Program",
  headline: `Earn ${COMMISSION_PCT}% on every business you send to Revvin.`,
  subhead: `Share Revvin with contractors and home-service owners. When they pay, you get ${COMMISSION_PCT}% of what they pay, for as long as they stay.`,
  applyButton: "Apply to become a partner",
  finalButton: "Apply now",
  applySuccess:
    "Thanks. We review every application personally and will email you within a few days.",
  termsCheckbox: "I agree to the Partner Terms.",
  nextPayout: `Next payout: the 15th, once your payable balance reaches $${MIN_PAYOUT_USD}`,
} as const;

export const PRODUCT_LABELS: Record<string, string> = {
  pro_monthly: "Revvin Pro, monthly",
  pro_yearly: "Revvin Pro, yearly",
  launch_package: "Launch Package",
};
