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
  {
    slug: "pest-control",
    trade: "pest control",
    label: "Pest control",
    h1: "Referral program software for pest control companies",
    metaTitle: "Pest Control Referral Program Software | Revvin",
    metaDescription:
      "Run a pest control referral program off your recurring service list. Branded page, QR code, tracked rewards. Free to publish; $49/month USD for Pro.",
    intro:
      "Pest control is one of the few home services where you are already in the driveway every quarter, and where the problem does not respect property lines. Ants, termites, rodents and mosquitoes move along a block, so the customer you treated on Tuesday has neighbours with the same complaint. Revvin gives that customer a branded page and link to hand over, and puts the referral in your inbox with the address attached so you can quote a stop you are already routing past.",
    loops: [
      {
        title: "Referrals along the same block",
        body: "The neighbours share the infestation, so they are the warmest list you have. Ask at the quarterly visit while the truck is still parked out front, and every referral arrives in your lead inbox with a name, contact and address, with one-tap call or text back.",
      },
      {
        title: "Recurring contracts that stay renewed",
        body: "Your revenue lives in contract retention, not one-off treatments. On Pro, import your customer list and send lapsed-plan and seasonal offers yourself, in batches from your own email app, so mosquito season and termite inspections get asked for on your timing.",
      },
      {
        title: "A service sticker that keeps asking",
        body: "The label you already leave inside the home is prime real estate. Add your QR code to it and the referral page is one scan away for the whole life of the contract, showing the reward exactly as you published it.",
      },
    ],
    rewardExample:
      "You set the reward and pay the referrer directly. Because pest control revenue arrives as a recurring plan rather than a single invoice, many owners decide whether their amount reflects the first service or the signed contract, and publish that wording on the page so there is no ambiguity.",
    placements: [
      "Service sticker in the garage or under the kitchen sink",
      "Bait station and exterior treatment log tag",
      "Quarterly service report and invoice footer",
      "Truck signage on a street you are already treating",
    ],
    faqs: [
      ...sharedFaqs("pest control"),
      {
        q: "Does a referral count if the new customer signs a recurring plan instead of a one-off treatment?",
        a: "That is your call, and you should say it plainly in your offer text. You can mark the reward as won when the plan is signed, or when the first service is completed and paid. Revvin tracks the reward from pending to paid on whichever rule you publish, and notifies the referrer at both moments.",
      },
    ],
  },
  {
    slug: "pool-service",
    trade: "pool service",
    label: "Pool service",
    h1: "Referral program software for pool service companies",
    metaTitle: "Pool Service Referral Program Software | Revvin",
    metaDescription:
      "Grow route density with a pool service referral program. Branded referral page, QR code, tracked rewards. Free to publish; $49/month USD for Pro.",
    intro:
      "Pool service is a route business before it is anything else. One street with five customers on it is worth far more than five customers scattered across town, because the drive time is the cost. That makes referrals from an existing customer unusually valuable: they almost always point at a pool within a block of a stop you already make weekly. Revvin gives your customers a page to pass along and shows you the referral with its address, so you can see immediately whether it falls on a day you are already there.",
    loops: [
      {
        title: "Referrals that tighten the route",
        body: "Ask the customers on your densest streets first. Each referral lands in your inbox with the name, contact and location, so you can judge it against the route you already drive and reply in one tap while the pool is still green.",
      },
      {
        title: "Repeat and upgrade work between visits",
        body: "Filter changes, heater and pump replacements, salt cell swaps, acid washes and openings and closings sit on the same list you already service. On Pro, import that list and send the offer yourself, in batches from your own email app, when the season calls for it.",
      },
      {
        title: "A door tag at the gate every week",
        body: "You leave a service tag at the gate on every visit anyway. Put your QR code on it and the referral page with your reward offer is in the customer's hand fifty-two times a year, tracked from scan to closed deal.",
      },
    ],
    rewardExample:
      "You publish the reward and pay it directly. Pool service is billed monthly rather than as one large invoice, so owners often weigh the reward against a few months of route revenue and state clearly on the page whether it applies once the new customer's service starts.",
    placements: [
      "Door tag or gate hanger left on every weekly visit",
      "Equipment pad sticker on the pump or filter housing",
      "Monthly statement and chemical reading report",
      "Truck and trailer decals parked on the route",
    ],
    faqs: [
      ...sharedFaqs("pool service"),
      {
        q: "Does a referral count when the new customer signs up for weekly service?",
        a: "You decide, and your offer text should say so. Most pool owners treat the reward as won once the new customer's recurring service begins, sometimes after the first month is billed. Revvin tracks whatever rule you publish and moves the reward from pending to paid when you say it is paid.",
      },
      {
        q: "Can I focus my referral asks on one neighbourhood?",
        a: "Yes. On Pro you choose exactly who goes into each batch when you import your customer list, so you can ask only the customers on the streets where you want more density and leave the rest out.",
      },
    ],
  },
  {
    slug: "garage-door",
    trade: "garage door",
    label: "Garage door",
    h1: "Referral program software for garage door companies",
    metaTitle: "Garage Door Referral Program Software | Revvin",
    metaDescription:
      "Run a garage door referral program from repairs and installs. Branded page, QR code, lead inbox, tracked rewards. Free to publish; $49/month USD for Pro.",
    intro:
      "A garage door fails suddenly and the homeowner decides fast, often on whoever a neighbour names first. It is also the largest moving object on the front of the house, so a new door is seen by everyone who drives past. That combination is why garage door work refers well: the decision is quick and the product is visible. Revvin gives you a branded page for the neighbour who asks and a lead inbox so a same-day call gets returned same day.",
    loops: [
      {
        title: "Referrals from a fast decision",
        body: "Spring breaks, opener dies, door will not close. The homeowner wants a name now. Send your referral link to the customer you just finished so they have something to forward, and take the reply in your inbox with one-tap call back.",
      },
      {
        title: "Repeat work on the hardware",
        body: "Springs, rollers, cables, openers and tune-ups all age on a known schedule, and the customer who bought a door will need service on it. On Pro, import your past jobs and send the maintenance or opener-upgrade offer yourself, from your own address, in batches.",
      },
      {
        title: "A sticker on the motor unit",
        body: "Everyone in the household looks up at the opener eventually, and so does the next owner of the house. Your QR code on the motor unit opens your branded referral page with the reward offer on it, years after the install.",
      },
    ],
    rewardExample:
      "You set the amount and pay it directly. Garage door work spans a small spring repair and a full insulated door replacement, so many owners publish two amounts, one for a repair referral and a larger one for a door installation, and Revvin shows the offer exactly as written.",
    placements: [
      "Sticker on the opener motor unit",
      "Wall label beside the interior push button",
      "Invoice and parts warranty card",
      "Truck signage while the door is open on the job",
    ],
    faqs: [
      ...sharedFaqs("garage door"),
      {
        q: "Can I set a bigger reward for a full door replacement than for a repair?",
        a: "Yes. You write the offer text and the amounts on your page, so a tiered reward that pays more for an installation than a service call is straightforward. You pay the referrer directly at whichever tier the closed job falls into, and Revvin tracks it.",
      },
    ],
  },
  {
    slug: "flooring",
    trade: "flooring",
    label: "Flooring",
    h1: "Referral program software for flooring companies",
    metaTitle: "Flooring Referral Program Software | Revvin",
    metaDescription:
      "Run a flooring referral program off past installs. Branded referral page, QR code, tracked rewards. Free to publish; $49/month USD for Pro.",
    intro:
      "Nobody replaces their floors on impulse. It is a planned spend that a homeowner researches for weeks, and the first thing they do is ask a friend who has recently done it. That means your best lead source is the customer who walked their family across the new hardwood last month, and the gap between their conversation and your phone ringing is where jobs get lost. Revvin closes it with a link they can forward and a page that spells out your reward.",
    loops: [
      {
        title: "Referrals during a long consideration cycle",
        body: "A friend asking about your floors may not buy for months. Give your past customer a referral link they can send the moment the question comes up, and the lead lands in your inbox with contact details and status tracking so you can follow it across a slow decision instead of losing it.",
      },
      {
        title: "Repeat work room by room",
        body: "Most flooring customers only did part of the house, and stairs, bedrooms and basements come later. On Pro, import your install history and send the next-phase offer yourself, in batches from your own email app, so the ask arrives from your address.",
      },
      {
        title: "A page that survives the shopping trip",
        body: "Homeowners compare several quotes. Your QR code in the care and warranty pack keeps your branded page, your reward offer and your contact details in the house through the whole comparison, with every scan tracked into your lead inbox.",
      },
    ],
    rewardExample:
      "You choose the reward and pay it directly. Flooring tickets are large and vary hugely with square footage and material, so some owners publish a flat amount per closed install and others stage it, with part on signed contract and the rest on completion. Revvin displays whatever you publish and tracks it from pending to paid.",
    placements: [
      "Care and warranty pack left with the customer",
      "Leftover material box label in the garage",
      "Showroom counter card and sample checkout",
      "Quote and invoice footer",
    ],
    faqs: [
      ...sharedFaqs("flooring"),
      {
        q: "Can I stage a flooring reward across signing and completion?",
        a: "Yes. Because you pay the referrer directly, you can split the reward however you like, for example part when the contract is signed and the rest when the install is finished. Write that in your offer text so the referrer knows, and use Revvin's pending-to-paid tracking to see where each reward stands.",
      },
      {
        q: "What if a referral takes months to decide?",
        a: "That is normal for flooring, and it is why every referral sits in your lead inbox with a status you control. You can move a lead through your own stages and keep it open as long as the decision takes, rather than relying on memory.",
      },
    ],
  },
  {
    slug: "window-replacement",
    trade: "window replacement",
    label: "Windows",
    h1: "Referral program software for window replacement companies",
    metaTitle: "Window Replacement Referral Program Software | Revvin",
    metaDescription:
      "Run a window replacement referral program off past customers. Branded page, QR code, tracked rewards. Free to publish; $49/month USD for Pro.",
    intro:
      "Window replacement is a considered purchase with a long path to a signature: the homeowner gets several quotes, worries about pressure selling, and leans hard on someone they know who has already been through it. A past customer vouching for you shortens that path more than any advertisement can. Revvin gives that customer a branded page to send and gives you a lead inbox built for a decision that takes weeks rather than hours.",
    loops: [
      {
        title: "Referrals that shortcut the quote comparison",
        body: "A homeowner who trusts your past customer starts the process already sold on you. Send your referral link after the install so it is in their messages when the question arrives, and take every reply in your inbox with full contact details and one-tap call back.",
      },
      {
        title: "Repeat work on the remaining windows",
        body: "Very few homes get every window replaced at once, and patio doors, screens and second-storey units come later. On Pro, import your customer list and send the phase-two offer yourself, in batches from your own email app.",
      },
      {
        title: "A page that outlasts the sales cycle",
        body: "Your QR code on the warranty registration and the glass label keeps your branded referral page reachable long after the crew leaves, showing your reward offer without you needing to be in the room.",
      },
    ],
    rewardExample:
      "You set the reward and pay it directly. Window projects are priced per opening, so some owners publish a per-window amount and others a flat amount per closed contract, or a tier that grows with project size. Revvin shows exactly the offer you write.",
    placements: [
      "Warranty registration card and glass unit label",
      "Post-install walkthrough packet",
      "Showroom or trailer display signage",
      "Quote folder and invoice footer",
    ],
    faqs: [
      ...sharedFaqs("window replacement"),
      {
        q: "Can I tier the reward by the size of the window project?",
        a: "Yes. You write the offer and pay the referrer yourself, so a reward that scales with the number of openings or the contract value is entirely up to you. State the tiers plainly on your referral page and track each reward from pending to paid.",
      },
      {
        q: "How do I keep a slow referral from going cold?",
        a: "Every referral lands in your lead inbox with contact details and a status you set, plus one-tap call and text back from your own phone. Follow-up is still yours to send, but nothing sits in an inbox unrecorded.",
      },
    ],
  },
  {
    slug: "tree-service",
    trade: "tree service",
    label: "Tree service",
    h1: "Referral program software for tree service companies",
    metaTitle: "Tree Service Referral Program Software | Revvin",
    metaDescription:
      "Run a tree service referral program off jobs neighbours already watched. Branded page, QR code, tracked rewards. Free to publish; $49/month USD for Pro.",
    intro:
      "A crane and a climber in someone's back yard is a spectacle, and half the street watches it. Everyone with a leaning limb over their roof is thinking about their own tree while your crew works. That is the referral moment for tree service, and it happens on the day of the job, not weeks later. Revvin gives your customer a page to hand across the fence and puts the neighbour's request in your inbox with an address, so you can quote it before you demobilise.",
    loops: [
      {
        title: "Referrals from the neighbours watching",
        body: "The audience is already there. Give the customer your referral link and QR card on the morning of the job so they can pass it to whoever comes over to look, and every referral arrives in your lead inbox with a name, contact and address while the equipment is still on the street.",
      },
      {
        title: "Repeat work on a growth cycle",
        body: "Trees keep growing, and pruning, stump grinding, deadwood removal and storm cleanup come back around. On Pro, import your past customers and send the seasonal or post-storm offer yourself, from your own address, in batches.",
      },
      {
        title: "Signage while the chipper is running",
        body: "Truck and chipper decals with your QR code do the asking during the loudest, most watched part of the day. Every scan opens your branded referral page with the reward you set and lands in your tracked lead inbox.",
      },
    ],
    rewardExample:
      "You publish the amount and pay it directly. Removals carry much larger tickets than trims, so many owners set one reward for a pruning referral and a larger one for a removal, and say which is which right on the page.",
    placements: [
      "Truck, chipper and crane decals visible from the street",
      "Door hangers for the houses either side of the job",
      "Estimate and completion paperwork footer",
      "Yard sign left up for the duration of a multi-day removal",
    ],
    faqs: [
      ...sharedFaqs("tree service"),
      {
        q: "Can I reward differently for a removal than for a trim?",
        a: "Yes. You control the offer text and the amounts, and you pay the referrer directly, so a tiered reward that reflects the difference between a prune and a full removal with grinding is simple to publish and track.",
      },
      {
        q: "Can neighbours refer me even if they were never my customer?",
        a: "Anyone with your link or QR code can send you a referral, and it arrives in your lead inbox the same way. Your offer text decides who qualifies for the reward, so be explicit if you want to include or exclude people who have not hired you yet.",
      },
    ],
  },
  {
    slug: "house-cleaning",
    trade: "house cleaning",
    label: "House cleaning",
    h1: "Referral program software for house cleaning businesses",
    metaTitle: "House Cleaning Referral Program Software | Revvin",
    metaDescription:
      "Run a house cleaning referral program built on trust and recurring clients. Branded page, QR code, tracked rewards. Free to publish; $49/month USD for Pro.",
    intro:
      "House cleaning runs on a level of trust almost no other trade needs: you hold a key, you are in the home when nobody is, and you see everything. Clients do not hand that over to a search result, they hand it over to a name a friend gave them. That is why word of mouth carries this trade, and why a client's recommendation is worth more here than any ad. Revvin gives your clients a branded page to send and tracks the reward so you never have to remember who sent whom.",
    loops: [
      {
        title: "Referrals from a trusted relationship",
        body: "Your clients are asked for a cleaner recommendation constantly, by neighbours, coworkers and family. Give them a link and a QR card so the answer is one message instead of a phone number they cannot find, and take the referral in your inbox with contact details and one-tap reply.",
      },
      {
        title: "Recurring clients and the ones who lapsed",
        body: "Weekly and biweekly clients are the whole business, and deep cleans, moves and seasonal work sit on top. On Pro, import your client list and send the rebooking or deep-clean offer yourself, from your own email app, in batches.",
      },
      {
        title: "A card left on the counter",
        body: "You are in the home every visit, so the ask can be physical and quiet: a QR card left with the finished kitchen. It opens your branded referral page with your reward offer, and every scan is tracked into your lead inbox.",
      },
    ],
    rewardExample:
      "You set the reward and pay it directly. Cleaning is billed per visit rather than as one large job, so many owners frame the reward against a month of recurring service and say on the page whether it applies once the new client's schedule begins.",
    placements: [
      "Card left on the kitchen counter at the end of a clean",
      "Welcome folder and key-handover paperwork",
      "Monthly invoice or booking confirmation footer",
      "Magnet for the fridge in recurring clients' homes",
    ],
    faqs: [
      ...sharedFaqs("house cleaning"),
      {
        q: "Does a referral count when the new client books recurring cleans?",
        a: "You decide, and your offer text should make it clear. Many cleaning owners treat the reward as won once the new client's second or fourth visit is done, so a single trial clean does not trigger it. Revvin tracks the reward from pending to paid on whatever rule you publish.",
      },
      {
        q: "Can I ask clients for referrals without it feeling pushy?",
        a: "The ask is yours to word and yours to send, from your own device, so it can be as low-key as a card on the counter or a line at the end of an invoice. Revvin never messages your clients for you.",
      },
    ],
  },
  {
    slug: "remodeling",
    trade: "remodeling",
    label: "Remodeling",
    h1: "Referral program software for remodeling contractors",
    metaTitle: "Remodeling Referral Program Software | Revvin",
    metaDescription:
      "Run a remodeling referral program off finished kitchens and baths. Branded page, QR code, tracked rewards. Free to publish; $49/month USD for Pro.",
    intro:
      "A kitchen or bath remodel is one of the biggest discretionary spends a household makes, and it puts a stranger in the house for weeks. Homeowners do not choose that from a directory. They ask the friend whose renovation they have stood in, and they ask early, sometimes a year before they sign. Revvin gives your finished customers a branded page to forward and gives you a lead inbox that can hold a lead through a decision that long.",
    loops: [
      {
        title: "Referrals from a room people visit",
        body: "Finished remodels get shown off at every dinner and holiday. Send your referral link at the final walkthrough so the homeowner has it when the question comes, and each referral lands in your inbox with a name, contact and what they are planning.",
      },
      {
        title: "Repeat work on the next room",
        body: "Kitchen this year, primary bath next, basement after that. On Pro, import your past-customer list and send the next-project offer yourself, in batches from your own email app, timed to when the budget usually comes back around.",
      },
      {
        title: "A reward offer that survives a year of planning",
        body: "Your QR code in the closeout binder and on the utility-room label keeps your branded page and reward offer reachable through a long planning phase, with every scan tracked from new lead to closed deal.",
      },
    ],
    rewardExample:
      "You publish the reward and pay it directly. Remodel contracts are among the largest tickets in home services, so some owners set a flat amount per signed project and others stage it, with part at contract and the balance at completion. Revvin shows the offer as you write it.",
    placements: [
      "Closeout binder with warranties and paint colours",
      "Utility room or panel label listing the trades used",
      "Job-site sign and dumpster banner during a multi-week build",
      "Proposal and final invoice footer",
    ],
    faqs: [
      ...sharedFaqs("remodeling"),
      {
        q: "Can I split a remodeling reward between contract signing and completion?",
        a: "Yes. You pay the referrer directly, so you can stage the reward however you like, for example part when the contract is signed and the rest at final payment. Put the split in your offer text and follow each reward's status from pending to paid in Revvin.",
      },
      {
        q: "Can I hold a referral that is a year away from starting?",
        a: "Yes. Referrals sit in your lead inbox with contact details and a status you control, so a homeowner who is still planning stays on record instead of relying on your memory or a note in a truck.",
      },
    ],
  },
  {
    slug: "fencing",
    trade: "fencing",
    label: "Fencing",
    h1: "Referral program software for fencing contractors",
    metaTitle: "Fencing Referral Program Software | Revvin",
    metaDescription:
      "Run a fencing referral program off street-visible installs. Branded page, QR code, tracked rewards. Free to publish; $49/month USD for Pro.",
    intro:
      "A new fence has an unusual property: it literally touches the neighbours. Two or three households share a boundary with every job you install, they watch the posts go in, and a fresh fence next door makes the old one look older. Fencing also clusters by neighbourhood age, so whole streets come due at once. Revvin turns that geography into tracked leads with a page your customer can pass over the rail and an inbox that shows you the address.",
    loops: [
      {
        title: "Referrals from the households on the boundary",
        body: "The neighbours on either side are the most qualified prospects you will meet that week. Give the customer your referral link and a few QR cards during the install, and every referral arrives in your lead inbox with a name, contact and address you can go and measure.",
      },
      {
        title: "Repeat work on gates, stain and repair",
        body: "Fences need gate hardware, staining, sections replaced after storms and extensions when a dog or pool arrives. On Pro, import your past installs and send the maintenance or staining offer yourself, from your own address, in batches.",
      },
      {
        title: "Signage on the most visible thing you build",
        body: "A yard sign at the fence line and a QR sticker on the gate post work on every passer-by. Each scan opens your branded referral page with your reward offer and lands in your tracked lead inbox.",
      },
    ],
    rewardExample:
      "You set the reward and pay it directly. Fencing is priced by linear foot, so many owners publish either a flat amount per closed install or an amount that steps up with the length of the run, and Revvin displays exactly what you write.",
    placements: [
      "Yard sign at the fence line during and after the build",
      "QR sticker on the gate post or hardware",
      "Door hangers for both adjoining neighbours",
      "Estimate and invoice footer",
    ],
    faqs: [
      ...sharedFaqs("fencing"),
      {
        q: "Can I reward a neighbour who refers a whole street?",
        a: "Every referral through your link is tracked separately in your lead inbox, so one person can send several and each reward is followed from pending to paid on its own. You pay them directly, and you can stack multiple rewards or publish a tier for volume if you want to.",
      },
    ],
  },
  {
    slug: "pressure-washing",
    trade: "pressure washing",
    label: "Pressure washing",
    h1: "Referral program software for pressure washing businesses",
    metaTitle: "Pressure Washing Referral Program Software | Revvin",
    metaDescription:
      "Run a pressure washing referral program off street-visible results. Branded page, QR code, tracked rewards. Free to publish; $49/month USD for Pro.",
    intro:
      "Pressure washing is the most instantly obvious result in home services. A driveway that was grey at nine is clean at eleven, and every neighbour who walks past sees the line where you stopped. The job also takes hours rather than weeks, so you can quote and complete a referral on the same street the same day. Revvin gives your customer a link to send while the concrete is still drying and puts the neighbour's request in your inbox with an address.",
    loops: [
      {
        title: "Referrals from a visible before and after",
        body: "The contrast sells for you. Hand over a QR card and text your referral link as you pack up, and referrals arrive in your lead inbox with contact and address so you can offer a slot while your rig is still nearby.",
      },
      {
        title: "Repeat work on a dirt cycle",
        body: "Mould, algae and grime come back on a predictable schedule, and driveways, roofs, decks and gutters are separate jobs. On Pro, import your customer list and send the annual reclean or next-surface offer yourself, in batches from your own email app.",
      },
      {
        title: "Asking a whole street at once",
        body: "Your QR code on a lawn sign and on door hangers works on everyone who walks by while the machine runs. Every scan opens your branded page with the reward offer on it and lands in your tracked lead inbox.",
      },
    ],
    rewardExample:
      "You publish the reward and pay it directly. Pressure washing tickets are smaller than construction work, so many owners keep the amount modest and simple enough to print on a door hanger, or offer a larger one for a roof or full-exterior job.",
    placements: [
      "Lawn sign while the job is running",
      "Door hangers up and down the street you are washing",
      "QR card handed over at the walkthrough",
      "Receipt and rebooking reminder footer",
    ],
    faqs: [
      ...sharedFaqs("pressure washing"),
      {
        q: "Is a small reward worth tracking?",
        a: "That is why the tracking exists. Even a modest reward needs to be remembered and paid, and Revvin holds each one from pending to paid and notifies the referrer at both points, so a five-minute favour does not turn into an awkward conversation later.",
      },
    ],
  },
  {
    slug: "carpet-cleaning",
    trade: "carpet cleaning",
    label: "Carpet cleaning",
    h1: "Referral program software for carpet cleaning companies",
    metaTitle: "Carpet Cleaning Referral Program Software | Revvin",
    metaDescription:
      "Run a carpet cleaning referral program and rebooking asks off one list. Branded page, QR code, tracked rewards. Free to publish; $49/month USD for Pro.",
    intro:
      "Carpet cleaning has a short cycle and a fast, obvious result, which is a rare combination. The same household calls you again in six to twelve months, and in between they tell people about the stain you got out. Because the job is measured in hours and the price is easy to say out loud, a referral needs almost no persuading. Revvin makes the ask repeatable with a branded page, a QR card you can leave behind and reward tracking so nothing gets forgotten between visits.",
    loops: [
      {
        title: "Referrals from a same-day result",
        body: "The customer is standing on the result when you finish, which is the easiest moment there will ever be to ask. Leave a QR card and send your referral link, and every referral lands in your inbox with contact details and one-tap call or text back.",
      },
      {
        title: "Rebooking on a short cycle",
        body: "Carpets, upholstery, tile and grout come due again within the year, and pets and kids shorten it. On Pro, import your customer list and send the rebooking prompt yourself, from your own email app, in batches timed to when each household is due.",
      },
      {
        title: "A card that stays in the house",
        body: "Leave your QR card with the corner protectors and blocks, so it is the last thing they pick up when the furniture goes back. It opens your branded referral page with your reward offer, tracked into your lead inbox.",
      },
    ],
    rewardExample:
      "You set the reward and pay it directly. Carpet cleaning is a smaller ticket than most trades on Revvin, so many owners keep a single flat amount that is easy to explain in one line at the door and easy to hand over in cash.",
    placements: [
      "Card left with the corner protectors and furniture blocks",
      "Fridge magnet with the recommended reclean window",
      "Receipt and spot-treatment care sheet",
      "Van signage parked with the hose running to the door",
    ],
    faqs: [
      ...sharedFaqs("carpet cleaning"),
      {
        q: "How do I keep asking without repeating myself every visit?",
        a: "The physical placements do most of the work: a card with the corner protectors, a magnet on the fridge, a QR code on the receipt. When you do want to ask directly, Pro prepares the message and opens your own email app with the recipients filled in, in batches, and your device sends it.",
      },
    ],
  },
  {
    slug: "handyman",
    trade: "handyman",
    label: "Handyman",
    h1: "Referral program software for handyman businesses",
    metaTitle: "Handyman Referral Program Software | Revvin",
    metaDescription:
      "Run a handyman referral program off repeat customers and small jobs. Branded page, QR code, tracked rewards. Free to publish; $49/month USD for Pro.",
    intro:
      "A handyman's business is built on being the person someone already has in their phone. The jobs are small and frequent, one visit turns into a list of four more things, and a good handyman is the single most requested recommendation in any neighbourhood group. The difficulty is volume: dozens of short jobs a month and no time to track who sent whom. Revvin handles that with a branded page, a link you can send in seconds and reward tracking that runs in the background.",
    loops: [
      {
        title: "Referrals from being the trusted name",
        body: "People ask for a reliable handyman more than any other trade. Give your customers a link and QR card so the recommendation is a forward instead of a half-remembered number, and every referral arrives in your inbox with a name, contact and what they need.",
      },
      {
        title: "Repeat work off the punch list",
        body: "Almost every customer has a list you did not finish, plus seasonal jobs like gutters, caulking, door adjustments and mounting. On Pro, import your customer list and send a short reminder yourself, from your own email app, in batches.",
      },
      {
        title: "One page for every kind of job",
        body: "You do not need a separate offer per service. A single branded referral page with your reward on it covers everything you do, and your QR code on the invoice, magnet and van keeps it a scan away between visits.",
      },
    ],
    rewardExample:
      "You choose the reward and pay it directly. Handyman jobs run small and repeat often, so many owners set a modest flat amount per closed job, or a larger one for a referral that turns into a multi-day project.",
    placements: [
      "Fridge magnet or business card with a QR code",
      "Invoice and quote footer",
      "Sticker inside the utility room or on the water shutoff",
      "Van and toolbox signage",
    ],
    faqs: [
      ...sharedFaqs("handyman"),
      {
        q: "I do dozens of small jobs a month. Is tracking rewards realistic?",
        a: "That is the point of a lead inbox. Each referral arrives with contact details and a status you control, and each reward sits at pending until you mark it paid, so a busy month does not turn into unpaid favours you cannot reconstruct.",
      },
    ],
  },
];

export const getIndustry = (slug?: string) =>
  INDUSTRIES.find((i) => i.slug === slug);
