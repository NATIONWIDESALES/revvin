import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, Printer, ArrowLeft } from "lucide-react";
import { getPrintAsset } from "@/lib/printAssets";
import AssetSheet, { type SheetBusiness } from "@/components/print/AssetSheet";

// A standalone page per asset. The @page rule below is what makes the browser's
// own "Save as PDF" produce a correctly sized, borderless file, so there is no
// PDF library in the bundle.
const PrintAssetPage = () => {
  const { asset: assetId } = useParams<{ asset: string }>();
  const asset = getPrintAsset(assetId);
  const [biz, setBiz] = useState<(SheetBusiness & { slug: string | null }) | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from("businesses")
        .select("name, slug, logo_url, offer_amount, offer_trigger, offer_fine_print, phone")
        .eq("user_id", auth.user.id)
        .limit(1);
      setBiz((data?.[0] as never) ?? null);
      setLoading(false);
    })();
  }, []);

  if (!asset) {
    return <div className="p-10 text-center text-sm text-muted-foreground">Unknown asset.</div>;
  }

  if (loading) {
    return (
      <div className="flex justify-center p-16">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!biz) {
    return (
      <div className="p-10 text-center text-sm text-muted-foreground">
        Sign in to your business account to print this.
      </div>
    );
  }

  const url = `${window.location.origin}/r/${biz.slug ?? ""}`;

  return (
    <div className="min-h-screen bg-muted/40">
      <style>{`
        @page { size: ${asset.widthIn}in ${asset.heightIn}in; margin: 0; }
        @media print {
          html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
          .print-chrome { display: none !important; }
          .print-stage { padding: 0 !important; background: #fff !important; }
          .asset-sheet { box-shadow: none !important; transform: none !important; }
        }
      `}</style>

      <div className="print-chrome border-b border-border bg-background px-6 py-3">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
          <div>
            <Link to="/dashboard?tab=share" className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground">
              <ArrowLeft className="mr-1.5 h-3 w-3" /> Back to Share Tools
            </Link>
            <h1 className="mt-1 text-sm font-semibold text-foreground">
              {asset.name} · {asset.widthIn} by {asset.heightIn} inches
            </h1>
            <p className="text-xs text-muted-foreground">
              QR is {asset.qrIn} inches, sized for {asset.scanDistance}. In the print dialog choose
              "Save as PDF", set margins to None and turn on background graphics.
            </p>
          </div>
          <Button onClick={() => window.print()}>
            <Printer className="mr-2 h-3.5 w-3.5" /> Print / Save as PDF
          </Button>
        </div>
      </div>

      <div className="print-stage overflow-auto p-8">
        <div className="mx-auto w-fit shadow-lg">
          <AssetSheet asset={asset} biz={biz} url={url} />
        </div>
      </div>

      <div className="print-chrome mx-auto max-w-3xl px-6 pb-16">
        <div className="rounded-2xl border border-border bg-card p-6 text-sm">
          <h2 className="text-sm font-semibold text-foreground">Where it goes</h2>
          <p className="mt-1 text-muted-foreground">{asset.where}</p>
          <h2 className="mt-4 text-sm font-semibold text-foreground">What to say</h2>
          <p className="mt-1 text-muted-foreground">{asset.say}</p>
          <h2 className="mt-4 text-sm font-semibold text-foreground">Print spec</h2>
          <p className="mt-1 text-muted-foreground">{asset.printNote}</p>
        </div>
      </div>
    </div>
  );
};

export default PrintAssetPage;
