import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { capturePartnerFromSearch } from "@/lib/partnerLink";

/**
 * Watches every navigation for ?via= or ?ref= and holds the partner code
 * locally. The code is only stored once the server confirms it belongs to an
 * approved partner, and nothing about the visitor is stored with the click.
 */
const PartnerCapture = () => {
  const { search, pathname } = useLocation();

  useEffect(() => {
    const held = partnerSearchFor(pathname, search);
    if (held) void capturePartnerFromSearch(held);
  }, [search, pathname]);

  return null;
};

/**
 * On business referral pages (/r/...) ?ref= is a referrer's personal link
 * token, never a partner code, so only ?via= is passed on there.
 */
export function partnerSearchFor(pathname: string, search: string): string | null {
  if (!search) return null;
  if (pathname.startsWith("/r/")) {
    const via = new URLSearchParams(search).get("via");
    return via ? `?via=${encodeURIComponent(via)}` : null;
  }
  return /[?&](via|ref)=/.test(search) ? search : null;
}

export default PartnerCapture;
