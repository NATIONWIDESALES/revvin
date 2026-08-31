// Industry landing page content. Every claim here must be true of the product:
// free to publish; $49/month USD for Pro, businesses pay referrers directly
// off-platform, and every message is sent by the owner from their own device.
// Revvin never sends email or SMS on a business's behalf: the bulk ask tool
// prepares the message and opens the owner's own email app with recipients
// filled in, in batches. Real capabilities referenced below: branded referral
// page, QR code and print pack, lead inbox with status tracking and one-tap
// call/text back, reward tracking from pending to paid, ROI reporting with a
// monthly email recap (Pro), and custom page branding (Pro).
// No statistics, testimonials or results are invented.

export interface IndustryFaq {
  q: string;
  a: string;
}

export interface Industry {
  slug: string;
  /** Trade name used inside sentences, lower case. */
  trade: string;
  /** Short label for nav and cards. */
  label: string;
  h1: string;
  metaTitle: string;
  metaDescription: string;
  intro: string;
  /** What the three loops look like for this trade. */
  loops: { title: string; body: string }[];
  /** Concrete, owner-set reward framing. Nothing implied about results. */
  rewardExample: string;
  /** Places this trade can put its QR code and link. */
  placements: string[];
  faqs: IndustryFaq[];
}

const sharedFaqs = (trade: string): IndustryFaq[] => [
  {
    q: `What does a ${trade} referral program cost to run on Revvin?`,
    a: "Publishing your referral page is free. Revvin Pro is $49/month USD, with no setup fee and no platform fees. Cancel anytime. Referral rewards are separate: you set the amount and pay your referrer directly when a deal closes.",
  },
  {
    q: "Who pays the referrer?",
    a: "You do, directly. Revvin tracks each reward from pending to paid and notifies your referrer at both moments, but it never holds or moves the money and never takes a cut of the reward.",
  },
  {
    q: "Does Revvin text or email my customers for me?",
    a: "No. Revvin never sends anything on your behalf. It prepares the message and opens your own email app or messaging app with the recipients and text filled in, in batches, and your device sends it from your own address or number. The relationship and the consent stay with you.",
  },
  {
    q: "Do I need a customer list to start?",
    a: "Your referral page works the day you publish it, but the customers who have already paid you are where referrals come from fastest. On Pro you can import that list by pasting it in and send your referral ask to everyone in a few batches from your own email app.",
  },
];

