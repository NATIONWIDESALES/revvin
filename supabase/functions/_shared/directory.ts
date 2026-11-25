// Pure marketplace directory rules shared by the directory-import function,
// the marketplace page and tests. No runtime imports.

/** Marketplace filter groups, in display order. */
export const TRADE_GROUPS = ["Home exterior", "Home interior", "Systems", "Outdoor", "Cleaning and maintenance", "Auto", "Professional"] as const;
export type TradeGroup = (typeof TRADE_GROUPS)[number];
export interface Trade {
  name: string;
  /** Filter group, or null for catch-alls kept only for businesses that already use them. */
  group: TradeGroup | null;
  /** What a referred customer needs: "Know someone who needs {need}?". Empty uses "could use {Business}". */
  need: string;
  /** Icon key, mapped to an icon by the card component. */
  icon: string;
}
/**
 * The one trade list: marketplace filter, referral sentence, card icons and
 * the business trade picker. Category values already stored on businesses
 * (Home Services, Auto, Other) stay valid.
 */
export const TRADES: readonly Trade[] = [
  { name: "Roofing", group: "Home exterior", need: "a roofer", icon: "roof" },
  { name: "Gutters and Siding", group: "Home exterior", need: "gutter or siding work", icon: "roof" },
  { name: "Windows and Doors", group: "Home exterior", need: "new windows or doors", icon: "door" },
  { name: "Garage Doors", group: "Home exterior", need: "garage door repair", icon: "garage" },
  { name: "Painting", group: "Home exterior", need: "a painter", icon: "paint" },
  { name: "Concrete and Masonry", group: "Home exterior", need: "concrete or masonry work", icon: "brick" },
  { name: "General Contracting", group: "Home exterior", need: "a contractor", icon: "hammer" },
  { name: "Remodeling", group: "Home interior", need: "a remodel", icon: "hammer" },
  { name: "Flooring", group: "Home interior", need: "new floors", icon: "layers" },
  { name: "Insulation and Drywall", group: "Home interior", need: "insulation or drywall work", icon: "layers" },
  { name: "Handyman", group: "Home interior", need: "a handyman", icon: "hammer" },
  { name: "Appliance Repair", group: "Home interior", need: "appliance repair", icon: "fridge" },
  { name: "Locksmith", group: "Home interior", need: "a locksmith", icon: "key" },
  { name: "Home Inspection", group: "Home interior", need: "a home inspection", icon: "inspect" },
  { name: "HVAC", group: "Systems", need: "heating or cooling work", icon: "flame" },
  { name: "Plumbing", group: "Systems", need: "a plumber", icon: "wrench" },
  { name: "Electrical", group: "Systems", need: "an electrician", icon: "zap" },
  { name: "Solar", group: "Systems", need: "solar", icon: "sun" },
  { name: "Landscaping", group: "Outdoor", need: "a landscaper", icon: "trees" },
  { name: "Tree Service", group: "Outdoor", need: "tree work", icon: "trees" },
  { name: "Fencing and Decks", group: "Outdoor", need: "a new fence or deck", icon: "fence" },
  { name: "Pools and Spas", group: "Outdoor", need: "pool or spa service", icon: "waves" },
  { name: "Septic", group: "Outdoor", need: "septic service", icon: "drops" },
  { name: "Cleaning", group: "Cleaning and maintenance", need: "a cleaner", icon: "sparkles" },
  { name: "Pest Control", group: "Cleaning and maintenance", need: "pest control", icon: "bug" },
  { name: "Moving", group: "Cleaning and maintenance", need: "a mover", icon: "truck" },
  { name: "Junk Removal", group: "Cleaning and maintenance", need: "junk removal", icon: "trash" },
  { name: "Auto Repair", group: "Auto", need: "auto repair", icon: "car" },
  { name: "Auto Body", group: "Auto", need: "body work on their car", icon: "car" },
  { name: "Tires", group: "Auto", need: "new tires", icon: "tire" },
  { name: "Auto Detailing", group: "Auto", need: "car detailing", icon: "sparkles" },
  { name: "Auto Glass", group: "Auto", need: "auto glass repair", icon: "car" },
  { name: "Real Estate", group: "Professional", need: "", icon: "building" },
  { name: "Mortgage", group: "Professional", need: "", icon: "building" },
  { name: "Insurance", group: "Professional", need: "", icon: "building" },
  { name: "Home Services", group: null, need: "help around the house", icon: "hammer" },
  { name: "Auto", group: null, need: "car work", icon: "car" },
  { name: "Other", group: null, need: "", icon: "building" },
];
const TRADE_BY_NAME = new Map(TRADES.map((t) => [t.name.toLowerCase(), t]));
/** The trade entry for a stored category, case-insensitive. */
export const tradeInfo = (category: string | null | undefined): Trade | undefined => TRADE_BY_NAME.get((category ?? "").trim().toLowerCase());

