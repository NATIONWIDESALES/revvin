import { Link } from "react-router-dom";
import revvinLogo from "@/assets/revvin-logo.png";

const Footer = () => {
  return (
    <footer className="border-t border-border bg-background py-12">
      <div className="container">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <Link to="/" className="flex items-center mb-3">
              <img src={revvinLogo} alt="Revvin" className="h-[30px] w-auto object-contain" />
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
              Revvin gives your business the referral infrastructure. You handle the relationship.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-3 text-xs uppercase tracking-wider text-muted-foreground">Product</h4>
            <div className="space-y-2.5">
              <Link to="/how-it-works" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">How it works</Link>
              <Link to="/pricing" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</Link>
              <Link to="/signup" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">Start your referral program</Link>
              <Link to="/login" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">Log in</Link>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-3 text-xs uppercase tracking-wider text-muted-foreground">Legal</h4>
            <div className="space-y-2.5">
              <Link to="/privacy" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">Privacy</Link>
              <Link to="/terms" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">Terms</Link>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">&copy; {new Date().getFullYear()} Revvin. All rights reserved.</p>
          <p className="text-xs text-muted-foreground">One simple plan. $147 for the first 3 months.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;