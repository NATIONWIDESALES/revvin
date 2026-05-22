import { Link } from "react-router-dom";
import Wordmark from "@/components/brand/Wordmark";

const Footer = () => {
  return (
    <footer className="bg-ink text-white/70">
      <div className="container py-16">
        <div className="grid gap-12 md:grid-cols-12">
          <div className="md:col-span-6">
            <Link to="/" aria-label="Revvin.co home" className="inline-block">
              <Wordmark size="lg" variant="white" />
            </Link>
            <p className="mt-5 max-w-md text-sm leading-relaxed text-white/60">
              Revvin gives your business the referral infrastructure. You handle the relationship.
            </p>
            <p className="mt-5 text-xs uppercase tracking-[0.18em] text-white/40">
              Available in Canada and the United States
            </p>
          </div>

          <div className="md:col-span-3">
            <h4 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50">
              Product
            </h4>
            <div className="space-y-3">
              <Link to="/how-it-works" className="block text-sm text-white/80 transition-colors hover:text-white">How it works</Link>
              <Link to="/pricing" className="block text-sm text-white/80 transition-colors hover:text-white">Pricing</Link>
              <Link to="/signup" className="block text-sm text-white/80 transition-colors hover:text-white">Start your referral program</Link>
              <Link to="/auth" className="block text-sm text-white/80 transition-colors hover:text-white">Log in</Link>
            </div>
          </div>

          <div className="md:col-span-3">
            <h4 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50">
              Company
            </h4>
            <div className="space-y-3">
              <Link to="/terms" className="block text-sm text-white/80 transition-colors hover:text-white">Terms</Link>
              <Link to="/privacy" className="block text-sm text-white/80 transition-colors hover:text-white">Privacy</Link>
            </div>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-start justify-between gap-4 border-t border-white/10 pt-6 sm:flex-row sm:items-center">
          <p className="text-xs text-white/40">&copy; {new Date().getFullYear()} Revvin. All rights reserved.</p>
          <p className="text-xs text-white/40">$49/month · cancel anytime · free tier for referrers</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;