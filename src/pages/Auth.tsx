import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

import { useToast } from "@/hooks/use-toast";
import { Building2, Users, ArrowLeft, Eye, EyeOff, ArrowRight, MapPin, Layers } from "lucide-react";
import revvinLogo from "@/assets/revvin-logo.png";
import SEOHead from "@/components/SEOHead";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const Auth = () => {
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<"login" | "signup">(
    searchParams.get("mode") === "signup" ? "signup" : "login"
  );
  const [role, setRole] = useState<"business" | "referrer" | "both">(
    (searchParams.get("role") as "business" | "referrer" | "both") || "referrer"
  );
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Business-specific fields
  const [businessName, setBusinessName] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const [industry, setIndustry] = useState("");
  const [serviceArea, setServiceArea] = useState("");

  // Referrer-specific fields
  const [location, setLocation] = useState("");
  const [industryFamiliarity, setIndustryFamiliarity] = useState("");

  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const modeParam = searchParams.get("mode");
    const roleParam = searchParams.get("role");
    if (modeParam === "signup") setMode("signup");
    if (roleParam === "business" || roleParam === "referrer" || roleParam === "both") setRole(roleParam);
  }, [searchParams]);

  const totalSteps = mode === "signup" ? 2 : 1;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === "signup" && step < totalSteps) {
      setStep(step + 1);
      return;
    }

    setLoading(true);

    try {
      if (mode === "signup") {
        const metadata: Record<string, string> = { full_name: fullName, role };
        if (role === "business" || role === "both") {
          if (businessName) metadata.business_name = businessName;
          if (businessPhone) metadata.phone = businessPhone;
          if (industry) metadata.industry = industry;
          if (serviceArea) metadata.service_area = serviceArea;
        }
        if (role === "referrer" || role === "both") {
          if (location) metadata.location = location;
          if (industryFamiliarity) metadata.industry_familiarity = industryFamiliarity;
        }
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: metadata,
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) {
          console.error("Signup error:", error);
          if (error.message?.toLowerCase().includes("database error")) {
            throw new Error("Something went wrong creating your account. Please try again or contact support@revvin.co.");
          }
          throw error;
        }

        // Fire-and-forget admin notification for business signups
        if ((role === "business" || role === "both") && data.user) {
          supabase.functions.invoke("notify-business-signup", {
            body: {
              type: "INSERT",
              table: "businesses",
              record: {
                user_id: data.user.id,
                name: businessName || fullName + "'s Business",
                industry,
                city: serviceArea,
                phone: businessPhone,
                created_at: new Date().toISOString(),
              },
            },
          }).catch((err) => console.warn("Admin notification failed (non-blocking):", err));
        }

        toast({ title: "You're live on REVVIN.CO!", description: "Check your email and click the confirmation link, then create your first offer." });
        setEmail(""); setPassword(""); setFullName(""); setStep(1);
        setMode("login");
        return;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        const redirectTo = searchParams.get("redirect");
        navigate(redirectTo || "/dashboard");
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      const message = err?.message || "An unexpected error occurred. Please try again.";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const renderLeftPanel = () => {
    if (mode === "login") {
      return (
        <>
          <h2 className="text-4xl font-bold text-primary-foreground leading-tight">
            Welcome back to Revvin
          </h2>
          <p className="mt-4 text-primary-foreground/60 text-lg">
            Sign in to manage your referrals and earnings.
          </p>
        </>
      );
    }
    if (role === "business" || role === "both") {
      return (
        <>
          <h2 className="text-4xl font-bold text-primary-foreground leading-tight">
            {role === "both" ? "List offers. Send referrals. Earn both ways." : "Acquire Customers Through Referral Payouts"}
          </h2>
          <p className="mt-4 text-primary-foreground/60 text-lg">
            {role === "both" ? "Your account will include both a business profile and a referrer profile." : "Set your own payout. Get qualified leads. Pay only when deals close."}
          </p>
          <div className="mt-8 space-y-3 text-primary-foreground/50 text-sm">
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${step >= 1 ? "bg-accent" : "bg-primary-foreground/20"}`} />
              <span className={step >= 1 ? "text-primary-foreground/80" : ""}>Account details</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${step >= 2 ? "bg-accent" : "bg-primary-foreground/20"}`} />
              <span className={step >= 2 ? "text-primary-foreground/80" : ""}>Business information</span>
            </div>
          </div>
        </>
      );
    }
    return (
      <>
        <h2 className="text-4xl font-bold text-primary-foreground leading-tight">
          Earn Income Referring Trusted Businesses
        </h2>
        <p className="mt-4 text-primary-foreground/60 text-lg">
          Browse programs, submit leads, and earn commissions when deals close.
        </p>
        <div className="mt-8 space-y-3 text-primary-foreground/50 text-sm">
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${step >= 1 ? "bg-accent" : "bg-primary-foreground/20"}`} />
            <span className={step >= 1 ? "text-primary-foreground/80" : ""}>Account details</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${step >= 2 ? "bg-accent" : "bg-primary-foreground/20"}`} />
            <span className={step >= 2 ? "text-primary-foreground/80" : ""}>Your profile</span>
          </div>
        </div>
      </>
    );
  };

  const renderFormStep = () => {
    if (mode === "login" || (mode === "signup" && step === 1)) {
      return (
        <>
          {mode === "signup" && (
            <>
              <div className="grid grid-cols-3 gap-2 mb-6">
                <button
                  type="button"
                  onClick={() => { setRole("referrer"); setStep(1); }}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 transition-all ${
                    role === "referrer" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                  }`}
                >
                  <Users className={`h-5 w-5 ${role === "referrer" ? "text-primary" : "text-muted-foreground"}`} />
                  <span className="font-medium text-xs">Referrer</span>
                  <span className="text-[10px] text-muted-foreground text-center leading-tight">Refer & earn</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setRole("business"); setStep(1); }}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 transition-all ${
                    role === "business" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                  }`}
                >
                  <Building2 className={`h-5 w-5 ${role === "business" ? "text-primary" : "text-muted-foreground"}`} />
                  <span className="font-medium text-xs">Business</span>
                  <span className="text-[10px] text-muted-foreground text-center leading-tight">Get customers</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setRole("both"); setStep(1); }}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 transition-all ${
                    role === "both" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                  }`}
                >
                  <Layers className={`h-5 w-5 ${role === "both" ? "text-primary" : "text-muted-foreground"}`} />
                  <span className="font-medium text-xs">Both</span>
                  <span className="text-[10px] text-muted-foreground text-center leading-tight">List & refer</span>
                </button>
              </div>
              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Smith" required className="mt-1" />
              </div>
            </>
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
            {mode === "login" && (
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
            )}
          </div>
        </>
      );
    }

    // Step 2 — role-specific fields
    if (role === "business" || role === "both") {
      return (
      <>
          {role === "both" && (
            <p className="text-xs text-muted-foreground mb-2">
              Tell us about your business. We'll also create a referrer profile for you using your account details.
            </p>
          )}
          <div>
            <Label>Business Name</Label>
            <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Acme Corp" className="mt-1" />
          </div>
          <div>
            <Label>Phone Number</Label>
            <Input type="tel" value={businessPhone} onChange={(e) => setBusinessPhone(e.target.value)} placeholder="(555) 123-4567" required className="mt-1" />
          </div>
          <div>
            <Label>Industry Category</Label>
            <Select value={industry} onValueChange={setIndustry}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select industry..." />
              </SelectTrigger>
              <SelectContent>
                {["Energy", "Insurance", "SaaS", "Services", "Real Estate", "Technology", "Roofing", "Landscaping", "Finance", "Plumbing", "Legal", "Other"].map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Service Areas</Label>
            <Input value={serviceArea} onChange={(e) => setServiceArea(e.target.value)} placeholder="e.g. Los Angeles, CA" className="mt-1" />
          </div>
          <p className="text-xs text-muted-foreground">You can upload a logo and create offers after signing up.</p>
        </>
      );
    }

    // Referrer step 2
    return (
      <>
        <div>
          <Label>Location</Label>
          <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Austin, TX" className="mt-1" />
        </div>
        <div>
          <Label>Industry Familiarity <span className="text-muted-foreground">(optional)</span></Label>
          <Input value={industryFamiliarity} onChange={(e) => setIndustryFamiliarity(e.target.value)} placeholder="e.g. Real estate, SaaS, Insurance" className="mt-1" />
        </div>
        <p className="text-xs text-muted-foreground">This helps us show you the most relevant referral opportunities.</p>
      </>
    );
  };

  return (
    <div className="flex min-h-screen">
      <SEOHead
        title={mode === "login" ? "Log In — Revvin" : "Sign Up — Revvin Referral Marketplace"}
        description={mode === "login" ? "Log in to your Revvin account to manage referrals, track payouts, and view your dashboard." : "Create your free Revvin account. List your business and start receiving referrals, or sign up as a referrer and earn money for introductions that close."}
        path="/auth"
      />
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 hero-gradient flex-col justify-between p-12">
        <Link to="/" className="flex items-center">
          <img src={revvinLogo} alt="Revvin" className="h-9 w-auto object-contain brightness-0 invert" />
        </Link>
        <div>
          {renderLeftPanel()}
        </div>
        <div className="text-sm text-primary-foreground/40">© {new Date().getFullYear()} Revvin</div>
      </div>

      {/* Right panel */}
      <div className="flex w-full flex-col justify-center px-6 py-12 lg:w-1/2 lg:px-16">
        <div className="mx-auto w-full max-w-md">
          <Button variant="ghost" size="sm" className="mb-8 gap-1" asChild>
            <Link to="/"><ArrowLeft className="h-4 w-4" /> Back to home</Link>
          </Button>

          <h1 className="text-2xl font-bold text-foreground">
            {mode === "login" ? "Sign in to your account" : step === 1 ? "Create your account" : role === "business" ? "Tell us about your business" : "Complete your profile"}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {mode === "login" ? "Don't have an account? " : "Already have an account? "}
            <button onClick={() => { setMode(mode === "login" ? "signup" : "login"); setStep(1); }} className="text-primary font-medium hover:underline">
              {mode === "login" ? "Sign up" : "Sign in"}
            </button>
          </p>

          {mode === "signup" && totalSteps > 1 && (
            <div className="mt-4 flex items-center gap-2">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${i < step ? "bg-primary" : "bg-border"}`} />
              ))}
              <span className="text-xs text-muted-foreground ml-2">Step {step}/{totalSteps}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {/* Google OAuth */}
            <Button
              type="button"
              variant="outline"
              className="w-full gap-3 h-12 text-sm font-medium"
              onClick={async () => {
                setLoading(true);
                try {
                  const redirectTo = searchParams.get("redirect");
                  const redirectUrl = `${window.location.origin}${redirectTo || "/dashboard"}`;
                  const { error } = await supabase.auth.signInWithOAuth({
                    provider: "google",
                    options: { redirectTo: redirectUrl },
                  });
                  if (error) {
                    toast({ title: "Google sign-in failed", description: error.message, variant: "destructive" });
                    setLoading(false);
                    return;
                  }
                  // Browser will redirect to Google
                } catch (err: any) {
                  toast({ title: "Error", description: err.message || "Google sign-in failed", variant: "destructive" });
                  setLoading(false);
                }
              }}
              disabled={loading}
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </Button>

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground">or</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            {renderFormStep()}

            <div className="flex gap-3">
              {mode === "signup" && step > 1 && (
                <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(step - 1)}>
                  Back
                </Button>
              )}
              <Button type="submit" className={`${mode === "signup" && step > 1 ? "flex-1" : "w-full"} gap-2`} size="lg" disabled={loading}>
                {loading ? "Please wait..." : mode === "login" ? "Sign In" : step < totalSteps ? <>Next <ArrowRight className="h-4 w-4" /></> : "Create Account"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Auth;
