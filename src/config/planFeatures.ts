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
    label: "Job done automatic ask",
    description: "Every finished job can ask for a Google review and a referral in one go.",
  },
  {
    label: "API and Zapier connection",
    description: "Let your job software tell Revvin when a job is finished.",
  },
  {
    label: "Optional marketplace listing",
    description: "Choose whether your published offer appears in the marketplace.",
  },
] as const satisfies readonly PlanFeature[];

export const PRO_FEATURES = [
  {
    label: "Import your past-customer list",
    description: "Bring your existing customer list into Revvin.",
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