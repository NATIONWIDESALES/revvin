import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";

export type ForbiddenPattern = { label: string; pattern: RegExp };

export type ContentGuardConfig = {
  /** Files or directories to recursively scan. Missing paths are ignored. */
  roots: string[];
  /** Directory basenames to skip entirely during the walk. */
  skipDirs?: Iterable<string>;
  /** POSIX path fragments to skip (substring match on the full file path). */
  skipPaths?: string[];
  /** File extensions (including the dot) considered text and worth scanning. */
  textExtensions?: Iterable<string>;
  /** Absolute-from-repo path of the test file itself, so it doesn't scan its own patterns. */
  selfPath?: string;
};

const DEFAULT_SKIP_DIRS = [
  "node_modules", "dist", "build", ".git", ".next", ".vercel",
  "coverage", ".turbo", ".cache",
];

const DEFAULT_TEXT_EXT = [
  ".ts", ".tsx", ".js", ".jsx", ".html", ".css", ".md", ".mdx",
  ".json", ".yaml", ".yml", ".txt", ".svg", ".xml",
];

function walk(path: string, skipDirs: Set<string>, textExt: Set<string>, out: string[] = []): string[] {
  let st;
  try { st = statSync(path); } catch { return out; }
  if (st.isFile()) {
    if (textExt.has(extname(path))) out.push(path);
    return out;
  }
  if (!st.isDirectory()) return out;
  for (const entry of readdirSync(path)) {
    if (skipDirs.has(entry)) continue;
    walk(join(path, entry), skipDirs, textExt, out);
  }
  return out;
}

/** Resolve the scan target list from the provided config. Useful for tests/debugging. */
export function collectFiles(config: ContentGuardConfig): string[] {
  const skipDirs = new Set([...(config.skipDirs ?? []), ...DEFAULT_SKIP_DIRS]);
  const textExt = new Set([...(config.textExtensions ?? []), ...DEFAULT_TEXT_EXT]);
  const skipPaths = config.skipPaths ?? [];
  const self = config.selfPath;
  const all = config.roots.flatMap((r) => walk(r, skipDirs, textExt));
  return Array.from(new Set(all)).filter((f) => {
    const p = f.replace(/\\/g, "/");
    if (self && p === self) return false;
    return !skipPaths.some((s) => p.includes(s));
  });
}

/**
 * Register a vitest `describe` block that asserts every `ForbiddenPattern`
 * is absent from every scanned file. Adding a new guard is a one-line entry
 * in the `forbidden` array.
 */
export function registerContentGuard(
  suiteName: string,
  config: ContentGuardConfig,
  forbidden: ForbiddenPattern[],
) {
  describe(suiteName, () => {
    const files = collectFiles(config);

    for (const { label, pattern } of forbidden) {
      it(`does not contain "${label}" anywhere in the app`, () => {
        const offenders: string[] = [];
        for (const file of files) {
          const text = readFileSync(file, "utf8");
          const lines = text.split("\n");
          lines.forEach((line, i) => {
            if (pattern.test(line)) offenders.push(`${file}:${i + 1}  ${line.trim()}`);
          });
        }
        expect(
          offenders,
          `Found forbidden string "${label}":\n${offenders.join("\n")}`,
        ).toEqual([]);
      });
    }
  });
}
