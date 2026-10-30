// Title and description for every fixed public page. The prerendered HTML
// (seoRoutes.ts) and the page's own SEOHead both read this table, so the head a
// crawler sees and the head after hydration are the same text.
//
// Rules, enforced by src/test/meta-lengths.test.ts: titles 30 to 60 characters
// in the form "{Specific title} | Revvin" (the homepage keeps its brand-first
// title), descriptions 120 to 155 characters. No em dashes.
//
// Relative imports: this module is also loaded by the build-time prerender.
import { PRICE_TEXT } from "../config/pricing";
import { PLAN_SPLIT } from "../config/planFeatures";

const PRO = `${PRICE_TEXT.monthlyPerMonth} USD`;

export interface PageMeta {
  title: string;
  description: string;
}

export const PAGE_META = {
  "/about": {
    title: "About Revvin and founder Karm Sandhu | Revvin",
    description:
      "Revvin is a free referral program and local referral network for home-service businesses. What it does, what it does not do, pricing and who built it.",
  },
  "/how-it-works": {
    title: "How Revvin turns customers into referrals | Revvin",
    description: `See how Revvin turns past customers into referrals, repeat work and reviews. Your page is free to publish, and Revvin Pro is ${PRO}.`,
  },
  "/pricing": {
    title: `Pricing: free referral page, Pro ${PRICE_TEXT.monthlyPerMonth} | Revvin`,
    description: `${PLAN_SPLIT.line} Your referral page is free to publish. You pay your referrers directly.`,
  },
  "/browse": {
    title: "Browse referral offers | Revvin",
    description:
      "Browse referral offers from service businesses on Revvin. Refer a customer and earn the advertised payout when the deal closes. Free to join as a referrer.",
  },
  "/referral-programs": {
    title: "Referral programs by industry | Revvin",
    description: `Referral program software for roofing, HVAC, plumbing, solar, landscaping and more home-service trades. Free to publish; Revvin Pro is ${PRO}.`,
  },
  "/ask-kit": {
    title: "Referral ask kit: scripts for contractors | Revvin",
    description:
      "The exact words to use and when to use them. Copy a referral script, swap the braces for your own details and send it today. Free, no sign-up needed.",
  },
  "/sample": {
    title: "Try the referral loop demo | Revvin",
    description:
      "Walk a referral through end to end: an example referral page, the owner's lead inbox, closing the job and the reward. Nothing is saved. Your page is free.",
  },
  "/docs/zapier": {
    title: "Zapier and job software integrations | Revvin",
    description:
      "Connect your job software to Revvin through Zapier or the API, so a finished job can schedule an automatic review and referral ask. Included on every plan.",
  },
  "/tools": {
    title: "Free referral tools for contractors | Revvin",
    description:
      "Free tools for service businesses: grade your referral program, see what a reward leaves you per job and write the ask. No account, no card, nothing saved.",
  },
  "/tools/referral-program-grader": {
    title: "Referral program grader for contractors | Revvin",
    description:
      "Answer eight yes or no questions about how referrals work in your business and get a score out of 100 plus the three things to fix first. Free.",
  },
  "/tools/referral-reward-calculator": {
    title: "Referral reward calculator | Revvin",
    description:
      "Enter your average job revenue, gross margin and the reward you are considering, and see what a closed referred job leaves you. Free, no account needed.",
  },
  "/tools/referral-message-generator": {
    title: "Referral message generator | Revvin",
    description:
      "Generate a text, an email and a spoken script for asking a customer for a referral, written around your trade, timing and reward. Free, no account needed.",
  },
  "/partners": {
    title: "Partner program: earn 40% on businesses you refer | Revvin",
    description:
      "Share Revvin with home-service owners. Approved partners earn 40% of what their referred customers pay, for as long as those customers keep paying.",
  },
  "/partners/terms": {
    title: "Partner program terms | Revvin",
    description:
      "The rules of the Revvin Partner Program: commission, attribution, payment timing, refunds, taxes, disclosure and prohibited promotion methods.",
  },
  "/guides": {
    title: "Referral program guides for contractors | Revvin",
    description:
      "Straight answers on referral programs: what they are, what to pay, when and how to ask, text templates, getting paid as a referrer and fair comparisons.",
  },
  "/compare": {
    title: "Compare Revvin with other referral software | Revvin",
    description:
      "Side-by-side comparisons of Revvin with Get The Referral, ReferralWise, Clicki, Snoball and Jobber Referrals, plus a roundup for contractors.",
  },
} satisfies Record<string, PageMeta>;

export type MetaPath = keyof typeof PAGE_META;

export const pageMeta = (path: MetaPath): PageMeta => PAGE_META[path];
