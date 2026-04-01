import { Link } from "react-router-dom";
import revvinLogo from "@/assets/revvin-logo.png";

const Footer = () => {
  return (
    <footer className="border-t border-border bg-background py-12">
      <div className="container">
        <div className="grid gap-10 md:grid-cols-5">
          <div className="md:col-span-2">
            <div className="flex items-center mb-3">
              <img src={revvinLogo} alt="Revvin" className="h-[30px] w-auto object-contain" />
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              The referral marketplace where businesses list offers and people earn by sending customers.
            </p>
            <div className="mt-4 flex gap-3">
              <span className="text-xs text-muted-foreground">🇨🇦 Canada</span>
              <span className="text-xs text-muted-foreground">🇺🇸 USA</span>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-3 text-xs uppercase tracking-wider text-muted-foreground">Marketplace</h4>
            <div className="space-y-2.5">
              <Link to="/browse" className="block text-sm text-muted-foreground hover:text-foreground hover:underline transition-colors">Browse Offers</Link>
              <Link to="/for-businesses" className="block text-sm text-muted-foreground hover:text-foreground hover:underline transition-colors">For Businesses</Link>
              <Link to="/for-referrers" className="block text-sm text-muted-foreground hover:text-foreground hover:underline transition-colors">For Referrers</Link>
              
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-3 text-xs uppercase tracking-wider text-muted-foreground">Company</h4>
            <div className="space-y-2.5">
              <Link to="/how-it-works" className="block text-sm text-muted-foreground hover:text-foreground hover:underline transition-colors">How It Works</Link>
              <Link to="/trust" className="block text-sm text-muted-foreground hover:text-foreground hover:underline transition-colors">Trust Center</Link>
              <Link to="/auth?mode=signup&role=business" className="block text-sm text-muted-foreground hover:text-foreground hover:underline transition-colors">List Your Business</Link>
              <Link to="/auth?mode=signup&role=referrer" className="block text-sm text-muted-foreground hover:text-foreground hover:underline transition-colors">Start Earning</Link>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-3 text-xs uppercase tracking-wider text-muted-foreground">Legal</h4>
            <div className="space-y-2.5">
              <Link to="/privacy" className="block text-sm text-muted-foreground hover:text-foreground hover:underline transition-colors">Privacy Policy</Link>
              <Link to="/terms" className="block text-sm text-muted-foreground hover:text-foreground hover:underline transition-colors">Terms of Service</Link>
              <Link to="/referral-agreement" className="block text-sm text-muted-foreground hover:text-foreground hover:underline transition-colors">Referral Agreement</Link>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">&copy; {new Date().getFullYear()} Revvin. All rights reserved.</p>
          <p className="text-xs text-muted-foreground">Free to list · No credit card required</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
