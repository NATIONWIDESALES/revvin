import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Edge functions run in Deno and are outside the app typecheck, so a select on a
 * column that does not exist ships silently and fails at runtime with a
 * PostgREST error. This guard parses `.from("table").select("...")` pairs out of
 * the edge function sources and checks every column against the deployed schema
 * for the tables we care about.
 */
const SCHEMA: Record<string, string[]> = {
  referral_contacts: [
    "id",
    "business_id",
    "name",
    "email",
    "phone",
    "status",
    "last_sent_at",
    "send_channel",
    "is_mock",
    "created_at",
    "updated_at",
    "last_job_at",
  ],
  campaigns: [
    "id",
    "business_id",
    "name",
    "channel",
    "subject",
    "body",
    "status",
    "scheduled_at",
    "started_at",
    "completed_at",
    "total_recipients",
    "sent_count",
    "failed_count",
    "opened_count",
    "clicked_count",
    "opted_out_count",
    "consent_confirmed",
    "created_by",
    "created_at",
    "updated_at",
    "segment_key",
    "segment_label",
    "last_batch_at",
  ],
  campaign_sends: [
    "id",
    "campaign_id",
    "contact_id",
    "business_id",
    "recipient_email",
    "recipient_phone",
    "status",
    "message_id",
    "sent_at",
    "opened_at",
    "clicked_at",
    "failure_reason",
    "created_at",
  ],
};

const FUNCTIONS_DIR = join(process.cwd(), "supabase", "functions");

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (full.endsWith(".ts")) out.push(full);
  }
  return out;
}

type Select = { file: string; table: string; columns: string[] };

function collectSelects(): Select[] {
  const results: Select[] = [];
  // Matches `.from("table")` followed (allowing chained calls) by `.select("cols")`.
  const pattern =
    /\.from\(\s*["'`]([a-z_]+)["'`]\s*\)([\s\S]{0,400}?)\.select\(\s*["'`]([^"'`]*)["'`]/g;
  for (const file of walk(FUNCTIONS_DIR)) {
    const src = readFileSync(file, "utf8");
    for (const match of src.matchAll(pattern)) {
      const [, table, between, cols] = match;
      // A nested `.from(` in between means the pairing is unreliable; skip it.
      if (between.includes(".from(")) continue;
      if (!SCHEMA[table]) continue;
      const columns = cols
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean)
        // Strip aliases, embedded resources and count shorthands.
        .map((c) => c.split(":").pop()!.trim())
        .filter((c) => c && c !== "*" && !c.includes("("));
      results.push({ file: file.replace(process.cwd() + "/", ""), table, columns });
    }
  }
  return results;
}

describe("edge function selects match the deployed schema", () => {
  const selects = collectSelects();

  it("finds the send-campaign recipient query", () => {
    const found = selects.find(
      (s) => s.file.includes("send-campaign") && s.table === "referral_contacts",
    );
    expect(found, "send-campaign should query referral_contacts").toBeTruthy();
    expect(found!.columns).toContain("status");
    // `opted_out` lives on campaign_contacts, not referral_contacts.
    expect(found!.columns).not.toContain("opted_out");
  });

  it("selects only columns that exist", () => {
    const bad: string[] = [];
    for (const s of selects) {
      for (const col of s.columns) {
        if (!SCHEMA[s.table].includes(col)) bad.push(`${s.file}: ${s.table}.${col}`);
      }
    }
    expect(bad).toEqual([]);
  });
});
