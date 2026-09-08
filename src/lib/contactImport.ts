/**
 * Customer list import parsing.
 *
 * Two rules drive everything here:
 *  - A date is never a phone number. `2026-01-15` is all digits and dashes, so a
 *    naive phone test matches it and the last job date lands in the phone
 *    column. Dates are therefore classified first.
 *  - A CSV cell may contain a quoted comma ("Smith, John"). A plain split on
 *    commas shifts every later column, so parsing is quote aware.
 */

export type ParsedContact = {
  name: string;
  email?: string;
  phone?: string;
  last_job_at?: string;
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

/** Anything that reads as a calendar date, so it is never treated as a phone. */
export function looksLikeDate(value: string): boolean {
  const v = value.trim();
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(v)) return true; // 2026-01-15
  if (/^\d{1,2}[/.]\d{1,2}[/.]\d{2,4}$/.test(v)) return true; // 15/01/2026
  if (/^[a-z]{3,9}\s+\d{1,2},?\s+\d{4}$/i.test(v)) return true; // January 15, 2026
  if (/^\d{1,2}\s+[a-z]{3,9}\s+\d{4}$/i.test(v)) return true; // 15 January 2026
  return false;
}

export function parseJobDate(value: string | undefined): string | undefined {
  const raw = value?.trim();
  if (!raw) return undefined;
  if (!looksLikeDate(raw)) return undefined;
  const date = /^\d{4}-\d{1,2}-\d{1,2}$/.test(raw) ? new Date(`${raw}T12:00:00Z`) : new Date(raw);
  if (Number.isNaN(date.getTime())) return undefined;
  if (date.getFullYear() < 1990 || date > new Date()) return undefined;
  return date.toISOString();
}

function classify(parts: string[]): Omit<ParsedContact, "name"> {
  const out: Omit<ParsedContact, "name"> = {};
  for (const p of parts) {
    if (!p) continue;
    if (!out.last_job_at && looksLikeDate(p)) {
      const parsed = parseJobDate(p);
      if (parsed) out.last_job_at = parsed;
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

/** Free-form paste: one contact per line, separated by commas, semicolons or tabs. */
export function parsePastedLines(text: string): ImportResult {
  const rows: ParsedContact[] = [];
  const errors: ImportResult["errors"] = [];
  const lines = text.split(/\r?\n/);

  lines.forEach((rawLine, i) => {
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

    if (!name) {
      errors.push({ line: i + 1, reason: "No name on this line" });
      return;
    }
    if (!email && !phone) {
      errors.push({ line: i + 1, reason: "No email or phone number on this line" });
      return;
    }
    rows.push({ name, email, phone, last_job_at: rest.last_job_at });
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

const HEADER_ALIASES: Record<keyof Omit<ParsedContact, never>, string[]> = {
  name: ["name", "full name", "customer", "customer name", "client", "contact", "first name"],
  email: ["email", "e-mail", "email address"],
  phone: ["phone", "mobile", "phone number", "cell", "telephone"],
  last_job_at: ["last_job_at", "last job date", "last_job_date", "last job", "last service", "date"],
};

function headerIndex(header: string[], field: keyof ParsedContact): number {
  return header.findIndex((h) => HEADER_ALIASES[field].includes(h));
}

export function parseCsv(text: string): ImportResult {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { contacts: [], errors: [], duplicates: 0 };

  const header = splitDelimited(lines[0], ",;\t").map((h) => h.toLowerCase());
  const known = Object.values(HEADER_ALIASES).flat();
  const hasHeader = header.some((h) => known.includes(h));

  const idx = hasHeader
    ? {
        name: headerIndex(header, "name"),
        email: headerIndex(header, "email"),
        phone: headerIndex(header, "phone"),
        last_job_at: headerIndex(header, "last_job_at"),
      }
    : { name: 0, email: 1, phone: 2, last_job_at: 3 };

  const rows: ParsedContact[] = [];
  const errors: ImportResult["errors"] = [];
  const body = hasHeader ? lines.slice(1) : lines;

  body.forEach((raw, i) => {
    const lineNo = hasHeader ? i + 2 : i + 1;
    const cells = splitDelimited(raw, ",;\t");
    const at = (n: number) => (n >= 0 ? (cells[n] ?? "").trim() : "");
    const name = at(idx.name);
    const email = at(idx.email);
    const phone = at(idx.phone);
    const dateCell = at(idx.last_job_at);

    if (!name) {
      errors.push({ line: lineNo, reason: "Missing name" });
      return;
    }
    if (!email && !phone) {
      errors.push({ line: lineNo, reason: "Missing email and phone number" });
      return;
    }
    if (email && !EMAIL_RE.test(email)) {
      errors.push({ line: lineNo, reason: `"${email}" is not a valid email address` });
      return;
    }
    rows.push({
      name,
      email: email || undefined,
      phone: phone && !looksLikeDate(phone) ? phone : undefined,
      last_job_at: parseJobDate(dateCell),
    });
  });

  const { contacts, duplicates } = dedupe(rows);
  return { contacts, errors, duplicates };
}
