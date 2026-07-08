import { useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ArrowRight, Eye, EyeOff } from "lucide-react";
import SEOHead from "@/components/SEOHead";
import Wordmark from "@/components/brand/Wordmark";

const Auth = () => {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const redirectTo = searchParams.get("redirect");
      navigate(redirectTo || "/dashboard");
    } catch (err: any) {
      toast({ title: "Sign in failed", description: err?.message || "Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      <SEOHead
        title="Revvin | Sign in or create your account"
        description="Sign in to your Revvin dashboard or create an account. Businesses run on a flat $49/month USD plan. Referrers join free."
        path="/auth"
        noindex
      />
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 hero-gradient flex-col justify-between p-12">
        <Link to="/" className="flex items-center" aria-label="Revvin home">
          <Wordmark size="md" variant="white" />
        </Link>
        <div>
          <h2 className="text-4xl font-bold text-primary-foreground leading-tight">Welcome back to Revvin</h2>
          <p className="mt-4 text-primary-foreground/60 text-lg">Sign in to manage your referral program and payouts.</p>
        </div>
        <div className="text-sm text-primary-foreground/40">© {new Date().getFullYear()} Revvin</div>
      </div>

      {/* Right panel */}
      <div className="flex w-full flex-col justify-center px-6 py-12 lg:w-1/2 lg:px-16">
        <div className="mx-auto w-full max-w-md">
          <Button variant="ghost" size="sm" className="mb-8 gap-1" asChild>
            <Link to="/"><ArrowLeft className="h-4 w-4" /> Back to home</Link>
          </Button>

          <h1 className="text-2xl font-bold text-foreground">Sign in to your account</h1>
          <p className="mt-2 text-muted-foreground text-sm">
            Don't have an account?{" "}
            <Link to="/signup" className="text-primary font-medium hover:underline inline-flex items-center gap-1">
              Start your referral program <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required className="mt-1" />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <div className="relative mt-1">
                <Input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <button
                type="button"
                className="mt-2 text-xs text-primary hover:underline"
                onClick={async () => {
                  if (!email) {
                    toast({ title: "Enter your email first", description: "We need your email to send a reset link.", variant: "destructive" });
                    return;
                  }
                  const { error } = await supabase.auth.resetPasswordForEmail(email, {
                    redirectTo: window.location.origin + "/reset-password",
                  });
                  if (error) {
                    toast({ title: "Error", description: error.message, variant: "destructive" });
                  } else {
                    toast({ title: "Check your email", description: "We sent a password reset link." });
                  }
                }}
              >
                Forgot password?
              </button>
            </div>

            <Button type="submit" className="w-full gap-2" size="lg" disabled={loading}>
              {loading ? "Please wait..." : "Sign In"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Auth;