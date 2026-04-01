import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, LogOut, LayoutDashboard, UserCircle, Settings } from "lucide-react";
import revvinLogo from "@/assets/revvin-logo.png";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import NotificationBell from "@/components/NotificationBell";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AnimatePresence, motion } from "framer-motion";
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
    { to: "/browse", label: "Browse Offers" },
    { to: "/for-businesses", label: "For Businesses" },
    { to: "/for-referrers", label: "For Referrers" },
    
    { to: "/how-it-works", label: "How It Works" },
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
      <nav className="sticky top-0 z-50 border-b border-border" style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
        <div className="container flex h-14 items-center justify-between">
          {/* Left: Logo */}
          <Link to="/" className="flex items-center shrink-0">
            <img src={revvinLogo} alt="Revvin" className="h-[34px] md:h-9 w-auto object-contain" />
          </Link>

          {/* Center: Nav links */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`text-sm font-medium transition-colors hover:text-foreground ${
                  location.pathname === link.to ? "text-foreground" : "text-muted-foreground"
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

                  <AnimatePresence>
                    {dropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -4 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className="absolute right-0 top-11 w-52 rounded-xl border border-border bg-card p-1.5 shadow-lg z-50"
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
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            ) : (
              <>
                <Link
                  to="/auth"
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  Log In
                </Link>
                <Button size="sm" className="px-5" asChild>
                  <Link to="/auth?mode=signup">Get Started</Link>
                </Button>
                <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: '#DBEAFE', color: '#2563EB' }}>
                  in beta
                </span>
              </>
            )}
          </div>

          {/* Mobile toggle */}
          <div className="flex items-center gap-2 md:hidden">
            {user && <NotificationBell />}
            <button aria-label="Toggle menu" onClick={() => setOpen(!open)}>
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="border-t border-border bg-background px-4 pb-4 md:hidden overflow-hidden"
            >
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setOpen(false)}
                  className="block py-3 text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  {link.label}
                </Link>
              ))}
              {user && (
                <div className="border-t border-border pt-3 mt-1 space-y-1">
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
                    <Button variant="outline" size="sm" className="flex-1" asChild>
                      <Link to="/auth" onClick={() => setOpen(false)}>Log In</Link>
                    </Button>
                    <Button size="sm" className="flex-1" asChild>
                      <Link to="/auth?mode=signup" onClick={() => setOpen(false)}>Get Started</Link>
                    </Button>
                  </>
                )}
              </div>
              {!user && (
                <div className="mt-2 text-center">
                  <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: '#DBEAFE', color: '#2563EB' }}>
                    in beta
                  </span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
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
