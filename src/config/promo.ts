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

import { MONTHLY_PRICE, ANNUAL_PRICE, MONTHS_PER_YEAR, type BillingPlan } from "@/config/pricing";

export const PROMO_PRICE = 17;
export const PROMO_REGULAR_PRICE = MONTHLY_PRICE; // 49
export const PROMO_SAVING = PROMO_REGULAR_PRICE - PROMO_PRICE; // 32
export const PROMO_DISCOUNT_PCT = Math.round((PROMO_SAVING / PROMO_REGULAR_PRICE) * 100); // 65

// Annual promo price is exactly twelve months at the promo monthly rate, so the
// two plans cost the same over twelve months while the promo is live. Annual is
// therefore framed as "pay once and lock it", never as the cheaper option.
export const PROMO_ANNUAL_PRICE = PROMO_PRICE * MONTHS_PER_YEAR; // 204
export const PROMO_ANNUAL_REGULAR_PRICE = ANNUAL_PRICE; // 450
export const PROMO_ANNUAL_SAVING = PROMO_ANNUAL_REGULAR_PRICE - PROMO_ANNUAL_PRICE; // 246
export const PROMO_ANNUAL_DISCOUNT_PCT = Math.round(
  (PROMO_ANNUAL_SAVING / PROMO_ANNUAL_REGULAR_PRICE) * 100,
); // 55

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
  annualPrice: `$${PROMO_ANNUAL_PRICE}`,
  annualPerYear: `$${PROMO_ANNUAL_PRICE}/year`,
  annualRegular: `$${PROMO_ANNUAL_REGULAR_PRICE}`,
  annualRegularPerYear: `$${PROMO_ANNUAL_REGULAR_PRICE}/year`,
  annualSaving: `$${PROMO_ANNUAL_SAVING}`,
  annualSavingPerYear: `$${PROMO_ANNUAL_SAVING}/year`,
  annualDiscount: `${PROMO_ANNUAL_DISCOUNT_PCT}%`,
} as const;

// Per-plan figures, so surfaces never have to branch on plan themselves.
export const promoFiguresFor = (plan: BillingPlan) =>
  plan === "annual"
    ? {
        price: PROMO_TEXT.annualPrice,
        priceWithPeriod: PROMO_TEXT.annualPerYear,
        period: "/year USD",
        regularWithPeriod: PROMO_TEXT.annualRegularPerYear,
        saving: PROMO_TEXT.annualSavingPerYear,
        discount: PROMO_TEXT.annualDiscount,
      }
    : {
        price: PROMO_TEXT.price,
        priceWithPeriod: PROMO_TEXT.pricePerMonth,
        period: "/month USD",
        regularWithPeriod: PROMO_TEXT.regularPerMonth,
        saving: PROMO_TEXT.savingPerMonth,
        discount: PROMO_TEXT.discount,
      };

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

// Plain-language terms. Both plans are included, and the promo price holds on
// renewals for as long as the subscription stays active.
export const PROMO_TERMS = `Publish before ${PROMO_END_DATE_TEXT} and your price stays ${PROMO_TEXT.pricePerMonth} USD monthly, or ${PROMO_TEXT.annualPerYear} USD annually, for as long as you stay subscribed, renewals included. Regular prices are ${PROMO_TEXT.regularPerMonth} and ${PROMO_TEXT.annualRegularPerYear} USD. Cancel anytime.`;

export const PROMO_TERMS_MONTHLY = `Publish before ${PROMO_END_DATE_TEXT} and your price stays ${PROMO_TEXT.pricePerMonth} USD for as long as you stay subscribed, renewals included. Regular price is ${PROMO_TEXT.regularPerMonth} USD. Cancel anytime.`;

// Annual framing: paid once, locks the price in. Deliberately no comparison
// against the promo monthly rate, because over twelve months they are equal.
export const PROMO_TERMS_ANNUAL = `Publish before ${PROMO_END_DATE_TEXT} and pay ${PROMO_TEXT.annualPerYear} USD once, ${PROMO_TEXT.annualDiscount} off the regular ${PROMO_TEXT.annualRegularPerYear}. That price is locked for as long as you stay subscribed, renewals included. Billed once up front, no partial refunds.`;

export const promoTermsFor = (plan: BillingPlan) =>
  plan === "annual" ? PROMO_TERMS_ANNUAL : PROMO_TERMS_MONTHLY;
