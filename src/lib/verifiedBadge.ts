/**
 * The public Verified badge on /r/{slug}. The legacy is_verified column now
 * mirrors ownership_status = verified. Owners cannot set either value directly;
 * domain, document and admin confirmation are the only new verification paths.
 */
export const showVerifiedBadge = (biz: { is_verified?: boolean | null } | null | undefined): boolean =>
  biz?.is_verified === true;
