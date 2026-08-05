// Single source of truth for the launch promotion. Every surface (popup,
// pricing page, go-live banners) reads from here so the price and the deadline
// can never drift apart.
//
// The deadline is real and fixed. It is NOT per-visitor, it never resets, and
// it is never extended in code. Once it passes, every surface stops rendering.
//
// NOTE: the client-side check is presentation only. The authoritative check
// lives server-side in supabase/functions/_shared/promo.ts, which is what
// actually decides whether the Stripe coupon gets applied.

import { MONTHLY_PRICE } from "@/config/pricing";

export const PROMO_PRICE = 17;
export const PROMO_REGULAR_PRICE = MONTHLY_PRICE; // 49
export const PROMO_SAVING = PROMO_REGULAR_PRICE - PROMO_PRICE; // 32
export const PROMO_DISCOUNT_PCT = Math.round((PROMO_SAVING / PROMO_REGULAR_PRICE) * 100); // 65

// 2026-08-17 23:59 America/Vancouver. Vancouver is UTC-7 (PDT) in August,
// so that is 2026-08-18T06:59:00Z.
export const PROMO_END_ISO = "2026-08-18T06:59:00.000Z";
export const PROMO_END = new Date(PROMO_END_ISO);
export const PROMO_END_DATE_TEXT = "August 17, 2026";

export const PROMO_TEXT = {
  price: `$${PROMO_PRICE}`,
  pricePerMonth: `$${PROMO_PRICE}/month`,
  regular: `$${PROMO_REGULAR_PRICE}`,
  regularPerMonth: `$${PROMO_REGULAR_PRICE}/month`,
  saving: `$${PROMO_SAVING}`,
  savingPerMonth: `$${PROMO_SAVING}/month`,
  discount: `${PROMO_DISCOUNT_PCT}%`,
} as const;

export function isPromoLive(now: Date = new Date()): boolean {
  return now.getTime() < PROMO_END.getTime();
}

export type PromoTimeLeft = {
  expired: boolean;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

export function promoTimeLeft(now: Date = new Date()): PromoTimeLeft {
  const ms = PROMO_END.getTime() - now.getTime();
  if (ms <= 0) return { expired: true, days: 0, hours: 0, minutes: 0, seconds: 0 };
  const totalSeconds = Math.floor(ms / 1000);
  return {
    expired: false,
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

// Plain-language terms. Monthly plan only, locked for as long as they stay
// subscribed, regular price stays what it is.
export const PROMO_TERMS = `Sign up before ${PROMO_END_DATE_TEXT} and your price stays ${PROMO_TEXT.pricePerMonth} USD for as long as you stay subscribed. Regular price is ${PROMO_TEXT.regularPerMonth} USD. Monthly plan only, the annual plan is not part of this promotion. Cancel anytime.`;
