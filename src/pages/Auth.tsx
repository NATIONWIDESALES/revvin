import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Building2, Users, ArrowLeft, Eye, EyeOff, ArrowRight, MapPin } from "lucide-react";

const Auth = () => {
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<"login" | "signup">(
    searchParams.get("mode") === "signup" ? "signup" : "login"
  );
  const [role, setRole] = useState<"business" | "referrer">(
    (searchParams.get("role") as "business" | "referrer") || "referrer"
  );
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Business-specific fields
  const [businessName, setBusinessName] = useState("");
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
    if (roleParam === "business" || roleParam === "referrer") setRole(roleParam);
  }, [searchParams]);

  const totalSteps = mode === "signup" ? (role === "business" ? 2 : 2) : 1;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === "signup" && step < totalSteps) {
      setStep(step + 1);
      return;
    }

    setLoading(true);

    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName, role },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;

        // Email confirmation is required — don't navigate to dashboard
        toast({ title: "Check your email!", description: "We sent a confirmation link. Click it to activate your account." });
        setEmail(""); setPassword(""); setFullName(""); setStep(1);
        setMode("login");
        return;
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

  const renderLeftPanel = () => {
    if (mode === "login") {
      return (
        <>
          <h2 className="font-display text-4xl font-bold text-primary-foreground leading-tight">
            Welcome back to Revvin
          </h2>
          <p className="mt-4 text-primary-foreground/60 text-lg">
            Sign in to manage your referrals and earnings.
          </p>
        </>
      );
    }
    if (role === "business") {
      return (
        <>
          <h2 className="font-display text-4xl font-bold text-primary-foreground leading-tight">
            Acquire Customers Through Referral Payouts
          </h2>
          <p className="mt-4 text-primary-foreground/60 text-lg">
            Set your own payout. Get qualified leads. Pay only when deals close.
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
        <h2 className="font-display text-4xl font-bold text-primary-foreground leading-tight">
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
              <div className="grid grid-cols-2 gap-3 mb-6">
                <button
                  type="button"
                  onClick={() => { setRole("referrer"); setStep(1); }}
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
                  onClick={() => { setRole("business"); setStep(1); }}
                  className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all ${
                    role === "business" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                  }`}
                >
                  <Building2 className={`h-6 w-6 ${role === "business" ? "text-primary" : "text-muted-foreground"}`} />
                  <span className="font-medium text-sm">I'm a business</span>
                  <span className="text-xs text-muted-foreground">Get customers</span>
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
          </div>
        </>
      );
    }

    // Step 2 — role-specific fields
    if (role === "business") {
      return (
        <>
          <div>
            <Label>Business Name</Label>
            <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Acme Corp" className="mt-1" />
          </div>
          <div>
            <Label>Industry Category</Label>
            <select value={industry} onChange={(e) => setIndustry(e.target.value)} className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background">
              <option value="">Select industry...</option>
              {["Energy", "Insurance", "SaaS", "Services", "Real Estate", "Technology", "Roofing", "Landscaping", "Finance", "Plumbing", "Legal", "Other"].map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
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
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 hero-gradient flex-col justify-between p-12">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-foreground/20">
            <span className="text-lg font-bold text-primary-foreground">R</span>
          </div>
          <span className="font-display text-xl font-bold text-primary-foreground">Revvin</span>
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

          <h1 className="font-display text-2xl font-bold text-foreground">
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
