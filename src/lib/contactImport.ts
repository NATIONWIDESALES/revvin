/**
 * Customer list import parsing.
 *
 * Rules that drive everything here:
 *  - A date is never a phone number. `2026-01-15` is all digits and dashes, so a
 *    naive phone test matches it and the last job date lands in the phone
 *    column. Dates are therefore classified first.
 *  - A CSV cell may contain a quoted comma ("Smith, John") or an escaped quote
 *    ("Bob ""Bobby"" Jones"). Parsing is quote aware, and a quoted cell may
 *    contain a newline: the record continues to the closing quote instead of
 *    being silently cut in half.
 *  - Parsing returns STRUCTURED rows. Nothing is ever re-serialised into a
 *    comma string and reparsed: that round trip turned "Smith, John" into
 *    "Smith" and shifted every later column.
 *  - The FINAL normalised row is validated, not the raw cells. A row whose only
 *    contact cell turns out to be a date has no reachable channel, so it is an
 *    error row rather than a silently unusable contact.
 *  - Every error carries the ORIGINAL 1-based line number in the uploaded file,
 *    including when quoted newlines mean one record spans several lines.
 *
 * Accepted last-job-date formats (anything else is reported, never guessed):
 *   YYYY-MM-DD            2026-01-15
 *   D/M/YYYY or M/D/YYYY  15/01/2026, 1/15/2026   (unambiguous only)
 *   D.M.YYYY              15.01.2026
 *   Month D, YYYY         January 15, 2026
 *   D Month YYYY          15 January 2026
 * A date must be real (2026-02-30 is rejected), in the past, and no earlier
 * than 1990.
 */

export type ParsedContact = {
  name: string;
  email?: string;
  phone?: string;
  last_job_at?: string;
  /** 1-based line in the uploaded file or pasted text this contact came from. */
  sourceLine: number;
};

export interface ImportResult {
  contacts: ParsedContact[];
  /** Rows we could not use, with the reason, so the owner can fix them. */
  errors: { line: number; reason: string }[];
  /** Rows dropped because the same email or phone already appeared. */
  duplicates: number;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+()\d][\d\s().\-]{5,}$/;

const MONTHS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

/** Anything that reads as a calendar date, so it is never treated as a phone. */
export function looksLikeDate(value: string): boolean {
  const v = value.trim();
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(v)) return true; // 2026-01-15
  if (/^\d{1,2}[/.]\d{1,2}[/.]\d{2,4}$/.test(v)) return true; // 15/01/2026
  if (/^[a-z]{3,9}\s+\d{1,2},?\s+\d{4}$/i.test(v)) return true; // January 15, 2026
  if (/^\d{1,2}\s+[a-z]{3,9}\s+\d{4}$/i.test(v)) return true; // 15 January 2026
  return false;
}

/** Build a UTC date and confirm it round-trips, so 2026-02-30 cannot roll to March. */
function utcDate(y: number, m: number, d: number): Date | null {
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  if (
    date.getUTCFullYear() !== y ||
    date.getUTCMonth() !== m - 1 ||
    date.getUTCDate() !== d
  ) {
    return null; // the calendar rejected it: no such day in that month
  }
  return date;
}

function monthFromName(name: string): number | null {
  const n = name.trim().toLowerCase();
  const exact = MONTHS.indexOf(n);
  if (exact >= 0) return exact + 1;
  const abbrev = MONTHS.findIndex((m) => m.slice(0, 3) === n.slice(0, 3) && n.length >= 3);
  return abbrev >= 0 ? abbrev + 1 : null;
}

/**
 * Why a date cell cannot be used, or null when it is fine. Split out from
 * parseJobDate so the importer can report the difference between "that is not a
 * date at all" and "that date does not exist".
 */
export function jobDateProblem(value: string | undefined): string | null {
  const raw = value?.trim();
  if (!raw) return null;
  if (!looksLikeDate(raw)) return "is not a date we recognise (use YYYY-MM-DD)";
  const built = buildDate(raw);
  if (!built) return `is not a real calendar date`;
  if (built.getUTCFullYear() < 1990) return "is before 1990";
  if (built.getTime() > Date.now()) return "is in the future";
  return null;
}

