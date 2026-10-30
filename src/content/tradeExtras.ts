// Answer-first sections added to every /referral-program/{trade} page:
// how much to pay for a referral, three ready-to-copy texts, and three FAQs.
// No typical prices or results; the worksheet starts from labelled example
// numbers the reader replaces.

import { generateMessages, TRADE_OPTIONS, type MessageTiming } from "@/lib/toolkit/messages";

export interface TradeFaq {
  q: string;
  a: string;
}

/** Round example figures for the embedded worksheet. The same on every trade. */
export const TRADE_WORKSHEET_EXAMPLE = { revenue: "1000", margin: "40", reward: "100" } as const;
export const TRADE_WORKSHEET_NOTE = "Example: change these to your numbers";

export const rewardHeading = (trade: string) => `How much should a ${trade} business pay for a referral?`;
export const rewardAnswer = (trade: string) =>
  `Set one fixed dollar reward you would happily pay for a closed ${trade} job. Size it as a small slice of the gross profit on that job, and pay it only when the referred job closes. That keeps the reward easy to repeat, affordable every time, and tied to real work rather than to names.`;
export const REWARD_FORMULA = "Reward = a share of gross profit you would spend to win the job anyway";

export const scriptsHeading = (trade: string) => `What to text a ${trade} customer after the job`;
export const scriptsAnswer = (trade: string) =>
  `Send a short text the same day you finish, a check-in one week later, and a seasonal check-in before the next busy period. Each one thanks the customer, asks if anyone they know needs ${trade} work, and gives one link to pass on. Copy the three texts below and fill in the brackets.`;
export const SCRIPTS_NOTE = "These texts go from your own phone. Revvin never sends texts to your customers.";

const MOMENTS: { timing: MessageTiming; label: string }[] = [
  { timing: "just_completed", label: "Right after the job" },
  { timing: "checking_in", label: "One week later" },
  { timing: "seasonal", label: "Seasonal check-in" },
];

/** Three texts from the Message Generator, with placeholders the owner fills in. */
export const tradeScripts = (slug: string) => {
  const trade = TRADE_OPTIONS.some((t) => t.value === slug) ? slug : "other";
  return MOMENTS.map((m) => ({
    label: m.label,
    text: generateMessages({
      trade,
      customerFirstName: "[first name]",
      ownerName: "[your name]",
      businessName: "[your business]",
      rewardDisplay: "[your reward]",
      referralPageLink: "[your link]",
      timing: m.timing,
      tone: "warm",
    }).sms,
  }));
};

export const tradeFaqs = (trade: string): TradeFaq[] => [
  {
    q: `When should a ${trade} company ask for referrals?`,
    a: `Ask when the customer can see the finished ${trade} work and is happy with it, usually at the end of the job or when they pay. Ask again a week later and at the next seasonal check-in. Asking at each of those moments gives customers more than one chance to pass your name on.`,
  },
  {
    q: "Should the reward be cash or a discount?",
    a: "Either can work. Cash is simple to say out loud and useful to anyone, including people who will not hire you again. A discount or credit only rewards someone who books you again, which suits recurring services. Whatever you pick, state one clear amount and when you pay it. This is general information, not tax advice.",
  },
  {
    q: "What if the referred job does not close?",
    a: "Then no reward is owed, as long as your offer says you pay on closed jobs. Say that plainly on your referral page, and thank the referrer anyway. On Revvin a reward becomes owed only when you mark the referral closed, so nothing is tracked as owed for a lead that never became paid work.",
  },
];
