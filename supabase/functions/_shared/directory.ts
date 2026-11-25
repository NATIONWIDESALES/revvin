// Pure marketplace directory rules shared by the directory-import function,
// the marketplace page and tests. No runtime imports.

/** Trade vocabulary for directory entries: the business picker plus the regulated trades. */
export const DIRECTORY_CATEGORIES = [
  "Roofing", "HVAC", "Plumbing", "Electrical", "Landscaping", "Painting",
  "Auto", "Solar", "Real Estate", "Mortgage", "Insurance", "Home Services", "Other",
] as const;
export type DirectoryCategory = (typeof DIRECTORY_CATEGORIES)[number];

const squash = (v: string | null | undefined) => (v ?? "").toLowerCase().replace(/[^a-z]/g, "");

const REGULATED = new Set(["realestate", "mortgage", "insurance"]);
/**
 * Real Estate, Mortgage and Insurance: the directory shows the profile but no
 * reward amount and no "earn a reward" action, pending legal review.
 * Mirrors fn_directory_regulated in the database.
 */
export const directoryRegulated = (category: string | null | undefined) => REGULATED.has(squash(category));

const ALIASES: Record<string, DirectoryCategory> = {
  roofer: "Roofing", roofers: "Roofing", roofingcontractor: "Roofing",
  heating: "HVAC", cooling: "HVAC", airconditioning: "HVAC", hvaccontractor: "HVAC", heatingandcooling: "HVAC",
  plumber: "Plumbing", plumbers: "Plumbing",
  electrician: "Electrical", electricians: "Electrical",
  landscaper: "Landscaping", gardener: "Landscaping", lawncare: "Landscaping",
  painter: "Painting", painters: "Painting",
  autorepair: "Auto", carrepair: "Auto", mechanic: "Auto",
  solarinstaller: "Solar", realtor: "Real Estate", realestateagent: "Real Estate", estateagent: "Real Estate",
  mortgagebroker: "Mortgage", insuranceagent: "Insurance", handyman: "Home Services", contractor: "Home Services",
};
const BY_SQUASH = new Map<string, DirectoryCategory>(DIRECTORY_CATEGORIES.map((c) => [squash(c), c]));
/** Maps a free-text category onto the directory vocabulary, or "Other". */
export function mapDirectoryCategory(raw: string | null | undefined): DirectoryCategory {
  const k = squash(raw);
  return BY_SQUASH.get(k) ?? ALIASES[k] ?? "Other";
}

/** The reward line on a directory card. The business pays the reward itself. */
export const rewardLine = (reward: string) => `Pays ${reward} per referral, paid by the business when the job closes`;

export interface ImportRow {
  name: string; category: DirectoryCategory; city: string | null; region: string | null; country: "US" | "CA";
  postal_code: string | null; latitude: number | null; longitude: number | null; phone: string | null;
  website: string | null; source: string; source_id: string; source_license: string | null;
}

const text = (v: unknown, max: number) => {
  if (typeof v !== "string" && typeof v !== "number") return null;
  const s = String(v).replace(/[\u0000-\u001f]/g, " ").trim();
  return s ? s.slice(0, max) : null;
};
const coord = (v: unknown, lim: number) => {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) && Math.abs(n) <= lim ? n : NaN;
};

export const MAX_IMPORT_BATCH = 1000;

/**
 * Same cleaning as fn_directory_clean_name: drops U+FE0F and zero-width
 * characters, then any leading characters that are not a letter, digit or
 * opening quote/bracket, then trims.
 */
export function cleanListingName(v: string): string {
  return v.replace(/[\uFE0F\u200B\u200C\u200D\u2060\uFEFF]/g, "").replace(/^[^\p{L}\p{N}"'(\[{\u201C\u2018]+/u, "").trim();
}

/** Validates one import row. Returns the clean row or the reason it was rejected. */
export function validateImportRow(input: unknown): { row: ImportRow } | { error: string } {
  if (!input || typeof input !== "object") return { error: "not_an_object" };
  const r = input as Record<string, unknown>;
  const raw = text(r.name, 200);
  const name = raw ? cleanListingName(raw) || null : null;
  if (!name) return { error: "name_required" };
  const country = text(r.country, 2)?.toUpperCase();
  if (country !== "US" && country !== "CA") return { error: "invalid_country" };
  const source = text(r.source, 60);
  const source_id = text(r.source_id, 200);
  if (!source || !source_id) return { error: "source_required" };
  const latitude = coord(r.latitude, 90);
  const longitude = coord(r.longitude, 180);
  if (Number.isNaN(latitude) || Number.isNaN(longitude) || (latitude === null) !== (longitude === null)) return { error: "invalid_coordinates" };
  let website = text(r.website, 300);
  if (website && !/^https?:\/\//i.test(website)) website = `https://${website}`;
  if (website) { try { const u = new URL(website); if (!/^https?:$/.test(u.protocol)) website = null; } catch { website = null; } }
  return { row: {
    name, category: mapDirectoryCategory(text(r.category, 80)), city: text(r.city, 120), region: text(r.region, 40)?.toUpperCase() ?? null,
    country, postal_code: text(r.postal_code, 20), latitude, longitude, phone: text(r.phone, 32), website,
    source, source_id, source_license: text(r.source_license, 200),
  } };
}

/** Validates a batch; duplicate (source, source_id) pairs keep the last row. */
export function validateImportBatch(rows: unknown): { rows: ImportRow[]; rejected: { index: number; error: string }[] } | { error: string } {
  if (!Array.isArray(rows)) return { error: "rows_must_be_an_array" };
  if (rows.length > MAX_IMPORT_BATCH) return { error: "batch_too_large" };
  const keep = new Map<string, ImportRow>();
  const rejected: { index: number; error: string }[] = [];
  rows.forEach((raw, index) => {
    const v = validateImportRow(raw);
    if ("error" in v) rejected.push({ index, error: v.error });
    else keep.set(`${v.row.source}\u0000${v.row.source_id}`, v.row);
  });
  return { rows: [...keep.values()], rejected };
}
