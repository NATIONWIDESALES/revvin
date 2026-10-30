import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useLocation } from "react-router-dom";
import type { User, Session } from "@supabase/supabase-js";
import { isMarketingPath, loadSupabase, mayHaveSession } from "@/lib/supabaseLazy";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  userRole: "business" | "referrer" | "admin" | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  userRole: null,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<"business" | "referrer" | "admin" | null>(null);
  const { pathname } = useLocation();
  // A signed-out visitor on a marketing page never needs the backend client:
  // with no stored session and no sign-in redirect there is nobody to load.
  // Any other route, or a browser that may hold a session, loads it.
  const [needsClient, setNeedsClient] = useState(() => !isMarketingPath(pathname) || mayHaveSession());
  useEffect(() => {
    if (!needsClient && !isMarketingPath(pathname)) setNeedsClient(true);
  }, [pathname, needsClient]);

  const fetchRole = async (userId: string) => {
    const supabase = await loadSupabase();
    // A user can hold several roles (e.g. business + admin). Fetch them all and
    // prefer the most privileged one, otherwise a multi-role account resolves to null.
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .limit(10);
    const roles = (data ?? []).map((r) => r.role as "business" | "referrer" | "admin");
    const resolved = roles.includes("admin")
      ? "admin"
      : roles.includes("business")
        ? "business"
        : roles.includes("referrer")
          ? "referrer"
          : null;
    setUserRole(resolved);
    return resolved;
  };

  // Safety net: ensure profile exists on login (recovers from partial signup failures)
  const ensureProfile = async (user: User) => {
    const supabase = await loadSupabase();
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!profile) {
      const fullName = user.user_metadata?.full_name || user.email?.split("@")[0] || "";
      await supabase.from("profiles").insert({ user_id: user.id, full_name: fullName }).select().maybeSingle();
      console.info("Profile recovery: created missing profile for user", user.id);
    }
  };

  useEffect(() => {
    if (!needsClient) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    let unsubscribe: (() => void) | null = null;
    // Track the user id we've already loaded a role for so background auth
    // events (TOKEN_REFRESHED, USER_UPDATED, INITIAL_SESSION with same user)
    // don't flip `loading` back to true and unmount protected page trees —
    // which would wipe in-progress form state (Create Offer, Referral Wizard, etc.).
    let loadedUserId: string | null = null;

    void loadSupabase().then((supabase) => {
    if (cancelled) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      const nextUserId = session?.user?.id ?? null;

      if (!nextUserId) {
        loadedUserId = null;
        setUserRole(null);
        setLoading(false);
        return;
      }

      // Same user as already loaded (token refresh, user update): do NOT
      // toggle loading or remount children. Roles rarely change; skip refetch.
      if (nextUserId === loadedUserId) {
        return;
      }

      loadedUserId = nextUserId;
      setLoading(true);
      // Defer to avoid deadlocks with the auth callback.
      setTimeout(() => {
        fetchRole(nextUserId).finally(() => setLoading(false));
        ensureProfile(session!.user);
      }, 0);
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadedUserId = session.user.id;
        try {
          await fetchRole(session.user.id);
        } finally {
          setLoading(false);
        }
        ensureProfile(session.user);
      } else {
        setLoading(false);
      }
    });

    unsubscribe = () => subscription.unsubscribe();
    });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [needsClient]);

  const signOut = async () => {
    const supabase = await loadSupabase();
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setUserRole(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, userRole, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
