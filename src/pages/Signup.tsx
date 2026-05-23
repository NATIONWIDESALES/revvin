import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import SEOHead from "@/components/SEOHead";
import Wordmark from "@/components/brand/Wordmark";
import { Loader2 } from "lucide-react";

const Signup = () => {
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [businessName, setBusinessName] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const handleOAuth = async (provider: "google" | "apple") => {
    setBusy(true);
    try {
      sessionStorage.setItem("revvin_signup_role", "business");
      const result = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: `${window.location.origin}/signup`,
      });
      if (result.error) {
        toast({ title: `${provider} sign-up failed`, description: (result.error as Error).message, variant: "destructive" });
        setBusy(false);
      }
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Sign-up failed", variant: "destructive" });
      setBusy(false);
    }
  };

  const startCheckout = async () => {
    setBusy(true);
    try {
      const includeLaunchPackage =
        typeof window !== "undefined" &&
        window.sessionStorage.getItem("revvin_addon_launch") === "1";
      const { data, error } = await supabase.functions.invoke("create-business-checkout", {
        body: { includeLaunchPackage },
      });
      if (error || !data?.url) throw new Error(error?.message || "Could not start checkout");
      if (typeof window !== "undefined") window.sessionStorage.removeItem("revvin_addon_launch");
      window.location.href = data.url;
    } catch (err: any) {
      toast({ title: "Checkout error", description: err.message, variant: "destructive" });
      setBusy(false);
    }
  };

  // If already authenticated, kick off checkout immediately.
  useEffect(() => {
    if (!authLoading && user && searchParams.get("checkout") !== "canceled") {
      startCheckout();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !businessName.trim()) {
      toast({ title: "Missing info", description: "Email, password, and business name are required.", variant: "destructive" });
      return;
    }
    if (password.length < 8) {
      toast({ title: "Password too short", description: "Use at least 8 characters.", variant: "destructive" });
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/welcome`,
        data: {
          role: "business",
          full_name: fullName.trim() || email.split("@")[0],
          business_name: businessName.trim(),
        },
      },
    });
    if (error) {
      toast({ title: "Signup failed", description: error.message, variant: "destructive" });
      setBusy(false);
      return;
    }
    // Fire admin notification (info@revvin.co). Non-blocking.
    if (data.user?.id) {
      supabase.functions
        .invoke("notify-business-signup", { body: { user_id: data.user.id } })
        .catch((err) => console.warn("[notify-business-signup] failed", err));
    }
    if (!data.session) {
      toast({
        title: "Check your email",
        description: "Confirm your address, then log in to continue to checkout.",
      });
      setBusy(false);
      return;
    }
    // session created → checkout via effect
  };

  if (authLoading || (user && busy)) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Redirecting to secure checkout…</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <SEOHead
        title="Start your referral program — Revvin"
        description="Create your Revvin account and launch a branded referral page for your business. $49/month, cancel anytime."
        path="/signup"
        noindex
      />
      <div className="min-h-[80vh] flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-md">
          <Link to="/" className="flex items-center justify-center mb-8" aria-label="Revvin home">
            <Wordmark size="md" />
          </Link>
          <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Start your referral program
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Create your account, then we'll send you to secure checkout. $49/month, cancel anytime.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button type="button" variant="outline" className="w-full gap-2 h-11 text-sm font-medium" onClick={() => handleOAuth("google")} disabled={busy}>
                  <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Google
                </Button>
                <Button type="button" variant="outline" className="w-full gap-2 h-11 text-sm font-medium" onClick={() => handleOAuth("apple")} disabled={busy}>
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                  </svg>
                  Apple
                </Button>
              </div>

              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground">or sign up with email</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <div>
                <Label htmlFor="biz">Business name</Label>
                <Input id="biz" value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Apex Roofing" className="mt-1.5" required />
              </div>
              <div>
                <Label htmlFor="name">Your name</Label>
                <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Smith" className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="email">Work email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@apexroofing.com" className="mt-1.5" required />
              </div>
              <div>
                <Label htmlFor="pw">Password</Label>
                <Input id="pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" className="mt-1.5" required />
              </div>
              <Button type="submit" size="lg" className="w-full h-11" disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Continue to checkout"}
              </Button>
              <p className="text-[11px] text-muted-foreground text-center">
                By signing up you agree to our <Link to="/terms" className="underline">Terms</Link> and <Link to="/privacy" className="underline">Privacy Policy</Link>.
              </p>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Already have an account? <Link to="/login" className="text-foreground font-medium hover:underline">Log in</Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default Signup;