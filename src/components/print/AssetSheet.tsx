import { useEffect, useState, type CSSProperties } from "react";
import { printQrDataUrl } from "@/lib/printQr";
import type { PrintAsset } from "@/lib/printAssets";

export interface SheetBusiness {
  name: string;
  logo_url?: string | null;
  brand_color?: string | null;
  /** Custom page headline, shown as a kicker when set. */
  headline?: string | null;
  offer_amount?: string | null;
  offer_trigger?: string | null;
  offer_fine_print?: string | null;
  phone?: string | null;
}

interface Props {
  asset: PrintAsset;
  biz: SheetBusiness;
  url: string;
  /** 1 = actual size. Previews pass something small. */
  scale?: number;
}

const DEFAULT_BRAND = "#15803D";
const INK = "#0F172A";
const MUTED = "#475569";
const RULE = "#CBD5E1";
const HEAD_FONT = "'Barlow Condensed', 'Barlow Condensed Fallback', 'Arial Narrow', sans-serif";
const BODY_FONT = "'Barlow', 'Barlow Fallback', system-ui, sans-serif";

const parseHex = (hex: string | null | undefined): [number, number, number] | null => {
  const m = hex?.trim().match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return null;
  const h = m[1].length === 3 ? m[1].split("").map((c) => c + c).join("") : m[1];
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
};
const toHex = (rgb: number[]) => "#" + rgb.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");

/** Brand color, a dark shade for text on white, and a readable text color for the band. */
export const brandPalette = (color: string | null | undefined) => {
  const rgb = parseHex(color) ?? (parseHex(DEFAULT_BRAND) as [number, number, number]);
  const brand = toHex(rgb);
  const dark = toHex(rgb.map((v) => v * 0.55));
  const lum = (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 255;
  return { brand, dark, onBrand: lum > 0.62 ? INK : "#FFFFFF", amountOnWhite: lum > 0.62 ? dark : brand };
};

/** revvin.co/r/slug: no protocol, no www, no trailing slash. */
export const displayUrl = (url: string) => url.replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/$/, "");

/** (604) 219-4008 for 10 digit (or 1 + 10 digit) North American numbers, otherwise as entered. */
export const formatPhone = (phone: string | null | undefined) => {
  const raw = phone?.trim();
  if (!raw) return "";
  const d = raw.replace(/\D/g, "");
  const n = d.length === 11 && d.startsWith("1") ? d.slice(1) : d;
  return n.length === 10 ? `(${n.slice(0, 3)}) ${n.slice(3, 6)}-${n.slice(6)}` : raw;
};

type Layout = "row" | "stack" | "card";
interface Spec {
  layout: Layout;
  pad: number;
  /** Top zone kept clear for a hanger hole. */
  hole?: number;
  band: number;
  name: number;
  nameMin: number;
  logo: number;
  kicker?: number;
  amount: number;
  sub: number;
  label?: number;
  steps?: number;
  paidWhen?: boolean;
  foot?: number;
  phone?: boolean;
  fine?: number;
  gap: number;
}

// All sizes in inches at trim size. Minimums: 7pt (0.097in) on the card,
// 9pt (0.125in) on the hanger and flyer, and roughly 0.35in cap height
// (0.5in type) on the yard sign and magnet.
const SPECS: Record<string, Spec> = {
  "yard-sign": { layout: "row", pad: 0.9, band: 3, name: 1.6, nameMin: 0.9, logo: 2.1, kicker: 0.85, amount: 3.1, sub: 1.25, label: 0.6, foot: 0.75, gap: 0.45 },
  "door-hanger": { layout: "stack", pad: 0.3, hole: 2.25, band: 0.95, name: 0.36, nameMin: 0.2, logo: 0.62, kicker: 0.16, amount: 0.7, sub: 0.26, label: 0.15, steps: 0.14, foot: 0.13, phone: true, fine: 0.125, gap: 0.13 },
  "invoice-insert": { layout: "stack", pad: 0.55, band: 1.35, name: 0.6, nameMin: 0.3, logo: 0.95, kicker: 0.28, amount: 1.05, sub: 0.38, label: 0.2, steps: 0.19, paidWhen: true, foot: 0.17, phone: true, fine: 0.14, gap: 0.2 },
  "card-back": { layout: "card", pad: 0.16, band: 0.12, name: 0, nameMin: 0, logo: 0, amount: 0.3, sub: 0.12, label: 0.1, gap: 0.06 },
  "truck-magnet": { layout: "stack", pad: 0.3, band: 1.2, name: 0.62, nameMin: 0.5, logo: 0.85, amount: 1.1, sub: 0.5, label: 0.5, foot: 0.5, gap: 0.1 },
};

