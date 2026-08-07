// Slug rules for public referral pages (revvin.co/r/<slug>).
// Mirrored server-side by public.fn_validate_slug / trigger on businesses.
// Keep the two in sync when editing these lists.

export type SlugRejection = "format" | "numeric" | "reserved" | "profanity" | "taken";

export interface SlugCheck {
  ok: boolean;
  reason?: SlugRejection;
}

// Every top-level route plus common infrastructure names.
export const RESERVED_SLUGS = [
  "admin", "api", "auth", "login", "signin", "signup", "dashboard", "welcome",
  "pricing", "browse", "marketplace", "sample", "terms", "privacy", "trust",
  "saved", "i", "r", "offer", "referrer", "reset-password", "for-businesses",
  "for-referrers", "about-revvin-llm", "referral-agreement", "how-it-works",
  "feedback", "print", "docs", "www", "mail", "ftp", "cdn", "static", "assets",
  "app", "help", "support", "status", "blog", "null", "undefined", "test",
];

// Brand impersonation and security/phishing vocabulary. Matched as substrings
// of the normalised slug, so "secure-billing" and "s3cur3" both fail.
export const BLOCKED_TERMS = [
  "revvin", "revin", "rewin", "rewvin", "revvn", "revvinn",
  "official", "verify", "verification", "verified", "secure", "security",
  "account", "billing", "payment", "payments", "password", "refund", "invoice",
  "stripe", "paypal", "wallet", "login", "signin", "2fa", "otp",
];

