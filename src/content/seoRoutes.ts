// Prerender content for crawlers that do not execute JavaScript (GPTBot,
// ClaudeBot, PerplexityBot, CCBot, and Googlebot's first pass).
//
// Every claim below must be true of the product: publishing a referral page is
// free, Revvin Pro is $49/month USD, and businesses pay their referrers
// directly off-platform. Personal referral asks are prepared by Revvin and sent
// from the owner's own email or SMS app; the one thing Revvin sends itself is
// Pro reactivation campaign email, by email only, with the business postal
// address and an unsubscribe link, capped per send. There is no auto-ask
// engine, no automated review requests, no webhooks and no public API.
//
// Industry and guide routes are derived from content so they can never drift.
// Legal routes are derived from src/content/legal.ts, the same source the
// rendered legal pages use.

import { INDUSTRIES } from "./industries";
import { GUIDES } from "./guides";
import { PRIVACY_DOC, TERMS_DOC, legalPrerenderSections } from "./legal";
// Relative, not aliased: this module is also imported by the build-time
// prerender plugin, which is bundled outside the app's alias resolution.
import { PRICE_TEXT } from "../config/pricing";
import { SAMPLE_META } from "./samplePage";




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

// Derived from the single pricing source so the initial HTML can never quote a
// figure the rendered page has moved on from.
const PRO = `${PRICE_TEXT.monthlyPerMonth} USD`;
const ANNUAL = `${PRICE_TEXT.annualPerYear} USD billed once, which saves ${PRICE_TEXT.saving} (${PRICE_TEXT.discount} off)`;


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
  sections: [{ heading: "The short answer", body: g.answer }, ...g.sections],
  faqs: g.faqs,
}));

const guideIndexRoute: PrerenderRoute = {
  path: "/guides",
  title: "Referral Program Guides | Revvin",
  description:
    "Straight answers on referral programs for service businesses: how much to pay for a referral, referrals versus buying leads, how to start a program, whether they work, and how to ask.",
  h1: "Referral program guides",
  sections: [
    {
      heading: "Questions owners ask before they start",
      body: "These direct guides cover referral rewards, referrals versus buying leads, starting a program, whether referral programs work for contractors, and how to ask a customer for a referral. They explain the mechanics without invented benchmarks, testimonials or results.",
    },
    {
      heading: "Five practical guides",
      body: GUIDES.map((g) => g.question).join("; "),
    },
  ],
};

