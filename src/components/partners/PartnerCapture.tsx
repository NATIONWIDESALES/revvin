import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { capturePartnerFromSearch } from "@/lib/partnerLink";

/**
 * Watches every navigation for ?via= or ?ref= and holds the partner code
 * locally. The code is only stored once the server confirms it belongs to an
 * approved partner, and nothing about the visitor is stored with the click.
 */
const PartnerCapture = () => {
  const { search } = useLocation();

  useEffect(() => {
    if (!search) return;
    if (!/[?&](via|ref)=/.test(search)) return;
    void capturePartnerFromSearch(search);
  }, [search]);

  return null;
};

export default PartnerCapture;