/** Shrink a single-line string to fit a width, never below a floor. Approximate glyph width ratio. */
const fit = (text: string, size: number, width: number, ratio: number, min: number) =>
  Math.max(min, Math.min(size, width / Math.max(1, text.length * ratio)));

// Everything is sized in inches so the same component is correct on screen at
// scale 1 and correct on paper. The QR sits in a white block with a quiet zone
// of four modules' worth of margin, never on the logo, never on a tint.
const AssetSheet = ({ asset, biz, url, scale = 1 }: Props) => {
  const [qr, setQr] = useState<string>("");

  useEffect(() => {
    let live = true;
    printQrDataUrl(url).then((d) => {
      if (live) setQr(d);
    });
    return () => {
      live = false;
    };
  }, [url]);

  const s = SPECS[asset.id] ?? SPECS["invoice-insert"];
  const pal = brandPalette(biz.brand_color);
  const quiet = Math.max(0.12, asset.qrIn * 0.08);
  const amount = biz.offer_amount?.trim();
  const trigger = biz.offer_trigger?.trim().replace(/[.\s]+$/, "");
  const kicker = biz.headline?.trim();
  const fine = biz.offer_fine_print?.trim();
  const link = displayUrl(url);
  const phone = s.phone ? formatPhone(biz.phone) : "";
  const innerW = asset.widthIn - s.pad * 2;

  const balance = { textWrap: "balance" } as CSSProperties;

  const qrBlock = (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
      <div style={{ background: "#FFFFFF", padding: `${quiet}in`, lineHeight: 0 }}>
        {qr ? (
          <img src={qr} alt="" style={{ width: `${asset.qrIn}in`, height: `${asset.qrIn}in`, display: "block" }} />
        ) : (
          <div style={{ width: `${asset.qrIn}in`, height: `${asset.qrIn}in`, background: "#F1F5F9" }} />
        )}
      </div>
      {s.label ? (
        <div style={{ fontFamily: BODY_FONT, fontWeight: 700, fontSize: `${s.label}in`, lineHeight: 1.1, color: pal.dark, letterSpacing: "0.02em", whiteSpace: "nowrap" }}>
          Scan to refer
        </div>
      ) : null}
    </div>
  );

  const headline = (align: "left" | "center", amountSize = s.amount, subSize = s.sub) =>
    amount ? (
      <div style={{ textAlign: align }}>
        <div style={{ ...balance, fontFamily: HEAD_FONT, fontWeight: 800, fontSize: `${amountSize}in`, lineHeight: 0.95, letterSpacing: "-0.01em", color: INK }}>
          Earn <span style={{ color: pal.amountOnWhite, whiteSpace: "nowrap" }}>{amount}</span>
        </div>
        <div style={{ fontFamily: BODY_FONT, fontWeight: 700, fontSize: `${subSize}in`, lineHeight: 1.1, color: INK, marginTop: `${subSize * 0.15}in` }}>
          for a referral
        </div>
      </div>
    ) : (
      <div style={{ ...balance, textAlign: align, fontFamily: HEAD_FONT, fontWeight: 800, fontSize: `${amountSize * 0.8}in`, lineHeight: 0.98, color: INK }}>
        Refer someone, get rewarded
      </div>
    );

  const sheetStyle: CSSProperties = {
    width: `${asset.widthIn}in`,
    height: `${asset.heightIn}in`,
    transform: scale === 1 ? undefined : `scale(${scale})`,
    transformOrigin: "top left",
    background: "#FFFFFF",
    color: INK,
    boxSizing: "border-box",
    fontFamily: BODY_FONT,
    overflow: "hidden",
    position: "relative",
    display: "flex",
    flexDirection: s.layout === "card" ? "row" : "column",
  };

  // Business card back: brand strip, headline left, QR right. Nothing else.
  if (s.layout === "card") {
    return (
      <div className="asset-sheet" style={sheetStyle}>
        <div style={{ width: `${s.band}in`, background: pal.brand, flexShrink: 0 }} />
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "space-evenly", gap: `${s.pad}in`, padding: `${s.pad}in`, minWidth: 0 }}>
          <div style={{ flex: 1, minWidth: 0 }}>{headline("left")}</div>
          {qrBlock}
        </div>
      </div>
    );
  }

  const nameSize = fit(biz.name, s.name, innerW * (s.layout === "row" ? 0.95 : 1), 0.56, s.nameMin);
  const band = (
    <div style={{ background: pal.brand, minHeight: `${s.band}in`, padding: `${s.band * 0.12}in ${s.pad}in`, boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: s.layout === "row" ? "flex-start" : "center", flexShrink: 0 }}>
      {biz.logo_url ? (
        <div style={{ background: "#FFFFFF", borderRadius: `${s.logo * 0.18}in`, padding: `${s.logo * 0.12}in ${s.logo * 0.2}in`, lineHeight: 0 }}>
          <img src={biz.logo_url} alt={biz.name} style={{ height: `${s.logo}in`, maxWidth: `${innerW * 0.7}in`, objectFit: "contain", display: "block" }} />
        </div>
      ) : (
        <div style={{ ...balance, color: pal.onBrand, fontWeight: 700, fontSize: `${nameSize}in`, lineHeight: 1.05, letterSpacing: "-0.01em", textAlign: s.layout === "row" ? "left" : "center", overflowWrap: "anywhere" }}>
          {biz.name}
        </div>
      )}
    </div>
  );

  const linkSize = s.foot ? fit(link, s.foot, innerW, 0.5, Math.min(s.foot, s.layout === "row" ? 0.5 : 0.125)) : 0;
  const footer = s.foot ? (
    <div style={{ padding: s.layout === "row" ? `0 ${s.pad}in ${s.pad * 0.8}in` : 0, flexShrink: 0 }}>
      <div style={{ borderTop: `${Math.max(0.01, s.foot * 0.06)}in solid ${RULE}`, paddingTop: `${s.foot * 0.5}in`, textAlign: s.layout === "row" ? "left" : "center" }}>
        <div style={{ fontWeight: 600, fontSize: `${linkSize}in`, lineHeight: 1.2, whiteSpace: "nowrap", color: INK }}>
          {link}
          {phone ? <span style={{ color: MUTED }}>{"  ·  "}{phone}</span> : null}
        </div>
        {s.fine && fine ? (
          <div style={{ ...balance, fontWeight: 500, fontSize: `${s.fine}in`, lineHeight: 1.3, color: MUTED, marginTop: `${s.fine * 0.4}in` }}>{fine}</div>
        ) : null}
      </div>
    </div>
  ) : null;

  const kickerEl = s.kicker && kicker ? (
    <div style={{ ...balance, fontWeight: 600, fontSize: `${s.kicker}in`, lineHeight: 1.2, color: pal.dark, textAlign: s.layout === "row" ? "left" : "center" }}>
      {kicker}
    </div>
  ) : null;

  const steps = s.steps ? (
    <ol style={{ listStyle: "none", margin: 0, padding: 0, fontSize: `${s.steps}in`, lineHeight: 1.3, fontWeight: 500, color: INK, textAlign: "left" }}>
      <li style={{ fontWeight: 700, color: pal.dark, marginBottom: `${s.steps * 0.2}in` }}>How it works</li>
      <li>1. Scan the code.</li>
      <li>2. Tell us who needs us.</li>
      <li>{trigger ? `3. Get paid when ${trigger}.` : "3. Get paid."}</li>
    </ol>
  ) : null;

  const paidWhen = s.paidWhen && trigger ? (
    <div style={{ ...balance, fontSize: `${s.steps ?? s.sub}in`, fontWeight: 600, color: MUTED, textAlign: "center" }}>Paid when {trigger}</div>
  ) : null;

  return (
    <div className="asset-sheet" style={sheetStyle}>
      {s.hole ? (
        <div style={{ height: `${s.hole}in`, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="asset-cut-guide" aria-hidden style={{ width: "1.75in", height: "1.75in", borderRadius: "50%", border: `0.02in dashed ${RULE}` }} />
        </div>
      ) : null}
      {band}
      {s.layout === "row" ? (
        <div style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: `${s.pad}in`, padding: `${s.pad * 0.6}in ${s.pad}in` }}>
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: `${s.gap}in` }}>
            {kickerEl}
            {headline("left")}
          </div>
          {qrBlock}
        </div>
      ) : (
        <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: `${s.gap}in`, padding: `${s.pad * 0.6}in ${s.pad}in` }}>
          {kickerEl}
          {headline("center")}
          {qrBlock}
          {steps}
          {paidWhen}
          <div style={{ alignSelf: "stretch", marginTop: `${s.gap}in` }}>{footer}</div>
        </div>
      )}
      {s.layout === "row" ? footer : null}
    </div>
  );
};

export default AssetSheet;
