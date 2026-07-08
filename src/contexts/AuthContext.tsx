import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

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

  const fetchRole = async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();
    setUserRole((data?.role as "business" | "referrer" | "admin") ?? null);
    return (data?.role as "business" | "referrer" | "admin") ?? null;
  };

  // Safety net: ensure profile exists on login (recovers from partial signup failures)
  const ensureProfile = async (user: User) => {
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
    // Track the user id we've already loaded a role for so background auth
    // events (TOKEN_REFRESHED, USER_UPDATED, INITIAL_SESSION with same user)
    // don't flip `loading` back to true and unmount protected page trees —
    // which would wipe in-progress form state (Create Offer, Referral Wizard, etc.).
    let loadedUserId: string | null = null;

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

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
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