// Free toolkit. The tools themselves are interactive and client-side, so the
// prerendered document describes honestly what each one does and what it does
// not do, rather than pretending a crawler can see a result.
const toolkitRoutes: PrerenderRoute[] = [
  {
    path: "/tools",
    title: "Contractor Growth Toolkit | Free Referral Tools | Revvin",
    description: `Free tools for service businesses: grade your referral program, check what a reward leaves you per job, and write the ask. No account, no card. Revvin Pro is ${PRO}.`,
    h1: "Turn the customers you already have into the next job.",
    sections: [
      {
        heading: "Free tools for service businesses",
        body: "Free, practical tools to design the offer, check the economics, write the ask and put the system live. They are written first for home-service contractors, because that is who asks us most, and they work for any service business with a list of past customers. No account, no card and no email address is required, and nothing you type is saved or sent.",
      },
      {
        heading: "Referral Program Grader",
        body: "Eight yes or no questions about how referrals work in your business today: whether the reward is one fixed amount, whether the qualifying event and payout timing are written down, whether customers have one link or QR code, whether you ask close to the end of the job, whether one named person follows up, whether you record the source and the outcome, and whether you keep the referrer updated. You get a score out of 100, a plain label, and the three things to fix first. It is an operational checklist, not a forecast.",
      },
      {
        heading: "Referral Reward Calculator",
        body: `Enter your average collected job revenue, your gross margin and the fixed reward you are considering. You see the gross profit on a closed referred job before and after the reward, what the rewards cost at the monthly volume you choose, the contribution left over, and how many closed referred jobs would cover Revvin Pro at ${PRO} or ${PRICE_TEXT.annualPerYear} billed once. It does not recommend an amount, promise profit or count as accounting advice. All figures are USD.`,
      },
      {
        heading: "Referral Message Generator",
        body: "Pick your trade, when you are asking and the tone, and add anything else you want included: the customer's first name, your business name, your name, the job, the reward as you want it written and your referral page link. You get a text message, an email with a subject line and a script you can say out loud. Revvin does not send any of them: you copy the text and send it from your own phone or email app.",
      },
      {
        heading: "From free tool to working system",
        body: `The tools prepare the decisions; Revvin runs the loop. Choose the offer, create the page, share the link and QR code, track the referral, close the job, record the reward. Publishing your referral page is free with no card, and you pay your referrer directly when a job closes, with no fee on the reward. Revvin Pro is ${PRO} and adds importing your past-customer list, preparing the ask for that whole list, reactivation email campaigns, ROI reporting and custom page branding.`,
      },
    ],
    faqs: [
      {
        q: "Are these tools really free?",
        a: "Yes. All three tools run in your browser with no account, no card and no email required. Building and publishing your referral page on Revvin is free too.",
      },
      {
        q: "Do you save what I type into the tools?",
        a: "No. Nothing you type is sent to us, saved, put in the web address or included in our analytics. Close the tab and it is gone. We only count anonymous facts such as a tool being opened and finished.",
      },
      {
        q: "Do these work if I am not a contractor?",
        a: "Yes. The wording is written first for home-service businesses, because that is who asks us most, but the checklist, the reward arithmetic and the messages work for any service business with past customers.",
      },
      {
        q: "What does Revvin Pro add?",
        a: `Your referral page, lead inbox, QR code and print pack are free. Revvin Pro is ${PRO}, or ${PRICE_TEXT.annualPerYear} billed once, and adds importing your past-customer list, preparing the ask for that whole list, reactivation email campaigns, ROI reporting and custom page branding.`,
      },
    ],
  },
  {
    path: "/tools/referral-program-grader",
    title: "Referral Program Grader | Score Your Referral Program | Revvin",
    description:
      "Answer eight yes or no questions about how referrals work in your business today and get a score out of 100 plus the three things to fix first. Free, no account, nothing saved.",
    h1: "Grade your referral program in eight questions.",
    sections: [
      {
        heading: "What the grader checks",
        body: "Eight things a referral program either has in place or does not: one clear fixed reward, a defined qualifying event, written payout timing, one link or QR code destination for customers, asks that happen close to the end of the job, one named person who follows up, a record of where each referral came from and how it ended, and updates for the referrer and the customer.",
      },
      {
        heading: "How the score works",
        body: "Each of the eight items is worth the same 12.5 points, which is a stated choice rather than a measurement: we have no evidence that would justify weighting one above another, so we do not pretend to. The score is the share of items in place, out of 100, with a plain label of Foundation needed, Good start or Ready to run. It is a checklist of what is set up, not a prediction of referral volume, and it is not professional advice.",
      },
      {
        heading: "What you get at the end",
        body: "Your score out of 100, the label, and exactly three prioritized actions taken from the items you have not put in place yet, in a fixed order so the same answers always give the same advice. You can retake it as often as you like. Answers stay in your browser: nothing is saved, sent or added to a web address.",
      },
    ],
  },
  {
    path: "/tools/referral-reward-calculator",
    title: "Referral Reward Calculator | What a Referral Reward Costs You | Revvin",
    description:
      "Enter your average job revenue, your gross margin and the reward you are considering, and see what a closed referred job leaves you. Free, no account, nothing saved.",
    h1: "See what a referral reward leaves you per closed job.",
    sections: [
      {
        heading: "What you enter",
        body: "Your average collected job revenue in USD, your gross margin as a percentage, the fixed reward you are considering in USD, and optionally how many closed referred jobs a month you expect, which defaults to one. Figures are bounded and validated, no formatted marketing text is parsed, and there is no currency conversion: Revvin prices in USD everywhere.",
      },
      {
        heading: "What it works out",
        body: "The gross profit on one closed referred job before the reward, which is revenue multiplied by margin. The gross profit after the reward. The total rewards you would pay at the monthly volume you chose. The contribution left after those rewards, which is not net profit because your overheads are not included. If the reward is the same as or larger than the gross profit, it says so plainly so you can revisit the economics.",
      },
      {
        heading: "Compared with the cost of Revvin Pro",
        body: `When the post-reward contribution is positive, the calculator shows how many closed referred jobs would cover Revvin Pro at ${PRO}, and how many would cover ${PRICE_TEXT.annualPerYear} billed once for a year. When the reward leaves nothing, it says no number of jobs would cover it rather than showing a figure. Publishing your referral page is free either way, so Pro is the only subscription in the comparison.`,
      },
      {
        heading: "What it is not",
        body: "It does not recommend a reward, a percentage or a payout rule, it does not promise profit or results, it never treats revenue as profit, and it is not accounting advice. It is your own arithmetic, done for you, on figures only you can supply. Nothing you type is saved or sent, and the copyable summary is copied to your own clipboard.",
      },
    ],
  },
  {
    path: "/tools/referral-message-generator",
    title: "Referral Message Generator | Write Your Referral Ask | Revvin",
    description:
      "Generate a text, an email and a spoken script for asking a customer for a referral, written around your trade, your timing and your reward. Free, no account, nothing saved.",
    h1: "Write the referral ask you will actually send.",
    sections: [
      {
        heading: "What you choose",
        body: "Your trade or service from a list, plus other for anything not on it. When you are asking: the job just finished, checking in a while later, or a customer you have not spoken to in a long time. The tone, direct or warm. Everything else is optional: the customer's first name, your business name, your name or team name, what the job was, the reward exactly as you want it written, and your referral page link.",
      },
      {
        heading: "What you get",
        body: "Three versions of the same ask: a text message, an email with a subject line, and something you can say out loud while you are packing up. Leave fields blank and the wording stays natural rather than leaving gaps or placeholders behind. The same choices always produce the same messages.",
      },
      {
        heading: "You send it, not Revvin",
        body: "The copy buttons put the text on your own clipboard so you can send it from your own phone or email app, which is why it arrives from your number or your address. Revvin does not send these messages and does not see them. Ask once, say what actually earns the reward, and only use contact details the customer gave you for contact like this.",
      },
    ],
  },
];

