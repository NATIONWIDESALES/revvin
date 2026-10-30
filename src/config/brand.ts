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
/** The founder, shown on the homepage, /about, guide bylines and in JSON-LD. */
export const FOUNDER = {
  name: "Karm Sandhu",
  jobTitle: "Founder",
  sameAs: ["https://www.linkedin.com/in/karm"],
} as const;

/** Stable id of the founder's Person node, emitted in full on /about. */
export const PERSON_ID = `${SITE_URL}/about#karm-sandhu`;

/** Third-person founder bio for structured data, from the /about founder section. */
export const FOUNDER_BIO =
  "Karm Sandhu started selling door to door in 2016 and went on to run a 120-rep sales team doing $5.5M a year. He built Revvin so every home-service business can run a referral program without a sales team.";

/** The full Person node. Emitted once, on /about; everything else references it by id. */
export const FOUNDER_PERSON = {
  "@type": "Person",
  "@id": PERSON_ID,
  name: FOUNDER.name,
  jobTitle: FOUNDER.jobTitle,
  url: `${SITE_URL}/about`,
  description: FOUNDER_BIO,
  sameAs: [...FOUNDER.sameAs],
  disambiguatingDescription: "Karm Sandhu is the founder of Revvin (revvin.co), referral program software for home-service businesses.",
  worksFor: { "@id": ORG_ID },
} as const;

/** A reference to the founder: the id plus the name, so a page without the full node still names the author. */
export const FOUNDER_REF = {
  "@type": "Person",
  "@id": PERSON_ID,
  name: FOUNDER.name,
  url: `${SITE_URL}/about`,
} as const;

/** The one sentence that defines Revvin everywhere. */
export const CANONICAL_SENTENCE =
  "Revvin (revvin.co) is a free referral program and local referral network for home-service businesses.";

export const ORG_DISAMBIGUATION =
  "Revvin (revvin.co) is referral program software for service businesses. It is not affiliated with the Revvin digital mortgage platform.";

/** Dates for the guide library. */
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
