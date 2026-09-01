// Question-shaped guide content for answer engines and search.
//
// Every claim here must be true of the product: publishing a referral page is
// free, Revvin Pro is $49/month USD, businesses pay their referrers directly
// off-platform, and Revvin never sends email or SMS on a business's behalf.
// The Pro bulk ask prepares the message and opens the owner's own email app
// with the recipients filled in, in batches. There is no auto-ask engine, no
// job-done trigger, no segmented reactivation, no automated review requests,
// no webhooks and no public API.
//
// No statistics, benchmarks, averages, testimonials, case studies or results
// are invented anywhere on these pages. Where a number would normally go, the
// mechanism is described instead.

export interface GuideFaq {
  q: string;
  a: string;
}

export interface Guide {
  slug: string;
  /** The question exactly as a person would ask it. Used as the H1. */
  question: string;
  /** Short label for cards, nav and breadcrumbs. */
  label: string;
  metaTitle: string;
  metaDescription: string;
  /**
   * The direct answer, in the first paragraph. Answer engines quote the
   * opening, so this has to stand on its own without the rest of the page.
   */
  answer: string;
  sections: { heading: string; body: string }[];
  faqs: GuideFaq[];
}

export const GUIDES: Guide[] = [
  {
    slug: "how-much-to-pay-for-a-referral",
    question: "How much should you pay for a referral?",
    label: "How much to pay for a referral",
    metaTitle: "How Much Should You Pay for a Referral? | Revvin",
    metaDescription:
      "How service business owners set a referral reward: a flat amount per closed job, tiers by job type, or a percentage they work out themselves. Revvin does not set or cap the reward and takes no cut.",
    answer:
      "There is no correct figure, and anyone quoting you one is guessing about your business. The amount you pay for a referral is a decision you make from two numbers you already have: what a customer is worth to you over the life of the relationship, and what you currently spend to acquire one somewhere else. A referral reward that sits comfortably below what an acquired customer already costs you is a reward you can afford to pay gladly and repeatedly. Revvin does not set the amount, does not cap it, and takes no cut of it.",
    sections: [
      {
        heading: "The three ways owners usually set it",
        body: "The first is a flat amount per closed job: one number, advertised plainly, paid whenever a referral turns into paid work. It is the easiest to explain and the easiest for a customer to repeat to a neighbour, which is the whole point. The second is tiers by job type, where a small service call and a full replacement carry different rewards, because the value to you is not the same. The third is a percentage of the job, which you calculate yourself and enter as the reward. All three are supported the same way: you type the reward onto your referral page and it displays exactly as you set it.",
      },
      {
        heading: "The real anchor is what a customer is worth to you",
        body: "Work out what an average customer pays you across the whole relationship, not just the first invoice, and subtract your costs. That is the ceiling the reward has to live under. Then look at what you already pay per acquired customer through ads, lead fees or any other channel. That is the honest comparison, because a referral is replacing one of those acquisitions. If you are already comfortable spending a certain amount to acquire a stranger, a reward at or below that number to acquire someone who arrives already trusting you is straightforward arithmetic you can do on your own figures.",
      },
      {
        heading: "Pay on the close, not on the lead",
        body: "Rewards on Revvin are attached to outcomes you confirm. A referral arrives in your lead inbox, you work it like any other lead, and you move it to closed when it becomes paid work. Only then is a reward owed. That is what lets you set a meaningful number: you are never paying for volume, curiosity or a name that goes nowhere. Revvin tracks each reward from pending to paid and notifies your referrer at both moments.",
      },
      {
        heading: "Say the number out loud",
        body: "A reward nobody can quote is a reward nobody acts on. Whatever you choose, write it on your referral page in plain language, along with what counts as a referral and when you pay. A customer who can say the amount and the condition in one sentence at a barbecue is worth more than a generous but vague offer nobody can repeat.",
      },
      {
        heading: "What Revvin does and does not do here",
        body: "Revvin shows the reward exactly as you set it, tracks what is owed, and notifies your referrer when the reward is won and when you mark it paid. It never holds or moves money, never processes the payout, and never takes a percentage. You pay your referrer directly, off-platform, by whatever method the two of you use.",
      },
    ],
    faqs: [
      {
        q: "How much should I pay for a referral?",
        a: "Set it from your own figures: what a customer is worth to you over the relationship, and what you already pay to acquire one elsewhere. A reward below your existing cost per acquired customer is one you can pay every time without hesitating. There is no universal number, and Revvin does not set or cap yours.",
      },
      {
        q: "Should a referral reward be a flat fee or a percentage?",
        a: "Both are used. A flat amount is easier for a customer to remember and repeat, which matters more than precision. A percentage tracks the size of the job better when your ticket values vary widely. If your jobs fall into clear types, tiers by job type give you most of the benefit of a percentage while still being one line to say.",
      },
      {
        q: "Do you pay for the referral or only when the job closes?",
        a: "On Revvin the reward is tied to a closed deal you confirm yourself. The referral lands in your lead inbox, you work it, and you mark it closed when it becomes paid work. That is when the reward becomes owed, so you are never paying for leads that go nowhere.",
      },
      {
        q: "Does Revvin take a cut of the referral reward?",
        a: "No. Revvin never holds, moves or processes the reward, and takes no percentage of it. You pay your referrer directly off-platform. Publishing your referral page is free and Revvin Pro is $49/month USD if you want the tools that work your whole customer list.",
      },
      {
        q: "Can I change the reward later?",
        a: "Yes. You can edit the reward on your referral page whenever you like, and the page shows the current amount to anyone who visits it. Rewards already won on earlier terms stay tracked as they were, so changing the offer does not rewrite what you already owe.",
      },
    ],
  },
  {
    slug: "referral-program-vs-buying-leads",
    question: "Referral program vs buying leads: what is the difference?",
    label: "Referral program vs buying leads",
    metaTitle: "Referral Program vs Buying Leads | Revvin",
    metaDescription:
      "The mechanical difference between a referral program and a lead marketplace: exclusivity, trust and when you pay. A factual comparison for service businesses.",
    answer:
      "The difference is mechanical, and it comes down to three things: who else gets the lead, how much the customer already trusts you, and when the money leaves your account. Lead marketplaces such as Angi, Thumbtack and HomeAdvisor typically sell an enquiry to several businesses at once, so you are competing on response speed and price against companies the customer has never met either, and you generally pay per lead whether or not it turns into work. A referral is exclusive to you, arrives already trusted because someone the customer knows sent them, and on Revvin costs you nothing until the job actually closes. Neither model is dishonest; they simply price different things.",
    sections: [
      {
        heading: "Exclusivity: who else is calling",
        body: "The defining feature of the lead marketplace category is shared distribution. The same enquiry commonly goes to multiple contractors, which is what makes the marketplace worth using for the homeowner: they get several quotes without making several calls. For the contractor it means the first minutes matter more than the quality of the work, because the customer is comparing whoever answers. A referral is not distributed. It comes to you, named, and no one else is racing you for it.",
      },
      {
        heading: "Trust: how the conversation starts",
        body: "A marketplace lead starts cold. You are one of several names on a screen and the customer has no reason to prefer you until you give them one. A referred customer starts the conversation already leaning your way, because a person they know has vouched for you with their own reputation. That changes what the first call is about. You spend it on the job rather than on establishing that you are legitimate.",
      },
      {
        heading: "When you pay, and for what",
        body: "In the marketplace model you generally pay for the enquiry itself, which means your cost is fixed at the top of the funnel and your return depends entirely on your close rate. In a referral program the cost sits at the bottom: you set a reward and it is only owed when the referral becomes paid work. That inverts the risk. A quiet month costs you nothing in rewards, and a good month costs you more only because you earned more.",
      },
      {
        heading: "What each one is actually good at",
        body: "Lead marketplaces solve a real problem: they produce volume on demand, from strangers, without you having any existing audience. If you need work next week and have no list, that is a legitimate thing to buy. A referral program does not produce volume on demand. It compounds slowly off the customers you have already served, and it needs you to ask. The two are not mutually exclusive, and plenty of businesses run both while the second one grows.",
      },
      {
        heading: "How this works on Revvin",
        body: "You publish a branded referral page on your own link, free, with a QR code and a print pack for signage and paperwork. Referrals land in one lead inbox with status tracking and one-tap call or text back. You set the reward, you confirm the close, and you pay your referrer directly when it happens. Revvin takes no cut of the reward and never sends messages on your behalf. Revvin Pro, at $49/month USD, adds importing your past-customer list, sending your ask in bulk from your own email app, ROI reporting and custom page branding.",
      },
    ],
    faqs: [
      {
        q: "Is a referral program better than buying leads?",
        a: "They do different jobs. Buying leads produces volume from strangers on demand and costs you per enquiry regardless of outcome. A referral program produces fewer, exclusive, pre-trusted leads and costs you only when a job closes, but it grows off customers you already have and requires you to ask. Many businesses run both.",
      },
      {
        q: "Why do lead marketplaces send the same lead to several contractors?",
        a: "That is generally how the category works: the homeowner submits one enquiry and receives several quotes, which is the value to them. The consequence for contractors is that speed of response and price carry more weight than reputation, because the customer is comparing businesses none of whom they know.",
      },
      {
        q: "Do I pay for referrals that never close?",
        a: "Not on Revvin. The reward you set is only owed when you confirm the referral turned into paid work. Referrals that go nowhere cost you nothing, because Revvin charges no per-lead fee and takes no cut of the reward.",
      },
      {
        q: "Can I use Revvin alongside Angi, Thumbtack or HomeAdvisor?",
        a: "Yes. Revvin does not replace any lead source and does not require exclusivity. It runs off your own past customers and your own link, so it sits alongside whatever else brings you work.",
      },
      {
        q: "What does a referral program cost to run?",
        a: "Publishing your referral page on Revvin is free, with no per-lead fee and no cut of the reward. Revvin Pro is $49/month USD for list import, bulk asking from your own email app, ROI reporting and custom branding. The referral rewards themselves are set by you and paid by you, directly to your referrer.",
      },
    ],
  },
  {
    slug: "how-to-start-a-referral-program",
    question: "How do you start a referral program?",
    label: "How to start a referral program",
    metaTitle: "How to Start a Referral Program (Step by Step) | Revvin",
    metaDescription:
      "A practical six-step guide to starting a referral program for a service business: set the reward, write the terms, place the link and QR, ask at the right moment, track what is owed, and pay quickly.",
    answer:
      "Starting a referral program takes six decisions, and you can make all of them in an afternoon: decide the reward, write it down in terms a customer could repeat, put your link and QR code where your customers already are, ask at the moment the work is fresh, track what you owe, and pay it quickly. The programs that fail almost never fail on the reward amount. They fail because nothing was written down, nobody was asked, or someone was owed money and had to chase it.",
    sections: [
      {
        heading: "Step one: decide the reward",
        body: "Pick a number you can pay without flinching every single time, because you will be paying it on your best months. Most owners use a flat amount per closed job, or tiers if a service call and a full replacement are wildly different in value to them. Work it out from what a customer is worth to you and what you already spend to acquire one elsewhere, rather than copying a figure from another business with different economics.",
      },
      {
        heading: "Step two: write the terms in plain language",
        body: "Three sentences is enough: what counts as a referral, what you pay, and when you pay it. Write it as a person would say it out loud, not as a policy. On Revvin these sit on your referral page so every visitor sees the same terms, and neither you nor your referrer is relying on memory of a conversation months earlier.",
      },
      {
        heading: "Step three: put the link and QR where customers already are",
        body: "A referral page nobody can find is a referral page nobody uses. Publish yours on your own Revvin link and get the QR code and print pack out of your dashboard, then put it on the things your customers already handle: the invoice, the receipt, the yard sign, the van, the fridge magnet, the paperwork you leave behind. The point is to remove the moment where someone has to remember your business name and search for it.",
      },
      {
        heading: "Step four: ask at the right moment",
        body: "The ask does more work than the reward. Ask while the job is fresh and the customer is pleased, in person as you pack up or by message the same day, and ask for something specific rather than for a vague favour. Then ask your past customers as well, in batches, because that list is where the fastest referrals come from. On Pro you can import that list and Revvin will open your own email app with the recipients and text filled in, batch by batch, so it always sends from your address.",
      },
      {
        heading: "Step five: track what is owed",
        body: "Every referral lands in your lead inbox with a status you move as you work it, from new lead through to closed. When you close one, the reward attached to it becomes pending, and your referrer can see that it was won. This is the part people improvise with texts and a notebook, and it is the part that quietly kills programs when someone is forgotten.",
      },
      {
        heading: "Step six: pay quickly, and say you have",
        body: "Pay the reward as soon as the job is paid, by whatever method you and your referrer already use. Revvin does not hold or move the money and takes no cut. Mark it paid in your dashboard and your referrer is notified. Paying fast is the single cheapest piece of marketing in the whole program, because the person you just paid tells other people about it.",
      },
    ],
    faqs: [
      {
        q: "How do I start a referral program for my business?",
        a: "Decide the reward, write the terms in three plain sentences, publish a referral page and put its link and QR code on your invoices, signage and vehicles, ask customers while the job is fresh, track each referral to a close, and pay the reward quickly. On Revvin the page, the QR code, the print pack and the lead inbox are free.",
      },
      {
        q: "What should a referral program include?",
        a: "At minimum: what counts as a referral, the reward amount, when it gets paid, a way for the referral to reach you that is not word of mouth alone, and a record of who is owed what. Everything else is optional.",
      },
      {
        q: "How long does it take to set up?",
        a: "Building and publishing a Revvin referral page is an afternoon's work at most, and the QR code and print pack are generated for you. The longer part is deciding the reward and getting the link in front of the customers you already have.",
      },
      {
        q: "Do I need a customer list to start a referral program?",
        a: "No. Your page works the day you publish it and can be shared with anyone. But the customers who have already paid you are where referrals come from fastest, so importing that list and asking it is usually the first thing worth doing. List import and bulk asking are Revvin Pro features at $49/month USD.",
      },
      {
        q: "Does Revvin send the referral asks for me?",
        a: "No. Revvin never sends email or SMS on your behalf. It prepares the message and opens your own email app or messaging app with the recipients and the text filled in, in batches, so it sends from your own address or number and the relationship stays yours.",
      },
    ],
  },
  {
    slug: "do-referral-programs-work-for-contractors",
    question: "Do referral programs actually work for contractors?",
    label: "Do referral programs work for contractors",
    metaTitle: "Do Referral Programs Work for Contractors? An Honest Answer | Revvin",
    metaDescription:
      "When contractor referral programs work and when they do not. A candid look at the conditions that make referrals produce, without invented statistics or case studies.",
    answer:
      "Sometimes, and the conditions are predictable enough to check before you start. Referral programs work for contractors when the trade serves customers who talk to each other, when the ask happens close to the job while the work is still visible and the customer is still pleased, and when the reward is a specific named amount that actually gets paid. They work poorly when the ask is generic, when it comes weeks after the crew left, or when the reward is vague enough that nobody can repeat it. The reward amount is rarely the deciding factor. The timing and the specificity of the ask usually are.",
    sections: [
      {
        heading: "When they work: the customer has someone to tell",
        body: "Trades where the work is visible from the street or discussed between neighbours have a built-in advantage. A new roof, a driveway, a fence, a tree that came down, a fresh coat on the exterior: these start conversations without you doing anything. Trades where the work is invisible are not excluded, but the referral has to travel through a different route, usually a landlord, a property manager, a family member or a group of people in the same building or the same trade.",
      },
      {
        heading: "When they work: the ask lands near the job",
        body: "The strongest moment is the one where you are still standing there and the work has just been done well. Everything after that decays. A message the same evening still works. A message a month later is a different conversation and needs a different opening, usually one that checks the work is still holding up before it asks for anything. A generic broadcast to everyone you have ever invoiced, with no reference to what you did for them, is the weakest version and it is the version most businesses try first.",
      },
      {
        heading: "When they work: the reward is named and paid",
        body: "\"We appreciate referrals\" is not a program. A named amount, a clear condition and a fast payment is. The paying part is not a formality: a customer who was promised something and had to chase it will not send you a second person, and they will mention it to the first one. If you cannot commit to paying quickly, set a smaller reward you can.",
      },
      {
        heading: "When they do not work",
        body: "They do not work if you never ask, which is the most common failure by a wide margin. They do not work if the ask is a link in a footer nobody reads. They do not work if the customer cannot say what they get or what counts, because ambiguity makes people avoid the whole subject rather than risk asking. And they do not work as a rescue plan for a business with a quality problem, because a referral puts your customer's reputation on the line and they will not risk it on work they were not happy with.",
      },
      {
        heading: "What is realistic to expect",
        body: "A referral program is not a volume channel you can turn up when you need work next week. It compounds off jobs you have already done, at the pace you do them, and the return depends on how many customers you have served and how consistently you ask. What it does offer is a cost structure most channels do not: nothing is owed until a job closes, and the lead arrives with trust already attached. Whether that adds up to a meaningful number for your business depends on your ticket values and your list size, which are numbers only you have.",
      },
    ],
    faqs: [
      {
        q: "Do referral programs work for contractors?",
        a: "They work when the trade has customers who talk to each other, when the ask happens near the job while the work is fresh, and when a named reward is actually paid. They work poorly when the ask is generic or delayed, or when the reward is vague. The ask matters more than the amount.",
      },
      {
        q: "Why do most referral programs fail?",
        a: "Usually because nobody asks. After that: the terms are vague so customers cannot repeat them, the ask arrives weeks after the job, or someone earned a reward and had to chase it, which ends their participation and damages the story they tell about you.",
      },
      {
        q: "How long before a referral program produces work?",
        a: "There is no fixed answer, and anyone offering one does not know your list. A referral program moves at the pace of the jobs you complete and the customers you ask, so the honest expectation is gradual compounding rather than a spike. Asking your existing past-customer list is the fastest starting point because those people already exist.",
      },
      {
        q: "Are referral programs worth it for small contractors?",
        a: "The cost structure suits small operators well, because there is no per-lead fee and the reward is only owed on closed work. On Revvin publishing the page is free, so the main investment is the habit of asking. Whether the return is meaningful depends on your ticket values and how many past customers you have.",
      },
      {
        q: "What is the best moment to ask a customer for a referral?",
        a: "While you are still on site and the work has just been done well, or by message the same day. Later asks still work but need a different opening, usually one that checks the work is holding up before it asks for anything.",
      },
    ],
  },
  {
    slug: "how-to-ask-a-customer-for-a-referral",
    question: "How do you ask a customer for a referral?",
    label: "How to ask for a referral",
    metaTitle: "How to Ask a Customer for a Referral | Revvin",
    metaDescription:
      "The timing and the wording of the referral ask: when to ask, how specific to be, and why a named reward matters. Copy-paste scripts are in the Revvin referral ask kit.",
    answer:
      "Ask while the work is fresh, ask for something specific, and give them something concrete to hand over. The best moment is the one where you are still there and the job has just been finished well: a short, plain request to pass your name on if someone asks, followed the same day by a message containing your referral link and the reward. Vagueness is what kills the ask. \"Send people my way\" asks the customer to invent both the wording and the mechanism, so most of them do nothing. A named reward, a clear condition and a link they can forward removes all three obstacles at once.",
    sections: [
      {
        heading: "Timing: the same day beats a better script next week",
        body: "There are three moments worth using. The first is in person as you pack up, when the customer is pleased and you are still a real person to them. The second is a message a couple of hours later, which gives you room to include the link and the reward in writing. The third is a check-in weeks or months after the job, which works but has to earn the ask first by confirming the work is still holding up. Anything beyond that is really a message to a dormant customer, and it should read like one.",
      },
      {
        heading: "Wording: be specific about what you want",
        body: "Name the kind of person you want. \"If anyone you know needs their gutters done before winter\" gives the customer a search to run in their head. \"Send anyone my way\" gives them nothing to match against. Say the reward as a number, say what counts as a referral, and keep the whole thing short enough to read on a phone without scrolling. Never ask for a referral in the same breath as an upsell.",
      },
      {
        heading: "Give them something to forward",
        body: "The customer's next problem after agreeing to help is how. A link solves it. Your Revvin referral page is a single address you can drop into a text, an email or a group chat, and it shows your reward and terms without the customer having to explain anything. The QR code and print pack cover the offline version: the invoice, the yard sign, the van, the paperwork left behind.",
      },
      {
        heading: "Asking your past customers, in batches",
        body: "The people who have already paid you are the fastest source of referrals and the one most owners never touch. On Revvin Pro you can paste in that list and send your ask in batches: Revvin prepares the message and opens your own email app with the recipients filled in, so it goes out from your address, not from a platform. It never sends on your behalf, which is also why it always looks like you.",
      },
      {
        heading: "The scripts",
        body: "The exact wording for each of these moments, including the in-person ask, the same-day text, the 30-day check-in, the dormant-customer message and the note you send when a referred customer calls, is in the Revvin referral ask kit. It is free, public, and every script is copy-and-paste with the placeholders marked, so it is kept in one place rather than repeated across the site.",
      },
    ],
    faqs: [
      {
        q: "How do you ask a customer for a referral?",
        a: "Ask while the job is fresh, in person as you finish or by message the same day. Be specific about the kind of person you are looking for, name the reward as an amount, and include a link they can forward so they do not have to explain anything themselves.",
      },
      {
        q: "When is the best time to ask for a referral?",
        a: "Immediately after the work is done well, while you are still on site, with a written follow-up the same day. Later asks work but need to open by confirming the work is still holding up before they ask for anything.",
      },
      {
        q: "What should I say when asking for a referral?",
        a: "Keep it short, name the kind of customer you want, state the reward and what counts as a referral, and include your link. The Revvin referral ask kit has copy-and-paste wording for the in-person ask, the same-day text, the 30-day check-in and the dormant-customer message.",
      },
      {
        q: "Should I offer a reward when I ask for a referral?",
        a: "A named amount makes the ask concrete and gives the customer something specific to repeat to someone else. You set the amount, it displays on your referral page exactly as you set it, and you pay your referrer directly when a referral closes. Revvin takes no cut.",
      },
      {
        q: "Can Revvin send the referral ask for me?",
        a: "No. Revvin never sends email or SMS on your behalf. On Pro it prepares the message and opens your own email app with the recipients and text filled in, in batches, so the message comes from you.",
      },
    ],
  },
];

export const getGuide = (slug?: string) => GUIDES.find((g) => g.slug === slug);
