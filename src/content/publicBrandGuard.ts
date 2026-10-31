import fs from "node:fs";
import path from "node:path";

/** Prevent retired personal identity from reappearing in public sources or output. */
export const RETIRED_IDENTITY = /karm|sandhu|linkedin\.com\/in\/karm/i;

export const assertPublicBrand = (text: string, label: string) => {
  if (RETIRED_IDENTITY.test(text)) throw new Error(`Retired personal identity in public content: ${label}`);
};

export const validatePublicBrandSources = (root: string) => {
  assertPublicBrand(fs.readFileSync(path.join(root, "index.html"), "utf8"), "index.html");
  const visit = (dir: string) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) visit(file);
      else if (/\.(tsx?|html|txt|xml)$/.test(entry.name)) assertPublicBrand(fs.readFileSync(file, "utf8"), file);
    }
  };
  for (const dir of ["src/pages", "src/components", "src/config", "public", "supabase/functions/_shared/transactional-email-templates"]) visit(path.join(root, dir));
  // This guard contains the banned words itself, so exclude it from the content scan.
  const content = path.join(root, "src/content");
  for (const name of fs.readdirSync(content)) {
    if (name !== "publicBrandGuard.ts" && /\.tsx?$/.test(name)) {
      assertPublicBrand(fs.readFileSync(path.join(content, name), "utf8"), name);
    }
  }
};