export const trialNotice = (endsAt: string | null | undefined, storedPlan: string | null | undefined, now: number) => {
  if (!endsAt || storedPlan === "pro") return null;
  const remaining = new Date(endsAt).getTime() - now;
  if (!Number.isFinite(remaining) || remaining <= 0) return null;
  if (remaining <= 86400000) return "trial_ends_today";
  if (remaining <= 3 * 86400000 && remaining > 2 * 86400000) return "trial_ends_3_days";
  return null;
};
/** Copy context only. Entitlement and lifecycle selection remain separate. */
export const trialEmailData = (endsAt: string | null | undefined, storedPlan: string | null | undefined, now: number) => {
  const ends = endsAt ? new Date(endsAt) : null;
  const onTrial = storedPlan !== "pro" && Boolean(ends && ends.getTime() > now);
  return {
    onTrial,
    ...(onTrial && ends ? { trialEndsOn: ends.toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" }) } : {}),
  };
};
