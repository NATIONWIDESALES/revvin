// /about content. Shared by the rendered page and the prerendered document.
import { PRICE_TEXT } from "../config/pricing";
import { CANONICAL_SENTENCE, TEAM_HEADING, TEAM_BIO } from "../config/brand";

export const ABOUT_UPDATED_AT = "2026-10-31";

export const ABOUT_SECTIONS: { heading: string; body: string }[] = [
  {
    heading: "What Revvin is",
    body: `${CANONICAL_SENTENCE} A business gets a referral page on its own link, a QR code and print pack, a lead inbox, the review and referral ask after each finished job, and reward tracking from owed to paid.`,
  },
  {
    heading: "Who it is for",
    body: "Roofers, HVAC companies, plumbers, landscapers, electricians, painters and other home-service businesses across the US and Canada, usually teams of 1 to 10, that want more jobs from happy customers instead of buying leads.",
  },
  {
    heading: "How it works",
    body: "Set a fixed reward. Import your customers and send the ask from your own phone or email, or let Revvin email the ask when you tap Job done or your job software reports the job finished through Zapier or the API. Referrals land in your inbox. When the job closes, you pay the referrer directly and mark the reward paid.",
  },
  {
    heading: "Pricing",
    body: `Free: your referral page, unlimited referrals, and importing and asking up to 100 customers, with no card and no expiry. Revvin Pro is ${PRICE_TEXT.monthlyPerMonth} USD, or ${PRICE_TEXT.annualPerYear} USD billed once, and adds unlimited customers, reactivation email campaigns, ROI reporting and custom branding. An optional Launch Package is $297 one time.`,
  },
  {
    heading: "What Revvin does not do",
    body: "Revvin does not pay referrers for you. It does not send texts for you: personal asks open in your own phone or email app. It does not take a cut of any reward. It is not the Revvin digital mortgage platform.",
  },
  {
    heading: TEAM_HEADING,
    body: TEAM_BIO,
  },
  {
    heading: "Contact",
    body: "Email info@revvin.co.",
  },
];
