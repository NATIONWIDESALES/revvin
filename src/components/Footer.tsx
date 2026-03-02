import { Link } from "react-router-dom";
import revvinLogo from "@/assets/revvin-logo.png";

const Footer = () => {
  return (
    <footer className="border-t border-border bg-background py-12">
      <div className="container">
        <div className="grid gap-10 md:grid-cols-4">
          <div>
            <div className="flex items-center mb-3">
              <img src={revvinLogo} alt="Revvin" className="h-[30px] w-auto object-contain" />
            </div>
            <p className="text-[13px] text-muted-foreground leading-relaxed">
              Customer acquisition powered by the people who already trust you.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-3 text-xs uppercase tracking-wider text-muted-foreground">Platform</h4>
            <div className="space-y-2.5">
              <Link to="/browse" className="block text-[13px] text-muted-foreground hover:text-foreground transition-colors">Browse Offers</Link>
              <Link to="/how-it-works" className="block text-[13px] text-muted-foreground hover:text-foreground transition-colors">How It Works</Link>
              <Link to="/for-businesses" className="block text-[13px] text-muted-foreground hover:text-foreground transition-colors">For Businesses</Link>
              <Link to="/for-referrers" className="block text-[13px] text-muted-foreground hover:text-foreground transition-colors">For Referrers</Link>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-3 text-xs uppercase tracking-wider text-muted-foreground">Support</h4>
            <div className="space-y-2.5">
              <Link to="/trust" className="block text-[13px] text-muted-foreground hover:text-foreground transition-colors">Trust Center</Link>
              <Link to="/auth?mode=signup&role=business" className="block text-[13px] text-muted-foreground hover:text-foreground transition-colors">List Your Business</Link>
              <Link to="/auth?mode=signup&role=referrer" className="block text-[13px] text-muted-foreground hover:text-foreground transition-colors">Start Earning</Link>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-3 text-xs uppercase tracking-wider text-muted-foreground">Legal</h4>
            <div className="space-y-2.5">
              <Link to="/privacy" className="block text-[13px] text-muted-foreground hover:text-foreground transition-colors">Privacy Policy</Link>
              <Link to="/terms" className="block text-[13px] text-muted-foreground hover:text-foreground transition-colors">Terms of Service</Link>
              <Link to="/referral-agreement" className="block text-[13px] text-muted-foreground hover:text-foreground transition-colors">Referral Agreement</Link>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-border pt-6 text-center">
          <p className="text-xs text-muted-foreground/60">© {new Date().getFullYear()} Revvin. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
