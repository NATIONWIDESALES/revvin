import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const ROOTS = ["src", "supabase/functions", "index.html", "public"];
const SKIP_DIRS = new Set(["node_modules", "dist", "build", ".git"]);
const TEXT_EXT = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".html", ".css", ".md", ".json", ".txt", ".svg",
]);
const SELF = "src/test/content-guards.test.ts";

function walk(path: string, out: string[] = []): string[] {
  let st;
  try { st = statSync(path); } catch { return out; }
  if (st.isFile()) {
    if (TEXT_EXT.has(extname(path))) out.push(path);
    return out;
  }
  if (!st.isDirectory()) return out;
  for (const entry of readdirSync(path)) {
    if (SKIP_DIRS.has(entry)) continue;
    walk(join(path, entry), out);
  }
  return out;
}

const FORBIDDEN: Array<{ label: string; pattern: RegExp }> = [
  { label: "$147", pattern: /\$147\b/ },
  { label: "3 months", pattern: /\b3\s+months\b/i },
];

describe("content guards — deprecated pricing strings", () => {
  const files = ROOTS.flatMap((r) => walk(r));

  for (const { label, pattern } of FORBIDDEN) {
    it(`does not contain "${label}" anywhere in the app`, () => {
      const offenders: string[] = [];
      for (const file of files) {
        if (file.replace(/\\/g, "/") === SELF) continue;
        const text = readFileSync(file, "utf8");
        const lines = text.split("\n");
        lines.forEach((line, i) => {
          if (pattern.test(line)) offenders.push(`${file}:${i + 1}  ${line.trim()}`);
        });
      }
      expect(offenders, `Found forbidden string "${label}":\n${offenders.join("\n")}`).toEqual([]);
    });
  }
});