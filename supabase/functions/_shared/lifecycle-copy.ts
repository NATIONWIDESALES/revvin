// Pure copy helpers for lifecycle email. No Deno globals and no remote imports
// live here on purpose: the app's vitest suite imports this file so the wording
// stays identical to the dashboard card.

/**
 * Same wording as firstAskMessage in src/components/dashboard/WelcomeLiveCard.tsx.
 * The reward sentence is dropped when no reward has been set, so we never
 * promise a payment the business has not stated.
 */
export function firstAskMessage(
  businessName: string,
  publicUrl: string,
  offerAmount: string | null,
): string {
  const base = `Hi, it's ${businessName}. Thanks again for having us out. If anyone you know needs the same work, this link comes straight to me: ${publicUrl}.`;
  const reward = offerAmount?.trim();
  return reward ? `${base} I pay ${reward} if it turns into a job.` : base;
}

/** Coaching block appended to the very first new-lead email only. */
export const FIRST_LEAD_TIPS: string[] = [
  "Call within the hour. Speed is the whole advantage of a referral.",
  "Say the referrer's name in your first sentence, so they know this is not a cold call.",
  "Thank the referrer the same day, even if the job has not been booked yet.",
];

export const FIRST_LEAD_TIPS_TITLE = "How to close a referral fast";
