import { useEffect, useState } from "react";
import { printQrDataUrl } from "@/lib/printQr";
import type { PrintAsset } from "@/lib/printAssets";

export interface SheetBusiness {
  name: string;
  logo_url?: string | null;
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

  const tiny = asset.widthIn <= 4; // card back and door hanger get shorter copy
  const pad = Math.max(0.2, asset.widthIn * 0.05);
  const quiet = Math.max(0.12, asset.qrIn * 0.08);
  const base = asset.heightIn * 0.055; // type scale tied to the physical size
  const headline = biz.offer_amount?.trim()
    ? `Earn ${biz.offer_amount.trim()} for a referral`
    : "Refer someone, get rewarded";
  const trigger = biz.offer_trigger?.trim();
  const stacked = asset.heightIn / asset.widthIn > 1.3; // door hanger, flyer

  return (
    <div
      className="asset-sheet"
      style={{
        width: `${asset.widthIn}in`,
        height: `${asset.heightIn}in`,
        transform: scale === 1 ? undefined : `scale(${scale})`,
        transformOrigin: "top left",
        background: "#ffffff",
        color: "#0F172A",
        padding: `${pad}in`,
        boxSizing: "border-box",
        display: "flex",
        flexDirection: stacked ? "column" : "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: `${pad * 0.8}in`,
        fontFamily: "Inter, system-ui, sans-serif",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: `${base * 0.22}in`,
          textAlign: stacked ? "center" : "left",
          alignItems: stacked ? "center" : "flex-start",
          flex: 1,
          minWidth: 0,
        }}
      >
        {biz.logo_url ? (
          <img
            src={biz.logo_url}
            alt=""
            style={{ height: `${base * 1.1}in`, objectFit: "contain", maxWidth: "100%" }}
          />
        ) : null}
        <div style={{ fontSize: `${base * 0.62}in`, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.05 }}>
          {biz.name}
        </div>
        <div style={{ fontSize: `${base}in`, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.02 }}>
          {headline}
        </div>
        {!tiny && trigger ? (
          <div style={{ fontSize: `${base * 0.42}in`, color: "#475569", lineHeight: 1.25, maxWidth: "9in" }}>
            Paid when {trigger}
          </div>
        ) : null}
        <div style={{ fontSize: `${base * 0.4}in`, color: "#0F172A", fontWeight: 600, lineHeight: 1.2 }}>
          Scan the code to send someone over
        </div>
        {!tiny ? (
          <div style={{ fontSize: `${base * 0.3}in`, color: "#64748B", wordBreak: "break-all", maxWidth: "8in" }}>
            {url}
            {biz.phone ? `  ·  ${biz.phone}` : ""}
          </div>
        ) : null}
        {!tiny && biz.offer_fine_print?.trim() ? (
          <div style={{ fontSize: `${base * 0.24}in`, color: "#94A3B8", lineHeight: 1.3, maxWidth: "8in" }}>
            {biz.offer_fine_print.trim()}
          </div>
        ) : null}
      </div>

      <div
        style={{
          background: "#ffffff",
          padding: `${quiet}in`,
          flexShrink: 0,
          lineHeight: 0,
        }}
      >
        {qr ? (
          <img
            src={qr}
            alt=""
            style={{ width: `${asset.qrIn}in`, height: `${asset.qrIn}in`, display: "block" }}
          />
        ) : (
          <div style={{ width: `${asset.qrIn}in`, height: `${asset.qrIn}in`, background: "#F1F5F9" }} />
        )}
      </div>
    </div>
  );
};

export default AssetSheet;
