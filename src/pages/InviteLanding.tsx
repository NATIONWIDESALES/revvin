import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { setInviteCode } from "@/lib/invite";
import { track } from "@/lib/track";
import SEOHead from "@/components/SEOHead";

/** Shareable invite link: revvin.co/i/FOUNDER3 -> stores the code, then /signup. */
const InviteLanding = () => {
  const { code } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const stored = code ? setInviteCode(code) : null;
    if (stored) track("invite_link_opened", { invite_code: stored });
    navigate("/signup", { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  return (
    <>
      <SEOHead title="Revvin invite" description="Redeeming your Revvin invite." path="/signup" noindex />
      <div className="py-24 text-center text-sm text-muted-foreground">Opening your invite...</div>
    </>
  );
};

export default InviteLanding;
