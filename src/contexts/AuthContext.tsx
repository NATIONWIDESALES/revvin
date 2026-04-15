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

  // Safety net: ensure wallet exists for business users (recovers from legacy accounts)
  const ensureWallet = async (userId: string) => {
    const { data: role } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "business")
      .maybeSingle();
    if (!role) return;
    const { data: wallet } = await supabase
      .from("wallet_balances")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    if (!wallet) {
      await supabase.from("wallet_balances").insert({ user_id: userId });
      console.info("Wallet recovery: created missing wallet for business user", userId);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setTimeout(() => {
          fetchRole(session.user.id);
          ensureProfile(session.user);
          ensureWallet(session.user.id);
        }, 0);
      } else {
        setUserRole(null);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchRole(session.user.id);
        ensureProfile(session.user);
      }
      setLoading(false);
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
