// Pure rules behind the "Bring your customers" intake. The file and paste
// paths both end in parseCsv / parsePastedLines from contactImport, then this
// module decides what is new, what fits the plan, and how to explain it.
import type { ImportResult, ParsedContact } from "@/lib/contactImport";

export type IntakeMethod = "upload" | "paste" | "export_help" | "send_us";
export const INTAKE_METHODS: readonly IntakeMethod[] = ["upload", "paste", "export_help", "send_us"];

export const INTAKE_FILE_ACCEPT = ".csv,text/csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel";

export type IntakeFileKind = "csv" | "excel" | null;
export function intakeFileKind(name: string): IntakeFileKind {
  const n = name.toLowerCase();
  if (n.endsWith(".csv") || n.endsWith(".txt")) return "csv";
  if (n.endsWith(".xlsx") || n.endsWith(".xls")) return "excel";
  return null;
}

const keyOf = (p: { email?: string | null; phone?: string | null }) => ({
  e: p.email ? "e:" + p.email.trim().toLowerCase() : "",
  p: p.phone ? "p:" + p.phone.replace(/\D/g, "") : "",
});

export interface IntakePlan {
  /** Rows that will be inserted, in file order. */
  toAdd: ParsedContact[];
  skipped: { invalid: number; duplicateInFile: number; alreadyOnList: number; overLimit: number };
  firstProblems: { line: number; reason: string }[];
}

/**
 * Decide what one parsed file or paste turns into. Never fails the whole
 * file: rows past the plan allowance are counted as overLimit, not refused.
 * remaining is Infinity for plans without a cap.
 */
export function planIntake(
  parsed: ImportResult,
  existing: Array<{ email?: string | null; phone?: string | null }>,
  remaining: number,
): IntakePlan {
  const known = new Set<string>();
  for (const c of existing) { const k = keyOf(c); if (k.e) known.add(k.e); if (k.p) known.add(k.p); }
  const fresh: ParsedContact[] = [];
  let alreadyOnList = 0;
  for (const row of parsed.contacts) {
    const k = keyOf(row);
    if ((k.e && known.has(k.e)) || (k.p && known.has(k.p))) { alreadyOnList++; continue; }
    if (k.e) known.add(k.e);
    if (k.p) known.add(k.p);
    fresh.push(row);
  }
  const room = Math.max(0, remaining);
  const toAdd = Number.isFinite(room) ? fresh.slice(0, room) : fresh;
  return {
    toAdd,
    skipped: { invalid: parsed.errors.length, duplicateInFile: parsed.duplicates, alreadyOnList, overLimit: fresh.length - toAdd.length },
    firstProblems: parsed.errors.slice(0, 5),
  };
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** One line per skip reason, only for reasons that happened. */
export function skipLines(skipped: IntakePlan["skipped"], limit: number): string[] {
  const out: string[] = [];
  if (skipped.alreadyOnList) out.push(`${plural(skipped.alreadyOnList, "was", "were")} already on your list.`);
  if (skipped.duplicateInFile) out.push(`${plural(skipped.duplicateInFile, "was a repeat", "were repeats")} of another row.`);
  if (skipped.invalid) out.push(`${plural(skipped.invalid, "row was", "rows were")} missing a name, or an email or phone.`);
  if (skipped.overLimit) out.push(`${plural(skipped.overLimit, "customer was", "customers were")} left out because Free includes ${limit} customers. Pro removes the limit.`);
  return out;
}

export function sendUsMailto(businessName: string): string {
  const subject = `Customer list for ${businessName}`;
  const body = "Hi Revvin team,\n\nMy customer list is attached. Any format is fine. Please load it into my account.\n\nThanks";
  return `mailto:info@revvin.co?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/**
 * First sheet of an Excel file as CSV text, so it runs through the same
 * parseCsv mapping and validation as an uploaded .csv. The parser is loaded
 * on demand and never ships in the main bundle.
 */
export async function excelToCsv(data: ArrayBuffer): Promise<string> {
  const XLSX = await import("xlsx");
  const wb = XLSX.read(data, { type: "array", cellDates: true, dense: true });
  const first = wb.SheetNames[0];
  if (!first) return "";
  return XLSX.utils.sheet_to_csv(wb.Sheets[first], { dateNF: "yyyy-mm-dd", blankrows: false });
}
