import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import revvinLogo from "@/assets/revvin-logo.png";
import { Button } from "@/components/ui/button";

const Footer = () => {
  return (
    <footer className="border-t border-border bg-card py-14">
      <div className="container">
        {/* Add Your Business CTA */}
        <div className="mb-10 rounded-2xl border border-primary/20 bg-primary/5 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="font-display text-lg font-bold">Add Your Business to Revvin</h3>
            <p className="text-sm text-muted-foreground">Pay only for closed deals. Start receiving referrals today.</p>
          </div>
          <Button asChild className="gap-2 shrink-0">
            <Link to="/auth?mode=signup&role=business">Create Business Account <ArrowRight className="h-4 w-4" /></Link>
          </Button>
        </div>

        <div className="grid gap-10 md:grid-cols-4">
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <img src={revvinLogo} alt="Revvin" className="h-10 w-10 object-contain" />
              <span className="font-display text-lg font-bold">Revvin</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Pay-per-close customer acquisition powered by human introductions. Not ads. Not affiliates. Real referrals.
            </p>
          </div>

          <div>
            <h4 className="font-display font-bold mb-4 text-sm">Platform</h4>
            <div className="space-y-2.5">
              <Link to="/browse" className="block text-sm text-muted-foreground hover:text-primary transition-colors">Marketplace</Link>
              <Link to="/how-it-works" className="block text-sm text-muted-foreground hover:text-primary transition-colors">How It Works</Link>
              <Link to="/for-businesses" className="block text-sm text-muted-foreground hover:text-primary transition-colors">For Businesses</Link>
              <Link to="/for-referrers" className="block text-sm text-muted-foreground hover:text-primary transition-colors">For Referrers</Link>
              <Link to="/trust" className="block text-sm text-muted-foreground hover:text-primary transition-colors">Trust & Payouts</Link>
            </div>
          </div>

          <div>
            <h4 className="font-display font-bold mb-4 text-sm">Resources</h4>
            <div className="space-y-2.5">
              <Link to="/auth?mode=signup&role=referrer" className="block text-sm text-muted-foreground hover:text-primary transition-colors">Start Earning</Link>
              <Link to="/auth?mode=signup&role=business" className="block text-sm text-muted-foreground hover:text-primary transition-colors">List Your Business</Link>
              <Link to="/browse" className="block text-sm text-muted-foreground hover:text-primary transition-colors">Browse Offers</Link>
              <Link to="/trust" className="block text-sm text-muted-foreground hover:text-primary transition-colors">Trust Center</Link>
            </div>
          </div>

          <div>
            <h4 className="font-display font-bold mb-4 text-sm">Legal</h4>
            <div className="space-y-2.5">
              <Link to="/privacy" className="block text-sm text-muted-foreground hover:text-primary transition-colors">Privacy Policy</Link>
              <Link to="/terms" className="block text-sm text-muted-foreground hover:text-primary transition-colors">Terms of Service</Link>
              <Link to="/referral-agreement" className="block text-sm text-muted-foreground hover:text-primary transition-colors">Referral Agreement</Link>
            </div>
          </div>
        </div>

        <div className="mt-12 border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} Revvin. All rights reserved.</p>
          <p className="text-xs text-muted-foreground">Pay-per-close customer acquisition — powered by referrals</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
