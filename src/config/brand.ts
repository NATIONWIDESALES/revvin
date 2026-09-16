// Single source of truth for entity level facts about Revvin as an
// organization, used by the runtime pages and by the build time prerender.
// Structured data on every page points at the same identifiers, so search and
// answer engines read one entity instead of several similar mentions.

export const SITE_URL = "https://revvin.co";

/** Stable JSON-LD node identifiers. Never change these once published. */
export const ORG_ID = `${SITE_URL}/#organization`;
export const SITE_ID = `${SITE_URL}/#website`;
export const APP_ID = `${SITE_URL}/#software`;

export const FOUNDER = {
  name: "Karm Sandhu",
  jobTitle: "Founder",
} as const;

/**
 * Company founding date, ISO 8601. Left empty until it is confirmed; it is
 * omitted from structured data while empty rather than guessed.
 */
export const FOUNDING_DATE = "";

/**
 * Profile URLs that prove this is the same organization elsewhere: LinkedIn,
 * X, Crunchbase, GitHub, YouTube. Karm fills these in; every entry is emitted
 * in Organization.sameAs exactly as written.
 */
export const ORG_SAME_AS: string[] = [];

/**
 * Name collision disambiguation. Another product called Revvin operates in
 * digital mortgage software, so every Organization node states plainly which
 * Revvin this is.
 */
export const ORG_DISAMBIGUATION =
  "Revvin (revvin.co) is referral program software for service businesses. It is not affiliated with the Revvin digital mortgage platform.";

/** Byline and dates for the guide library. */
export const CONTENT_AUTHOR = FOUNDER;
export const GUIDES_PUBLISHED_AT = "2026-09-05";
export const GUIDES_UPDATED_AT = "2026-09-16";

export const formatContentDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });

/**
 * IndexNow key. The build writes /{key}.txt containing this exact value, which
 * is how Bing, Yandex and Seznam verify a submission. Changing it means the key
 * file changes too, so treat it as permanent.
 */
export const INDEXNOW_KEY = "b7f4a1c93e5d42f8ab6c05719d3e8a42";
