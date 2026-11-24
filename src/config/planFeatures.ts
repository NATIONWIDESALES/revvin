export interface PlanFeature {
  label: string;
  description: string;
}

export const FREE_FEATURES = [
  {
    label: "Referral page on your own link",
    description: "Build and publish your referral page for free.",
  },
  {
    label: "A personal link for every customer",
    description: "Every customer gets their own link, so each referral is credited to them automatically.",
  },
  {
    label: "QR code and print-ready kit",
    description: "PDF downloads of your yard sign, door hanger, invoice insert, business card and truck magnet, or email the kit to a print shop.",
  },
  {
    label: "Lead inbox and referral alerts",
    description: "Every referral lands in your inbox with an email alert, ready to call or text back.",
  },
  {
    label: "Reward tracking",
    description: "Track each reward from owed to paid. You pay the reward yourself, with the referrer notified at both moments.",
  },
  {
    label: "Bring up to 500 customers",
    description: "Upload a file, paste a list, or send us your list and we load it.",
  },
  {
    label: "One launch campaign",
    description: "Revvin emails every customer their own referral link from your business name, with two follow-ups.",
  },
  {
    label: "Ask one at a time, any time",
    description: "Ask any customer from your own phone or email app whenever you like.",
  },
] as const satisfies readonly PlanFeature[];

export const PRO_FEATURES = [
  {
    label: "Unlimited customers",
    description: "Bring your whole customer list into Revvin, with no cap.",
  },
  {
    label: "Unlimited launch campaigns",
    description: "Send a launch campaign to your whole list as often as you like.",
  },
  {
    label: "Automatic ask after each job",
    description: "A review and referral ask after every job, from Job done or through job software, API or Zapier.",
  },
  {
    label: "Win-back email campaigns",
    description: "Email the customer segment you choose to win back repeat work.",
  },
  {
    label: "ROI reporting and monthly recap",
    description: "Track leads, closed deals and attributed revenue, with a monthly email recap.",
  },
  {
    label: "Custom page branding",
    description: "Add your color, cover image, headline, welcome message and testimonials.",
  },
] as const satisfies readonly PlanFeature[];

/** The one trial statement. The trial starts at the first launch campaign, never at signup. */
export const TRIAL_DAYS = 14;
export const TRIAL_LINE = "Pro is free for 14 days, starting when you send your first campaign. No card.";
/** Shown next to the first launch send button for accounts that can still start the trial. */
export const TRIAL_SEND_NOTE = "Sending starts 14 days of Pro, free. No card.";
export const PRO_UPSELL_KEEP_ASKING = "Pro keeps asking: unlimited campaigns to your whole list, and an automatic ask after every job.";

/**
 * Shared Free and Pro split for marketing and account screens.
 * Used on the homepage, pricing page and invite landing so they never differ.
 */
/** The one label for every "start on Free" button across public pages. */
export const FREE_CTA_LABEL = "Start free";

/** Free plan cap on stored customers. The database enforces the same number. */
export const FREE_CONTACT_LIMIT = 500;

export const FREE_LIMIT_COPY = {
  /** Shown when the server refuses with free_contact_limit. */
  error: "Free includes 500 customers. Upgrade to Pro for your whole list.",
  reachedTitle: "You've added 500 customers. Pro asks your whole list.",
  firstLeadTitle: "Your first referral is in. Pro asks the rest of your list.",
} as const;

export const isFreeContactLimitError = (e: { message?: string } | null | undefined) =>
  !!e?.message && /free_contact_limit/.test(e.message);

export const PLAN_SPLIT = {
  line: "Free covers your first 500 customers. Pro covers your whole list.",
  subline: "Your referral page, your kit and your first launch campaign are free. Pro adds unlimited customers, unlimited campaigns and the automatic asks.",
  freeSubtitle: "Your first 500 customers",
  proSubtitle: "Your whole list, automatically",
  freeDetail:
    "Referral page on your own link, a personal link for every customer, QR code and print-ready kit with PDF downloads and email my kit to a print shop, lead inbox and referral alerts, reward tracking, up to 500 customers, one launch campaign in which Revvin emails every customer their own referral link from your business name with two follow-ups, and one-at-a-time asks from your own phone or email any time.",
  proDetail: "Unlimited customers, unlimited launch campaigns to your whole list, an automatic review and referral ask after every job through Job done, job software, API or Zapier, win-back email campaigns, ROI reporting and monthly recap, and custom page branding.",
  proLead: "Revvin keeps asking for you: unlimited campaigns to your whole list, from your business name, and an automatic ask after every job.",
} as const;
