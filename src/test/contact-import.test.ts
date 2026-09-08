import { describe, it, expect } from "vitest";
import {
  parseCsv,
  parsePastedLines,
  splitCsvRecords,
  parseJobDate,
  jobDateProblem,
  combineName,
} from "@/lib/contactImport";

describe("CSV import: quoting", () => {
  it("keeps a quoted comma inside the name cell", () => {
    const csv = 'Name,Email,Phone\n"Smith, John",john@example.com,555-123-4567\n';
    const r = parseCsv(csv);
    expect(r.errors).toEqual([]);
    expect(r.contacts).toHaveLength(1);
    expect(r.contacts[0].name).toBe("Smith, John");
    expect(r.contacts[0].email).toBe("john@example.com");
    expect(r.contacts[0].phone).toBe("555-123-4567");
  });

  it("keeps an escaped quote inside the name cell", () => {
    const csv = 'Name,Email\n"Bob ""Bobby"" Jones",bob@example.com\n';
    const r = parseCsv(csv);
    expect(r.contacts[0].name).toBe('Bob "Bobby" Jones');
  });

  it("treats a newline inside a quoted cell as part of the record, not a new row", () => {
    const csv = 'Name,Email\n"Ann\nLee",ann@example.com\nBen,ben@example.com\n';
    const records = splitCsvRecords(csv);
    expect(records).toHaveLength(3); // header + 2 contacts
    const r = parseCsv(csv);
    expect(r.contacts.map((c) => c.email)).toEqual(["ann@example.com", "ben@example.com"]);
    expect(r.contacts[0].name).toBe("Ann\nLee");
  });

  it("reports the original file line number when a record spans lines", () => {
    const csv = 'Name,Email\n"Ann\nLee",ann@example.com\n,nope\n';
    const r = parseCsv(csv);
    // header line 1, Ann record starts line 2 (spans 2-3), broken row is line 4
    expect(r.errors[0].line).toBe(4);
  });
});

describe("CSV import: mixed valid and invalid rows", () => {
  it("keeps the good rows and explains each bad one", () => {
    const csv = [
      "Name,Email,Phone",
      "Jane Doe,jane@example.com,555-000-1111",
      ",orphan@example.com,",
      "No Channel,,",
      "Bad Email,not-an-email,",
      "Ken Ok,,555-222-3333",
    ].join("\n");
    const r = parseCsv(csv);
    expect(r.contacts.map((c) => c.name)).toEqual(["Jane Doe", "Ken Ok"]);
    expect(r.errors.map((e) => e.line)).toEqual([3, 4, 5]);
    expect(r.errors[0].reason).toMatch(/name/i);
    expect(r.errors[1].reason).toMatch(/email or phone/i);
    expect(r.errors[2].reason).toMatch(/not a valid email/i);
  });

  it("combines first and last name columns", () => {
    const csv = "First Name,Last Name,Email\nJohn,Smith,js@example.com\n";
    expect(parseCsv(csv).contacts[0].name).toBe("John Smith");
    expect(combineName("John", "Smith", "")).toBe("John Smith");
    expect(combineName("John", "Smith", "Preferred Name")).toBe("Preferred Name");
  });
});

describe("last job dates", () => {
  it("accepts the documented formats", () => {
    for (const value of ["2020-01-15", "15/01/2020", "15.01.2020", "January 15, 2020", "15 January 2020"]) {
      expect(jobDateProblem(value), value).toBeNull();
      expect(parseJobDate(value), value).toMatch(/^2020-01-15T/);
    }
  });

  it("rejects an impossible calendar date instead of rolling it forward", () => {
    expect(jobDateProblem("2026-02-30")).toMatch(/real calendar date/);
    expect(parseJobDate("2026-02-30")).toBeUndefined();
  });

  it("rejects a future date and an unrecognised format", () => {
    expect(jobDateProblem("2999-01-01")).toMatch(/future/);
    expect(jobDateProblem("last spring")).toMatch(/not a date we recognise/);
  });

  it("reports a broken date rather than importing the row silently", () => {
    const r = parseCsv("Name,Email,Phone,Last Job Date\nJane,jane@example.com,,2026-02-30\n");
    expect(r.contacts).toHaveLength(0);
    expect(r.errors[0].reason).toMatch(/2026-02-30/);
  });
});

describe("final normalised row validation", () => {
  it("does not accept a date in the phone column as a contact channel", () => {
    // name,phone where phone is really a date: no reachable channel.
    const r = parseCsv("Name,Email,Phone\nJane,,2020-01-15\n");
    expect(r.contacts).toHaveLength(0);
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0].reason).toMatch(/date, not a phone number/);
  });

  it("accepts a date in the phone column when an email still reaches them", () => {
    const r = parseCsv("Name,Email,Phone\nJane,jane@example.com,2020-01-15\n");
    expect(r.contacts).toHaveLength(1);
    expect(r.contacts[0].phone).toBeUndefined();
  });

  it("drops duplicate emails within one file", () => {
    const r = parseCsv("Name,Email\nA,dup@example.com\nB,DUP@example.com\n");
    expect(r.contacts).toHaveLength(1);
    expect(r.duplicates).toBe(1);
  });
});

describe("pasted lines", () => {
  it("handles a quoted comma and a bare email", () => {
    const r = parsePastedLines('"Smith, John", john@example.com\nsolo@example.com\n');
    expect(r.contacts[0].name).toBe("Smith, John");
    expect(r.contacts[1].email).toBe("solo@example.com");
  });

  it("never files a date as a phone number", () => {
    const r = parsePastedLines("Jane, 2020-01-15");
    expect(r.contacts).toHaveLength(0);
    expect(r.errors[0].reason).toMatch(/email or phone/i);
  });
});
