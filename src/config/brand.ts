// Single source of truth for entity level facts about Revvin as an
// organization, used by the runtime pages and by the build time prerender.
// Structured data on every page points at the same identifiers, so search and
// answer engines read one entity instead of several similar mentions.

export const SITE_URL = "https://revvin.co";

/** Stable JSON-LD node identifiers. Never change these once published. */
export const ORG_ID = `${SITE_URL}/#organization`;
export const SITE_ID = `${SITE_URL}/#website`;
export const APP_ID = `${SITE_URL}/#software`;

/**
 * Company founding date, ISO 8601. Left empty until it is confirmed; it is
 * omitted from structured data while empty rather than guessed.
 */
export const FOUNDING_DATE = "";

/**
 * Profile URLs that prove this is the same organization elsewhere: LinkedIn,
 * X, Crunchbase, GitHub, YouTube. Filled in by the team; every entry is emitted
 * in Organization.sameAs exactly as written.
 */
export const ORG_SAME_AS: string[] = [];

/**
 * Name collision disambiguation. Another product called Revvin operates in
 * digital mortgage software, so every Organization node states plainly which
 * Revvin this is.
 */
/** Team identity shared by public copy and Article authors. */
export const TEAM_HEADING = "Built by people who've run real sales teams.";
export const TEAM_BIO = "Revvin is built by operators who have recruited, trained and managed door-to-door and phone sales teams of 120+ reps, selling 8,000+ accounts a year for national telecom carriers across North America. The cheapest jobs those teams ever closed came from happy customers. Revvin turns that play into software any home-service business can run without a sales team.";
export const TEAM_REF = {
  "@type": "Organization",
  "@id": ORG_ID,
  name: "Revvin",
  url: SITE_URL,
} as const;

/** The one sentence that defines Revvin everywhere. */
export const CANONICAL_SENTENCE =
  "Revvin (revvin.co) is a free referral program and local referral network for home-service businesses.";

export const ORG_DISAMBIGUATION =
  "Revvin (revvin.co) is referral program software for service businesses. It is not affiliated with the Revvin digital mortgage platform.";

/** Dates for the guide library. */
export const GUIDES_PUBLISHED_AT = "2026-09-05";
export const GUIDES_UPDATED_AT = "2026-09-16";
/** Date of the answer-first content build (new guides and trade page sections). */
export const CONTENT_UPDATED_AT = "2026-10-30";

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
/** Empty until an advertising dataset and regional consent route are approved. */
export const META_PIXEL_ID = "";

/**
 * Microsoft Clarity project id. Empty means session recording is off
 * everywhere. When set, ClarityLoader loads it only on marketing pages,
 * /start, /preview and signup/onboarding, after first interaction or 3s idle,
 * with input masking on. Never on the dashboard, /r/ referral forms or /me.
 */
export const CLARITY_PROJECT_ID = "";
