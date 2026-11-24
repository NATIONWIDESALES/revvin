// One source for the pricing accordion, client schema and static document.
import { LAUNCH_GUARANTEE, PRICE_TEXT } from "../config/pricing";
import { LAUNCH_PACKAGE_ENABLED } from "../config/featureFlags";

export const PRICING_FAQS = [
  {
    id: "p1",
    q: "Is there really no contract?",
    a: `Correct. Your page costs nothing and has no contract at all. Revvin Pro is ${PRICE_TEXT.monthlyPerMonth} billed monthly, or ${PRICE_TEXT.annualPerYear} billed once, and you can cancel anytime from your billing portal. Your page and your referrals stay live either way, you just lose the Pro tools.`,
  },
  {
    id: "p6",
    q: "How does annual billing work if I cancel?",
    a: `The annual plan is ${PRICE_TEXT.annual} USD charged once, up front, for twelve months of Pro. You can cancel anytime and Pro stays on through the end of that paid year, then it does not renew. Your page stays live regardless. We do not pro-rate or refund the unused part of a year, so if you are not sure yet, start monthly at ${PRICE_TEXT.monthlyPerMonth} and switch to annual later from your billing portal.`,
  },
  ...(LAUNCH_PACKAGE_ENABLED ? [{
    id: "p2",
    q: "What's in the done-for-you launch?",
    a: `We load your customer list, set up your page and reward with you, and send the first asks with you. It is optional. ${LAUNCH_GUARANTEE}`,
  }] : []),
  {
    id: "p3",
    q: "What exactly is free?",
    a: "Your referral page. Create your account, set up your offer, publish the page, share the link and QR code, and take referrals through it without paying anything. You can also bring up to 500 customers and send one launch campaign in which Revvin emails every customer their own referral link from your business name, with two follow-ups. That is not a trial and it does not expire. Referrer accounts are free too: send leads to businesses on Revvin and get paid directly, no card required. Pro is what you pay for: unlimited customers and campaigns and an automatic ask after every job. Pro is free for 14 days, starting when you send your first campaign. No card.",
  },
  {
    id: "p4",
    q: "Does Revvin take a cut of referral payouts?",
    a: "No. Revvin is the infrastructure, not a middleman on payouts. You pay referrers directly when deals close and keep 100% of that relationship.",
  },
];

export const pricingFaqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: PRICING_FAQS.map(({ q, a }) => ({
    "@type": "Question",
    name: q,
    acceptedAnswer: { "@type": "Answer", text: a },
  })),
};