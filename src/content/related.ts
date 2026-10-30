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
  "referral-text-templates": ["house-cleaning", "landscaping", "hvac"],
  "what-is-a-referral-program": ["roofing", "plumbing", "landscaping"],
  "when-to-ask-for-a-referral": ["hvac", "pest-control", "pool-service"],
  "how-to-get-paid-for-referrals": ["roofing", "hvac", "plumbing"],
  "referral-marketing-glossary": ["roofing", "electrical", "painting"],
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

// ---- "Related" blocks (3 to 5 links) closing guides, comparisons and trades ----

export interface RelatedLinkItem {
  to: string;
  label: string;
}

const MESSAGE_TOOL = { to: "/tools/referral-message-generator", label: "Referral message generator" };
const CALC_TOOL = { to: REWARD_CALCULATOR_PATH, label: "Referral reward calculator" };
const PRICING = { to: "/pricing", label: "Revvin pricing" };
const ROUNDUP_LINK = {
  to: "/guides/best-referral-software-for-contractors-2026",
  label: "Best referral software for contractors in 2026",
};

const guideLink = (slug: string): RelatedLinkItem | null => {
  const g = byGuideSlug(slug);
  return g ? { to: `/guides/${g.slug}`, label: g.label } : null;
};
const tradeLink = (slug: string): RelatedLinkItem | null => {
  const t = byTradeSlug(slug);
  return t ? { to: `/referral-program/${t.slug}`, label: `${t.label} referral program` } : null;
};

const dedupe = (links: (RelatedLinkItem | null)[], max = 5) => {
  const seen = new Set<string>();
  const out: RelatedLinkItem[] = [];
  for (const l of links) {
    if (!l || seen.has(l.to)) continue;
    seen.add(l.to);
    out.push(l);
  }
  return out.slice(0, max);
};

/** Extra related guides per guide, most relevant first. */
const GUIDE_RELATED_GUIDES: Record<string, string[]> = {
  "referral-text-templates": ["when-to-ask-for-a-referral", "how-to-ask-a-customer-for-a-referral"],
  "what-is-a-referral-program": ["how-to-start-a-referral-program", "referral-marketing-glossary"],
  "when-to-ask-for-a-referral": ["referral-text-templates", "how-to-ask-a-customer-for-a-referral"],
  "how-to-get-paid-for-referrals": ["what-is-a-referral-program", "referral-marketing-glossary"],
  "referral-marketing-glossary": ["what-is-a-referral-program", "how-much-to-pay-for-a-referral"],
  "how-much-to-pay-for-a-referral": ["what-is-a-referral-program"],
  "how-to-ask-a-customer-for-a-referral": ["referral-text-templates"],
  "how-to-start-a-referral-program": ["what-is-a-referral-program"],
};

/** Guides link to trades and tools (and the Earn page for the referrer guide). */
export const relatedForGuide = (slug: string): RelatedLinkItem[] => {
  const trades = tradesForGuide(slug).slice(0, 2).map((t) => tradeLink(t.slug));
  const tool = slug.includes("ask") || slug.includes("text") ? MESSAGE_TOOL : CALC_TOOL;
  const guides = (GUIDE_RELATED_GUIDES[slug] ?? []).map(guideLink);
  if (slug === "how-to-get-paid-for-referrals") {
    return dedupe([{ to: "/earn", label: "Revvin Earn" }, ...guides, ...trades]);
  }
  return dedupe([...trades, tool, ...guides]);
};

/** The comparison closest to each trade's buyers. */
const TRADE_COMPARE: Record<string, string> = {
  roofing: "get-the-referral",
  solar: "snoball",
  remodeling: "snoball",
  "window-replacement": "get-the-referral",
  hvac: "clicki",
  plumbing: "clicki",
  electrical: "clicki",
  "pest-control": "clicki",
  "garage-door": "clicki",
  "pool-service": "referralwise",
  flooring: "referralwise",
  fencing: "referralwise",
};

const COMPARE_NAMES: Record<string, string> = {
  "get-the-referral": "Revvin vs Get The Referral",
  referralwise: "Revvin vs ReferralWise",
  clicki: "Revvin vs Clicki",
  snoball: "Revvin vs Snoball",
  "jobber-referrals": "Revvin vs Jobber Referrals",
};

export const compareForTrade = (tradeSlug: string): RelatedLinkItem => {
  const c = TRADE_COMPARE[tradeSlug] ?? "jobber-referrals";
  return { to: `/compare/${c}`, label: COMPARE_NAMES[c] };
};

/** Trades link to guides and the matching comparison. */
export const relatedForTrade = (tradeSlug: string): RelatedLinkItem[] =>
  dedupe([
    guideLink("how-much-to-pay-for-a-referral"),
    guideLink("referral-text-templates"),
    ...guidesForTrade(tradeSlug).map((g) => guideLink(g.slug)),
    compareForTrade(tradeSlug),
  ]);

/** Comparisons link to the roundup and pricing. */
export const relatedForCompare = (path: string): RelatedLinkItem[] =>
  dedupe([
    path === ROUNDUP_LINK.to ? null : ROUNDUP_LINK,
    PRICING,
    { to: "/compare", label: "All comparisons" },
    guideLink("what-is-a-referral-program"),
    guideLink("how-much-to-pay-for-a-referral"),
  ]);
