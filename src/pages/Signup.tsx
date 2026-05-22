import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import SEOHead from "@/components/SEOHead";
import revvinLogo from "@/assets/revvin-logo.png";
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
          <Link to="/" className="flex items-center justify-center mb-8">
            <img src={revvinLogo} alt="Revvin" className="h-9 w-auto" />
          </Link>
          <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Start your referral program
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Create your account, then we'll send you to secure checkout. $49/month, cancel anytime.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
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