// Standard English profanity/slur list (LDNOOBW), normalised.
export const PROFANITY = [
  "acrotomophilia",
  "alabamahotpocket",
  "alaskanpipeline",
  "anal",
  "anilingus",
  "anus",
  "apeshit",
  "arsehole",
  "ass",
  "asshole",
  "assmunch",
  "autoerotic",
  "babeland",
  "babybatter",
  "babyjuice",
  "ballgag",
  "ballgravy",
  "ballkicking",
  "balllicking",
  "ballsack",
  "ballsucking",
  "bangbros",
  "bangbus",
  "bareback",
  "barelylegal",
  "barenaked",
  "bastard",
  "bastardo",
  "bastinado",
  "bbw",
  "bdsm",
  "beaner",
  "beaners",
  "beastiality",
  "beavercleaver",
  "beaverlips",
  "bestiality",
  "bigblack",
  "bigbreasts",
  "bigknockers",
  "bigtits",
  "bimbos",
  "birdlock",
  "bitch",
  "bitches",
  "blackcock",
  "blondeaction",
  "blondeonblondeaction",
  "blowjob",
  "blowyourload",
  "bluewaffle",
  "blumpkin",
  "bollocks",
  "bondage",
  "boner",
  "boob",
  "boobs",
  "bootycall",
  "brownshowers",
  "brunetteaction",
  "bukkake",
  "bulldyke",
  "bulletvibe",
  "bullshit",
  "bunghole",
  "busty",
  "butt",
  "buttcheeks",
  "butthole",
  "cameltoe",
  "camgirl",
  "camslut",
  "camwhore",
  "carpetmuncher",
  "chocolaterosebuds",
  "cialis",
  "circlejerk",
  "clevelandsteamer",
  "clit",
  "clitoris",
  "cloverclamps",
  "clusterfuck",
  "cock",
  "cocks",
  "coon",
  "coons",
  "coprolagnia",
  "coprophilia",
  "cornhole",
  "creampie",
  "cum",
  "cumming",
  "cumshot",
  "cumshots",
  "cunnilingus",
  "cunt",
  "darkie",
  "daterape",
  "deepthroat",
  "dendrophilia",
  "dick",
  "dildo",
  "dingleberries",
  "dingleberry",
  "dirtypillows",
  "dirtysanchez",
  "doggiestyle",
  "doggystyle",
  "dogstyle",
  "dolcett",
  "domination",
  "dominatrix",
  "dommes",
  "donkeypunch",
  "doubledong",
  "doublepenetration",
  "dpaction",
  "dryhump",
  "dvda",
  "eatmyass",
  "ecchi",
  "ejaculation",
  "erotic",
  "erotism",
  "escort",
  "eunuch",
  "fag",
  "faggot",
  "fecal",
  "felch",
  "fellatio",
  "feltch",
  "femalesquirting",
  "femdom",
  "figging",
  "fingerbang",
  "fingering",
  "fisting",
  "footfetish",
  "footjob",
  "frotting",
  "fuck",
  "fuckbuttons",
  "fuckin",
  "fucking",
  "fucktards",
  "fudgepacker",
  "futanari",
  "gangbang",
  "gaysex",
  "genitals",
  "giantcock",
  "girlon",
  "girlontop",
  "girlscup",
  "girlsgonewild",
  "goatcx",
  "goatse",
  "goddamn",
  "gokkun",
  "goldenshower",
  "goodpoop",
  "googirl",
  "goregasm",
  "grope",
  "groupsex",
  "gspot",
  "guro",
  "handjob",
  "hardcore",
  "hentai",
  "homoerotic",
  "honkey",
  "hooker",
  "horny",
  "hotcarl",
  "hotchick",
  "howtokill",
  "howtomurder",
  "hugefat",
  "humping",
  "incest",
  "intercourse",
  "jackoff",
  "jailbait",
  "jellydonut",
  "jerkoff",
  "jigaboo",
  "jiggaboo",
  "jiggerboo",
  "jizz",
  "juggs",
  "kike",
  "kinbaku",
  "kinkster",
  "kinky",
  "knobbing",
  "leatherrestraint",
  "leatherstraightjacket",
  "lemonparty",
  "livesex",
  "lolita",
  "lovemaking",
  "makemecome",
  "malesquirting",
  "masturbate",
  "masturbating",
  "masturbation",
  "menageatrois",
  "milf",
  "missionaryposition",
  "mong",
  "motherfucker",
  "moundofvenus",
  "mrhands",
  "muffdiver",
  "muffdiving",
  "nambla",
  "nawashi",
  "negro",
  "neonazi",
  "nigga",
  "nigger",
  "nignog",
  "nimphomania",
  "nipple",
  "nipples",
  "nsfw",
  "nsfwimages",
  "nude",
  "nudity",
  "nutten",
  "nympho",
  "nymphomania",
  "octopussy",
  "omorashi",
  "onecuptwogirls",
  "oneguyonejar",
  "orgasm",
  "orgy",
  "paedophile",
  "paki",
  "panties",
  "panty",
  "pedobear",
  "pedophile",
  "pegging",
  "penis",
  "phonesex",
  "pieceofshit",
  "pikey",
  "pissing",
  "pisspig",
  "playboy",
  "pleasurechest",
  "polesmoker",
  "ponyplay",
  "poof",
  "poon",
  "poontang",
  "poopchute",
  "porn",
  "porno",
  "pornography",
  "princealbertpiercing",
  "pthc",
  "pubes",
  "punany",
  "pussy",
  "queaf",
  "queef",
  "quim",
  "raghead",
  "ragingboner",
  "rape",
  "raping",
  "rapist",
  "rectum",
  "reversecowgirl",
  "rimjob",
  "rimming",
  "rosypalm",
  "rosypalmandhersisters",
  "rustytrombone",
  "sadism",
  "santorum",
  "scat",
  "schlong",
  "scissoring",
  "semen",
  "sex",
  "sexcam",
  "sexo",
  "sexual",
  "sexuality",
  "sexually",
  "sexy",
  "shavedbeaver",
  "shavedpussy",
  "shemale",
  "shibari",
  "shit",
  "shitblimp",
  "shitty",
  "shota",
  "shrimping",
  "skeet",
  "slanteye",
  "slut",
  "smut",
  "snatch",
  "snowballing",
  "sodomize",
  "sodomy",
  "spastic",
  "spic",
  "splooge",
  "sploogemoose",
  "spooge",
  "spreadlegs",
  "spunk",
  "strapon",
  "strappado",
  "stripclub",
  "styledoggy",
  "suck",
  "sucks",
  "suicidegirls",
  "sultrywomen",
  "swastika",
  "swinger",
  "taintedlove",
  "tastemy",
  "teabagging",
  "threesome",
  "throating",
  "thumbzilla",
  "tiedup",
  "tightwhite",
  "tit",
  "tits",
  "titties",
  "titty",
  "tongueina",
  "topless",
  "tosser",
  "towelhead",
  "tranny",
  "tribadism",
  "tubgirl",
  "tushy",
  "twat",
  "twink",
  "twinkie",
  "twogirlsonecup",
  "undressing",
  "upskirt",
  "urethraplay",
  "urophilia",
  "vagina",
  "venusmound",
  "viagra",
  "vibrator",
  "violetwand",
  "vorarephilia",
  "voyeur",
  "voyeurweb",
  "voyuer",
  "vulva",
  "wank",
  "wetback",
  "wetdream",
  "whitepower",
  "whore",
  "worldsex",
  "wrappingmen",
  "wrinkledstarfish",
  "xxx",
  "yaoi",
  "yellowshowers",
  "yiffy",
  "zoophilia",
];

