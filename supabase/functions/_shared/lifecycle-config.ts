/**
 * Lifecycle email configuration.
 *
 * SETUP_CALL_URL is the real booking link for the free setup call. While it
 * is empty the no_leads_d7 email is skipped entirely, so we never send an
 * offer with a dead link.
 */
export const SETUP_CALL_URL = "https://cal.com/revvin/30min";

/**
 * Lifecycle nudges (not_published_d1, no_share_d3, no_leads_d7) only apply to
 * businesses created on or after this date, so internal and test accounts
 * created earlier are never emailed.
 */
export const LIFECYCLE_COHORT_START = "2026-09-14T00:00:00.000Z";

export const LIFECYCLE_FROM = "Karm at Revvin <info@revvin.co>";
export const LIFECYCLE_REPLY_TO = "info@revvin.co";

/**
 * Revvin's own postal address, shown in the footer of every promotional
 * lifecycle email.
 *
 * CAN-SPAM and CASL both require a valid physical mailing address on
 * commercial email. Until this string is filled in, every template marked
 * category "promo" is skipped entirely, the same way no_leads_d7 was skipped
 * while SETUP_CALL_URL was empty. Setup emails (help using the account the
 * person created) are unaffected.
 */
export const REVVIN_POSTAL_ADDRESS = "";

/**
 * The founder story email (free_d14) ships with placeholder copy that Karm
 * will replace. It stays disabled until this is true.
 */
export const FOUNDER_STORY_APPROVED = false;
