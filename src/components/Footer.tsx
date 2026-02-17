import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="border-t border-border bg-card py-12">
      <div className="container">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <span className="text-sm font-bold text-primary-foreground">R</span>
              </div>
              <span className="font-display text-lg font-bold">RefBoard</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              The marketplace connecting businesses with referral partners. Earn by sharing opportunities.
            </p>
          </div>

          <div>
            <h4 className="font-display font-semibold mb-3 text-sm">Platform</h4>
            <div className="space-y-2">
              <Link to="/browse" className="block text-sm text-muted-foreground hover:text-primary">Browse Offers</Link>
              <Link to="/how-it-works" className="block text-sm text-muted-foreground hover:text-primary">How It Works</Link>
              <Link to="/" className="block text-sm text-muted-foreground hover:text-primary">For Businesses</Link>
            </div>
          </div>

          <div>
            <h4 className="font-display font-semibold mb-3 text-sm">Company</h4>
            <div className="space-y-2">
              <Link to="/" className="block text-sm text-muted-foreground hover:text-primary">About</Link>
              <Link to="/" className="block text-sm text-muted-foreground hover:text-primary">Blog</Link>
              <Link to="/" className="block text-sm text-muted-foreground hover:text-primary">Careers</Link>
            </div>
          </div>

          <div>
            <h4 className="font-display font-semibold mb-3 text-sm">Legal</h4>
            <div className="space-y-2">
              <Link to="/" className="block text-sm text-muted-foreground hover:text-primary">Privacy Policy</Link>
              <Link to="/" className="block text-sm text-muted-foreground hover:text-primary">Terms of Service</Link>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-border pt-6 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} RefBoard. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
