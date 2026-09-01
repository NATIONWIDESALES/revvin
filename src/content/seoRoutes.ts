// Prerender content for crawlers that do not execute JavaScript (GPTBot,
// ClaudeBot, PerplexityBot, CCBot, and Googlebot's first pass).
//
// Every claim below must be true of the product: publishing a referral page is
// free, Revvin Pro is $49/month USD, Revvin never sends email or SMS on a
// business's behalf (it prepares the message and the owner's own device sends
// it), and businesses pay their referrers directly off-platform. There is no
// auto-ask engine, no automated review requests, no reactivation segmentation,
// no webhooks and no public API.
//
// Industry and guide routes are derived from content so they can never drift.

import { INDUSTRIES } from "./industries";
import { GUIDES } from "./guides";

export interface PrerenderRoute {
  path: string;
  title: string;
  description: string;
  h1: string;
  sections: { heading: string; body: string }[];
  faqs?: { q: string; a: string }[];
  /**
   * Absolute canonical URL. Set this only for pages that are genuine variants
   * or aliases of another page and must not compete with it in the index.
   * When absent the prerender emits a self-referential canonical.
   */
  canonical?: string;
}

const PRO = "$49/month USD";

const industryRoutes: PrerenderRoute[] = INDUSTRIES.map((i) => ({
  path: `/referral-program/${i.slug}`,
  title: i.metaTitle,
  description: i.metaDescription,
  h1: i.h1,
  sections: [
    { heading: `Referrals for ${i.trade} businesses`, body: i.intro },
    ...i.loops.map((l) => ({ heading: l.title, body: l.body })),
    {
      heading: "Where to put your link",
      body: `Your referral page lives on your own Revvin link and comes with a QR code and a print pack. ${i.trade.charAt(0).toUpperCase() + i.trade.slice(1)} businesses put it here: ${i.placements.join("; ")}. ${i.rewardExample}`,
    },
  ],
  faqs: i.faqs,
}));

const guideRoutes: PrerenderRoute[] = GUIDES.map((g) => ({
  path: `/guides/${g.slug}`,
  title: g.metaTitle,
  description: g.metaDescription,
  h1: g.question,
  sections: g.sections,
  faqs: g.faqs,
}));

