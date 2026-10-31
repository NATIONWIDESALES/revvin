import { INDUSTRIES } from "./industries";
export const START_FAQS = [
  { q: "What does it cost?", a: "Your referral page is free. Every new account gets Pro free for 14 days. No card. After the trial, Pro is $49/month or $450/year if you choose to upgrade." },
  { q: "Who pays the reward?", a: "Your business pays the referrer directly when the referred job closes. Revvin tracks rewards but never moves money." },
  { q: "How are customers asked?", a: "Personal asks open in your own phone or email app. The job-done ask includes a Google review request. Pro also includes reactivation email campaigns." },
  { q: "How long does setup take?", a: "Enter your business name, trade and reward, create your account, then confirm and publish. You can also book a free 30-minute setup call." },
];
export const startHeadline = (slug?: string) => `Get more ${INDUSTRIES.find(i => i.slug === slug)?.trade ?? "home-service"} jobs from the customers you already have.`;
export const START_PATHS = ["/start", ...INDUSTRIES.map(i => `/start/${i.slug}`)];