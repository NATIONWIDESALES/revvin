/**
 * The /sample page metadata, shared by the page itself and by the prerendered
 * document, so the canonical, title, description and heading can never
 * disagree between the static HTML and what React renders.
 */
import { PRICE_TEXT } from "../config/pricing";

export const SAMPLE_META = {
  path: "/sample",
  title: "Revvin | Try the referral loop (demo)",
  description: `Walk a Revvin referral through end to end: an example referral page, the owner's lead inbox, closing the job and recording the reward. Nothing is saved. Publishing your own page is free. Revvin Pro is ${PRICE_TEXT.monthlyPerMonth} USD.`,
  h1: "Try the referral loop yourself",
} as const;
