// Light helpers for the print kit downloads. The PDF and zip code lives in
// printPdf.ts and is only loaded on click.
import type { PrintAsset } from "@/lib/printAssets";
import { printFileName } from "../../supabase/functions/_shared/print-kit";

export { printFileName };
export const PT_PER_IN = 72;
export const kitZipName = (slug: string) => `${slug}-print-kit.zip`;

/** print-specs.txt: what a print shop needs, and nothing invented. */
export function printSpecsText(assets: PrintAsset[], slug: string): string {
  const blocks = assets.map((a) => [
    a.name,
    `File: ${printFileName(slug, a.id)}`,
    `Finished size: ${a.widthIn} x ${a.heightIn} inches`,
    "Color: full color, one side",
    `QR code: ${a.qrIn} x ${a.qrIn} inches`,
    `Where it is used: ${a.where}`,
  ].join("\n"));
  return ["Print specs", "", ...blocks.flatMap((b) => [b, ""])].join("\n").trimEnd() + "\n";
}
