import { describe, expect, it } from "vitest";
import { parseCsv, parseJobDate, parsePastedLines, splitDelimited, looksLikeDate } from "@/lib/contactImport";

describe("date versus phone classification", () => {
  it("treats an ISO date as a date, never a phone number", () => {
    const { contacts } = parsePastedLines("Jane Smith, jane@example.org, 2026-01-15");
    expect(contacts).toHaveLength(1);
    expect(contacts[0].phone).toBeUndefined();
    expect(contacts[0].last_job_at?.slice(0, 10)).toBe("2026-01-15");
  });

  it("keeps a real phone and a date in the right columns, in any order", () => {
    const { contacts } = parsePastedLines("Ali Khan, 2025-11-02, 555-123-4567, ali@example.org");
    expect(contacts[0].phone).toBe("555-123-4567");
    expect(contacts[0].email).toBe("ali@example.org");
    expect(contacts[0].last_job_at?.slice(0, 10)).toBe("2025-11-02");
  });

  it("recognises slash and written dates", () => {
    expect(looksLikeDate("15/01/2026")).toBe(true);
    expect(looksLikeDate("January 15, 2026")).toBe(true);
    expect(looksLikeDate("555-123-4567")).toBe(false);
  });

  it("rejects future and prehistoric dates", () => {
    expect(parseJobDate("2099-01-01")).toBeUndefined();
    expect(parseJobDate("1971-01-01")).toBeUndefined();
  });

  it("reports lines with no contact detail instead of dropping them silently", () => {
    const { contacts, errors } = parsePastedLines("Jane Smith\nBob, bob@example.org");
    expect(contacts).toHaveLength(1);
    expect(errors[0]).toMatchObject({ line: 1 });
  });

  it("drops repeats of the same email or phone", () => {
    const { contacts, duplicates } = parsePastedLines(
      "Jane, jane@example.org\nJane Smith, jane@example.org",
    );
    expect(contacts).toHaveLength(1);
    expect(duplicates).toBe(1);
  });
});

describe("quote-aware CSV parsing", () => {
  it("keeps a quoted comma inside one cell", () => {
    expect(splitDelimited('"Smith, John",john@example.org,555-000-1111')).toEqual([
      "Smith, John",
      "john@example.org",
      "555-000-1111",
    ]);
  });

  it("does not shift columns when a name contains a comma", () => {
    const csv = 'name,email,phone,last job date\n"Smith, John",john@example.org,555-000-1111,2025-06-01';
    const { contacts, errors } = parseCsv(csv);
    expect(errors).toHaveLength(0);
    expect(contacts[0]).toMatchObject({
      name: "Smith, John",
      email: "john@example.org",
      phone: "555-000-1111",
    });
    expect(contacts[0].last_job_at?.slice(0, 10)).toBe("2025-06-01");
  });

  it("maps header aliases and preserves last_job_at", () => {
    const csv = "Customer Name,E-Mail,Mobile,Last Service\nDana Lee,dana@example.org,5551234567,2024-03-09";
    const { contacts } = parseCsv(csv);
    expect(contacts[0].name).toBe("Dana Lee");
    expect(contacts[0].email).toBe("dana@example.org");
    expect(contacts[0].last_job_at?.slice(0, 10)).toBe("2024-03-09");
  });

  it("handles a headerless file positionally", () => {
    const { contacts } = parseCsv("Dana Lee,dana@example.org,5551234567,2024-03-09");
    expect(contacts).toHaveLength(1);
    expect(contacts[0].email).toBe("dana@example.org");
  });

  it("reports a bad email with its line number rather than importing it", () => {
    const csv = "name,email\nDana Lee,not-an-email";
    const { contacts, errors } = parseCsv(csv);
    expect(contacts).toHaveLength(0);
    expect(errors[0].line).toBe(2);
    expect(errors[0].reason).toContain("not a valid email");
  });

  it("escapes doubled quotes", () => {
    expect(splitDelimited('"He said ""hi""",x@example.org')).toEqual(['He said "hi"', "x@example.org"]);
  });
});
