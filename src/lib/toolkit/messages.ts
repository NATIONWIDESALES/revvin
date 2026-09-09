/**
 * Referral Message Generator — deterministic text composition.
 *
 * Pure string building: the same inputs always produce the same three messages.
 * No AI call, no network, no storage. Revvin does not send any of this. The
 * owner copies the text into their own phone or email app, which is also why
 * the reward field is treated as presentation text and never parsed as money.
 */

export type MessageTiming = "just_completed" | "checking_in" | "dormant";
export type MessageTone = "direct" | "warm";

export interface TradeOption {
  value: string;
  label: string;
  /** How the trade reads inside a sentence, for example "roofing work". */
  phrase: string;
}

export const TRADE_OPTIONS: readonly TradeOption[] = [
  { value: "roofing", label: "Roofing", phrase: "roofing work" },
  { value: "hvac", label: "HVAC", phrase: "heating or cooling work" },
  { value: "plumbing", label: "Plumbing", phrase: "plumbing work" },
  { value: "electrical", label: "Electrical", phrase: "electrical work" },
  { value: "solar", label: "Solar", phrase: "solar work" },
  { value: "landscaping", label: "Landscaping", phrase: "landscaping work" },
  { value: "painting", label: "Painting", phrase: "painting work" },
  { value: "auto-detailing", label: "Auto detailing", phrase: "detailing work" },
  { value: "pest-control", label: "Pest control", phrase: "pest control work" },
  { value: "pool-service", label: "Pool service", phrase: "pool work" },
  { value: "house-cleaning", label: "House cleaning", phrase: "cleaning work" },
  { value: "remodeling", label: "Remodeling", phrase: "remodeling work" },
  { value: "handyman", label: "Handyman", phrase: "work around the house" },
  { value: "other", label: "Other service business", phrase: "the kind of work we do" },
];

export const TIMING_OPTIONS: readonly { value: MessageTiming; label: string }[] = [
  { value: "just_completed", label: "The job just finished" },
  { value: "checking_in", label: "Checking in a while later" },
  { value: "dormant", label: "A customer you have not spoken to in a long time" },
];

export const TONE_OPTIONS: readonly { value: MessageTone; label: string }[] = [
  { value: "direct", label: "Direct" },
  { value: "warm", label: "Warm" },
];

export interface MessageInputs {
  trade: string;
  customerFirstName?: string;
  businessName?: string;
  ownerName?: string;
  jobDescription?: string;
  /** Display text only, for example "$100" or "a $100 gift card". Never parsed. */
  rewardDisplay?: string;
  referralPageLink?: string;
  timing: MessageTiming;
  tone: MessageTone;
}

export interface GeneratedMessages {
  sms: string;
  emailSubject: string;
  emailBody: string;
  inPerson: string;
}

const MAX_FIELD = 80;
const MAX_LINK = 300;

/**
 * Collapse whitespace, drop control characters, cap the length, and strip a
 * trailing comma or period so the composed sentence never ends up with ".." or
 * ", ." when a field already carried punctuation.
 */
const clean = (raw: string | undefined, max = MAX_FIELD): string => {
  if (typeof raw !== "string") return "";
  const collapsed = raw
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
  return collapsed.replace(/[\s,.;:]+$/, "").trim();
};

const sentences = (...parts: (string | false | undefined)[]) =>
  parts.filter((p): p is string => typeof p === "string" && p.length > 0).join(" ");

const tradePhrase = (value: string): string =>
  TRADE_OPTIONS.find((t) => t.value === value)?.phrase ?? TRADE_OPTIONS[TRADE_OPTIONS.length - 1].phrase;

export function generateMessages(input: MessageInputs): GeneratedMessages {
  const first = clean(input.customerFirstName);
  const business = clean(input.businessName);
  const owner = clean(input.ownerName);
  const job = clean(input.jobDescription);
  const reward = clean(input.rewardDisplay, 60);
  const link = clean(input.referralPageLink, MAX_LINK);
  const phrase = tradePhrase(input.trade);
  const warm = input.tone === "warm";

  const greeting = first ? `Hi ${first},` : "Hi,";

  const identity =
    owner && business
      ? `${owner} here from ${business}.`
      : owner
        ? `${owner} here.`
        : business
          ? `${business} here.`
          : "";

  const context =
    input.timing === "just_completed"
      ? sentences(
          job ? `Thanks for having us out for ${job}.` : "Thanks for having us out.",
          warm && "It was good to work with you.",
        )
      : input.timing === "checking_in"
        ? job
          ? `We finished ${job} for you a while back, and I wanted to check it is all still holding up.`
          : "We finished a job for you a while back, and I wanted to check it is all still holding up."
        : job
          ? `You had us out for ${job} a while back, and I do not think we have spoken since.`
          : "It has been a while since we worked together, and I do not want to lose touch.";

  const ask = warm
    ? `If anyone you know needs ${phrase}, I would look after them the same way.`
    : `If anyone you know needs ${phrase}, send them my way.`;

  const rewardLine = reward ? `There is ${reward} in it for you if it turns into a booked job.` : "";

  const linkLine = link ? `Here is the link to pass on: ${link}` : "";

  const sms = sentences(greeting, identity, context, ask, rewardLine, linkLine);

  const emailSubject =
    input.timing === "just_completed"
      ? first
        ? `Thanks again, ${first}`
        : "Thanks again for the work"
      : input.timing === "checking_in"
        ? first
          ? `Quick check-in, ${first}`
          : "Quick check-in on your job"
        : business
          ? `Still here if you need ${business}`
          : "Still here if you need us";

  const emailClose = warm
    ? "No rush at all, and thank you either way."
    : "Either way, thanks for your time.";

  const signOff = owner ? `Thanks,\n${owner}${business ? `\n${business}` : ""}` : "Thanks";

  const emailBody = [
    greeting,
    sentences(identity, context),
    sentences(ask, rewardLine),
    linkLine,
    emailClose,
    signOff,
  ]
    .filter((block) => block.length > 0)
    .join("\n\n");

  const inPersonOpen =
    input.timing === "just_completed"
      ? job
        ? `Before I head off, how do you feel about how ${job} turned out?`
        : "Before I head off, how do you feel about how it turned out?"
      : input.timing === "checking_in"
        ? "While I have you, is the work still holding up the way you expected?"
        : "It has been a while, so I wanted to check in rather than only turn up when there is a job.";

  const inPersonAsk = warm
    ? `If it did, and someone you know ever needs ${phrase}, I would be glad if you passed my name on.`
    : `If it did, pass my name on to anyone you know who needs ${phrase}.`;

  const inPerson = sentences(
    inPersonOpen,
    inPersonAsk,
    rewardLine,
    link ? "I will text you the link so you have it." : "I will text you my details so you have them.",
  );

  return { sms, emailSubject, emailBody, inPerson };
}