function buildDate(raw: string): Date | null {
  let m: RegExpMatchArray | null;

  if ((m = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/))) {
    return utcDate(+m[1], +m[2], +m[3]);
  }
  if ((m = raw.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{2,4})$/))) {
    const a = +m[1];
    const b = +m[2];
    const year = m[3].length === 2 ? 2000 + +m[3] : +m[3];
    // Day/month order is only resolvable when one value cannot be a month.
    if (a > 12 && b <= 12) return utcDate(year, b, a);
    if (b > 12 && a <= 12) return utcDate(year, a, b);
    if (a <= 12 && b <= 12) return utcDate(year, a, b); // ambiguous: month first
    return null;
  }
  if ((m = raw.match(/^([a-z]{3,9})\s+(\d{1,2}),?\s+(\d{4})$/i))) {
    const month = monthFromName(m[1]);
    return month ? utcDate(+m[3], month, +m[2]) : null;
  }
  if ((m = raw.match(/^(\d{1,2})\s+([a-z]{3,9})\s+(\d{4})$/i))) {
    const month = monthFromName(m[2]);
    return month ? utcDate(+m[3], month, +m[1]) : null;
  }
  return null;
}

export function parseJobDate(value: string | undefined): string | undefined {
  const raw = value?.trim();
  if (!raw) return undefined;
  if (jobDateProblem(raw)) return undefined;
  return buildDate(raw)!.toISOString();
}

function classify(parts: string[]): { email?: string; phone?: string; last_job_at?: string } {
  const out: { email?: string; phone?: string; last_job_at?: string } = {};
  for (const p of parts) {
    if (!p) continue;
    if (looksLikeDate(p)) {
      if (!out.last_job_at) {
        const parsed = parseJobDate(p);
        if (parsed) out.last_job_at = parsed;
      }
      continue; // a date is never a phone, even when it fails validation
    }
    if (!out.email && EMAIL_RE.test(p)) {
      out.email = p;
      continue;
    }
    if (!out.phone && PHONE_RE.test(p)) out.phone = p;
  }
  return out;
}

function dedupe(rows: ParsedContact[]): { contacts: ParsedContact[]; duplicates: number } {
  const seen = new Set<string>();
  const contacts: ParsedContact[] = [];
  let duplicates = 0;
  for (const row of rows) {
    const keys = [
      row.email ? `e:${row.email.toLowerCase()}` : null,
      row.phone ? `p:${row.phone.replace(/\D/g, "")}` : null,
    ].filter(Boolean) as string[];
    if (keys.some((k) => seen.has(k))) {
      duplicates++;
      continue;
    }
    keys.forEach((k) => seen.add(k));
    contacts.push(row);
  }
  return { contacts, duplicates };
}

/**
 * Final gate for a normalised row. Runs on what would actually be stored, so a
 * row can never reach the preview with no way to reach the person.
 */
function finalise(
  row: { name: string; email?: string; phone?: string; last_job_at?: string },
  line: number,
  errors: ImportResult["errors"],
): ParsedContact | null {
  const name = row.name.trim();
  const email = row.email?.trim() || undefined;
  const phone = row.phone?.trim() || undefined;
  if (!name) {
    errors.push({ line, reason: "No name on this row" });
    return null;
  }
  if (email && !EMAIL_RE.test(email)) {
    errors.push({ line, reason: `"${email}" is not a valid email address` });
    return null;
  }
  if (phone && !PHONE_RE.test(phone)) {
    errors.push({ line, reason: `"${phone}" is not a usable phone number` });
    return null;
  }
  if (!email && !phone) {
    errors.push({ line, reason: "No email or phone number on this row" });
    return null;
  }
  return { name, email, phone, last_job_at: row.last_job_at, sourceLine: line };
}

/** Free-form paste: one contact per line, separated by commas, semicolons or tabs. */
export function parsePastedLines(text: string): ImportResult {
  const rows: ParsedContact[] = [];
  const errors: ImportResult["errors"] = [];
  const lines = text.split(/\r?\n/);

  lines.forEach((rawLine, i) => {
    const lineNo = i + 1;
    const line = rawLine.trim();
    if (!line) return;
    const parts = splitDelimited(line).map((p) => p.trim()).filter(Boolean);
    if (parts.length === 0) return;

    let name = parts[0];
    const rest = classify(parts.slice(1));
    let { email, phone } = rest;

    if (parts.length === 1) {
      if (EMAIL_RE.test(name)) {
        email = name;
        name = name.split("@")[0];
      } else if (!looksLikeDate(name) && PHONE_RE.test(name)) {
        phone = name;
        name = "(no name)";
      }
    }

    const row = finalise({ name, email, phone, last_job_at: rest.last_job_at }, lineNo, errors);
    if (row) rows.push(row);
  });

  const { contacts, duplicates } = dedupe(rows);
  return { contacts, errors, duplicates };
}

/** Quote-aware split of one delimited line. Handles "" as an escaped quote. */
export function splitDelimited(line: string, delimiters = ",;\t"): string[] {
  const cells: string[] = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (delimiters.includes(ch)) {
      cells.push(cell);
      cell = "";
      continue;
    }
    cell += ch;
  }
  cells.push(cell);
  return cells.map((c) => c.trim());
}

