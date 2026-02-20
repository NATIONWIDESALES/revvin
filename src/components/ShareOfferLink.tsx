import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Link2, Check } from "lucide-react";

interface ShareOfferLinkProps {
  offerId?: string;
  offerTitle?: string;
  variant?: "button" | "icon";
}

const ShareOfferLink = ({ offerId, offerTitle, variant = "button" }: ShareOfferLinkProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/offer/${offerId}`;
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
    <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1.5">
      {copied ? <><Check className="h-3.5 w-3.5" /> Copied!</> : <><Link2 className="h-3.5 w-3.5" /> Share Link</>}
    </Button>
  );
};

export default ShareOfferLink;
