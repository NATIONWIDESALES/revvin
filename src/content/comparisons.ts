/**
 * Comparison pages and the referral software roundup.
 *
 * Every competitor fact here was taken from that company's own site and
 * checked on COMPARISONS_CHECKED_ON. Do not add a competitor claim that is not
 * already written in this file; where a fact was not checked, the cell points
 * the reader at the competitor's own site instead of guessing.
 */

export const COMPARISONS_CHECKED_ON = "2026-10-29";
export const CHECKED_LINE =
  "Prices and features checked October 29, 2026. Check each company's site for current terms.";
export const BIAS_DISCLOSURE =
  "Revvin wrote this page. We've tried to be fair; tell us at info@revvin.co if anything is out of date.";

export interface ContentTable {
  caption: string;
  head: string[];
  rows: string[][];
}

export interface Source {
  label: string;
  url: string;
}

export interface Comparison {
  slug: string;
  competitor: string;
  h1: string;
  metaTitle: string;
  metaDescription: string;
  answer: string;
  table: ContentTable;
  chooseThem: string[];
  chooseRevvin: string[];
  /** Extra plain sections shown after the choose lists. */
  notes?: { heading: string; body: string }[];
  faqs: { q: string; a: string }[];
  sources: Source[];
}

const REVVIN_SOURCE: Source = { label: "Revvin pricing", url: "https://revvin.co/pricing" };

const REVVIN_COL = {
  price: "Free. Pro is $49/month or $450/year",
  setup: "None",
  free: "Yes: referral page and QR code, unlimited referrals, import and ask up to 100 customers",
  signup: "Self-serve signup, no demo",
  payouts: "The business pays referrers directly; Revvin does not process payouts yet",
  link: "Yes, a personal link for every referrer, on Free",
  integrations: "Zapier and API",
  best: "Small home-service crews who want to ask their whole customer list",
};

const ROW_LABELS = [
  "Starting price",
  "Setup fee",
  "Free plan",
  "How you sign up",
  "Reward payouts",
  "Personal link per referrer",
  "Integrations",
  "Best for",
];

const table = (competitor: string, them: string[]): ContentTable => {
  const r = REVVIN_COL;
  const ours = [r.price, r.setup, r.free, r.signup, r.payouts, r.link, r.integrations, r.best];
  return {
    caption: `Revvin and ${competitor} compared`,
    head: ["", "Revvin", competitor],
    rows: ROW_LABELS.map((label, i) => [label, ours[i], them[i]]),
  };
};

