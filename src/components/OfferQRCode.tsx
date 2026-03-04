import { useRef, useEffect, useState } from "react";
import QRCodeStyling from "qr-code-styling";
import { Button } from "@/components/ui/button";
import { toSlug } from "@/lib/utils";
import { Copy, Check, Download, Printer } from "lucide-react";

interface OfferQRCodeProps {
  offerId: string;
  businessName: string;
  offerTitle: string;
  payoutAmount: number;
  payoutCurrency: string;
  compact?: boolean;
}

const createQR = (data: string, size: number) =>
  new QRCodeStyling({
    width: size,
    height: size,
    data,
    dotsOptions: { color: "#0F172A", type: "rounded" },
    cornersSquareOptions: { color: "#15803D", type: "extra-rounded" },
    cornersDotOptions: { color: "#15803D", type: "dot" },
    backgroundOptions: { color: "#ffffff" },
    qrOptions: { errorCorrectionLevel: "H" },
  });

const OfferQRCode = ({ offerId, businessName, offerTitle, payoutAmount, payoutCurrency, compact = false }: OfferQRCodeProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const qrRef = useRef<QRCodeStyling | null>(null);
  const [copied, setCopied] = useState(false);

  const slug = toSlug(businessName);
  const offerUrl = `${window.location.origin}/offer/${slug}/${offerId}`;

  useEffect(() => {
    if (!ref.current) return;
    const qr = createQR(offerUrl, compact ? 200 : 280);
    ref.current.innerHTML = "";
    qr.append(ref.current);
    qrRef.current = qr;
    return () => {
      if (ref.current) ref.current.innerHTML = "";
    };
  }, [offerUrl, compact]);

  const handleCopy = () => {
    navigator.clipboard.writeText(offerUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = (ext: "png" | "svg") => {
    const hq = createQR(offerUrl, 1024);
    hq.download({ name: `${slug}-qr`, extension: ext });
  };

  const handlePrint = () => {
    const qrCanvas = ref.current?.querySelector("canvas");
    if (!qrCanvas) return;
    const dataUrl = qrCanvas.toDataURL("image/png");
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>QR — ${businessName}</title><style>body{margin:0;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;font-family:system-ui,sans-serif;text-align:center}img{width:400px;height:400px}h1{font-size:24px;margin:24px 0 8px}p{color:#64748b;font-size:14px;margin:4px 0}@media print{body{padding:0}}</style></head><body><h1>${businessName}</h1><p>Scan to refer a customer</p><img src="${dataUrl}" /><p style="margin-top:16px;font-size:12px;word-break:break-all">${offerUrl}</p><script>window.onload=()=>window.print()</script></body></html>`);
    w.document.close();
  };

  if (compact) {
    return (
      <div className="flex flex-col items-center gap-3 p-4">
        <div ref={ref} />
        <p className="text-xs text-muted-foreground text-center">Scan to view this offer</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => handleDownload("png")}>
            <Download className="h-3 w-3" /> PNG
          </Button>
          <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => handleDownload("svg")}>
            <Download className="h-3 w-3" /> SVG
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <p className="text-sm font-medium text-muted-foreground mb-4 text-center">
        Share this with your customers, partners, and network
      </p>
      <div className="flex justify-center mb-3" ref={ref} />
      <p className="text-xs text-muted-foreground text-center mb-4">
        Scan to view this offer and start referring
      </p>
      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 rounded-lg border border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground truncate select-all">
          {offerUrl}
        </div>
        <Button variant="outline" size="sm" className="gap-1 shrink-0" onClick={handleCopy}>
          {copied ? <><Check className="h-3.5 w-3.5" /> Copied!</> : <><Copy className="h-3.5 w-3.5" /> Copy</>}
        </Button>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => handleDownload("png")}>
          <Download className="h-3 w-3" /> Download PNG
        </Button>
        <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => handleDownload("svg")}>
          <Download className="h-3 w-3" /> Download SVG
        </Button>
        <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={handlePrint}>
          <Printer className="h-3 w-3" /> Print
        </Button>
      </div>
    </div>
  );
};

export default OfferQRCode;
