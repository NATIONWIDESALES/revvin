// Answer-first guides added in the October 2026 content build.
//
// Same rules as guides.ts: no statistics, benchmarks, typical prices,
// testimonials or sweeping claims about other businesses. Examples are labelled and use round
// numbers the reader replaces with their own. Nothing here is legal or tax
// advice, and every page that touches money or rules says so.

import type { Guide } from "./guides";
import { CONTENT_UPDATED_AT } from "../config/brand";

const DATED = { publishedAt: CONTENT_UPDATED_AT, updatedAt: CONTENT_UPDATED_AT };

/** The line a referrer adds when they share a link that may earn them a reward. */
export const REFERRER_DISCLOSURE = "Heads up: I may get a reward from [your business] if you hire them.";

const NOT_ADVICE = "This is general information, not legal or tax advice. Check the rules where you operate.";

export const NEW_GUIDES: Guide[] = [
  {
    ...DATED,
    group: "ask",
    slug: "referral-text-templates",
    question: "Referral request templates: what to text a customer after a job",
    label: "Referral text templates",
    metaTitle: "Referral Text Templates for After a Job | Revvin",
    metaDescription:
      "Twelve copy-ready referral requests: text, email and say-it-out-loud versions for job completion, one week later, after a review and a seasonal check-in.",
    answer:
      "Text the customer within a day of finishing the job, thank them, ask if they know anyone who needs the same work, and give them one link to pass on with the reward stated plainly. Below are twelve templates: a text, an email and a spoken version for four moments, ready to copy and fill in.",
    sections: [
      {
        heading: "A good referral text has four parts",
        body: "A referral request works when it is short and specific: a thank you, a plain ask, one link, and the reward with its condition. Leave out anything else. The customer should be able to forward it in one tap, and the person they send it to should understand it without context.",
      },
      {
        heading: "Fill in the brackets before you send",
        body: "Every template uses the same placeholders: [first name], [your name], [your business], [your reward] and [your link]. Replace them with your own details. Your link is the referral page link from your dashboard, so the referral is attributed to the right person and you can see who to thank.",
      },
    ],
    table: {
      heading: "All twelve templates at a glance",
      intro:
        "Each of the four moments has three versions: a text for your phone, an email for customers you reach by inbox, and a few lines to say out loud in person or on a call. Pick the channel you already use with that customer, then copy the full wording from the sections below.",
      caption: "Twelve referral request templates by moment and channel",
      head: ["Moment", "Channel", "Opens with"],
      rows: [
        ["Job completion", "Text", "Thanks for having us out today"],
        ["Job completion", "Email", "Thanks again for choosing us"],
        ["Job completion", "Say it out loud", "Before I head off"],
        ["One week after", "Text", "Checking the work is holding up"],
        ["One week after", "Email", "A quick check-in"],
        ["One week after", "Say it out loud", "I wanted to check everything is working"],
        ["After a 5-star review", "Text", "Thank you for the review"],
        ["After a 5-star review", "Email", "Thank you for your review"],
        ["After a 5-star review", "Say it out loud", "Thank you for the review you left"],
        ["Seasonal check-in", "Text", "It is that time of year again"],
        ["Seasonal check-in", "Email", "Getting ready for the season"],
        ["Seasonal check-in", "Say it out loud", "I am calling ahead of the season"],
      ],
    },
    copyGroups: [
      {
        heading: "Moment one: right after the job is done",
        intro:
          "Ask the same day or the next morning, while the customer is looking at the finished work. This is the moment they are most likely to mention you to someone, so give them the link now. Keep it to a thank you, the ask, the link and the reward.",
        items: [
          {
            label: "Text: job completion",
            text: "Hi [first name], thanks for having [your business] out today. If anyone you know needs the same kind of work, here is my link to pass on: [your link]. If they hire us, there is [your reward] in it for you.",
          },
          {
            label: "Email: job completion",
            text: "Subject: Thanks again for choosing us\n\nHi [first name],\n\nThanks for having [your business] out. If anyone you know needs the same kind of work, this link sends them straight to me: [your link]\n\nIf it turns into a job, there is [your reward] in it for you.\n\nThanks,\n[your name]",
          },
          {
            label: "Say it out loud: job completion",
            text: "Before I head off, how do you feel about how it turned out? If you are happy with it, the best thing you can do for a small business like ours is pass our name on. I will text you the link, and there is [your reward] for you if someone you send hires us.",
          },
        ],
      },
      {
        heading: "Moment two: one week after the job",
        intro:
          "A week later, check the work is holding up and ask again. A follow-up shows you care about the result, not just the invoice, and it reaches customers who meant to share your link and forgot. Lead with the check-in, then the ask.",
        items: [
          {
            label: "Text: one week after",
            text: "Hi [first name], [your name] from [your business]. Checking the work is holding up a week on. If it is, and someone you know needs help, here is the link to pass on: [your link]. [your reward] if it turns into a job.",
          },
          {
            label: "Email: one week after",
            text: "Subject: A quick check-in\n\nHi [first name],\n\nIt has been a week since we finished, so I wanted to check everything is working the way you expected. If anything needs a look, reply and I will sort it.\n\nIf it is all good and you know someone who needs us, here is the link: [your link]. There is [your reward] for you if it becomes a job.\n\nThanks,\n[your name]",
          },
          {
            label: "Say it out loud: one week after",
            text: "I wanted to check everything is working the way you wanted. If it is, and a neighbour or friend ever asks who did the work, I would be grateful if you passed my name on. I can text you the link so you have it.",
          },
        ],
      },
      {
        heading: "Moment three: after a 5-star review",
        intro:
          "When a customer leaves a good review, thank them personally and ask in the same message. They have just said in public that they would recommend you, so a referral link is a natural next step. Keep the thank you first and the ask light.",
        items: [
          {
            label: "Text: after a review",
            text: "Hi [first name], thank you for the review. It means a lot to a business our size. If you know anyone else who needs us, this link sends them straight to me and makes sure you get the [your reward]: [your link]",
          },
          {
            label: "Email: after a review",
            text: "Subject: Thank you for your review\n\nHi [first name],\n\nThank you for taking the time to leave a review. It genuinely helps.\n\nIf anyone you know needs the same work, this link sends them to me and records that they came from you: [your link]. There is [your reward] for you if it turns into a job.\n\nThanks,\n[your name]",
          },
          {
            label: "Say it out loud: after a review",
            text: "Thank you for the review you left. If anyone asks you who did the work, here is our card with the link on it, and there is [your reward] for you if they hire us.",
          },
        ],
      },
      {
        heading: "Moment four: the seasonal check-in",
        intro:
          "Before the season that matters for your trade, check in with past customers. It is a useful reminder for them and a fresh chance to share your link with neighbours who are thinking about the same work. Offer help first, then mention the referral.",
        items: [
          {
            label: "Text: seasonal check-in",
            text: "Hi [first name], [your name] from [your business]. It is that time of year again. If you or anyone you know needs anything before the season, here is the link: [your link]. [your reward] for any referral that turns into a job.",
          },
          {
            label: "Email: seasonal check-in",
            text: "Subject: Getting ready for the season\n\nHi [first name],\n\nIt is that time of year again, so I wanted to check in before things get busy. If you need anything looked at, reply and we will find a time.\n\nIf friends or neighbours are planning the same work, this link sends them to me: [your link]. There is [your reward] for you if it turns into a job.\n\nThanks,\n[your name]",
          },
          {
            label: "Say it out loud: seasonal check-in",
            text: "I am calling ahead of the season to see if you need anything before we get busy. And if anyone you know is planning work, I would be glad if you passed my name on. I will text you the link.",
          },
        ],
      },
      {
        heading: "Give referrers a disclosure line to use",
        intro:
          "When a referrer shares your link and may get a reward, they should say so. Give them a short line to add, in the spirit of the FTC's guidance on endorsements, so the person they send it to knows there is a reward. Put it on your referral page too. This is general information, not legal advice.",
        items: [{ label: "Disclosure line for referrers", text: REFERRER_DISCLOSURE }],
      },
    ],
    closingSections: [
      {
        heading: "Your own phone sends these, not Revvin",
        body: "On Revvin, referral asks open your own phone or email app with the message filled in, and your device sends them from your own number or address. Replies come straight back to you. To write a version for your trade, tone and timing, use the free Referral Message Generator.",
      },
    ],
    sources: [
      {
        label: "FTC: FTC's Endorsement Guides, what people are asking",
        url: "https://www.ftc.gov/business-guidance/resources/ftcs-endorsement-guides-what-people-are-asking",
      },
    ],
    faqs: [
      {
        q: "Should I text or email a customer for a referral?",
        a: "Use the channel you already use with that customer. A text is quicker to read and forward, an email suits customers who booked by email or need a receipt. Either way, send it from your own phone or address so replies come back to you.",
      },
      {
        q: "Should the referral request mention the reward?",
        a: "Yes, if you offer one. Say the amount and the condition in one line, for example that you pay when the referred job closes. A reward nobody can repeat is a reward nobody acts on.",
      },
      {
        q: "How often can I ask the same customer?",
        a: "Asking at each natural moment is reasonable: when the job is done, a week later, after a review and at a seasonal check-in. Stop if they ask you to, and honour any opt-out the rules where you work require.",
      },
    ],
  },
  {
    ...DATED,
    group: "start",
    slug: "what-is-a-referral-program",
    question: "What is a referral program? A plain-English guide for service businesses",
    label: "What is a referral program",
    metaTitle: "What Is a Referral Program? Plain-English Guide | Revvin",
    metaDescription:
      "A referral program is a standing offer that rewards customers for sending you new ones. How it works, reward types, what to track and the common mistakes.",
    answer:
      "A referral program is a standing offer from a business that rewards people for sending it new customers. For a service business it usually means one clear reward, a link or card that customers can pass on, and a rule for when the reward is paid, typically when the referred job closes.",
    sections: [
      {
        heading: "How does a referral program work, step by step?",
        body: "A referral program runs in a loop: you set an offer, you ask customers to share it, a friend contacts you through the shared link or name, you do the job, and you pay the reward to the person who sent them. Each step is simple. The work is doing every step every time.",
        list: [
          "Set one reward and the rule for when it is paid.",
          "Give each customer a way to pass you on: a link, a card or a QR code.",
          "Ask, at the moments customers are happiest with the work.",
          "Record who sent each new lead so you know who to thank.",
          "Do the job, then pay the reward when the job closes.",
        ],
      },
      {
        heading: "Cash, credit or gift: which reward type fits?",
        body: "Cash is the easiest to say out loud and useful to anyone. A credit on a future service only rewards customers who book you again, so it fits recurring work. A gift card or small gift sits in between. Pick the one your customers would actually repeat to a friend, then state it in one sentence.",
      },
      {
        heading: "One-sided or two-sided rewards?",
        body: "A one-sided reward pays only the person who refers. A two-sided reward also gives the new customer something, such as a discount on the first job. Two-sided offers give the friend a reason to call now; one-sided offers are simpler to run. Either way, write down exactly who gets what and when.",
      },
      {
        heading: "What should you track?",
        body: "Track enough to pay people correctly and see whether the program is working: who referred each lead, what happened to the lead, which rewards are owed and which are paid. Keeping that in one place stops the most damaging mistake, a referrer who never hears back.",
        list: [
          "Who sent each referral.",
          "The lead's status: new, contacted, quoted, closed or lost.",
          "Rewards owed, and when each was paid.",
          "Which asks and placements bring referrals in.",
        ],
      },
      {
        heading: "What are the common mistakes?",
        body: "When a referral program stalls, the cause is often simple: nobody asks, the reward is vague, or rewards are paid late. None of these need software to fix, but they do need a routine. Ask every time, state the reward plainly, and pay promptly when the job closes.",
        list: [
          "Not asking. A program customers never hear about does nothing.",
          "Rewards too vague. \"Something for your trouble\" is hard to repeat.",
          "Paying slowly. A late reward costs you the next referral from that person.",
          "No record of who sent whom, so the right person never gets thanked.",
        ],
      },
    ],
    table: {
      heading: "Reward types side by side",
      intro:
        "The three common reward types trade off simplicity, cost and who they appeal to. Cash is simplest to explain, credit keeps the value inside your business, and gifts feel personal. The table compares them on the points that matter when you choose one for your offer.",
      caption: "Cash, credit and gift referral rewards compared",
      head: ["Reward type", "Easy to repeat", "Useful to one-off customers", "Best fit"],
      rows: [
        ["Cash", "Yes, one number", "Yes", "Any trade, especially one-off jobs"],
        ["Credit on a future service", "Yes", "Only if they book again", "Recurring services"],
        ["Gift card or gift", "Usually", "Yes", "Businesses that prefer a non-cash thank you"],
      ],
    },
    closingSections: [
      {
        heading: "How Revvin runs a referral program",
        body: "Revvin gives you a free referral page with a QR code and a personal link for every referrer. Referrals land in one lead inbox, and each reward is tracked from owed to paid. You set a fixed dollar reward and pay referrers directly; Revvin does not process payouts. Asks go from your own phone or email.",
      },
    ],
    faqs: [
      {
        q: "What is the difference between a referral program and word of mouth?",
        a: "Word of mouth happens on its own. A referral program is the routine that encourages it: a stated reward, a way to pass you on, regular asks and a record of who sent whom.",
      },
      {
        q: "Do I need software to run a referral program?",
        a: "No. You can run one with cards and a spreadsheet. Software helps with personal links, tracking who referred whom and remembering which rewards are owed.",
      },
      {
        q: "Are referral rewards taxable?",
        a: "They can be, for the person who receives them, and reporting rules depend on the country and the amounts. This is general information, not tax advice. Check with a tax professional where you operate.",
      },
    ],
  },
  {
    ...DATED,
    group: "ask",
    slug: "when-to-ask-for-a-referral",
    question: "When to ask a customer for a referral",
    label: "When to ask for a referral",
    metaTitle: "When to Ask a Customer for a Referral | Revvin",
    metaDescription:
      "The five moments to ask a customer for a referral: at completion, at payment, after a review, at seasonal maintenance and after a problem you fixed well.",
    answer:
      "Ask when the customer is happiest with your work: when the job is finished, when they pay, after they leave a good review, at seasonal maintenance and after you fix a problem well. Ask at each of these moments, every time, rather than once, because each one reaches the customer when a referral is easy for them.",
    sections: [
      {
        heading: "Ask when the job is finished",
        body: "The end of the job is the strongest moment to ask, because the customer is looking at the finished work and the result is fresh. Ask in person before you leave, then follow up the same day with a text that includes your link, so they have something to forward.",
      },
      {
        heading: "Ask when the customer pays",
        body: "Payment is a natural second moment, because the customer is already thinking about the job and the relationship. Put your referral link and reward on the invoice or receipt, and add one line to the payment message. It costs nothing and it reaches every paying customer.",
      },
      {
        heading: "Ask after a good review",
        body: "When a customer leaves a good review, they have just said in public that they would recommend you. Thank them personally and, in the same message, give them your referral link. Keep the thank you first and the ask short, so it reads as gratitude rather than a sales follow-up.",
      },
      {
        heading: "Ask at seasonal maintenance",
        body: "A seasonal check-in gives you a reason to contact past customers that is useful to them, and their neighbours are often thinking about the same work at the same time. Offer help first, then mention your referral link. This is how customers from past seasons stay in touch.",
      },
      {
        heading: "Ask after a problem you fixed well",
        body: "A problem handled well can leave a customer more loyal than a job that went smoothly. Once the fix is confirmed and the customer is happy, it is fair to ask. Wait until the issue is fully resolved; asking while it is still open will feel tone deaf.",
      },
      {
        heading: "Why asking every time beats asking once",
        body: "One ask is easy to forget. Customers mean to pass your name on and then the moment passes. Asking at each natural moment gives them several chances to act when it is convenient, and makes referrals part of how you finish every job rather than an occasional favour.",
      },
    ],
    table: {
      heading: "What to say at each moment",
      intro:
        "The wording changes with the moment, but the shape stays the same: a thank you or check-in, a plain ask, your link and the reward. Use the lines below as starting points, then copy full versions from the referral text templates guide.",
      caption: "What to say when asking for a referral at each moment",
      head: ["Moment", "What to say"],
      rows: [
        ["Job finished", "If you are happy with it, pass our name on. I will text you the link."],
        ["Payment", "Thanks for your business. Our referral link is on the receipt if anyone asks who did the work."],
        ["After a review", "Thank you for the review. If you know anyone else who needs us, here is the link."],
        ["Seasonal maintenance", "It is that time of year again. If friends are planning work, here is the link."],
        ["Problem fixed", "Glad we got that sorted. If anyone you know needs us, I would be grateful for the referral."],
      ],
    },
    faqs: [
      {
        q: "Is it pushy to ask a customer for a referral?",
        a: "Not if the customer is happy and the ask is short. A plain sentence and a link are easy to ignore if they are not interested, and easy to act on if they are.",
      },
      {
        q: "Should I ask before the job is finished?",
        a: "Usually not. Wait until the customer has seen the result. Asking before the work is done asks them to vouch for something they have not seen yet.",
      },
      {
        q: "What if the customer was not happy?",
        a: "Do not ask for a referral. Fix the problem first. Once it is resolved and the customer says so, asking is fair.",
      },
    ],
  },
  {
    ...DATED,
    group: "money",
    slug: "how-to-get-paid-for-referrals",
    question: "How to get paid for referring people to local businesses",
    label: "How to get paid for referrals",
    metaTitle: "How to Get Paid for Referring Local Businesses | Revvin",
    metaDescription:
      "How referral rewards work for people who refer: who pays, when you get paid, the rules to follow, a note on taxes and how to start with Revvin Earn.",
    answer:
      "You get paid for a referral when you send someone to a local business that offers a referral reward, that person hires the business, and the business pays you the reward it advertised. The business pays you directly, usually once the job closes, and each business sets its own reward and rules.",
    sections: [
      {
        heading: "How do referral rewards work?",
        body: "A business publishes a reward for referrals, you share its referral link or name with someone who needs the service, and when that person hires the business and the job closes, the business pays you. Your personal link records that the referral came from you, so the business knows who to pay.",
      },
      {
        heading: "Who pays the referral reward?",
        body: "The business pays you, not Revvin. On Revvin, each business sets its own reward and pays its referrers directly, by whatever method the two of you agree. Revvin tracks the referral and whether the reward is owed or paid, and notifies you at each step, but it does not hold or send the money.",
      },
      {
        heading: "When do you get paid?",
        body: "You are paid when the referred job closes, meaning the person you sent has hired the business and the work has become paid work, under that business's offer. A referral that does not turn into a job does not earn a reward. Each business's referral page states its own condition.",
      },
      {
        heading: "What are the rules for referring people?",
        body: "Refer only people who actually need the service, and always tell them you may be rewarded. Referring people who did not ask, or hiding the reward, damages trust and can break the rules where you live. A short disclosure line covers it.",
        list: [
          "Only refer people who need the service.",
          "Always disclose that you may get a reward, for example: \"I may get a reward from this business if you hire them.\"",
          "Do not spam strangers or post your link where it is not welcome.",
          "Follow each business's own referral terms.",
        ],
      },
      {
        heading: "Do you pay tax on referral rewards?",
        body: "Referral rewards can be taxable income. In the US, payers report payments to a person of $2,000 or more in a year on Form 1099, for payments made from January 1, 2026. In Canada, referral income may be taxable, so check CRA guidance. This is general information, not tax advice; ask a tax professional about your situation.",
      },
      {
        heading: "How do you start on Revvin Earn?",
        body: "Revvin Earn lists local businesses that pay for referrals, city by city across the US and Canada. Open the Earn page, join the list for your city, and get your own link for any business listed there. Where Earn is not live yet, you can join the waitlist.",
      },
    ],
    sources: [
      {
        label: "Tremendous: One Big Beautiful Bill and the 1099 threshold",
        url: "https://www.tremendous.com/blog/one-big-beautiful-bill-1099-tax-impact/",
      },
      { label: "Canada Revenue Agency", url: "https://www.canada.ca/en/revenue-agency.html" },
      {
        label: "FTC: FTC's Endorsement Guides, what people are asking",
        url: "https://www.ftc.gov/business-guidance/resources/ftcs-endorsement-guides-what-people-are-asking",
      },
    ],
    faqs: [
      {
        q: "Do I need to be a customer to refer someone?",
        a: "It depends on the business. Some referral pages accept referrals from anyone, others only from past customers. Each business's page states its own terms.",
      },
      {
        q: "How will I be paid?",
        a: "The business pays you directly, by a method you agree with them. Revvin does not process referral payouts.",
      },
      {
        q: "Is referral income taxable?",
        a: `It can be. In the US, payers report payments to a person of $2,000 or more in a year on Form 1099 for payments made from January 1, 2026. In Canada, check CRA guidance. ${NOT_ADVICE}`,
      },
    ],
  },
  {
    ...DATED,
    group: "start",
    slug: "referral-marketing-glossary",
    question: "Referral marketing glossary",
    label: "Referral marketing glossary",
    metaTitle: "Referral Marketing Glossary: 20 Terms Defined | Revvin",
    metaDescription:
      "Plain definitions of twenty referral marketing terms for service businesses, from referral link and two-sided reward to attribution and job done ask.",
    answer:
      "This glossary defines the twenty terms that come up most when a service business runs a referral program, from the basics, such as referrer and referral reward, to tracking terms such as attribution. Each definition is one or two sentences, with a link you can share to that term.",
    sections: [],
    terms: [
      { id: "referral-program", term: "Referral program", definition: "A standing offer from a business that rewards people for sending it new customers." },
      { id: "referrer", term: "Referrer", definition: "The person who recommends a business to someone else, usually a past customer, friend or partner." },
      { id: "referral-reward", term: "Referral reward", definition: "What the business gives the referrer when a referral meets the offer's condition, such as cash, a credit or a gift." },
      { id: "fixed-reward", term: "Fixed reward", definition: "A reward set as one dollar amount per qualifying referral, rather than a percentage of the job." },
      { id: "two-sided-reward", term: "Two-sided reward", definition: "An offer that rewards both the referrer and the new customer, for example cash for the referrer and a discount for the friend." },
      { id: "referral-link", term: "Referral link", definition: "A web address that sends someone to a business's referral page or offer." },
      { id: "personal-referral-link", term: "Personal referral link", definition: "A referral link unique to one referrer, so each referral it brings in is credited to that person." },
      { id: "referral-page", term: "Referral page", definition: "A web page that explains a business's referral offer and lets someone submit a referral or contact the business." },
      { id: "closed-job", term: "Closed job", definition: "A referral that has turned into paid work. Many programs owe the reward only at this point." },
      { id: "reward-owed", term: "Reward owed", definition: "A reward the business has agreed to pay because the referral met the offer's condition, but has not paid yet." },
      { id: "reward-paid", term: "Reward paid", definition: "A reward the business has paid to the referrer and recorded as paid." },
      { id: "attribution", term: "Attribution", definition: "Working out which referrer, link or ask a new lead came from, so the right person gets credit." },
      { id: "last-click-attribution", term: "Last-click attribution", definition: "An attribution rule that credits the last link a person used before contacting the business." },
      { id: "ask", term: "Ask", definition: "A message or conversation in which a business asks a customer to refer someone." },
      { id: "job-done-ask", term: "Job done ask", definition: "A referral ask sent when a job is marked finished, often paired with a request for a review." },
      { id: "reactivation-campaign", term: "Reactivation campaign", definition: "An email or message sent to past customers who have not booked in a while, inviting them back." },
      { id: "review-request", term: "Review request", definition: "A message asking a customer to leave a public review, such as on Google." },
      { id: "print-pack", term: "Print pack", definition: "Printable materials that carry a referral link or QR code, such as yard signs, door hangers and invoice inserts." },
      { id: "referral-network", term: "Referral network", definition: "A group of businesses and people who send each other referrals, sometimes through a shared directory." },
      { id: "partner-program", term: "Partner program", definition: "An arrangement that rewards other businesses or professionals for referring customers or signups, often with its own terms." },
    ],
    faqs: [],
  },
];
