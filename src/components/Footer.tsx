import { Link } from "react-router-dom";
import revvinLogo from "@/assets/revvin-logo.png";

const Footer = () => {
  return (
    <footer className="border-t border-border bg-card py-10">
      <div className="container">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <img src={revvinLogo} alt="Revvin" className="h-8 w-8 object-contain" />
              <span className="font-display text-base font-bold">Revvin</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Pay-per-close customer acquisition powered by human introductions.
            </p>
          </div>

          <div>
            <h4 className="font-display font-bold mb-3 text-xs uppercase tracking-wider text-muted-foreground">Platform</h4>
            <div className="space-y-2">
              <Link to="/browse" className="block text-sm text-muted-foreground hover:text-primary transition-colors">Browse Offers</Link>
              <Link to="/how-it-works" className="block text-sm text-muted-foreground hover:text-primary transition-colors">How It Works</Link>
              <Link to="/for-businesses" className="block text-sm text-muted-foreground hover:text-primary transition-colors">For Businesses</Link>
              <Link to="/for-referrers" className="block text-sm text-muted-foreground hover:text-primary transition-colors">For Referrers</Link>
            </div>
          </div>

          <div>
            <h4 className="font-display font-bold mb-3 text-xs uppercase tracking-wider text-muted-foreground">Support</h4>
            <div className="space-y-2">
              <Link to="/trust" className="block text-sm text-muted-foreground hover:text-primary transition-colors">Trust Center</Link>
              <Link to="/auth?mode=signup&role=business" className="block text-sm text-muted-foreground hover:text-primary transition-colors">List Your Business</Link>
              <Link to="/auth?mode=signup&role=referrer" className="block text-sm text-muted-foreground hover:text-primary transition-colors">Start Earning</Link>
            </div>
          </div>

          <div>
            <h4 className="font-display font-bold mb-3 text-xs uppercase tracking-wider text-muted-foreground">Legal</h4>
            <div className="space-y-2">
              <Link to="/privacy" className="block text-sm text-muted-foreground hover:text-primary transition-colors">Privacy Policy</Link>
              <Link to="/terms" className="block text-sm text-muted-foreground hover:text-primary transition-colors">Terms of Service</Link>
              <Link to="/referral-agreement" className="block text-sm text-muted-foreground hover:text-primary transition-colors">Referral Agreement</Link>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-border pt-6 text-center">
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Revvin. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
