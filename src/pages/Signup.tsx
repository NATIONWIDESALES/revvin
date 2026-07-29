import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import SEOHead from "@/components/SEOHead";
import Wordmark from "@/components/brand/Wordmark";
import { Loader2, MailCheck } from "lucide-react";
import { track } from "@/lib/track";

const Signup = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [businessName, setBusinessName] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmPending, setConfirmPending] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    track("signup_viewed");
  }, []);

  // Signup never touches Stripe. An already-authenticated visitor belongs in
  // the app, not on this form.
  useEffect(() => {
    if (authLoading || !user || confirmPending) return;
    navigate("/welcome", { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  const resendConfirmation = async () => {
    setResending(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${window.location.origin}/welcome` },
    });
    setResending(false);
    if (error) {
      toast({ title: "Could not resend", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Confirmation email sent", description: `We sent another link to ${email}.` });
  };

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
    track("signup_submitted");
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
      track("signup_failed");
      setBusy(false);
      return;
    }
    track("signup_succeeded");
    // Fire admin notification (info@revvin.co). Non-blocking.
    if (data.user?.id) {
      supabase.functions
        .invoke("notify-business-signup", { body: { user_id: data.user.id } })
        .catch((err) => console.warn("[notify-business-signup] failed", err));
    }
    if (!data.session) {
      setConfirmPending(true);
      setBusy(false);
      return;
    }
    navigate("/welcome", { replace: true });
  };

  if (authLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <SEOHead
        title="Revvin | Start your referral program"
        description="Create a free Revvin account, build your branded referral page, QR code, and offer. Pay $49/month only when you are ready to go live. You pay your referrers directly."
        path="/signup"
        noindex
      />
      <div className="min-h-[80vh] flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-md">
          <Link to="/" className="flex items-center justify-center mb-8" aria-label="Revvin home">
            <Wordmark size="md" />
          </Link>
          <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
            {confirmPending ? (
              <div className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <MailCheck className="h-5 w-5" />
                </div>
                <h1 className="mt-4 text-2xl font-semibold tracking-tight text-foreground">
                  Check your email
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  We sent a confirmation link to <span className="font-medium text-foreground">{email}</span>.
                  Open it to finish creating your free account and start building your referral page.
                </p>
                <div className="mt-6 flex flex-col gap-2">
                  <Button variant="outline" onClick={resendConfirmation} disabled={resending}>
                    {resending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Resend confirmation email"}
                  </Button>
                  <Button variant="ghost" asChild>
                    <Link to="/auth">Already confirmed? Log in</Link>
                  </Button>
                </div>
                <p className="mt-4 text-[11px] text-muted-foreground">
                  Wrong address?{" "}
                  <button type="button" className="underline" onClick={() => setConfirmPending(false)}>
                    Go back and edit it
                  </button>
                  .
                </p>
              </div>
            ) : (
            <>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Create your free account
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Build your referral page, offer, and QR code for free. Pay $49/month only when you are ready to go live. Cancel anytime.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <Label htmlFor="biz">Business name</Label>
                <Input id="biz" value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Your business name" className="mt-1.5" required />
              </div>
              <div>
                <Label htmlFor="name">Your name</Label>
                <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Smith" className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="email">Work email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@yourbusiness.com" className="mt-1.5" required />
              </div>
              <div>
                <Label htmlFor="pw">Password</Label>
                <Input id="pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" className="mt-1.5" required />
              </div>
              <Button type="submit" size="lg" className="w-full h-11" disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create free account"}
              </Button>
              <p className="text-[11px] text-muted-foreground text-center">
                By signing up you agree to our <Link to="/terms" className="underline">Terms</Link> and <Link to="/privacy" className="underline">Privacy Policy</Link>.
              </p>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Already have an account? <Link to="/login" className="text-foreground font-medium hover:underline">Log in</Link>
            </p>
            </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Signup;