import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { PRINT_ASSETS } from "@/lib/printAssets";
import AssetSheet, { type SheetBusiness } from "@/components/print/AssetSheet";

const PREVIEW_W = 300; // px

const PrintPack = ({ biz, publicUrl }: { biz: SheetBusiness & { slug?: string | null }; publicUrl: string }) => (
  <div className="rounded-2xl border border-border bg-card p-6">
    <h3 className="text-sm font-semibold text-foreground">Print pack</h3>
    <p className="mt-1 text-sm text-muted-foreground">
      Five ready-to-print pieces carrying your logo, your offer, your link and a QR code sized for how far
      away it gets scanned. Open one, hit print, choose Save as PDF, and send that file to any print shop.
      Nothing here is fabricated: the offer text is whatever you set up on your page.
    </p>

    <div className="mt-5 grid gap-5 sm:grid-cols-2">
      {PRINT_ASSETS.map((asset) => {
        const scale = PREVIEW_W / (asset.widthIn * 96);
        return (
          <div key={asset.id} className="rounded-xl border border-border bg-background p-4">
            <div
              className="mx-auto overflow-hidden rounded-md border border-border bg-white"
              style={{ width: PREVIEW_W, height: asset.heightIn * 96 * scale }}
            >
              <AssetSheet asset={asset} biz={biz} url={publicUrl} scale={scale} />
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
