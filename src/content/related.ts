// Internal linking map. Guides, trade pages and tools reference each other from
// here so the link graph stays complete as content is added: every guide links
// to at least two trade pages and one tool, every trade page links to two
// guides and the reward calculator, and the tools link back to the guides hub.

import { GUIDES, type Guide } from "./guides";
import { INDUSTRIES, type Industry } from "./industries";

export const REWARD_CALCULATOR_PATH = "/tools/referral-reward-calculator";
export const GUIDES_HUB_PATH = "/guides";

/** Trade pages that best fit each guide's subject. */
const GUIDE_TRADES: Record<string, string[]> = {
  "how-much-to-pay-for-a-referral": ["roofing", "hvac", "solar"],
  "referral-program-vs-buying-leads": ["roofing", "plumbing", "window-replacement"],
  "how-to-start-a-referral-program": ["hvac", "landscaping", "house-cleaning"],
  "do-referral-programs-work-for-contractors": ["remodeling", "electrical", "roofing"],
  "how-to-ask-a-customer-for-a-referral": ["house-cleaning", "carpet-cleaning", "handyman"],
  "alternative-to-buying-leads": ["plumbing", "hvac", "pest-control"],
};

const DEFAULT_TRADES = ["roofing", "hvac", "plumbing"];

/** Guides that best fit each trade page. Two per page, most relevant first. */
const TRADE_GUIDES: Record<string, string[]> = {
  roofing: ["how-much-to-pay-for-a-referral", "referral-program-vs-buying-leads"],
  hvac: ["how-to-start-a-referral-program", "how-much-to-pay-for-a-referral"],
  plumbing: ["alternative-to-buying-leads", "how-much-to-pay-for-a-referral"],
  solar: ["how-much-to-pay-for-a-referral", "do-referral-programs-work-for-contractors"],
  remodeling: ["do-referral-programs-work-for-contractors", "how-much-to-pay-for-a-referral"],
  "house-cleaning": ["how-to-ask-a-customer-for-a-referral", "how-to-start-a-referral-program"],
  "carpet-cleaning": ["how-to-ask-a-customer-for-a-referral", "how-to-start-a-referral-program"],
  handyman: ["how-to-ask-a-customer-for-a-referral", "alternative-to-buying-leads"],
};

const DEFAULT_GUIDES = [
  "how-much-to-pay-for-a-referral",
  "how-to-ask-a-customer-for-a-referral",
];

const byTradeSlug = (slug: string) => INDUSTRIES.find((i) => i.slug === slug);
const byGuideSlug = (slug: string) => GUIDES.find((g) => g.slug === slug);

/** At least two trade pages for a guide, always resolvable to real pages. */
export const tradesForGuide = (guideSlug: string): Industry[] => {
  const picked = (GUIDE_TRADES[guideSlug] ?? DEFAULT_TRADES)
    .map(byTradeSlug)
    .filter((i): i is Industry => Boolean(i));
  if (picked.length >= 2) return picked;
  return INDUSTRIES.slice(0, 3);
};

/** The two most relevant guides for a trade page. */
export const guidesForTrade = (tradeSlug: string): Guide[] => {
  const picked = (TRADE_GUIDES[tradeSlug] ?? DEFAULT_GUIDES)
    .map(byGuideSlug)
    .filter((g): g is Guide => Boolean(g));
  if (picked.length >= 2) return picked;
  return GUIDES.slice(0, 2);
};
