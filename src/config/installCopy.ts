/**
 * Every sentence we say about adding Revvin to a phone home screen lives here,
 * so the dashboard, the referral pages, the emails and the marketing pages all
 * say the same thing. Revvin is not a store app, so this copy never says
 * download, App Store, Google Play or native app.
 */

export const INSTALL_COPY = {
  /** Main label everywhere, on every device. */
  mainLabel: "Add Revvin to your home screen",
  supportingLine: "Free, no app store needed. Opens full screen like an app.",
  /** Only when the browser gives us a real install prompt (Android, Edge, Chrome). */
  androidButton: "Install the Revvin app",
  iosTitle: "Add Revvin to your home screen",
  iosSteps: [
    "1. Tap the Share button",
    "2. Scroll and tap Add to Home Screen",
    "3. Tap Add",
  ],
  iosNote: "Open it from your home screen to turn on lead notifications.",
  inAppBrowser: "Open this page in Safari (or Chrome) to add it to your home screen.",
  desktopStep: "Open revvin.co on your phone to add it to your home screen",
  checklistStep: "Add Revvin to your home screen",
  statusLine: "Save this page to your home screen to check your reward any time",
  /** Emails and the marketing pages. */
  emailTip:
    "Tip: add Revvin to your phone's home screen for one-tap access to your leads. Open revvin.co/dashboard on your phone and follow the steps.",
  leadEmailFooter:
    "Get new leads as phone notifications: add Revvin to your home screen and turn on notifications.",
  planFeature: {
    label: "Works on your phone",
    description: "Add Revvin to your home screen, no app store needed.",
  },
  faq: {
    question: "Is there a Revvin app?",
    answer:
      "Yes. Revvin is a web app you can add to your phone's home screen from revvin.co. It opens full screen, and you can turn on notifications for new referrals. There is nothing to download from an app store.",
  },
} as const;

/** For referrers on a business referral page. */
export const referrerInstallLine = (business: string) =>
  `Save this page to your home screen so you can refer ${business} again in one tap.`;

/** Where an install prompt is shown. Kept fixed so analytics can never carry an identifier. */
export const INSTALL_SURFACES = [
  "welcome_card",
  "checklist",
  "notifications_card",
  "referral_success",
  "referral_status",
  "banner",
] as const;

export type InstallSurface = (typeof INSTALL_SURFACES)[number];
