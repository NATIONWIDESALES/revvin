import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, Search, User, LogOut, LayoutDashboard, UserCircle } from "lucide-react";
import revvinLogo from "@/assets/revvin-logo.png";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import NotificationBell from "@/components/NotificationBell";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const { user, userRole, signOut } = useAuth();

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const initials = user?.email?.slice(0, 2).toUpperCase() ?? "U";

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-lg">
      <div className="container flex h-16 items-center justify-between">
        {/* Left: Logo */}
        <Link to="/" className="flex items-center gap-2.5">
          <img src={revvinLogo} alt="Revvin" className="h-28 w-28 object-contain" />
          <span className="font-display text-xl font-bold text-foreground">Revvin</span>
        </Link>

        {/* Center: Search link */}
        <Link
          to="/browse"
          className="hidden md:flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2 text-sm text-muted-foreground shadow-sm transition-all hover:shadow-md hover:border-primary/30"
        >
          <Search className="h-4 w-4" />
          <span>Search opportunities</span>
        </Link>

        {/* Right: Controls */}
        <div className="hidden items-center gap-3 md:flex">
          <Link
            to="/for-businesses"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            List Your Business
          </Link>

          {user ? (
            <>
              <NotificationBell />
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-1 rounded-full border border-border p-1 pl-2 shadow-sm transition-all hover:shadow-md"
                >
                  <Menu className="h-4 w-4 text-muted-foreground" />
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 top-12 w-52 rounded-xl border border-border bg-card p-1.5 shadow-xl z-50">
                    <Link
                      to="/dashboard"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                    >
                      <LayoutDashboard className="h-4 w-4" /> Dashboard
                    </Link>
                    <Link
                      to="/dashboard/profile"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                    >
                      <UserCircle className="h-4 w-4" /> Profile
                    </Link>
                    <div className="my-1 border-t border-border" />
                    <button
                      onClick={() => { signOut(); setDropdownOpen(false); }}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <LogOut className="h-4 w-4" /> Sign Out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/auth">Log In</Link>
              </Button>
              <Button size="sm" className="rounded-full shadow-sm px-5" asChild>
                <Link to="/auth?mode=signup">Sign Up</Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button className="md:hidden" onClick={() => setOpen(!open)}>
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="border-t border-border bg-background px-4 pb-4 md:hidden">
          <Link
            to="/browse"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 py-3 text-sm font-medium text-muted-foreground hover:text-primary"
          >
            <Search className="h-4 w-4" /> Search Opportunities
          </Link>
          <Link to="/for-businesses" onClick={() => setOpen(false)} className="block py-3 text-sm font-medium text-muted-foreground hover:text-primary">
            List Your Business
          </Link>
          <Link to="/how-it-works" onClick={() => setOpen(false)} className="block py-3 text-sm font-medium text-muted-foreground hover:text-primary">
            How It Works
          </Link>
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
                  <Link to="/auth" onClick={() => setOpen(false)}>Log In</Link>
                </Button>
                <Button size="sm" className="flex-1 rounded-full" asChild>
                  <Link to="/auth?mode=signup" onClick={() => setOpen(false)}>Sign Up</Link>
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
