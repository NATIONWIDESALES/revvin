import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ArrowRight, Eye, EyeOff } from "lucide-react";
import AuthSplit from "@/components/AuthSplit";
import SEOHead from "@/components/SEOHead";
import Wordmark from "@/components/brand/Wordmark";
import { friendlyError } from "@/lib/errors";
import { PRICE_TEXT } from "@/config/pricing";

const Auth = () => {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSending, setResetSending] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  useEffect(() => setMounted(true), []);

  // Navigate only once the auth context reports the signed-in user, never on
  // the same tick as the sign-in call. This also sends an already signed-in
  // visitor straight past the form.
  useEffect(() => {
    if (authLoading || !user) return;
    const raw = searchParams.get("redirect");
    const target = raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/dashboard";
    navigate(target, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  const sendReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) return;
    setResetSending(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: window.location.origin + "/reset-password",
    });
    setResetSending(false);
    if (error) {
      toast({ title: "Could not send reset link", description: friendlyError(error), variant: "destructive" });
      return;
    }
    setResetSent(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      // Stay busy; the effect above navigates once the session is in context.
    } catch (err: any) {
      toast({ title: "Sign in failed", description: friendlyError(err, "Please try again."), variant: "destructive" });
      setLoading(false);
    }
  };

  return (
    <AuthSplit>
      <SEOHead
        title="Revvin | Sign in or create your account"
        description={`Sign in to your Revvin dashboard or create an account. Businesses build and publish their referral page free. Pro is optional at ${PRICE_TEXT.monthlyPerMonth} USD with a 14-day trial, no card required. Referrers join free.`}
        path="/auth"
        noindex
      />
        <div className="w-full">

          <h1 className="text-4xl sm:text-5xl">Sign in to your account</h1>
          <p className="mt-2 text-muted-foreground text-sm">
            Don't have an account?{" "}
            <Link to="/signup" className="text-primary font-medium hover:underline inline-flex items-center gap-1">
              Build your referral page, free
            </Link>
          </p>

          <form method="post" action="" onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required className="mt-1" />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <div className="relative mt-1">
                <Input id="password" type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} />
                <button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <button
                type="button"
                className="mt-2 text-xs text-primary hover:underline"
                aria-expanded={showReset}
                onClick={() => {
                  setResetEmail((v) => v || email);
                  setShowReset((v) => !v);
                }}
              >
                Forgot password?
              </button>
            </div>

            <Button type="submit" className="w-full gap-2" size="lg" disabled={loading || !mounted}>
              {loading ? "Please wait..." : "Sign In"}
            </Button>
          </form>

          {showReset && (
            <form method="post" action="" onSubmit={sendReset} className="mt-6 rounded-lg border border-border p-4 space-y-3">
              <Label htmlFor="reset-email">Email for your reset link</Label>
              <div className="flex gap-2">
                <Input id="reset-email" type="email" autoComplete="email" inputMode="email" value={resetEmail} onChange={(e) => { setResetEmail(e.target.value); setResetSent(false); }} placeholder="you@example.com" required />
                <Button type="submit" variant="outline" disabled={resetSending || !mounted}>
                  {resetSending ? "Sending..." : "Send reset link"}
                </Button>
              </div>
              {resetSent && (
                <p role="status" className="text-sm text-muted-foreground">
                  Check your email for a reset link. It can take a minute.
                </p>
              )}
            </form>
          )}
        </div>
    </AuthSplit>
  );
};

export default Auth;