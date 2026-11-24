// Print-ready PDFs built from data, not screenshots: vector text, vector
// shapes and a vector QR code, on a page exactly the piece's trim size. Loaded
// with a dynamic import from the Print pack, never in the main bundle.
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage, type PDFImage } from "pdf-lib";
import qrcode from "qrcode-generator";
import { zipSync, strToU8 } from "fflate";
import type { PrintAsset } from "@/lib/printAssets";
import { brandPalette, displayUrl, formatPhone, type SheetBusiness } from "@/components/print/AssetSheet";
import { printFileName, printSpecsText, PT_PER_IN } from "@/lib/printKit";

const INK = "#0F172A";
const MUTED = "#475569";
const RULE = "#CBD5E1";
const WHITE = "#FFFFFF";

interface Spec {
  layout: "row" | "stack" | "card";
  pad: number; hole?: number; band: number; name: number; nameMin: number; logo: number;
  kicker?: number; amount: number; sub: number; label?: number; steps?: number; paidWhen?: boolean;
  foot?: number; phone?: boolean; fine?: number; gap: number;
}
// Same inch measurements as AssetSheet, so paper matches the on-screen preview.
const SPECS: Record<string, Spec> = {
  "yard-sign": { layout: "row", pad: 0.9, band: 3, name: 1.6, nameMin: 0.9, logo: 2.1, kicker: 0.85, amount: 3.1, sub: 1.25, label: 0.6, foot: 0.75, gap: 0.45 },
  "door-hanger": { layout: "stack", pad: 0.3, hole: 2.25, band: 0.95, name: 0.36, nameMin: 0.2, logo: 0.62, kicker: 0.16, amount: 0.7, sub: 0.26, label: 0.15, steps: 0.14, foot: 0.13, phone: true, fine: 0.125, gap: 0.13 },
  "invoice-insert": { layout: "stack", pad: 0.55, band: 1.35, name: 0.6, nameMin: 0.3, logo: 0.95, kicker: 0.28, amount: 1.05, sub: 0.38, label: 0.2, steps: 0.19, paidWhen: true, foot: 0.17, phone: true, fine: 0.14, gap: 0.2 },
  "card-back": { layout: "card", pad: 0.16, band: 0.12, name: 0, nameMin: 0, logo: 0, amount: 0.3, sub: 0.12, label: 0.1, gap: 0.06 },
  "truck-magnet": { layout: "stack", pad: 0.3, band: 1.2, name: 0.62, nameMin: 0.5, logo: 0.85, amount: 1.1, sub: 0.5, label: 0.5, foot: 0.5, gap: 0.1 },
};

const hex = (h: string) => {
  const v = h.replace("#", "");
  return rgb(parseInt(v.slice(0, 2), 16) / 255, parseInt(v.slice(2, 4), 16) / 255, parseInt(v.slice(4, 6), 16) / 255);
};

/** Standard PDF fonts only speak WinAnsi; map common punctuation and drop the rest. */
export const pdfSafe = (s: string) => s
  .replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"').replace(/[\u2013\u2014]/g, "-")
  .normalize("NFC").replace(/[^\x20-\x7E\u00A0-\u00FF\u00B7]/g, "");

function wrap(text: string, font: PDFFont, size: number, maxW: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (font.widthOfTextAtSize(next, size) <= maxW || !line) line = next;
    else { lines.push(line); line = w; }
  }
  if (line) lines.push(line);
  return lines;
}

/** Largest size not above `size` (and not below `min`) where the text fits in `maxLines`. */
function fitSize(text: string, font: PDFFont, size: number, min: number, maxW: number, maxLines: number) {
  let s = size;
  while (s > min && (wrap(text, font, s, maxW).length > maxLines || wrap(text, font, s, maxW).some((l) => font.widthOfTextAtSize(l, s) > maxW))) s *= 0.95;
  return Math.max(min, s);
}

/** Vector QR: one black rectangle per horizontal run of dark modules, EC level H. */
export function qrMatrix(data: string): boolean[][] {
  const qr = qrcode(0, "H");
  qr.addData(data);
  qr.make();
  const n = qr.getModuleCount();
  return Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => qr.isDark(r, c)));
}
function drawQr(page: PDFPage, m: boolean[][], x: number, yTop: number, sizePt: number) {
  const n = m.length;
  const cell = sizePt / n;
  for (let r = 0; r < n; r++) {
    let c = 0;
    while (c < n) {
      if (!m[r][c]) { c++; continue; }
      let end = c;
      while (end < n && m[r][end]) end++;
      // A hair of overlap so adjacent rows never show a hairline gap.
      page.drawRectangle({ x: x + c * cell, y: yTop - (r + 1) * cell - 0.01, width: (end - c) * cell, height: cell + 0.02, color: rgb(0, 0, 0) });
      c = end;
    }
  }
}

