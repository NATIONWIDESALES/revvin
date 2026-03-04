import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Link2, Check, QrCode } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { toSlug } from "@/lib/utils";
import OfferQRCode from "@/components/OfferQRCode";

interface ShareOfferLinkProps {
  offerId?: string;
  offerTitle?: string;
  businessName?: string;
  variant?: "button" | "icon";
}

const ShareOfferLink = ({ offerId, offerTitle, businessName, variant = "button" }: ShareOfferLinkProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const slug = businessName ? toSlug(businessName) : null;
    const url = slug
      ? `${window.location.origin}/offer/${slug}/${offerId}`
      : `${window.location.origin}/offer/${offerId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (variant === "icon") {
    return (
      <button onClick={handleCopy} className="inline-flex items-center justify-center rounded-full hover:bg-muted p-1.5 transition-colors" title="Copy offer link">
        {copied ? <Check className="h-3.5 w-3.5 text-earnings" /> : <Link2 className="h-3.5 w-3.5 text-muted-foreground" />}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1.5">
        {copied ? <><Check className="h-3.5 w-3.5" /> Copied!</> : <><Link2 className="h-3.5 w-3.5" /> Share Link</>}
      </Button>
      {offerId && (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="icon" className="h-9 w-9" title="Show QR Code">
              <QrCode className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <OfferQRCode
              offerId={offerId}
              businessName={businessName ?? "Business"}
              offerTitle={offerTitle ?? "Offer"}
              payoutAmount={0}
              payoutCurrency="USD"
              compact
            />
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
};

export default ShareOfferLink;
