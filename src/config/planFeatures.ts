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
    label: "A personal link for every referrer",
    description: "Every customer and referrer gets their own link, so each referral is credited to them automatically.",
  },
  {
    label: "QR code and print pack",
    description: "Create yard signs, door hangers, invoice inserts, business cards and truck magnets.",
  },
  {
    label: "Lead inbox",
    description: "Track referrals and call or text a lead back in one tap.",
  },
  {
    label: "Referral email alerts",
    description: "Get an email alert each time a referral arrives.",
  },
  {
    label: "Reward tracking",
    description: "Track each fixed reward from owed to paid, with the referrer notified at both moments.",
  },
  {
    label: "Automatic ask after each job",
    description:
      "Tap Job done, or connect your job software, and Revvin asks for a Google review and a referral.",
  },
  {
    label: "API and Zapier connection",
    description: "Let your job software tell Revvin when a job is finished.",
  },
  {
    label: "Import and ask up to 100 customers",
    description: "Add up to 100 past customers and send each ask from your own phone or email app.",
  },
  {
    label: "Works on your phone",
    description: "Add Revvin to your home screen, no app store needed.",
  },
  {
    label: "Optional marketplace listing",
    description: "Choose whether your published offer appears in the marketplace.",
  },
] as const satisfies readonly PlanFeature[];

export const PRO_FEATURES = [
  {
    label: "Unlimited customers, imported and asked",
    description: "Bring your whole customer list into Revvin, with no cap.",
  },
  {
    label: "Send your ask to the whole list",
    description: "Work through customers in batches, with each ask opening in your own phone or email app.",
  },
  {
    label: "Reactivation email campaigns",
    description: "Send a reactivation campaign by email to the customer segment you choose.",
  },
  {
    label: "ROI reporting and monthly recap",
    description: "Track leads, closed deals and attributed revenue, with a monthly email recap.",
  },
  {
    label: "Custom page branding",
    description: "Add your colour, cover image, headline, welcome message and testimonials.",
  },
] as const satisfies readonly PlanFeature[];
/**
 * The one-line answer to "what do I get for $49": Free works forward on every
 * job from here on; Pro works backward through every customer already served.
 * Used on the homepage, pricing page and invite landing so they never differ.
 */
/** The one label for every "start on Free" button across public pages. */
export const FREE_CTA_LABEL = "Start free";

/** Free plan cap on stored customers. The database enforces the same number. */
export const FREE_CONTACT_LIMIT = 100;

export const FREE_LIMIT_COPY = {
  /** Shown when the server refuses with free_contact_limit. */
  error: "Free includes 100 customers. Upgrade to Pro for your whole list.",
  reachedTitle: "You've added 100 customers. Pro asks your whole list.",
  firstLeadTitle: "Your first referral is in. Pro asks the rest of your list.",
} as const;

export const isFreeContactLimitError = (e: { message?: string } | null | undefined) =>
  !!e?.message && /free_contact_limit/.test(e.message);

export const PLAN_SPLIT = {
  line: "Free asks your first 100 customers. Pro asks all of them, automatically.",
  freeSubtitle: "Every job from here on",
  proSubtitle: "Every customer you've ever had",
  freeDetail:
    "Referral page, QR codes, lead inbox, the review and referral ask that fires when you mark a job done, and up to 100 imported customers to ask.",
  proDetail: "Import your whole list with no cap and Revvin emails them from your business name to win back repeat work, with replies going to your own inbox. Plus ROI reporting and custom branding.",
  proLead: "Revvin emails your whole past-customer list for you, from your business name, to win back repeat work.",
} as const;