export const INDUSTRIES: Industry[] = [
  {
    slug: "roofing",
    trade: "roofing",
    label: "Roofing",
    h1: "Referral program software for roofing companies",
    metaTitle: "Roofing Referral Program Software | Revvin",
    metaDescription:
      "Run a roofing referral program off your past-customer list. Branded referral page, QR code and lead inbox. Free to publish; $49/month USD for Pro. Pay referrers directly.",
    intro:
      "A finished roof is visible from the street, and the neighbours ask about it. A roofing referral program turns those conversations into tracked leads instead of lost ones. Revvin gives you a branded referral page, a shareable link and a QR code, and makes it easy to ask your past customers to pass it on.",
    loops: [
      {
        title: "Referrals from finished roofs",
        body: "You send the ask, Revvin catches the reply. Send your referral link to the homeowner after a completed job, or to your whole past-customer list in batches from your own email app. Every referral lands in your inbox with the lead's name, contact and what they need, so you can text or call back in one tap.",
      },
      {
        title: "Repeat work on the rest of the exterior",
        body: "Roofs do not come around often, but gutters, vents, flashing, attic ventilation and inspections do. On Pro, import your past-customer list and send a relevant offer to the customers you have not heard from in a while, from your own address, in a few batches.",
      },
      {
        title: "A page that keeps asking for you",
        body: "Your QR code on the yard sign, truck and invoice works while you are on the next job. Anyone who scans it lands on your branded referral page with your reward offer, and their referral goes straight to your lead inbox with status tracking from new lead to closed deal.",
      },
    ],
    rewardExample:
      "You choose the reward. Roofing jobs carry high ticket values, so many owners set a flat cash amount per closed roof and advertise it plainly on their referral page. Revvin shows the reward exactly as you set it and never marks it up.",
    placements: [
      "Yard sign and job-site signage",
      "Truck and trailer decals",
      "Invoice and warranty paperwork",
      "Door hangers for the street you are already working on",
    ],
    faqs: [
      ...sharedFaqs("roofing"),
      {
        q: "Can I pay referrers a percentage of the job instead of a flat amount?",
        a: "You set the reward however you want and pay it directly, so a flat amount, a tiered amount or a percentage you calculate yourself all work. Revvin displays the offer you publish and tracks it from pending to paid.",
      },
    ],
  },
  {
    slug: "hvac",
    trade: "HVAC",
    label: "HVAC",
    h1: "Referral program software for HVAC contractors",
    metaTitle: "HVAC Referral Program Software | Revvin",
    metaDescription:
      "Run an HVAC referral program plus maintenance outreach off one customer list. Free to publish; $49/month USD for Pro. You pay your referrers directly.",
    intro:
      "HVAC has the two things a referral engine needs: a service list that ages predictably and neighbours on the same equipment cycle. Revvin turns your past-customer list into a branded referral page, a seasonal outreach habit and a lead inbox, all running off the customers you already have.",
    loops: [
      {
        title: "Referrals after an install",
        body: "A new system is the moment a homeowner is most willing to recommend you. Send them your referral link while the job is fresh, and route any reply straight into your lead inbox with one-tap call back. With Pro, ask your whole installed base in batches from your own email app.",
      },
      {
        title: "Repeat work on the maintenance clock",
        body: "Pre-season tune-ups, filter changes and lapsed maintenance plans are sitting in your list. Import your customers on Pro and send the seasonal offer yourself, from your own address, so the message reads like it came from you, because it did.",
      },
      {
        title: "Always-on asking from your equipment",
        body: "A QR sticker on the air handler or thermostat turns every future service visit, by anyone, into a chance to refer. The page shows your reward offer and every referral arrives in your inbox with contact details and status tracking.",
      },
    ],
    rewardExample:
      "You set the reward, publish it on your page, and pay it directly when the deal closes. Many HVAC owners use one amount for a service call referral and a larger amount for a full system replacement.",
    placements: [
      "Sticker on the air handler or thermostat",
      "Maintenance plan welcome pack",
      "Van wrap and yard sign",
      "Emailed invoice footer",
    ],
    faqs: [
      ...sharedFaqs("HVAC"),
      {
        q: "Can I run different rewards for service calls and installs?",
        a: "Yes. You control the offer text and the amount on your referral page, and you can update it whenever your job mix changes.",
      },
    ],
  },
  {
    slug: "plumbing",
    trade: "plumbing",
    label: "Plumbing",
    h1: "Referral program software for plumbers",
    metaTitle: "Plumbing Referral Program Software | Revvin",
    metaDescription:
      "Turn plumbing customers into referrals and repeat work. Branded referral page, QR code, lead inbox. Free to publish; $49/month USD for Pro.",
    intro:
      "Most plumbing work arrives as an emergency, which means the customer is relieved and talkative right when the job ends. Revvin captures that moment by giving you a link and QR code that are ready to share, and a lead inbox that makes sure no referral gets lost.",
    loops: [
      {
        title: "Referrals at the moment of relief",
        body: "Hand over your QR card or text your referral link before you leave the driveway. Referrals arrive in your inbox with the lead's name, contact details and what they need, with one-tap call or text back while the emergency is still theirs to solve.",
      },
      {
        title: "Repeat work on deferred jobs",
        body: "Water heaters, re-pipes, fixture upgrades and drain maintenance all sit on your list waiting. On Pro, import your past customers and send the offer that matches the work they have been postponing, in batches from your own email app.",
      },
      {
        title: "The fridge magnet that tracks itself",
        body: "A QR code on a magnet or water heater sticker keeps your referral page one scan away for years. Because every scan lands on your tracked page, referrals come in with full contact details instead of a vague mention you never hear about.",
      },
    ],
    rewardExample:
      "You choose the amount and pay it directly. Plumbers often keep one simple flat reward so the offer is easy to explain on a fridge magnet or invoice.",
    placements: [
      "Fridge magnet and water heater sticker",
      "Invoice and warranty card",
      "Van signage",
      "Text message follow-up sent from your own phone",
    ],
    faqs: sharedFaqs("plumbing"),
  },
  {
    slug: "solar",
    trade: "solar",
    label: "Solar",
    h1: "Referral program software for solar installers",
    metaTitle: "Solar Referral Program Software | Revvin",
    metaDescription:
      "Run a solar referral program from your installed-customer list. Branded referral page, QR code, tracked rewards. Free to publish; $49/month USD for Pro.",
    intro:
      "Solar is sold neighbour to neighbour, and your installed base is the most credible sales team you will ever have. Revvin gives every past customer a branded page and link to share, tracks the reward from pending to paid, and keeps your leads organised so nobody gets chased or forgotten.",
    loops: [
      {
        title: "Referrals from the installed base",
        body: "After commissioning, send the homeowner your referral link, or ask your entire installed base in batches from your own email app with Pro. Referrals land in your inbox with name, contact and what they are asking about, so a consultant can call back the same day.",
      },
      {
        title: "Repeat work on the rest of the system",
        body: "Battery add-ons, panel cleaning, monitoring checks, EV chargers and roof-related work all live on your existing list. Import it once and reach out with the right offer when the timing suits, from your own address.",
      },
      {
        title: "Your reward offer, always on display",
        body: "Solar rewards are worth talking about, so put them where people look: a sticker on the inverter, the handover pack, the production report footer. Every scan opens your branded page with the offer spelled out and a tracked path into your lead inbox.",
      },
    ],
    rewardExample:
      "Solar rewards are usually the largest in home services, and you set the number. Publish it on your referral page and pay your referrer directly once the install closes.",
    placements: [
      "Inverter or electrical panel sticker",
      "Handover pack and monitoring app onboarding",
      "Neighbourhood open-house signage",
      "Emailed production report footer",
    ],
    faqs: sharedFaqs("solar"),
  },
  {
    slug: "electrical",
    trade: "electrical",
    label: "Electrical",
    h1: "Referral program software for electricians",
    metaTitle: "Electrician Referral Program Software | Revvin",
    metaDescription:
      "Run an electrician referral program off your customer list. Branded page, QR code, lead inbox, tracked rewards. Free to publish; $49/month USD for Pro.",
    intro:
      "Electrical work is bought on trust, and trust travels by recommendation. Revvin turns the customers who already trust you into a referral channel, with a page you brand, a link they can send and a reward you set.",
    loops: [
      {
        title: "Referrals from completed work",
        body: "Panel upgrades, rewires and EV charger installs all end with a satisfied homeowner. Send your referral link before you pack up the van, and catch every reply in a lead inbox with one-tap call or text back and status tracking.",
      },
      {
        title: "Repeat work across the house",
        body: "Lighting, generators, surge protection, safety inspections and EV chargers are natural second jobs. On Pro, import your past-customer list and offer the next job yourself, in batches from your own email app.",
      },
      {
        title: "The panel label that refers for you",
        body: "Your QR code on the panel label and inspection sticker sits in the home for decades. Anyone who scans it sees your branded referral page and reward offer, and their referral reaches you with full contact details.",
      },
    ],
    rewardExample:
      "You publish the reward and pay it directly. A flat amount per closed job keeps the offer simple enough to explain in one sentence at the door.",
    placements: [
      "Panel label and inspection sticker",
      "Invoice and quote footer",
      "Van signage and job-site sign",
      "Text follow-up from your own phone",
    ],
    faqs: sharedFaqs("electrical"),
  },
  {
    slug: "landscaping",
    trade: "landscaping",
    label: "Landscaping",
    h1: "Referral program software for landscapers",
    metaTitle: "Landscaping Referral Program Software | Revvin",
    metaDescription:
      "Run a landscaping referral program and seasonal outreach from one customer list. Free to publish; $49/month USD for Pro. Pay referrers directly.",
    intro:
      "Landscaping is the most visible trade there is, and your best advertisement is the yard you finished this morning. Revvin makes that yard referable with a branded page, a QR code for the sign out front and an easy way to ask the customer who paid for it.",
    loops: [
      {
        title: "Referrals from the street",
        body: "Neighbours notice new work immediately. A QR code on the yard sign and a referral link sent to the homeowner turn that attention into leads in your inbox, each with a name, contact details and what they want done.",
      },
      {
        title: "Repeat work by season",
        body: "Spring cleanups, irrigation, mulch, aeration and fall work repeat on a calendar. On Pro, import your customer list and send the seasonal offer at the right moment, from your own email app, in batches.",
      },
      {
        title: "Signage that works the whole job",
        body: "From the first day of the install to the last, your sign and truck decals carry a QR code that opens your referral page with the reward offer on it. Every referral is tracked from new lead to closed deal.",
      },
    ],
    rewardExample:
      "You set the reward per closed job and pay it directly. Many landscapers use a smaller amount for recurring maintenance and a larger one for design or install work.",
    placements: [
      "Yard sign with a QR code",
      "Truck and trailer decals",
      "Seasonal invoice footer",
      "Door hangers on the block you are already servicing",
    ],
    faqs: sharedFaqs("landscaping"),
  },
  {
    slug: "painting",
    trade: "painting",
    label: "Painting",
    h1: "Referral program software for painting contractors",
    metaTitle: "Painting Referral Program Software | Revvin",
    metaDescription:
      "Run a painting referral program off your past-customer list. Branded referral page, QR code, tracked rewards. Free to publish; $49/month USD for Pro.",
    intro:
      "Painting sells itself once someone stands in the room. Revvin gives your past customers an easy way to hand you on, and gives you a lead inbox that lets you respond before the next quote does.",
    loops: [
      {
        title: "Referrals from finished rooms and exteriors",
        body: "Send your referral link at the walkthrough, while the customer is showing the room to family. The message reads like it came from you because it does: your device sends it, and every reply lands in your lead inbox with contact details and status tracking.",
      },
      {
        title: "Repeat work room by room",
        body: "Most painting customers only did part of the house. On Pro, import your past-customer list and offer the next phase yourself, in batches from your own email app, timed to when the work usually follows.",
      },
      {
        title: "A quiet ask on every surface",
        body: "The yard sign during the job and the QR code on the final invoice keep your referral page in front of neighbours and guests. Anyone can refer in a couple of taps, and you see it the moment it happens.",
      },
    ],
    rewardExample:
      "You choose the reward and pay it directly. A flat cash amount per closed job is the easiest version to advertise on your page.",
    placements: [
      "Yard sign during the job",
      "Touch-up paint can label",
      "Final invoice and colour record sheet",
      "Van signage",
    ],
    faqs: sharedFaqs("painting"),
  },
  {
    slug: "auto-detailing",
    trade: "auto detailing",
    label: "Auto detailing",
    h1: "Referral program software for auto detailing businesses",
    metaTitle: "Auto Detailing Referral Program Software | Revvin",
    metaDescription:
      "Run an auto detailing referral program and rebooking reminders from one list. Free to publish; $49/month USD for Pro. You pay referrers directly.",
    intro:
      "Detailing is a before-and-after business with a short repeat cycle, which makes it ideal for referrals and rebookings. Revvin helps you ask while the car still looks new, bring customers back on schedule and keep every lead tracked in between.",
    loops: [
      {
        title: "Referrals at handover",
        body: "Leave a QR card in the cup holder or text your referral link at handover, while the customer is still looking at the result. Referrals arrive in your inbox with contact details and vehicle notes, ready for a one-tap reply.",
      },
      {
        title: "Repeat work on a short cycle",
        body: "Detailing repeats in weeks and months, not years. On Pro, import your customer list and send the rebooking prompt yourself, from your own email app, in batches timed to when each customer is due.",
      },
      {
        title: "Your page, riding in every car",
        body: "The QR card in the cup holder keeps working after handover: friends ask, the customer scans, and your referral page with its reward offer does the explaining. Every referral is tracked from new lead to closed deal.",
      },
    ],
    rewardExample:
      "You set the reward and pay it directly. Detailers commonly use a modest flat amount per closed booking, or a larger one for ceramic coating and paint correction work.",
    placements: [
      "QR card left in the cup holder",
      "Shop window and waiting area",
      "Booking confirmation and receipt",
      "Text follow-up from your own phone",
    ],
    faqs: sharedFaqs("auto detailing"),
  },
];

export const getIndustry = (slug?: string) =>
  INDUSTRIES.find((i) => i.slug === slug);
