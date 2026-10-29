import { Link } from "react-router-dom";
import Wordmark from "@/components/brand/Wordmark";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

/** Minimal chrome for signed-in app pages that have no dashboard rail. */
const AppTopBar = () => {
  const { user, signOut } = useAuth();
  return (
    <header className="app-topbar sticky top-0 z-30 flex h-14 items-center justify-between bg-forest px-4 sm:px-8">
      <Link to={user ? "/dashboard" : "/"} aria-label="Revvin home"><Wordmark size="sm" variant="white" /></Link>
      {user && (
        <Button variant="ghost" className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground" onClick={() => void signOut()}>
          Sign out
        </Button>
      )}
    </header>
  );
};

export default AppTopBar;