async function loadLogo(pdf: PDFDocument, src: string | null | undefined): Promise<PDFImage | null> {
  if (!src || typeof document === "undefined") return null;
  try {
    const res = await fetch(src, { mode: "cors" });
    if (!res.ok) return null;
    const blob = await res.blob();
    const bmp = await createImageBitmap(blob);
    const canvas = document.createElement("canvas");
    canvas.width = bmp.width; canvas.height = bmp.height;
    canvas.getContext("2d")!.drawImage(bmp, 0, 0);
    const png = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/png"));
    if (!png) return null;
    return await pdf.embedPng(new Uint8Array(await png.arrayBuffer()));
  } catch { return null; }
}

type Block = { h: number; draw: (yTop: number) => void };

export async function renderAssetPdf(asset: PrintAsset, biz: SheetBusiness, url: string): Promise<Uint8Array> {
  const s = SPECS[asset.id] ?? SPECS["invoice-insert"];
  const P = PT_PER_IN;
  const W = asset.widthIn * P, H = asset.heightIn * P;
  const pdf = await PDFDocument.create();
  pdf.setTitle(pdfSafe(`${biz.name} ${asset.name}`));
  pdf.setCreator("Revvin");
  const page = pdf.addPage([W, H]);
  page.setTrimBox(0, 0, W, H);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const reg = await pdf.embedFont(StandardFonts.Helvetica);
  const pal = brandPalette(biz.brand_color);
  const logo = s.layout === "card" ? null : await loadLogo(pdf, biz.logo_url);
  const qr = qrMatrix(url);

  const name = pdfSafe(biz.name);
  const amount = pdfSafe(biz.offer_amount?.trim() ?? "");
  const trigger = pdfSafe(biz.offer_trigger?.trim().replace(/[.\s]+$/, "") ?? "");
  const kicker = pdfSafe(biz.headline?.trim() ?? "");
  const fine = pdfSafe(biz.offer_fine_print?.trim() ?? "");
  const link = pdfSafe(displayUrl(url));
  const phone = s.phone ? pdfSafe(formatPhone(biz.phone)) : "";
  const pad = s.pad * P, gap = s.gap * P;

  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: hex(WHITE) });

  const text = (t: string, x: number, yTop: number, size: number, font: PDFFont, color: string) =>
    page.drawText(t, { x, y: yTop - size * 0.8, size, font, color: hex(color) });

  const lines = (t: string, font: PDFFont, size: number, maxW: number, color: string, align: "left" | "center", x0: number, lh = 1.15): Block => {
    const ls = wrap(t, font, size, maxW);
    return {
      h: ls.length * size * lh,
      draw: (y) => ls.forEach((l, i) => {
        const w = font.widthOfTextAtSize(l, size);
        text(l, align === "center" ? x0 + (maxW - w) / 2 : x0, y - i * size * lh, size, font, color);
      }),
    };
  };

  const headline = (maxW: number, align: "left" | "center", x0: number, scale = 1): Block[] => {
    if (!amount) return [lines("Refer someone, get rewarded", bold, s.amount * 0.8 * P * scale, maxW, INK, align, x0, 1)];
    const earn = "Earn ";
    let size = s.amount * P * scale;
    while (size > 6 && bold.widthOfTextAtSize(earn + amount, size) > maxW) size *= 0.95;
    const total = bold.widthOfTextAtSize(earn + amount, size);
    const big: Block = {
      h: size * 0.98,
      draw: (y) => {
        const x = align === "center" ? x0 + (maxW - total) / 2 : x0;
        text(earn, x, y, size, bold, INK);
        text(amount, x + bold.widthOfTextAtSize(earn, size), y, size, bold, pal.amountOnWhite);
      },
    };
    const sub = lines("for a referral", bold, s.sub * P * scale, maxW, INK, align, x0, 1.1);
    return [big, { h: s.sub * P * 0.15 * scale, draw: () => {} }, sub];
  };

  const quiet = Math.max(0.12, asset.qrIn * 0.08) * P;
  const qrSize = asset.qrIn * P;
  const qrBox = qrSize + quiet * 2;
  const qrBlock = (cx: number): Block => {
    const labelSize = (s.label ?? 0) * P;
    return {
      h: qrBox + (labelSize ? labelSize * 1.1 : 0),
      draw: (y) => {
        page.drawRectangle({ x: cx - qrBox / 2, y: y - qrBox, width: qrBox, height: qrBox, color: hex(WHITE) });
        drawQr(page, qr, cx - qrSize / 2, y - quiet, qrSize);
        if (labelSize) {
          const w = bold.widthOfTextAtSize("Scan to refer", labelSize);
          text("Scan to refer", cx - w / 2, y - qrBox, labelSize, bold, pal.dark);
        }
      },
    };
  };
  const stackDraw = (blocks: Block[], yTop: number) => {
    let y = yTop;
    blocks.forEach((b, i) => { b.draw(y); y -= b.h + (i < blocks.length - 1 ? gap : 0); });
  };
  const stackH = (blocks: Block[]) => blocks.reduce((a, b) => a + b.h, 0) + gap * Math.max(0, blocks.length - 1);

  // Business card back: brand strip, headline left, QR right.
  if (s.layout === "card") {
    const strip = s.band * P;
    page.drawRectangle({ x: 0, y: 0, width: strip, height: H, color: hex(pal.brand) });
    const textW = W - strip - pad * 3 - qrBox;
    const left = headline(textW, "left", strip + pad);
    const leftH = left.reduce((a, b) => a + b.h, 0);
    let y = H / 2 + leftH / 2;
    left.forEach((b) => { b.draw(y); y -= b.h; });
    const q = qrBlock(W - pad - qrBox / 2);
    q.draw(H / 2 + q.h / 2);
    return pdf.save();
  }

  let top = H;
  if (s.hole) {
    const r = 0.875 * P;
    page.drawCircle({ x: W / 2, y: H - s.hole * P / 2, size: r, borderColor: hex(RULE), borderWidth: 0.02 * P, borderDashArray: [4, 3] });
    top -= s.hole * P;
  }

  // Full-bleed brand band with the logo or the name.
  const innerW = W - pad * 2;
  let bandH = s.band * P;
  const bandPadY = bandH * 0.12;
  let nameBlock: Block | null = null;
  if (!logo) {
    const nsize = fitSize(name, bold, s.name * P, s.nameMin * P, innerW * (s.layout === "row" ? 0.95 : 1), 2);
    nameBlock = lines(name, bold, nsize, innerW, pal.onBrand, s.layout === "row" ? "left" : "center", pad, 1.05);
    bandH = Math.max(bandH, nameBlock.h + bandPadY * 2);
  }
  page.drawRectangle({ x: 0, y: top - bandH, width: W, height: bandH, color: hex(pal.brand) });
  if (nameBlock) nameBlock.draw(top - (bandH - nameBlock.h) / 2);
  else if (logo) {
    const lh = s.logo * P;
    const lw = Math.min(innerW * 0.7, (logo.width / logo.height) * lh);
    const h = lw / (logo.width / logo.height);
    const px = s.logo * 0.2 * P, py = s.logo * 0.12 * P;
    const bx = s.layout === "row" ? pad : (W - lw - px * 2) / 2;
    const by = top - bandH / 2 - (h + py * 2) / 2;
    page.drawRectangle({ x: bx, y: by, width: lw + px * 2, height: h + py * 2, color: hex(WHITE) });
    page.drawImage(logo, { x: bx + px, y: by + py, width: lw, height: h });
  }
  top -= bandH;

  // Footer: rule, link and phone, fine print.
  const footSize = (s.foot ?? 0) * P;
  const footer: Block | null = s.foot ? (() => {
    const line = phone ? `${link}  \u00B7  ${phone}` : link;
    let size = footSize;
    const min = Math.min(footSize, (s.layout === "row" ? 0.5 : 0.125) * P);
    while (size > min && reg.widthOfTextAtSize(line, size) > innerW) size *= 0.95;
    const fineBlock = s.fine && fine ? lines(fine, reg, s.fine * P, innerW, MUTED, s.layout === "row" ? "left" : "center", pad, 1.3) : null;
    const ruleGap = footSize * 0.5;
    return {
      h: ruleGap + size * 1.2 + (fineBlock ? s.fine! * P * 0.4 + fineBlock.h : 0),
      draw: (y) => {
        page.drawLine({ start: { x: pad, y }, end: { x: W - pad, y }, thickness: Math.max(0.01, s.foot! * 0.06) * P, color: hex(RULE) });
        const yy = y - ruleGap;
        const w = bold.widthOfTextAtSize(link, size);
        const full = w + (phone ? reg.widthOfTextAtSize(`  \u00B7  ${phone}`, size) : 0);
        const x = s.layout === "row" ? pad : (W - full) / 2;
        text(link, x, yy, size, bold, INK);
        if (phone) text(`  \u00B7  ${phone}`, x + w, yy, size, reg, MUTED);
        fineBlock?.draw(yy - size * 1.2 - s.fine! * P * 0.4);
      },
    };
  })() : null;

  if (s.layout === "row") {
    const bottomPad = pad * 0.8;
    if (footer) footer.draw(bottomPad + footer.h);
    const areaTop = top - pad * 0.6;
    const areaBottom = (footer ? bottomPad + footer.h : 0) + pad * 0.6;
    const q = qrBlock(W - pad - qrBox / 2);
    const textW = W - pad * 3 - qrBox;
    const left: Block[] = [];
    if (s.kicker && kicker) left.push(lines(kicker, bold, s.kicker * P, textW, pal.dark, "left", pad, 1.2));
    const hl = headline(textW, "left", pad);
    const mid = (areaTop + areaBottom) / 2;
    const hlH = hl.reduce((a, b) => a + b.h, 0);
    const blocksH = left.reduce((a, b) => a + b.h, 0) + (left.length ? gap : 0) + hlH;
    let y = mid + blocksH / 2;
    left.forEach((b) => { b.draw(y); y -= b.h + gap; });
    hl.forEach((b) => { b.draw(y); y -= b.h; });
    q.draw(mid + q.h / 2);
    return pdf.save();
  }

  // Stacked layouts: kicker, headline, QR, steps, paid when, footer, centered.
  const areaTop = top - pad * 0.6;
  const areaBottom = pad * 0.6;
  const build = (k: number): Block[] => {
    const b: Block[] = [];
    if (s.kicker && kicker) b.push(lines(kicker, bold, s.kicker * P * k, innerW, pal.dark, "center", pad, 1.2));
    const hl = headline(innerW, "center", pad, k);
    b.push({ h: hl.reduce((a, x) => a + x.h, 0), draw: (y) => { let yy = y; hl.forEach((x) => { x.draw(yy); yy -= x.h; }); } });
    b.push(qrBlock(W / 2));
    if (s.steps) {
      const st = s.steps * P * k;
      const items = ["How it works", "1. Scan the code.", "2. Tell us who needs us.", trigger ? `3. Get paid when ${trigger}.` : "3. Get paid."];
      const blocks = items.map((t, i) => lines(t, i === 0 ? bold : reg, st, innerW, i === 0 ? pal.dark : INK, "left", pad, 1.3));
      const widest = Math.max(...items.map((t, i) => (i === 0 ? bold : reg).widthOfTextAtSize(t, st)));
      const x0 = pad + Math.max(0, (innerW - widest) / 2);
      const blocks2 = items.map((t, i) => lines(t, i === 0 ? bold : reg, st, innerW - (x0 - pad), i === 0 ? pal.dark : INK, "left", x0, 1.3));
      b.push({ h: blocks.reduce((a, x) => a + x.h, 0) + st * 0.2, draw: (y) => { let yy = y; blocks2.forEach((x, i) => { x.draw(yy); yy -= x.h + (i === 0 ? st * 0.2 : 0); }); } });
    }
    if (s.paidWhen && trigger) b.push(lines(`Paid when ${trigger}`, bold, (s.steps ?? s.sub) * P * k, innerW, MUTED, "center", pad));
    if (footer) b.push({ h: footer.h + gap, draw: (y) => footer.draw(y - gap) });
    return b;
  };
  let k = 1;
  let blocks = build(k);
  while (stackH(blocks) > areaTop - areaBottom && k > 0.6) { k -= 0.05; blocks = build(k); }
  const h = stackH(blocks);
  stackDraw(blocks, areaTop - Math.max(0, (areaTop - areaBottom - h) / 2));
  return pdf.save();
}

export async function renderKit(assets: PrintAsset[], biz: SheetBusiness, url: string, slug: string) {
  const files: Array<{ asset: PrintAsset; name: string; bytes: Uint8Array }> = [];
  for (const asset of assets) files.push({ asset, name: printFileName(slug, asset.id), bytes: await renderAssetPdf(asset, biz, url) });
  return files;
}

export function kitZip(files: Array<{ name: string; bytes: Uint8Array }>, assets: PrintAsset[], slug: string): Uint8Array {
  const entries: Record<string, Uint8Array> = {};
  for (const f of files) entries[f.name] = f.bytes;
  entries["print-specs.txt"] = strToU8(printSpecsText(assets, slug));
  return zipSync(entries, { level: 0 });
}
