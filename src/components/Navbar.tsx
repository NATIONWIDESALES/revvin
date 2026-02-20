import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, Zap, Globe } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useCountry } from "@/contexts/CountryContext";
import DemoModeToggle from "@/components/DemoModeToggle";
import type { Country } from "@/types/offer";

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { user, userRole, signOut } = useAuth();
  const { country, setCountry } = useCountry();

  const links = [
    { to: "/", label: "Home" },
    { to: "/browse", label: "Marketplace" },
    { to: "/for-businesses", label: "For Businesses" },
    { to: "/for-referrers", label: "For Referrers" },
    { to: "/trust", label: "Trust & Payouts" },
  ];

  const countryOptions: { value: "US" | "CA" | "ALL"; label: string; flag: string }[] = [
    { value: "US", label: "USA", flag: "🇺🇸" },
    { value: "CA", label: "Canada", flag: "🇨🇦" },
    { value: "ALL", label: "Both", flag: "🌎" },
  ];

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-lg">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary shadow-sm">
            <Zap className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-display text-xl font-bold text-foreground">Revvin</span>
        </Link>

        <div className="hidden items-center gap-6 lg:flex">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`text-sm font-medium transition-colors hover:text-primary ${
                location.pathname === link.to ? "text-primary" : "text-muted-foreground"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <DemoModeToggle />
          {/* Country Selector */}
          <div className="flex items-center rounded-lg border border-border bg-muted/50 p-0.5 gap-0.5">
            {countryOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setCountry(opt.value)}
                className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                  country === opt.value
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span>{opt.flag}</span>
                <span className="hidden sm:inline">{opt.label}</span>
              </button>
            ))}
          </div>

          {user ? (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/dashboard">Dashboard</Link>
              </Button>
              <Button size="sm" variant="outline" onClick={signOut}>Sign Out</Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/auth">Sign In</Link>
              </Button>
              <Button size="sm" className="shadow-sm" asChild>
                <Link to="/auth?mode=signup">Get Started</Link>
              </Button>
            </>
          )}
        </div>

        <button className="lg:hidden" onClick={() => setOpen(!open)}>
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-border bg-background px-4 pb-4 lg:hidden">
          {/* Mobile country selector */}
          <div className="flex items-center gap-1 py-3">
            {countryOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setCountry(opt.value)}
                className={`flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors flex-1 justify-center ${
                  country === opt.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {opt.flag} {opt.label}
              </button>
            ))}
          </div>
          {links.map((link) => (
            <Link key={link.to} to={link.to} onClick={() => setOpen(false)} className="block py-3 text-sm font-medium text-muted-foreground hover:text-primary">
              {link.label}
            </Link>
          ))}
          <div className="mt-3 flex gap-2">
            {user ? (
              <>
                <Button variant="outline" size="sm" className="flex-1" asChild>
                  <Link to="/dashboard" onClick={() => setOpen(false)}>Dashboard</Link>
                </Button>
                <Button size="sm" className="flex-1" onClick={() => { signOut(); setOpen(false); }}>Sign Out</Button>
              </>
            ) : (
              <>
                <Button variant="outline" size="sm" className="flex-1" asChild>
                  <Link to="/auth" onClick={() => setOpen(false)}>Sign In</Link>
                </Button>
                <Button size="sm" className="flex-1" asChild>
                  <Link to="/auth?mode=signup" onClick={() => setOpen(false)}>Get Started</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
