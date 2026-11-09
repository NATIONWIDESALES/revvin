import { readFileSync, readdirSync } from "node:fs";

/** Latest function bodies, in migration order, without replaying unrelated DDL. */
export function migrationFunctions() {
  const result = new Map<string, string>();
  for (const dir of ["supabase/migrations", "drizzle/migrations"]) {
    for (const file of readdirSync(dir).filter(f => f.endsWith(".sql")).sort()) {
      const sql = readFileSync(`${dir}/${file}`, "utf8");
      const pattern = /CREATE OR REPLACE FUNCTION\s+(?:public\.)?(\w+)\s*\([\s\S]*?AS\s+(\$\w*\$)[\s\S]*?\2\s*;/gi;
      for (const match of sql.matchAll(pattern)) result.set(match[1], match[0]);
    }
  }
  return result;
}