export const COMPARISONS: Comparison[] = [
  {
    slug: "get-the-referral",
    competitor: "Get The Referral",
    h1: "Revvin vs Get The Referral",
    metaTitle: "Revvin vs Get The Referral: price and payouts | Revvin",
    metaDescription:
      "Get The Referral runs $399 to $1,899 a month plus setup fees and starts with a demo. Revvin starts free with self-serve signup. An honest side-by-side.",
    answer:
      "Get The Referral is built for larger sales teams: plans run from $399 to $1,899 a month plus setup fees of $500 to $2,500, and you sign up through a demo. Revvin starts free with self-serve signup and no setup fee, and Pro is $49 a month. Revvin suits 1 to 10 person crews.",
    table: table("Get The Referral", [
      "Starter $399/month (5 sales seats); Pro Lite $799/month; Pro $999/month (15 seats); Premium $1,899/month (50 seats); 10% off annual",
      "$500 on Starter, $1,000 on Pro Lite and Pro, $2,500 on Premium",
      "No free plan shown",
      "Through a demo",
      "Through a wallet with a 3.2% payout transaction fee (Xtrm); ACH funding free, card funding 3 to 3.2%",
      "Branded referral hub",
      "Open API from Pro Lite",
      "Larger sales teams that want a sales rep app and a Customer Success Manager",
    ]),
    chooseThem: [
      "You run a larger sales team that wants rep apps and a success manager.",
      "You want payouts handled for you.",
      "Your budget is $400 to $1,900 a month.",
    ],
    chooseRevvin: [
      "You want to start free today without a demo.",
      "You are a 1 to 10 person team.",
      "You would rather pay referrers directly with no payout fees.",
    ],
    faqs: [
      {
        q: "How much does Get The Referral cost?",
        a: "Its pricing page lists Starter at $399 a month with a $500 setup fee, Pro Lite at $799 a month and Pro at $999 a month with $1,000 setup, and Premium at $1,899 a month with $2,500 setup. Annual billing is 10% off.",
      },
      {
        q: "Does Get The Referral have a free plan?",
        a: "No free plan is shown on its pricing page, and signup goes through a demo. Revvin has a free plan with self-serve signup.",
      },
      {
        q: "Who pays the referrer with Revvin?",
        a: "The business pays referrers directly. Revvin tracks each reward from owed to paid but does not process payouts yet, so there is no payout fee.",
      },
    ],
    sources: [{ label: "Get The Referral pricing", url: "https://www.getthereferral.com/pricing" }, REVVIN_SOURCE],
  },
  {
    slug: "referralwise",
    competitor: "ReferralWise",
    h1: "Revvin vs ReferralWise",
    metaTitle: "Revvin vs ReferralWise: two low-cost tools | Revvin",
    metaDescription:
      "ReferralWise and Revvin are close in price. ReferralWise automates partner payouts through Stripe; Revvin asks past customers with personal links.",
    answer:
      "ReferralWise is the closest tool to Revvin at a similar price: it has a free plan, Pro at $19 a month and Business at $49 a month, and it pays partners through Stripe after a job is approved. Revvin's Free plan lets you import and ask up to 100 past customers with personal links, and you pay referrers yourself.",
    table: table("ReferralWise", [
      "Free; Pro $19/month; Business $49/month",
      "No setup fees",
      "Yes, with limited partners and 3 referrals a month",
      "See referralwise.app",
      "After a job is marked won and approved, it charges the contractor's saved card and pays the partner by Stripe direct deposit",
      "See referralwise.app",
      "API on Business",
      "Partner referrals with automated payouts",
    ]),
    chooseThem: [
      "You want payouts automated through Stripe.",
      "You mostly work with partner referrers like realtors and other trades.",
      "You want team seats today.",
    ],
    chooseRevvin: [
      "You want to ask your whole past-customer list with personal links.",
      "You want the ask sent after every finished job with a review request.",
      "You want yard signs, door hangers and invoice inserts in a free print pack.",
    ],
    notes: [
      {
        heading: "The honest summary",
        body: "ReferralWise is the closest tool to Revvin at a similar price. If automated partner payouts matter most, it is a strong choice. If your referrals come mostly from past customers, Revvin is built around that list.",
      },
    ],
    faqs: [
      {
        q: "How much does ReferralWise cost?",
        a: "Its pricing page lists a Free plan with limited partners and 3 referrals a month, Pro at $19 a month with 25 partners, unlimited referrals, QR codes and a custom landing page, and Business at $49 a month with unlimited partners, team members and API.",
      },
      {
        q: "How does ReferralWise pay referrers?",
        a: "Commissions are flat or a percentage. After a job is marked won and approved, ReferralWise charges the contractor's saved card and pays the partner by Stripe direct deposit.",
      },
      {
        q: "How is Revvin different?",
        a: "Revvin is built around past customers: import and ask up to 100 on Free with a personal link for every referrer, plus the ask after every finished job with a Google review request. You pay referrers directly.",
      },
    ],
    sources: [{ label: "ReferralWise pricing", url: "https://referralwise.app/pricing" }, REVVIN_SOURCE],
  },
  {
    slug: "clicki",
    competitor: "Clicki",
    h1: "Revvin vs Clicki",
    metaTitle: "Revvin vs Clicki for service companies | Revvin",
    metaDescription:
      "Clicki starts at $549 a month with texting, instant payouts and field software integrations. Revvin starts free for smaller crews. A fair comparison.",
    answer:
      "Clicki starts at $549 a month for Referrals + RewardsPass, includes 2,000 texts a month, pays promoters by Venmo, Zelle, PayPal or direct deposit and connects to ServiceTitan and FieldRoutes. Revvin starts free, Pro is $49 a month, and the business pays referrers directly. Revvin suits smaller crews that want to start free.",
    table: table("Clicki", [
      "Referrals + RewardsPass $549/month base; Bravo add-on +$200/month; quarterly and annual billing nonrefundable",
      "See joinclicki.com",
      "See joinclicki.com",
      "See joinclicki.com",
      "Venmo, Zelle, PayPal and direct deposit",
      "Yes, a unique link per promoter, plus an Apple and Google Wallet pass",
      "ServiceTitan, Real Green, FieldRoutes, GoHighLevel, Zapier, HubSpot",
      "Multi-tech service companies on ServiceTitan or FieldRoutes",
    ]),
    chooseThem: [
      "You run a multi-tech operation on ServiceTitan or FieldRoutes.",
      "You want instant payouts and wallet passes.",
      "You want texting built in.",
    ],
    chooseRevvin: [
      "$549 a month is more than you want to spend before you have results.",
      "You are a smaller crew.",
      "You want to start free.",
    ],
    faqs: [
      {
        q: "How much does Clicki cost?",
        a: "Clicki Referrals + RewardsPass is $549 a month base. The Bravo add-on for reviews, NPS, technician tipping, employee rewards and leaderboards is $200 a month more. 2,000 SMS a month are included, then $0.03 per segment.",
      },
      {
        q: "Does Clicki work with ServiceTitan?",
        a: "Yes. Clicki lists integrations with ServiceTitan, Real Green, FieldRoutes, GoHighLevel, Zapier and HubSpot.",
      },
      {
        q: "Does Revvin send texts for me?",
        a: "No. Revvin pre-fills the ask so you send it from your own phone or email app. Clicki includes texting in its plan.",
      },
    ],
    sources: [{ label: "Clicki", url: "https://joinclicki.com/" }, REVVIN_SOURCE],
  },
  {
    slug: "snoball",
    competitor: "Snoball",
    h1: "Revvin vs Snoball",
    metaTitle: "Revvin vs Snoball: done for you or self-serve | Revvin",
    metaDescription:
      "Snoball sells a done-for-you word-of-mouth program with a Results Coach and unpublished pricing. Revvin is self-serve, published pricing, free to start.",
    answer:
      "Snoball sells a done-for-you word-of-mouth program with referrals, reviews, reputation assets and video testimonials, run with a dedicated Results Coach. Its pricing is not published on its site; you book a demo. Revvin publishes its pricing, starts free with self-serve signup, and Pro is $49 a month. Revvin is for owners who run it themselves.",
    table: table("Snoball", [
      "Not published on its site",
      "Not published on its site",
      "A free business profile is offered",
      "Book a demo",
      "See snoball.com",
      "See snoball.com",
      "Connects to your CRM so campaigns launch automatically",
      "Done-for-you reviews and referrals for larger companies",
    ]),
    chooseThem: [
      "You want a done-for-you program with a coach.",
      "Reviews and video testimonials matter as much as referrals.",
      "You are a larger solar, moving or remodeling company.",
    ],
    chooseRevvin: [
      "You want published pricing and a free start.",
      "You want to run it yourself in minutes.",
      "You mainly want referrals from past customers.",
    ],
    faqs: [
      {
        q: "How much does Snoball cost?",
        a: "Snoball does not publish pricing on its site. You book a demo to get a price. It does offer a free business profile.",
      },
      {
        q: "What does Snoball include?",
        a: "Snoball describes a done-for-you word-of-mouth program combining referrals, online reviews, reputation assets and video testimonials, connected to your CRM, with a dedicated Results Coach and client success team.",
      },
      {
        q: "Can I run Revvin myself?",
        a: "Yes. Revvin is self-serve: sign up, publish your referral page and start asking customers. There is no setup fee and you can cancel Pro anytime.",
      },
    ],
    sources: [{ label: "Snoball", url: "https://snoball.com/" }, REVVIN_SOURCE],
  },
  {
    slug: "jobber-referrals",
    competitor: "Jobber Referrals",
    h1: "Revvin vs Jobber Referrals",
    metaTitle: "Revvin vs Jobber Referrals: credits or cash | Revvin",
    metaDescription:
      "Jobber Referrals gives credits on the next service. With Revvin you pay cash rewards from a public referral page and print pack, and connect via Zapier.",
    answer:
      "Jobber Referrals is part of Jobber's marketing tools: it emails your customers about referring, gives each one a referral link and applies credits or discounts to the referrer's next service. Revvin gives you a public referral page anyone can use, cash rewards you pay directly and a free print pack, and connects to Jobber through Zapier.",
    table: table("Jobber Referrals", [
      "Part of Jobber's marketing tools; see Jobber pricing",
      "See Jobber pricing",
      "See Jobber pricing",
      "Through a Jobber account",
      "Credits or discounts on the referrer's next service",
      "Yes, referral links tied to each customer",
      "Part of Jobber",
      "Businesses already on Jobber",
    ]),
    chooseThem: [
      "You already pay for Jobber and want everything in one place.",
      "You prefer credits on the next service over cash.",
      "You only want referrals from existing Jobber clients.",
    ],
    chooseRevvin: [
      "You want cash rewards and a public referral page anyone can use, not just existing clients.",
      "You want a print pack with QR codes.",
      "You are not on Jobber, or you want both (Revvin connects to Jobber through Zapier).",
    ],
    faqs: [
      {
        q: "What does Jobber Referrals do?",
        a: "It sends customers an email campaign about referring, gives referral links tied to each customer, applies credits or discounts to the referrer's next service, and reports referred jobs and revenue.",
      },
      {
        q: "Can I use Revvin with Jobber?",
        a: "Yes. Revvin connects to Jobber through Zapier, so you can keep Jobber for jobs and use Revvin for your referral page and asks.",
      },
      {
        q: "Does Revvin pay rewards as credits?",
        a: "No. The business pays referrers directly. Revvin tracks each reward from owed to paid but does not process payouts yet.",
      },
    ],
    sources: [
      { label: "Jobber Referrals", url: "https://www.getjobber.com/features/marketing-tools/referrals/" },
      REVVIN_SOURCE,
    ],
  },
];

