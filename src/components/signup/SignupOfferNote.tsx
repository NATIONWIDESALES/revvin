import { useLocation } from "react-router-dom";
import { useSale } from "@/lib/useSale";
import { SALE_PRICE_TEXT } from "@/config/pricing";

// Ad-to-landing match for /signup?offer=bf2026. Visibility follows the same
// server-clock sale state as the banner, so it hides at the deadline.
export default function SignupOfferNote() {
  const { search } = useLocation();
  const offer = new URLSearchParams(search).get("offer") === "bf2026";
  const live = useSale(false, offer);
  if (!offer || !live) return null;
  return (
    <aside aria-label="Early Black Friday offer" className="mb-4 rounded-md border-l-4 border-sign bg-forest px-4 py-3 text-sm leading-snug text-primary-foreground">
      <p className="font-bold">
        <span className="text-sign">Early Black Friday:</span> Revvin Pro 30% off monthly ({SALE_PRICE_TEXT.monthly}/mo), 40% off yearly ({SALE_PRICE_TEXT.annual}/yr).
      </p>
      <p className="mt-1 text-primary-foreground/85">Locked in for as long as you stay subscribed. Create your free account first, then claim it on the billing step. Ends Nov 30.</p>
    </aside>
  );
}
