/**
 * The public Verified badge on /r/{slug}. Only a super admin can set
 * businesses.is_verified (database trigger), never the owner, and it defaults
 * to false. Nothing else, including the owner being an admin, shows it.
 */
export const showVerifiedBadge = (biz: { is_verified?: boolean | null } | null | undefined): boolean =>
  biz?.is_verified === true;