const handwritten: PrerenderRoute[] = [
  {
    path: "/",
    title: "Revvin | Referral software for service businesses",
    description: `Turn past customers into your next booked job. Create a free referral page, prepare a personal ask, and track the leads and rewards that follow. Revvin Pro is ${PRO}.`,
    h1: "Turn past customers into your next booked job.",
    sections: [
      {
        heading: "Create a referral page, free",
        body: "Add your business, write the offer, set the fixed reward you will pay, pick your link, and publish. Creating and publishing your referral page is free, with no card, and you get a shareable link, a QR code and a printable pack. Every referral submitted through the page lands in a lead inbox you can work from your phone, with statuses and one-tap call or text back.",
      },
      {
        heading: "Prepare and share the ask",
        body: "Revvin drafts the personal ask and opens it in your own texting or email app, so it sends from your number or your address. On Revvin Pro you can import your past-customer list, draft asks for the whole list at once, and have Revvin email a reactivation campaign to a segment you choose, with your business address and an unsubscribe link in every email.",
      },
      {
        heading: "Track referrals and record rewards",
        body: "Referral-form submissions arrive in your inbox and you are emailed about them. Replies to a personal text or email go to your own phone or inbox and are not synced back. Rewards are one fixed amount that you pay your referrer directly: Revvin tracks each one from owed to paid and notifies the referrer at both moments, holds no money and takes no cut.",
      },
      {
        heading: `Free page, Revvin Pro at ${PRO}`,
        body: `Publishing is free and does not expire. Revvin Pro is ${PRO}, or ${PRICE_TEXT.annualPerYear} billed once, and adds customer list import, bulk asks, reactivation email campaigns, ROI reporting with a monthly recap, and custom page branding. Cancel anytime: your page stays published and referrals keep arriving, you only lose the Pro tools.`,
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
    // The same five questions the rendered /for-businesses page shows, so the
    // initial HTML a crawler or an answer engine reads carries the answers a
    // visitor sees rather than a shorter summary of them.
    faqs: [
      {
        q: "How much does Revvin cost?",
        a: `Publishing your referral page and taking referrals on it is free. Revvin Pro costs a flat ${PRO} and adds the tools that ask your whole customer list for you: import, the bulk referral ask, ROI reporting and custom branding. Cancel anytime, no contract, no setup fee, no platform fees. You pay your referrers directly off-platform when deals close.`,
      },
      {
        q: "What are the three loops?",
        a: "Loop one is referrals: a branded referral page, shareable link and QR code, a lead inbox, and a pre-written referral ask you send from your own phone or email app. Loop two is repeat work: pre-written seasonal and maintenance messages to past customers. Loop three is reviews: a review ask after a job, followed by a referral ask to happy customers. All three run off the same past-customer list.",
      },
      {
        q: "What happens if a referral does not close?",
        a: `You pay your referrer nothing because they only earn when a deal closes. Your referral page costs nothing, and the only optional cost is the flat ${PRO} Revvin Pro subscription.`,
      },
      {
        q: "Who decides the referral payout amount?",
        a: "The business sets the payout based on what a closed customer is worth. Referrers receive 100% of that advertised amount.",
      },
      {
        q: "How is this different from Google Ads or Facebook Ads?",
        a: `Ads charge per click or impression with no guarantee of conversion. With Revvin your referral page is free, and Revvin Pro is a flat ${PRO} subscription with no platform fees. You pay your referrers directly when deals close.`,
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
        body: `Everything in Free, plus importing your past-customer list and sending your referral ask in bulk from your own email app, reactivation campaigns that Revvin sends by email from your account with an unsubscribe link in every message and a cap of 500 recipients per send, ROI reporting with a monthly email recap, and custom page branding. Annual billing is ${ANNUAL}. No contract and no setup fee.`,
      },

      {
        heading: "Cancel any time",
        body: "Cancel from the billing portal whenever you like. On the annual plan Pro keeps working to the end of the year you paid for. After Pro ends your page stays live and your referrals keep coming in, because publishing is free: you only lose the Pro tools. There are no platform fees on referral rewards: Revvin does not take a cut and does not move the money. You pay your referrer directly when a deal closes.",
      },
    ],
    faqs: [
      {
        q: "What exactly is free?",
        a: "Building and publishing your referral page, your link and QR code, unlimited referral leads, the lead inbox with status tracking, your offers, payout tracking, and your marketplace listing.",
      },
      {
        q: `What do I get for the ${PRO}?`,
        a: "Revvin Pro adds importing your past-customer list, sending your referral ask in bulk from your own email app, reactivation campaigns that Revvin sends by email from your account, ROI reporting with a monthly email recap, and custom page branding.",
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
        body: `Publishing a referral page is free, including the marketplace listing. Revvin Pro is ${PRO}, or an annual price billed once, with no contract and no setup fee, cancellable from the billing portal. Revvin takes no cut of referral rewards; referrers receive 100% of the advertised payout, paid directly by the business.`,
      },
      {
        heading: "How a referral flows",
        body: "A business publishes a page with its offer, reward amount and qualification criteria. It shares the link or QR code with past customers and its network. A referrer submits the customer's details. The business contacts and qualifies the customer and works the deal. When it closes, the business pays the referrer directly and marks the reward paid. Unpaid closed referrals can be flagged for review after 30 days.",
      },
      {
        heading: "Scope and limits",
        body: "Personal referral asks are never sent by Revvin: they are prepared and then sent from the owner's own device and accounts. Reactivation campaigns are the one thing Revvin sends, by email only, from the owner's Pro account, with the business postal address and an unsubscribe link in every message and a cap of 500 recipients per send. There is no automatic asking engine, no automated review-request sending, no SMS sending by Revvin, and no public API or webhook product. Pricing is USD only in every supported country: the United States, Canada and the United Arab Emirates.",
      },
    ],
  },
  {
    path: "/sample",
    // The page at /sample is an interactive walkthrough, not a static preview,
    // so the title, description and h1 here match what the page actually
    // renders and Sample.tsx reads the same strings.
    title: SAMPLE_META.title,
    description: SAMPLE_META.description,
    h1: SAMPLE_META.h1,
    sections: [
      {
        heading: "What the referral page looks like",
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
        body: "Jobs are marked done by hand in your dashboard, and every personal referral ask goes out from your own phone or email app, so it always comes from you: Revvin prepares the message and opens your own app with the recipients and the text filled in. Reactivation campaigns work the other way round, and are the one thing Revvin sends for you, by email only, from your Pro account, with an unsubscribe link in every message.",
      },
      {
        heading: "Tell us if it matters",
        body: "If an integration matters to how you work, email info@revvin.co and it will be factored into what gets built next. In the meantime the how-it-works page describes exactly what Revvin does today.",
      },
    ],
  },
  {
    // /privacy and /terms are in the sitemap, so without an entry here crawlers
    // received the SPA fallback (homepage content) at a legal URL. The sections
    // are generated from the same authoritative content the pages render, so
    // the initial HTML and the rendered page always state identical terms.
    path: PRIVACY_DOC.path,
    title: PRIVACY_DOC.metaTitle,
    description: PRIVACY_DOC.metaDescription,
    h1: PRIVACY_DOC.h1,
    sections: legalPrerenderSections(PRIVACY_DOC),
  },
  {
    path: TERMS_DOC.path,
    title: TERMS_DOC.metaTitle,
    description: TERMS_DOC.metaDescription,
    h1: TERMS_DOC.h1,
    sections: legalPrerenderSections(TERMS_DOC),
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

export const PRERENDER_ROUTES: PrerenderRoute[] = [...handwritten, ...toolkitRoutes, guideIndexRoute, ...industryRoutes, ...guideRoutes];
