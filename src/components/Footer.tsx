import { Link } from "react-router-dom";
import { Zap } from "lucide-react";

const Footer = () => {
  return (
    <footer className="border-t border-border bg-card py-14">
      <div className="container">
        <div className="grid gap-10 md:grid-cols-4">
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <Zap className="h-3.5 w-3.5 text-primary-foreground" />
              </div>
              <span className="font-display text-lg font-bold">Revvin</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              The performance-based referral marketplace. Businesses acquire customers. Referrers earn commissions. Everyone wins.
            </p>
          </div>

          <div>
            <h4 className="font-display font-bold mb-4 text-sm">Platform</h4>
            <div className="space-y-2.5">
              <Link to="/browse" className="block text-sm text-muted-foreground hover:text-primary transition-colors">Marketplace</Link>
              <Link to="/how-it-works" className="block text-sm text-muted-foreground hover:text-primary transition-colors">How It Works</Link>
              <Link to="/auth?mode=signup&role=referrer" className="block text-sm text-muted-foreground hover:text-primary transition-colors">Start Earning</Link>
              <Link to="/auth?mode=signup&role=business" className="block text-sm text-muted-foreground hover:text-primary transition-colors">For Businesses</Link>
            </div>
          </div>

          <div>
            <h4 className="font-display font-bold mb-4 text-sm">Company</h4>
            <div className="space-y-2.5">
              <Link to="/" className="block text-sm text-muted-foreground hover:text-primary transition-colors">About</Link>
              <Link to="/" className="block text-sm text-muted-foreground hover:text-primary transition-colors">Blog</Link>
              <Link to="/" className="block text-sm text-muted-foreground hover:text-primary transition-colors">Careers</Link>
              <Link to="/" className="block text-sm text-muted-foreground hover:text-primary transition-colors">Contact</Link>
            </div>
          </div>

          <div>
            <h4 className="font-display font-bold mb-4 text-sm">Legal</h4>
            <div className="space-y-2.5">
              <Link to="/" className="block text-sm text-muted-foreground hover:text-primary transition-colors">Privacy Policy</Link>
              <Link to="/" className="block text-sm text-muted-foreground hover:text-primary transition-colors">Terms of Service</Link>
              <Link to="/" className="block text-sm text-muted-foreground hover:text-primary transition-colors">Referral Agreement</Link>
            </div>
          </div>
        </div>

        <div className="mt-12 border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} Revvin. All rights reserved.</p>
          <p className="text-xs text-muted-foreground">Performance-based referral marketplace</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