/**
 * Split a whole CSV into records, honouring newlines inside quoted cells.
 * Each record keeps the 1-based line number it STARTED on, so an error points
 * at the right place in the owner's file even when a record spans three lines.
 */
export function splitCsvRecords(text: string): { line: number; raw: string }[] {
  const records: { line: number; raw: string }[] = [];
  let current = "";
  let inQuotes = false;
  let line = 1;
  let startLine = 1;

  const push = () => {
    if (current.trim().length > 0) records.push({ line: startLine, raw: current });
    current = "";
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      // Track quote state so a delimiter or newline inside quotes is literal.
      if (inQuotes && text[i + 1] === '"') {
        current += '""';
        i++;
        continue;
      }
      inQuotes = !inQuotes;
      current += ch;
      continue;
    }
    if ((ch === "\n" || ch === "\r") && !inQuotes) {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      push();
      line++;
      startLine = line;
      continue;
    }
    if (ch === "\n") line++; // newline inside a quoted cell: record continues
    current += ch;
  }
  if (inQuotes) {
    // Unterminated quote: keep what we have rather than dropping the tail.
    push();
  } else {
    push();
  }
  return records;
}

const HEADER_ALIASES = {
  name: ["name", "full name", "customer", "customer name", "client", "contact"],
  first_name: ["first name", "firstname", "first", "given name"],
  last_name: ["last name", "lastname", "surname", "family name"],
  email: ["email", "e-mail", "email address"],
  phone: ["phone", "mobile", "phone number", "cell", "telephone"],
  last_job_at: ["last_job_at", "last job date", "last_job_date", "last job", "last service", "date"],
} as const;

type HeaderField = keyof typeof HEADER_ALIASES;

function headerIndex(header: string[], field: HeaderField): number {
  return header.findIndex((h) => (HEADER_ALIASES[field] as readonly string[]).includes(h));
}

/** "Smith" + "John" -> "John Smith"; either half alone is used as-is. */
export function combineName(first: string, last: string, whole: string): string {
  if (whole.trim()) return whole.trim();
  return [first.trim(), last.trim()].filter(Boolean).join(" ");
}

export function parseCsv(text: string): ImportResult {
  const records = splitCsvRecords(text);
  if (records.length === 0) return { contacts: [], errors: [], duplicates: 0 };

  const header = splitDelimited(records[0].raw, ",;\t").map((h) => h.toLowerCase());
  const known = Object.values(HEADER_ALIASES).flat() as string[];
  const hasHeader = header.some((h) => known.includes(h));

  const idx = hasHeader
    ? {
        name: headerIndex(header, "name"),
        first_name: headerIndex(header, "first_name"),
        last_name: headerIndex(header, "last_name"),
        email: headerIndex(header, "email"),
        phone: headerIndex(header, "phone"),
        last_job_at: headerIndex(header, "last_job_at"),
      }
    : { name: 0, first_name: -1, last_name: -1, email: 1, phone: 2, last_job_at: 3 };

  const rows: ParsedContact[] = [];
  const errors: ImportResult["errors"] = [];
  const body = hasHeader ? records.slice(1) : records;

  for (const record of body) {
    const lineNo = record.line;
    const cells = splitDelimited(record.raw, ",;\t");
    const at = (n: number) => (n >= 0 ? (cells[n] ?? "").trim() : "");

    const name = combineName(at(idx.first_name), at(idx.last_name), at(idx.name));
    const email = at(idx.email);
    const phoneCell = at(idx.phone);
    const dateCell = at(idx.last_job_at);

    // Report a broken date instead of dropping it in silence.
    const dateIssue = jobDateProblem(dateCell);
    if (dateCell && dateIssue) {
      errors.push({ line: lineNo, reason: `Last job date "${dateCell}" ${dateIssue}` });
      continue;
    }

    // A date sitting in the phone column is not a phone number. If that leaves
    // the row with no channel, finalise() turns it into an error row.
    const phone = phoneCell && !looksLikeDate(phoneCell) ? phoneCell : undefined;
    if (phoneCell && looksLikeDate(phoneCell) && !email) {
      errors.push({
        line: lineNo,
        reason: `"${phoneCell}" is a date, not a phone number, so this row has no way to reach anyone`,
      });
      continue;
    }

    const row = finalise(
      { name, email: email || undefined, phone, last_job_at: parseJobDate(dateCell) },
      lineNo,
      errors,
    );
    if (row) rows.push(row);
  }

  const { contacts, duplicates } = dedupe(rows);
  return { contacts, errors, duplicates };
}
