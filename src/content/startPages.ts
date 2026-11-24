import { TRIAL_LINE } from "../config/planFeatures";
import { PRICE_TEXT } from "../config/pricing";
import { INDUSTRIES } from "./industries";
export const START_FAQS = [
  { q: "What does it cost?", a: `Your referral page is free. ${TRIAL_LINE} After the trial, Pro is ${PRICE_TEXT.monthly}/month or ${PRICE_TEXT.annual}/year if you choose to upgrade.` },
  { q: "Who pays the reward?", a: "Your business pays the referrer directly when the referred job closes. Revvin tracks rewards but never moves money." },
  { q: "How are customers asked?", a: "Revvin emails every customer their own referral link from your business name in one launch campaign, with two follow-ups. You can also ask any customer one at a time from your own phone or email app. Pro adds unlimited launch campaigns, win-back email campaigns and an automatic ask after every job." },
  { q: "How long does setup take?", a: "Enter your business name, trade and reward, create your account, then confirm and publish. You can also book a free 30-minute setup call." },
];
export const startHeadline = (slug?: string) => `Get more ${INDUSTRIES.find(i => i.slug === slug)?.trade ?? "home-service"} jobs from the customers you already have.`;
export const START_PATHS = ["/start", ...INDUSTRIES.map(i => `/start/${i.slug}`)];