/**
 * The /sample page metadata, shared by the page itself and by the prerendered
 * document, so the canonical, title, description and heading can never
 * disagree between the static HTML and what React renders.
 */
import { PRICE_TEXT } from "../config/pricing";

export const SAMPLE_META = {
  path: "/sample",
  title: "Try the referral loop demo | Revvin",
  description: "Walk a referral through end to end: an example referral page, the owner's lead inbox, closing the job and the reward. Nothing is saved. Your page is free.",
  h1: "Try the referral loop yourself",
} as const;