/** Trade vocabulary for directory entries, from TRADES. */
export const DIRECTORY_CATEGORIES = TRADES.map((t) => t.name);
export type DirectoryCategory = string;

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
  autorepair: "Auto Repair", carrepair: "Auto Repair", mechanic: "Auto Repair",
  solarinstaller: "Solar", realtor: "Real Estate", realestateagent: "Real Estate", estateagent: "Real Estate",
  mortgagebroker: "Mortgage", insuranceagent: "Insurance", handyman: "Handyman", contractor: "General Contracting", generalcontractor: "General Contracting",
};
const BY_SQUASH = new Map<string, DirectoryCategory>(DIRECTORY_CATEGORIES.map((c) => [squash(c), c]));
/** Source category (Overture taxonomy.primary) to trade. Mirrors fn_directory_source_trade. */
export const SOURCE_TRADES: Record<string, string> = Object.fromEntries(Object.entries({
  "General Contracting": "contractor building_contractor",
  Remodeling: "kitchen_remodeling bathroom_remodeling altering_and_remodeling_contractor",
  "Pest Control": "pest_control_service", Moving: "mover",
  Cleaning: "cleaning_service home_cleaning janitorial_service office_cleaning carpet_cleaning window_washing pressure_washing chimney_sweep chimney_service air_duct_cleaning_service",
  "Concrete and Masonry": "masonry_concrete masonry_contractor stone_and_masonry paving_contractor excavation_service demolition_service",
  Flooring: "flooring_contractor carpet_installation", "Windows and Doors": "windows_installation door_sales_service",
  "Garage Doors": "garage_door_service", "Fencing and Decks": "fence_and_gate_sales_service deck_and_railing_sales_service",
  "Pools and Spas": "pool_and_hot_tub_service pool_cleaning", Locksmith: "key_and_locksmith", "Appliance Repair": "appliance_repair_service",
  "Insulation and Drywall": "insulation_installation drywall_service waterproofing", Handyman: "handyman home_service",
  "Home Inspection": "home_inspector", "Junk Removal": "junk_removal_and_hauling", "Tree Service": "tree_service",
  "Gutters and Siding": "gutter_service siding", Septic: "septic_service",
  "Auto Repair": "automotive_repair automotive_service brake_service_and_repair transmission_repair auto_electrical_repair oil_change_station auto_restoration_service auto_upholstery",
  "Auto Body": "auto_body_shop", Tires: "tire_shop", "Auto Detailing": "auto_detailing car_window_tinting", "Auto Glass": "auto_glass_service",
}).flatMap(([trade, keys]) => keys.split(" ").map((k) => [k, trade])));

/** Maps a free-text category onto the directory vocabulary, or "Other". */
export function mapDirectoryCategory(raw: string | null | undefined): DirectoryCategory {
  const k = squash(raw);
  return BY_SQUASH.get(k) ?? ALIASES[k] ?? "Other";
}

/** The reward line on a directory card. The business pays the reward itself. */
export const rewardLine = (reward: string) => `Pays ${reward} per referral, paid by the business when the job closes`;

export interface ImportRow {
  name: string; category: DirectoryCategory; source_category: string | null; city: string | null; region: string | null; country: "US" | "CA";
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
  const source_category = text(r.source_category, 80);
  return { row: {
    name, category: (source_category && SOURCE_TRADES[source_category.toLowerCase()]) || mapDirectoryCategory(text(r.category, 80)), source_category, city: text(r.city, 120), region: text(r.region, 40)?.toUpperCase() ?? null,
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
