// Industry landing page content. Every claim here must be true of the product:
// free to publish; $49/month USD for Pro, businesses pay referrers directly
// off-platform, and all sending is device-native or email automation.
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
    a: "Publishing your referral page is free. Revvin Pro is $49/month USD, with no trial, no setup fee and no platform fees. Cancel anytime. Referral rewards are separate: you set the amount and pay your referrer directly when a deal closes.",
  },
  {
    q: "Who pays the referrer?",
    a: "You do, directly. Revvin tracks each reward from pending to paid and notifies your referrer at both moments, but it never holds or moves the money and never takes a cut of the reward.",
  },
  {
    q: "Does Revvin text or email my customers for me?",
    a: "Automated asks go out by email from Revvin. Text messages are device-native: Revvin pre-fills the message and your phone sends it from your own number, so the relationship and the consent stay with you.",
  },
  {
    q: "Do I need a customer list to start?",
    a: "You need the customers who have already paid you. That single list is what the referral, repeat-work and review loops all run on, so importing it is the first setup step.",
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
      "A finished roof is visible from the street, and the neighbours ask about it. A roofing referral program turns those conversations into tracked leads instead of lost ones. Revvin gives you a branded referral page, a shareable link and a QR code, then asks your past customers to pass it on after every completed job.",
    loops: [
      {
        title: "Referrals from finished roofs",
        body: "Mark the job done and Revvin sends a personalised ask a couple of hours later, using the homeowner's name, the crew lead and the service. Every referral lands in your inbox with the lead's name, contact and what they need, so you can text or call back in one tap.",
      },
      {
        title: "Repeat work on the rest of the exterior",
        body: "Roofs do not come around often, but gutters, vents, flashing, attic ventilation and inspections do. Reactivation campaigns segment your list by how long since the last job and send a relevant offer instead of a generic blast.",
      },
      {
        title: "Reviews while the roof is new",
        body: "A review request goes out after the job. Customers who say they are happy get a follow-up asking them to refer a neighbour, so your review pipeline feeds your referral pipeline.",
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
      "Run an HVAC referral program plus maintenance reactivation off one customer list. Free to publish; $49/month USD for Pro. You pay your referrers directly.",
    intro:
      "HVAC has the two things a referral engine needs: a service list that ages predictably and neighbours on the same equipment cycle. Revvin turns your past-customer list into a referral page, a seasonal reactivation calendar and a review loop, all firing off the jobs you already close.",
    loops: [
      {
        title: "Referrals after an install",
        body: "A new system is the moment a homeowner is most willing to recommend you. Revvin sends the ask on a delay after you mark the install done, and routes any referral straight into your lead inbox with one-tap call back.",
      },
      {
        title: "Repeat work on the maintenance clock",
        body: "Reactivation campaigns segment by time since last visit, so pre-season tune-ups, filter changes and lapsed maintenance plans get a specific message instead of one list-wide email.",
      },
      {
        title: "Reviews after the first hot or cold week",
        body: "Review requests go out after the job, and happy customers get a follow-up referral ask. Both run automatically from the same list.",
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
      "Turn plumbing customers into referrals, repeat work and reviews. Branded referral page, QR code, lead inbox. Free to publish; $49/month USD for Pro.",
    intro:
      "Most plumbing work arrives as an emergency, which means the customer is relieved and talkative right when the job ends. Revvin captures that moment with an automatic ask, then keeps the rest of your list warm with reactivation campaigns for the work people postpone.",
    loops: [
      {
        title: "Referrals at the moment of relief",
        body: "Mark the job done and the ask goes out shortly after, naming the customer, the technician and the service. Referrals arrive in your inbox with contact details and what the lead needs.",
      },
      {
        title: "Repeat work on deferred jobs",
        body: "Water heaters, re-pipes, fixture upgrades and drain maintenance all sit on your list waiting. Segment by time since last job and send the offer that matches.",
      },
      {
        title: "Reviews that carry the emergency story",
        body: "A review request follows the job, and customers who report they were happy get a referral ask next.",
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
      "Solar is sold neighbour to neighbour, and your installed base is the most credible sales team you will ever have. Revvin gives every past customer a branded page and link to share, tracks the reward from pending to paid, and keeps the rest of the loop running without you chasing anyone.",
    loops: [
      {
        title: "Referrals from the installed base",
        body: "After commissioning, Revvin asks the homeowner to pass on their link. Referrals land in your inbox with name, contact and what they are asking about, so a consultant can call back the same day.",
      },
      {
        title: "Repeat work on the rest of the system",
        body: "Battery add-ons, panel cleaning, monitoring checks, EV chargers and roof-related work all live on your existing list. Reactivation campaigns segment by time since install.",
      },
      {
        title: "Reviews after the first full bill cycle",
        body: "Review requests go out after the job, then happy customers get a referral ask. Both are automatic.",
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
        body: "Panel upgrades, rewires and EV charger installs all end with a satisfied homeowner. Mark the job done and the ask fires automatically.",
      },
      {
        title: "Repeat work across the house",
        body: "Lighting, generators, surge protection, safety inspections and EV chargers are natural second jobs. Segment your list by time since last visit and offer the right one.",
      },
      {
        title: "Reviews that mention the work by name",
        body: "Review requests follow the job, and customers who say they were happy get a referral ask.",
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
      "Run a landscaping referral program and seasonal reactivation from one customer list. Free to publish; $49/month USD for Pro. Pay referrers directly.",
    intro:
      "Landscaping is the most visible trade there is, and your best advertisement is the yard you finished this morning. Revvin makes that yard referable with a branded page, a QR code for the sign out front and an automatic ask to the customer who paid for it.",
    loops: [
      {
        title: "Referrals from the street",
        body: "Neighbours notice new work immediately. A QR code on the yard sign and an automatic ask to the homeowner turn that attention into leads in your inbox.",
      },
      {
        title: "Repeat work by season",
        body: "Spring cleanups, irrigation, mulch, aeration and fall work repeat on a calendar. Reactivation campaigns segment by time since last service and send the seasonal offer.",
      },
      {
        title: "Reviews while the yard looks its best",
        body: "Review requests go out after the job, and happy customers get a follow-up referral ask.",
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
        body: "Mark the job done and the ask goes out with the customer's name and the work you did, so the message reads like you wrote it.",
      },
      {
        title: "Repeat work room by room",
        body: "Most painting customers only did part of the house. Reactivation campaigns segment by time since the last job and offer the next phase.",
      },
      {
        title: "Reviews with photos attached",
        body: "Review requests follow the job, and happy customers get a referral ask straight after.",
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
      "Detailing is a before-and-after business with a short repeat cycle, which makes it ideal for all three loops. Revvin asks for the referral while the car still looks new, brings customers back on schedule and collects reviews in between.",
    loops: [
      {
        title: "Referrals at handover",
        body: "The ask fires shortly after you mark the job done, while the customer is still looking at the result. Referrals arrive with contact details and vehicle notes.",
      },
      {
        title: "Repeat work on a short cycle",
        body: "Detailing repeats in weeks and months, not years. Reactivation campaigns segment by time since last appointment and prompt the rebooking.",
      },
      {
        title: "Reviews with the photos you already take",
        body: "Review requests go out after the job, then happy customers get a referral ask.",
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