const handwritten: PrerenderRoute[] = [
  {
    path: "/",
    title: "Revvin · Your customer list, working for you",
    description: `Your referral page is free: publish it and take referrals. Revvin Pro is ${PRO} for the tools that ask your whole customer list for you.`,
    h1: "Your customer list, working for you.",
    sections: [
      {
        heading: "Three revenue loops from one list",
        body: "You already have a list of people who paid you and never heard from you again. Revvin turns that one list into three loops: referrals, repeat work and reviews. You publish a branded referral page on your own link, share it with the customers you already have, and every lead they send lands in one inbox you can work from your phone.",
      },
      {
        heading: "Publishing is free",
        body: `Building and publishing your referral page costs nothing, and your listing appears in the Revvin marketplace at no cost. Revvin Pro is ${PRO} and adds importing your past-customer list, sending your referral ask in bulk from your own email app, ROI reporting with a monthly email recap, and custom page branding. Cancel any time: your page stays live and your referrals keep coming in, you only lose the Pro tools.`,
      },
      {
        heading: "You stay in control of every message",
        body: "Revvin never sends email or SMS on your behalf. It prepares the message and opens your own email or messaging app with the recipients and text filled in, so it sends from your address or your number. The relationship and the consent stay with you.",
      },
      {
        heading: "Rewards you set, paid directly",
        body: "You decide the referral reward. Revvin tracks each one from pending to paid and notifies the referrer at both moments, but it never holds or moves money and takes no cut of the reward. When a deal closes you pay your referrer directly, off-platform.",
      },
    ],
  },
  {
    path: "/how-it-works",
    title: "Revvin | How it works",
    description: `See how Revvin turns past customers into referrals, repeat work and reviews. Your page is free to publish; Revvin Pro is ${PRO} for the tools that ask your whole customer list for you.`,
    h1: "Three steps to an engine that runs off your jobs.",
    sections: [
      {
        heading: "Step one: build your page",
        body: "Create a business account, set your offer and the reward you are willing to pay, and publish. Your page sits on your own Revvin link and comes with a shareable link and a QR code you can print. Publishing is free and takes minutes.",
      },
      {
        heading: "Step two: ask the customers you already served",
        body: "Send the ask yourself, using pre-written messages, after a finished job. On Pro you can paste in your past-customer list and send the ask in batches straight from your own email app. Revvin prepares the message; your device sends it.",
      },
      {
        heading: "Step three: work the leads and pay the reward",
        body: "Referrals arrive in a lead inbox with status tracking and one-tap call or text back. Move a lead through to closed, mark the reward paid, and your referrer is notified at each step. You pay them directly when the deal closes.",
      },
    ],
  },
  {
    path: "/for-businesses",
    title: "Revvin | Referrals, repeat work and reviews",
    description: `Turn your past-customer list into referrals, repeat work and reviews. Your referral page is free. Revvin Pro is ${PRO}. Cancel anytime.`,
    h1: "Stop paying for clicks. Start working the list you have.",
    sections: [
      {
        heading: "Every past customer is a referral waiting to happen",
        body: "Every customer who ever paid you is a referral, a repeat job or a review waiting to happen. Revvin gives you one place to ask for all three, and one inbox where the results land. No ad spend, no bidding on clicks, no buying shared leads.",
      },
      {
        heading: "Simple economics",
        body: `Your referral page is free to build and publish, and your marketplace listing costs nothing. Revvin Pro is ${PRO} with no contract and no setup fee. There are no platform fees and no per-referral charges: the reward you advertise is the reward your referrer receives, paid by you directly when the deal closes.`,
      },
      {
        heading: "What you get on day one",
        body: "A branded referral page on your own link, a QR code and print pack for yard signs, invoices and business cards, a lead inbox with status tracking and one-tap reply, offers you control, and reward tracking from pending to paid. Referrer accounts are always free, so the people sending you work never pay anything either.",
      },
    ],
  },
  {
    path: "/for-referrers",
    title: "Monetize Your Network | Earn Referral Fees | Revvin",
    description:
      "Turn your introductions into income. Refer customers to verified businesses on Revvin and earn 100% of the advertised payout when the deal closes.",
    h1: "Know someone who needs a service? Get paid for the intro.",
    sections: [
      {
        heading: "How referrers earn",
        body: "Browse businesses that publish a referral reward, submit the customer's details on the business's referral page, and earn when the deal closes. The business contacts the customer, qualifies them and works the deal, then pays you directly. You receive the full advertised amount, because Revvin takes no cut of the reward.",
      },
      {
        heading: "Free to join, nothing to sell",
        body: "A referrer account is free forever and needs no card. You are not reselling anything and you do not handle money on the business's behalf. You make an introduction to someone you already know needs the work.",
      },
      {
        heading: "You can see where a referral stands",
        body: "Each referral you submit has a status you can follow from new through to closed and paid, and you are notified when a reward is won and again when the business marks it paid. If a closed referral is not paid within 30 days you can flag it for Revvin review.",
      },
    ],
  },
  {
    path: "/pricing",
    title: "Revvin | Pricing",
    description: `Your referral page is free, published and collecting referrals. Revvin Pro is ${PRO} for the tools that ask your whole customer list for you. You pay your referrers directly.`,
    h1: "Your referral page is free.",
    sections: [
      {
        heading: "Free, $0",
        body: "Your referral page on your own link, a QR code and share tools, unlimited referral leads, a lead inbox with status tracking, offers, payout tracking from pending to paid, and a listing in the marketplace. Build it, publish it and take referrals on it without paying anything.",
      },
      {
        heading: `Revvin Pro, ${PRO}`,
        body: "Everything in Free, plus importing your past-customer list and sending your referral ask in bulk from your own email app, ROI reporting with a monthly email recap, and custom page branding. Annual billing is available and is billed once for the year. No contract and no setup fee.",
      },
      {
        heading: "Cancel any time",
        body: "Cancel from the billing portal whenever you like. Your page stays live and your referrals keep coming in, you only lose the Pro tools. There are no platform fees on referral rewards: Revvin does not take a cut and does not move the money. You pay your referrer directly when a deal closes.",
      },
      {
        heading: "Optional Launch Package",
        body: "A one-time $297 Launch Package is available if you want help getting started: a 1:1 setup call and done-for-you offer creation. It is optional and separate from the subscription.",
      },
    ],
    faqs: [
      {
        q: "What exactly is free?",
        a: "Building and publishing your referral page, your link and QR code, unlimited referral leads, the lead inbox with status tracking, your offers, payout tracking, and your marketplace listing.",
      },
      {
        q: `What do I get for the ${PRO}?`,
        a: "Revvin Pro adds importing your past-customer list and sending your referral ask in bulk from your own email app, ROI reporting with a monthly email recap, and custom page branding.",
      },
      {
        q: "Does Revvin take a cut of referral payouts?",
        a: "No. Referrers receive 100% of the advertised payout. The business pays the referrer directly, off-platform, when the deal closes. Revvin never holds or moves the money.",
      },
      {
        q: "Is there really no contract?",
        a: "Yes. Monthly Pro is month to month and you can cancel any time from the billing portal. Cancelling does not unpublish your referral page.",
      },
    ],
  },
  {
    path: "/browse",
    title: "Revvin | Browse referral offers",
    description:
      "Browse referral offers from verified service businesses on Revvin. Refer a customer, earn the full advertised payout when the deal closes. Free to join as a referrer.",
    h1: "Browse referral offers",
    sections: [
      {
        heading: "The marketplace is launching",
        body: "Listings are limited while founding businesses come on board. You can filter what is live by category, by country and region across the United States, Canada and the UAE, by payout, and by distance from where you are. If nothing matches yet you can leave your email and hear when offers go live in your area.",
      },
      {
        heading: "How a marketplace referral works",
        body: "Open an offer, read the reward and the qualification criteria the business set, then submit the customer's details on that business's referral page. The business qualifies and works the deal and pays you the full advertised amount directly when it closes.",
      },
      {
        heading: "Are you a business?",
        body: "Publishing your referral page and appearing in the marketplace is free. Set your offer and your reward, publish, and referrers can find you. Revvin Pro is available at " + PRO + " for the tools that ask your whole customer list for you.",
      },
    ],
  },
  {
    path: "/referral-programs",
    title: "Referral Programs by Industry | Revvin",
    description: `Referral program software for roofing, HVAC, plumbing, solar, electrical, landscaping, painting and auto detailing. Free to publish. Revvin Pro is ${PRO} for the tools that ask your whole customer list for you.`,
    h1: "Referral programs by industry",
    sections: [
      {
        heading: "Every trade sells differently",
        body: "The ask, the repeat work and the review timing change from trade to trade, so each industry page shows how the three loops run on that customer list. Pick your trade to see the wording, the reward framing and the places to put your link.",
      },
      {
        heading: "Trades covered",
        body:
          "Guides for " +
          INDUSTRIES.map((i) => i.label.toLowerCase()).join(", ") +
          ". Not listed? It still works: the page, the QR code, the lead inbox and the reward tracking are the same for any service business that keeps a customer list.",
      },
      {
        heading: "The same free page for every trade",
        body: `Publishing is free in every industry. Revvin Pro is ${PRO} and adds bulk asking from your own email app, ROI reporting and custom page branding. Businesses pay their referrers directly when deals close.`,
      },
    ],
  },
  {
    path: "/ask-kit",
    title: "The Referral Ask Kit",
    description:
      "The exact words to use, and when to use them. Copy any of these referral scripts, swap the braces for your own details, and send it today. Free, no sign-up needed.",
    h1: "The Referral Ask Kit",
    sections: [
      {
        heading: "Scripts you can copy right now",
        body: "Six short scripts for asking for referrals, repeat work and reviews: the ask right after a finished job, the text to a customer you served last season, the email to your whole past-customer list, the nudge to someone who said they knew somebody, the review request, and the thank-you when a referral closes. Copy any of them, swap the braces for your own details, and send it today.",
      },
      {
        heading: "Free, no sign-up needed",
        body: "The kit is a public page. There is nothing to buy and no account required to read or copy it. It is written to be sent from your own phone or email app, in your own words, because that is how Revvin works too: it prepares the message, your device sends it.",
      },
      {
        heading: "Where it leads",
        body: "The scripts work better when the person you ask has somewhere to send the referral. A free Revvin referral page gives them a link and a QR code to use, and gives you one inbox with the leads and the reward tracking in it.",
      },
    ],
  },
  {
    path: "/trust",
    title: "Revvin | Trust, verification and payouts",
    description:
      "How Revvin protects businesses and referrers with verification, transparent status tracking, dispute review, and full referrer payouts.",
    h1: "Trust and payouts",
    sections: [
      {
        heading: "Revvin does not process payouts",
        body: "Businesses pay their referrers directly, off-platform. Revvin is the infrastructure: it records the referral, tracks the status from new to closed to paid, and notifies the referrer at each step. It never holds, moves or takes a cut of the reward, so the advertised payout is what the referrer receives.",
      },
      {
        heading: "Verification and approval",
        body: "Businesses are reviewed before their first offer goes live, and some categories require approval before an offer is published. Outcomes are confirmed by the business in its dashboard, and status changes are kept in an audit log.",
      },
      {
        heading: "Disputes and non-payment",
        body: "If a referrer is not paid within 30 days of a closed deal, they can flag that referral for Revvin review. Repeated non-payment can result in a business being suspended. Duplicate submissions are settled first-in-wins.",
      },
      {
        heading: "Pricing transparency",
        body: `Publishing a referral page is free and there is no extra per-referral charge. Revvin Pro is ${PRO}. There are no platform fees on referral rewards.`,
      },
    ],
  },
  {
    path: "/about-revvin-llm",
    title: "About Revvin | Structured Summary for AI & LLM Citation",
    description:
      "A plain-text, structured factsheet about Revvin's referral platform for service businesses: pricing, business model, target industries, and policies.",
    h1: "About Revvin",
    sections: [
      {
        heading: "What Revvin is",
        body: "Revvin is referral software for service businesses. It turns a past-customer list into referrals, repeat work and reviews. A business gets a branded referral page on its own link, a shareable link and QR code, a lead inbox with status tracking, offers it controls, and reward tracking from pending to paid.",
      },
      {
        heading: "Business model",
        body: `Publishing a referral page is free, including the marketplace listing. Revvin Pro is ${PRO}, or an annual price billed once, with no contract and no setup fee, cancellable from the billing portal. An optional one-time $297 Launch Package adds a 1:1 setup call and done-for-you offer creation. Revvin takes no cut of referral rewards; referrers receive 100% of the advertised payout, paid directly by the business.`,
      },
      {
        heading: "How a referral flows",
        body: "A business publishes a page with its offer, reward amount and qualification criteria. It shares the link or QR code with past customers and its network. A referrer submits the customer's details. The business contacts and qualifies the customer and works the deal. When it closes, the business pays the referrer directly and marks the reward paid. Unpaid closed referrals can be flagged for review after 30 days.",
      },
      {
        heading: "Scope and limits",
        body: "Revvin never sends email or SMS on a business's behalf: messages are prepared and sent from the owner's own device and accounts. There is no automatic asking engine, no automated review-request sending, no reactivation segmentation, and no public API or webhook product. Pricing is USD only in every supported country: the United States, Canada and the United Arab Emirates.",
      },
    ],
  },
  {
    path: "/sample",
    title: "Revvin | Sample referral page",
    description: `Preview an example Revvin referral page: branded page, shareable link, QR code and lead inbox for service businesses. Free to publish. Revvin Pro is ${PRO}.`,
    h1: "A sample Revvin referral page",
    sections: [
      {
        heading: "What the page looks like",
        body: "This is an example of the branded page every business gets. It shows the business name, the offer, the reward on the table, and a short form where someone can submit a referral in under a minute. Share the link or the QR code with your customers and the leads land in your inbox.",
      },
      {
        heading: "What happens after a referral is submitted",
        body: "The referral appears in your lead inbox with a status you can move as you work it, and one-tap call or text back so you can reply from your phone. Your referrer can follow the status and is notified when the reward is won and when you mark it paid.",
      },
      {
        heading: "Free to publish your own",
        body: `Your version of this page is free to build and publish on your own link. Revvin Pro is ${PRO} and adds bulk asking from your own email app, ROI reporting with a monthly recap, and custom branding for the page.`,
      },
    ],
  },
  {
    path: "/marketplace",
    // Alias route: /marketplace renders the same Browse component and the same
    // offer listing as /browse, so it canonicals there and is kept out of the
    // sitemap.
    canonical: "https://revvin.co/browse",
    title: "Revvin | Browse referral offers",
    description:
      "Browse referral offers from verified service businesses on Revvin. Refer a customer, earn the full advertised payout when the deal closes. Free to join as a referrer.",
    h1: "Browse referral offers",
    sections: [
      {
        heading: "The marketplace is launching",
        body: "This is the same listing as the Revvin browse page. Listings are limited while founding businesses come on board. You can filter what is live by category, by country and region across the United States, Canada and the UAE, by payout, and by distance from where you are. If nothing matches yet you can leave your email and hear when offers go live in your area.",
      },
      {
        heading: "How referring works",
        body: "Joining as a referrer is free. You submit a customer's details on a business's referral page, the business contacts and qualifies them, and when the deal closes the business pays you the full advertised reward directly. Revvin takes no cut and does not process the payout.",
      },
    ],
  },
  {
    path: "/docs/zapier",
    title: "Zapier and integrations | Revvin",
    description:
      "Zapier, webhook and API integrations are not available in Revvin yet. Here is how the work actually gets done today.",
    h1: "Zapier and integrations",
    sections: [
      {
        heading: "These integrations do not exist yet",
        body: "Revvin has no Zapier app, no webhooks and no public API. Nothing on this page is a preview or a waitlist for one. If you are looking for a way to connect Revvin to another tool automatically, it is not available today.",
      },
      {
        heading: "What happens instead",
        body: "Jobs are marked done by hand in your dashboard, and every referral ask goes out from your own phone or email app, so it always comes from you. Revvin prepares the message and opens your own app with the recipients and the text filled in; it never sends email or SMS on your behalf.",
      },
      {
        heading: "Tell us if it matters",
        body: "If an integration matters to how you work, email info@revvin.co and it will be factored into what gets built next. In the meantime the how-it-works page describes exactly what Revvin does today.",
      },
    ],
  },
  {
    path: "/en-usd",
    // Legacy currency-variant URL. Revvin prices in USD only in every country,
    // so this variant has no distinct content: it redirects to the homepage and
    // canonicals there rather than self-canonicalising.
    canonical: "https://revvin.co/",
    title: "Revvin · Your customer list, working for you",
    description: `Revvin prices in USD everywhere. Your referral page is free to publish. Revvin Pro is ${PRO}.`,
    h1: "Your customer list, working for you.",
    sections: [
      {
        heading: "One currency, everywhere",
        body: `Revvin prices in USD only, in every country it supports: the United States, Canada and the United Arab Emirates. There is no separate currency edition of the site, so this address is the Revvin homepage. Publishing your referral page is free and Revvin Pro is ${PRO}.`,
      },
    ],
  },
  {
    path: "/en-cad",
    // Same as /en-usd: a legacy currency variant with no distinct content.
    // Revvin bills in USD only, including in Canada.
    canonical: "https://revvin.co/",
    title: "Revvin · Your customer list, working for you",
    description: `Revvin bills in USD, including in Canada. Your referral page is free to publish. Revvin Pro is ${PRO}.`,
    h1: "Your customer list, working for you.",
    sections: [
      {
        heading: "Canadian businesses are billed in USD",
        body: `Revvin supports Canada, but it bills in USD only, so there is no Canadian-dollar edition of the site and this address is the Revvin homepage. Publishing your referral page is free and Revvin Pro is ${PRO}. Businesses pay their referrers directly off-platform when deals close.`,
      },
    ],
  },
];

export const PRERENDER_ROUTES: PrerenderRoute[] = [...handwritten, ...industryRoutes, ...guideRoutes];