export const getComparison = (slug?: string) => COMPARISONS.find((c) => c.slug === slug);

export const ROUNDUP_SLUG = "best-referral-software-for-contractors-2026";

export interface RoundupTool {
  name: string;
  comparePath?: string;
  bestFor: string;
  price: string;
  standsOut: string;
  watchOut: string;
}

export const ROUNDUP = {
  slug: ROUNDUP_SLUG,
  h1: "Best referral software for contractors in 2026",
  metaTitle: "Best referral software for contractors in 2026 | Revvin",
  metaDescription:
    "Revvin, ReferralWise, Jobber Referrals, Clicki, Get The Referral and Snoball compared on price, free plans and who each is best for.",
  answer:
    "For most small contractors, start with a tool that is free to try and doesn't need a demo: Revvin or ReferralWise. If you already use Jobber, its built-in referrals may be enough. Larger teams with sales reps should look at Get The Referral, Clicki or Snoball.",
  tools: [
    {
      name: "Revvin",
      bestFor: "Small home-service crews who want to ask their whole customer list.",
      price: "Free. Pro is $49/month or $450/year, with no setup fee.",
      standsOut:
        "The Free plan includes a referral page and QR code, unlimited referrals, import and ask up to 100 customers, a personal link for every referrer, the ask after every finished job with a Google review request, a lead inbox and rewards tracked from owed to paid. Self-serve signup, Zapier and API.",
      watchOut: "You pay referrers yourself, and there is no rep app yet.",
    },
    {
      name: "ReferralWise",
      comparePath: "/compare/referralwise",
      bestFor: "Partner referrals with automated payouts.",
      price: "Free plan; Pro $19/month; Business $49/month; no setup fees.",
      standsOut:
        "After a job is marked won and approved, it charges the contractor's saved card and pays the partner by Stripe direct deposit. Business adds unlimited partners, team members and API.",
      watchOut: "The free plan is limited to a few referrals a month.",
    },
    {
      name: "Jobber Referrals",
      comparePath: "/compare/jobber-referrals",
      bestFor: "Jobber users.",
      price: "Part of Jobber's marketing tools; see Jobber pricing.",
      standsOut:
        "It emails customers about referring, gives referral links tied to each customer and reports referred jobs and revenue.",
      watchOut: "Rewards are credits or discounts on the next service, and it is tied to Jobber.",
    },
    {
      name: "Clicki",
      comparePath: "/compare/clicki",
      bestFor: "Multi-tech service companies on ServiceTitan or FieldRoutes.",
      price: "$549/month base; Bravo add-on +$200/month.",
      standsOut:
        "2,000 SMS a month included, payouts by Venmo, Zelle, PayPal and direct deposit, Apple and Google Wallet passes, and integrations with ServiceTitan, Real Green, FieldRoutes, GoHighLevel, Zapier and HubSpot.",
      watchOut: "$549 a month base, and quarterly and annual billing is nonrefundable.",
    },
    {
      name: "Get The Referral",
      comparePath: "/compare/get-the-referral",
      bestFor: "Roofing, solar and remodeling sales teams.",
      price: "$399 to $1,899/month plus $500 to $2,500 setup.",
      standsOut: "A branded referral hub, a sales rep app, a Customer Success Manager and payouts through a wallet.",
      watchOut: "$399 to $1,899 a month plus setup fees, and signup goes through a demo.",
    },
    {
      name: "Snoball",
      comparePath: "/compare/snoball",
      bestFor: "Done-for-you reviews and referrals.",
      price: "Not published; book a demo.",
      standsOut:
        "A done-for-you program combining referrals, reviews, reputation assets and video testimonials, with a dedicated Results Coach.",
      watchOut: "Pricing is not published.",
    },
  ] as RoundupTool[],
  summary: {
    caption: "Referral software for contractors at a glance",
    head: ["Tool", "Starting price", "Free plan", "Best for"],
    rows: [
      ["Revvin", "Free; Pro $49/month", "Yes", "Small home-service crews"],
      ["ReferralWise", "Free; Pro $19/month", "Yes, limited", "Partner referrals with automated payouts"],
      ["Jobber Referrals", "See Jobber pricing", "See Jobber pricing", "Jobber users"],
      ["Clicki", "$549/month", "See joinclicki.com", "Multi-tech companies on ServiceTitan or FieldRoutes"],
      ["Get The Referral", "$399/month plus setup", "No free plan shown", "Roofing, solar and remodeling sales teams"],
      ["Snoball", "Not published", "Free business profile", "Done-for-you reviews and referrals"],
    ],
  } as ContentTable,
  howToChoose: [
    { q: "How big is your team?", a: "A 1 to 10 person crew rarely needs rep apps or a success manager. Larger sales teams may." },
    { q: "What is your budget?", a: "Revvin and ReferralWise start free. Clicki and Get The Referral start at several hundred dollars a month." },
    { q: "Do you want payouts handled for you?", a: "ReferralWise, Clicki and Get The Referral handle payouts. With Revvin you pay referrers directly." },
    { q: "Which job software do you use?", a: "On Jobber, try its built-in referrals first. On ServiceTitan or FieldRoutes, Clicki integrates with both. Revvin connects through Zapier and API." },
  ],
  sources: [
    { label: "Get The Referral pricing", url: "https://www.getthereferral.com/pricing" },
    { label: "ReferralWise pricing", url: "https://referralwise.app/pricing" },
    { label: "Clicki", url: "https://joinclicki.com/" },
    { label: "Snoball", url: "https://snoball.com/" },
    { label: "Jobber Referrals", url: "https://www.getjobber.com/features/marketing-tools/referrals/" },
    REVVIN_SOURCE,
  ] as Source[],
};
