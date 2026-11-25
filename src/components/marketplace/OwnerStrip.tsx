import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/track";

/** "Own a business?" strip shared by the marketplace and the homepage. */
export default function OwnerStrip({ className = "" }: { className?: string }) {
  return (
    <div className={`rounded-xl border border-line bg-card p-5 sm:flex sm:items-center sm:justify-between sm:gap-6 ${className}`}>
      <p className="text-base font-semibold text-forest">Own a business? List it free and get your own referral program.</p>
      <Button asChild className="mt-4 h-11 w-full shrink-0 sm:mt-0 sm:w-auto">
        <Link to="/signup" onClick={() => track("cta_clicked", { cta: "owner_strip_list_free" })}>List your business free</Link>
      </Button>
    </div>
  );
}
