// The six homepage questions. One source for the rendered accordion, the
// client FAQPage JSON-LD and the prerendered homepage, so they never differ.
// Every answer must stay true of the shipped product.
import { PRICE_TEXT } from "../config/pricing";

export const HOME_FAQS: { q: string; a: string }[] = [
  {
    q: "Is it really free?",
    a: "Yes. Your referral page is free, every referral that comes through it is free with no limit, and you can import and ask up to 100 customers. No card, and it does not expire. Revvin Pro is " +
      `${PRICE_TEXT.monthlyPerMonth} or ${PRICE_TEXT.annualPerYear} if you want to ask your whole list.`,
  },
  {
    q: "How do I pay my referrers?",
    a: "You pay them directly, with any method you like. Revvin tracks each reward from owed to paid, notifies your referrer at both moments, and takes no cut.",
  },
  {
    q: "What if nobody refers?",
    a: "Most referrals come from asking. Revvin sends the ask after every job you mark done, gives you a print pack for invoices and yard signs, and you can book a free 30-minute setup call. We cannot guarantee referrals, but we make asking easy.",
  },
  {
    q: "Can my techs and reps have their own links?",
    a: "Not yet. Team links with a leaderboard are coming. Today everyone shares your page link.",
  },
  {
    q: "Is it legal to pay for referrals in my industry?",
    a: "For most home services, generally yes. In the US, real estate, mortgage and insurance have specific rules about paying for referrals. Check the rules for your trade and area. This is not legal advice.",
  },
  {
    q: "Does it work with Jobber or Housecall Pro?",
    a: "Yes, through Zapier or the Revvin API. When your job software marks a job finished, Revvin can send the ask. See the setup guide at revvin.co/docs/zapier.",
  },
];
