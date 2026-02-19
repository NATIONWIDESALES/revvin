import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Building2, Users, ArrowLeft, Eye, EyeOff } from "lucide-react";

const Auth = () => {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [role, setRole] = useState<"business" | "referrer">("referrer");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;

        if (data.user) {
          await supabase.from("user_roles").insert({ user_id: data.user.id, role });
          if (role === "business") {
            await supabase.from("businesses").insert({
              user_id: data.user.id,
              name: fullName + "'s Business",
            });
          }
        }

        toast({ title: "Check your email", description: "We sent you a confirmation link to verify your account." });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate("/dashboard");
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 hero-gradient flex-col justify-between p-12">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-foreground/20">
            <span className="text-lg font-bold text-primary-foreground">R</span>
          </div>
          <span className="font-display text-xl font-bold text-primary-foreground">Revvin</span>
        </Link>
        <div>
          <h2 className="font-display text-4xl font-bold text-primary-foreground leading-tight">
            {mode === "signup"
              ? role === "business"
                ? "Grow your business with referral-powered customer acquisition"
                : "Start earning money through your network today"
              : "Welcome back to Revvin"}
          </h2>
          <p className="mt-4 text-primary-foreground/60 text-lg">
            Join thousands of businesses and referrers on the marketplace.
          </p>
        </div>
        <div className="text-sm text-primary-foreground/40">© {new Date().getFullYear()} Revvin</div>
      </div>

      {/* Right panel */}
      <div className="flex w-full flex-col justify-center px-6 py-12 lg:w-1/2 lg:px-16">
        <div className="mx-auto w-full max-w-md">
          <Button variant="ghost" size="sm" className="mb-8 gap-1" asChild>
            <Link to="/"><ArrowLeft className="h-4 w-4" /> Back to home</Link>
          </Button>

          <h1 className="font-display text-2xl font-bold text-foreground">
            {mode === "login" ? "Sign in to your account" : "Create your account"}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {mode === "login" ? "Don't have an account? " : "Already have an account? "}
            <button onClick={() => setMode(mode === "login" ? "signup" : "login")} className="text-primary font-medium hover:underline">
              {mode === "login" ? "Sign up" : "Sign in"}
            </button>
          </p>

          {mode === "signup" && (
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole("referrer")}
                className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all ${
                  role === "referrer" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                }`}
              >
                <Users className={`h-6 w-6 ${role === "referrer" ? "text-primary" : "text-muted-foreground"}`} />
                <span className="font-medium text-sm">I want to earn</span>
                <span className="text-xs text-muted-foreground">Refer & get paid</span>
              </button>
              <button
                type="button"
                onClick={() => setRole("business")}
                className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all ${
                  role === "business" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                }`}
              >
                <Building2 className={`h-6 w-6 ${role === "business" ? "text-primary" : "text-muted-foreground"}`} />
                <span className="font-medium text-sm">I'm a business</span>
                <span className="text-xs text-muted-foreground">Get customers</span>
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {mode === "signup" && (
              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Smith" required className="mt-1" />
              </div>
            )}
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
            </div>
            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Auth;
