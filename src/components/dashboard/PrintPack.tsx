import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { PRINT_ASSETS } from "@/lib/printAssets";
import AssetSheet, { type SheetBusiness } from "@/components/print/AssetSheet";

// Every preview sits in the same fixed frame, scaled to fit and centered, so a
// landscape sign does not leave a tall empty card beside the door hanger.
const FRAME_W = 300; // px
const FRAME_H = 260; // px
const PX_PER_IN = 96;

const PrintPack = ({ biz, publicUrl }: { biz: SheetBusiness & { slug?: string | null }; publicUrl: string }) => (
  <div className="rounded-2xl border border-border bg-card p-6">
    <h3 className="text-sm font-semibold text-foreground">Print pack</h3>
    <p className="mt-1 text-sm text-muted-foreground">
      Five ready-to-print pieces carrying your logo, your offer, your link and a QR code sized for how far
      away it gets scanned. Open one, hit print, choose Save as PDF, and send that file to any print shop.
      Nothing here is fabricated: the offer text is whatever you set up on your page.
    </p>

    <div className="mt-5 grid items-start gap-5 sm:grid-cols-2">
      {PRINT_ASSETS.map((asset) => {
        const scale = Math.min(FRAME_W / (asset.widthIn * PX_PER_IN), FRAME_H / (asset.heightIn * PX_PER_IN));
        const w = asset.widthIn * PX_PER_IN * scale;
        const h = asset.heightIn * PX_PER_IN * scale;
        return (
          <div key={asset.id} className="rounded-xl border border-border bg-background p-4">
            <div className="mx-auto flex items-center justify-center rounded-md bg-muted/50" style={{ width: FRAME_W, maxWidth: "100%", height: FRAME_H }}>
              <div className="overflow-hidden rounded-sm border border-border bg-white shadow-sm" style={{ width: w, height: h }}>
                <AssetSheet asset={asset} biz={biz} url={publicUrl} scale={scale} />
              </div>
            </div>
            <div className="mt-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{asset.name}</p>
                <p className="text-xs text-muted-foreground">
                  {asset.widthIn} by {asset.heightIn} in · {asset.qrIn} in QR for {asset.scanDistance}
                </p>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link to={`/print/${asset.id}`} target="_blank" rel="noopener noreferrer">
                  <Printer className="mr-1.5 h-3.5 w-3.5" /> Open
                </Link>
              </Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{asset.where}</p>
          </div>
        );
      })}
    </div>
  </div>
);

export default PrintPack;