const LEET: Record<string, string> = {
  "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", "$": "s",
  "8": "b", "9": "g", "|": "l", "!": "i",
};

/** Strip hyphens and map leet substitutions so trivial evasion fails. */
export const normalizeSlug = (slug: string): string =>
  slug
    .toLowerCase()
    .replace(/-/g, "")
    .split("")
    .map((c) => LEET[c] ?? c)
    .join("");

/** Same as normalizeSlug but keeps hyphens as segment separators. */
const normalizeSegments = (slug: string): string[] =>
  slug.toLowerCase().split("-").map((seg) => normalizeSlug(seg)).filter(Boolean);

const FORMAT_RE = /^[a-z0-9]([a-z0-9]|-(?!-))*[a-z0-9]$/;

const isAscii = (s: string) => /^[\x00-\x7F]*$/.test(s);

const hitsProfanity = (slug: string): boolean => {
  const flat = normalizeSlug(slug);
  const segments = normalizeSegments(slug);
  return PROFANITY.some((word) => {
    // Short words only match a whole hyphen segment or the whole slug, so
    // legitimate names like "scunthorpe-roofing" are not false positives.
    if (word.length <= 4) return segments.includes(word) || flat === word;
    return flat.includes(word);
  });
};

/**
 * Validate a candidate slug. Does not check uniqueness (that is a DB lookup).
 */
export const checkSlug = (raw: string): SlugCheck => {
  const slug = (raw ?? "").trim();
  if (!isAscii(slug)) return { ok: false, reason: "format" };
  if (slug.length < 3 || slug.length > 40) return { ok: false, reason: "format" };
  if (!FORMAT_RE.test(slug)) return { ok: false, reason: "format" };
  if (/^[0-9]+$/.test(slug.replace(/-/g, ""))) return { ok: false, reason: "numeric" };

  const flat = normalizeSlug(slug);
  if (RESERVED_SLUGS.includes(slug) || RESERVED_SLUGS.some((r) => normalizeSlug(r) === flat)) {
    return { ok: false, reason: "reserved" };
  }
  if (BLOCKED_TERMS.some((t) => flat.includes(normalizeSlug(t)))) {
    return { ok: false, reason: "reserved" };
  }
  if (hitsProfanity(slug)) return { ok: false, reason: "profanity" };
  return { ok: true };
};

export const slugRejectionMessage = (reason: SlugRejection): string => {
  switch (reason) {
    case "taken":
      return "That one's taken";
    case "reserved":
      return "That word is reserved, please pick another";
    case "profanity":
      return "Please choose a different name";
    case "numeric":
      return "Add at least one letter, numbers alone are not allowed";
    default:
      return "Letters, numbers and hyphens only, 3 to 40 characters, no double hyphens";
  }
};

export const slugifyName = (s: string): string =>
  s
    .normalize("NFKD")
    .replace(/[^\x00-\x7F]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/, "");

/**
 * Derive a valid suggestion from the business name (or the typed slug),
 * appending a suffix until the rules pass.
 */
export const suggestSlug = (businessName: string, fallback = ""): string => {
  const base = slugifyName(businessName) || slugifyName(fallback) || "my-business";
  const suffixes = ["", "-referrals", "-rewards", "-team", "-crew", "-hq"];
  for (const suffix of suffixes) {
    const candidate = `${base.slice(0, 40 - suffix.length)}${suffix}`.replace(/^-+|-+$/g, "");
    if (candidate.length >= 3 && checkSlug(candidate).ok) return candidate;
  }
  return `partner-${Math.random().toString(36).slice(2, 8)}`;
};
