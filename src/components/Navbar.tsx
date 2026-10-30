import { track } from "@/lib/track";
import { FREE_CTA_LABEL } from "@/config/planFeatures";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, LogOut, LayoutDashboard, UserCircle, Settings, Heart, Send } from "lucide-react";
import Wordmark from "@/components/brand/Wordmark";
import { useState, useRef, useEffect, lazy, Suspense } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Signed-in only, and it needs the backend client, so it loads on demand.
const NotificationBellLazy = lazy(() => import("@/components/NotificationBell"));
const NotificationBell = () => (
  <Suspense fallback={null}>
    <NotificationBellLazy />
  </Suspense>
);

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [signOutDialogOpen, setSignOutDialogOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const { user, userRole, signOut } = useAuth();

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

  const navLinks = [
    { to: "/how-it-works", label: "How it works" },
    { to: "/pricing", label: "Pricing" },
    { to: "/earn", label: "Earn money" },
    { to: "/guides", label: "Guides" },
  ];

  const roleLabel = userRole === "business" ? "Business" : userRole === "admin" ? "Admin" : "Referrer";

  const handleSignOut = () => {
    setSignOutDialogOpen(false);
    setDropdownOpen(false);
    setOpen(false);
    signOut();
  };

  return (
    <>
      <nav className="sticky top-0 z-50 border-b border-line bg-paper/95 backdrop-blur-md">
        <div className="mk-wrap flex h-[72px] items-center justify-between gap-8">
          {/* Left: Logo */}
          <Link to="/" className="flex items-center shrink-0" aria-label="Revvin.co home">
            <Wordmark size="md" />
          </Link>

          {/* Center: Nav links */}
          <div className="hidden md:ml-auto md:flex items-center gap-7">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`text-base font-semibold text-forest transition-colors hover:text-green ${
                  location.pathname === link.to ? "underline decoration-2 underline-offset-8" : ""
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right: Controls */}
          <div className="hidden items-center gap-3 md:flex shrink-0">
            {user ? (
              <>
                <NotificationBell />
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    aria-label="User menu"
                    className="flex items-center gap-1.5 rounded-lg border border-border p-1 pl-2 transition-all hover:shadow-sm"
                  >
                    <Menu className="h-4 w-4 text-muted-foreground" />
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                  </button>

                    {dropdownOpen && (
                      <div
                        className="absolute right-0 top-11 z-50 w-52 rounded-xl border border-border bg-card p-1.5 shadow-lg animate-in fade-in zoom-in-95 duration-150 motion-reduce:animate-none"
                      >
                        {/* Role badge */}
                        <div className="px-3 py-2 mb-1">
                          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold mt-1 bg-primary/10 text-primary">
                            {roleLabel}
                          </span>
                        </div>
                        <div className="mb-1 border-t border-border" />
                        <Link
                          to="/dashboard"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                        >
                          <LayoutDashboard className="h-4 w-4" /> Dashboard
                        </Link>
                        {userRole === "business" && (
                          <Link
                            to="/dashboard/invite"
                            onClick={() => setDropdownOpen(false)}
                            className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                          >
                            <Send className="h-4 w-4" /> Invite customers
                          </Link>
                        )}
                        <Link
                          to="/dashboard/profile"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                        >
                          <UserCircle className="h-4 w-4" /> Profile
                        </Link>
                        <Link
                          to="/dashboard/settings"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                        >
                          <Settings className="h-4 w-4" /> Settings
                        </Link>
                        <div className="my-1 border-t border-border" />
                        <button
                          onClick={() => { setDropdownOpen(false); setSignOutDialogOpen(true); }}
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
                <Link
                  to="/auth"
                  className="text-base font-semibold text-forest transition-colors hover:text-green"
                >
                  Log in
                </Link>
                <Button className="px-5" asChild>
                   <Link to="/signup" onClick={() => track("cta_clicked", { cta: "nav_signup" })}>{FREE_CTA_LABEL}</Link>
                </Button>
              </>
            )}
          </div>

          {/* Mobile toggle */}
          <div className="flex items-center gap-2 md:hidden">
            {user && <NotificationBell />}
            <button aria-label="Toggle menu" aria-expanded={open} className="grid h-11 w-11 place-items-center text-forest" onClick={() => setOpen(!open)}>
              {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
          {open && (
            <div
              className="overflow-hidden border-t border-line bg-paper px-6 pb-5 animate-in fade-in slide-in-from-top-2 duration-200 motion-reduce:animate-none md:hidden"
            >
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setOpen(false)}
                  className="block py-3 text-base font-semibold text-forest hover:text-green"
                >
                  {link.label}
                </Link>
              ))}
              {user && (
                <div className="border-t border-border pt-3 mt-1 space-y-1">
                  {userRole === "business" && (
                    <Link to="/dashboard/invite" onClick={() => setOpen(false)} className="block py-2 text-sm font-medium text-muted-foreground hover:text-foreground">
                      Invite customers
                    </Link>
                  )}
                  <Link to="/dashboard/profile" onClick={() => setOpen(false)} className="block py-2 text-sm font-medium text-muted-foreground hover:text-foreground">
                    Profile
                  </Link>
                  <Link to="/dashboard/settings" onClick={() => setOpen(false)} className="block py-2 text-sm font-medium text-muted-foreground hover:text-foreground">
                    Settings
                  </Link>
                </div>
              )}
              <div className="mt-3 flex gap-2">
                {user ? (
                  <>
                    <Button variant="outline" size="sm" className="flex-1" asChild>
                      <Link to="/dashboard" onClick={() => setOpen(false)}>Dashboard</Link>
                    </Button>
                    <Button size="sm" className="flex-1" onClick={() => { setOpen(false); setSignOutDialogOpen(true); }}>Sign Out</Button>
                  </>
                ) : (
                  <>
                    <Button variant="line" className="flex-1" asChild>
                      <Link to="/auth" onClick={() => setOpen(false)}>Log in</Link>
                    </Button>
                    <Button className="h-auto min-h-11 flex-1 whitespace-normal py-2 text-center" asChild>
                       <Link to="/signup" onClick={() => { setOpen(false); track("cta_clicked", { cta: "nav_menu_signup" }); }}>{FREE_CTA_LABEL}</Link>
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
      </nav>

      {/* Sign out confirmation */}
      <AlertDialog open={signOutDialogOpen} onOpenChange={setSignOutDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out?</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to sign out of your account?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSignOut}>Sign Out</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default Navbar;
