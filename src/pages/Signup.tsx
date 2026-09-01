import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import SEOHead from "@/components/SEOHead";
import Wordmark from "@/components/brand/Wordmark";
import { Loader2 } from "lucide-react";
import { track } from "@/lib/track";
import { PRICE_TEXT } from "@/config/pricing";
import { captureInviteFromSearch, getInviteCode } from "@/lib/invite";
import SignupForm, { SIGNUP_SUBHEAD } from "@/components/signup/SignupForm";

const Signup = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [confirmPending, setConfirmPending] = useState(false);
  const [inviteCode, setInviteCodeState] = useState<string | null>(null);

  useEffect(() => {
    track("signup_viewed");
    captureInviteFromSearch();
    setInviteCodeState(getInviteCode());
  }, []);

  // Signup never touches Stripe. An already-authenticated visitor belongs in
  // the app, not on this form.
  useEffect(() => {
    if (authLoading || !user || confirmPending) return;
    navigate("/welcome", { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

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
        description={`Create a free Revvin account, build your branded referral page, QR code, and offer, and publish it free. Revvin Pro is ${PRICE_TEXT.monthlyPerMonth} when you want the tools that ask your whole customer list for you.`}
        path="/signup"
        noindex
      />
      <div className="flex items-start justify-center px-4 pb-24 pt-6 sm:pb-12">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-5 flex items-center justify-center" aria-label="Revvin home">
            <Wordmark size="md" />
          </Link>
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
            {!confirmPending && (
              <div className="mb-4">
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                  Create your free account
                </h1>
                <p className="mt-1.5 text-sm text-muted-foreground">{SIGNUP_SUBHEAD(inviteCode)}</p>
              </div>
            )}
            <SignupForm onConfirmPendingChange={setConfirmPending} />
          </div>
        </div>
      </div>
    </>
  );
};

export default Signup;
