import { Link, Navigate, useSearchParams } from "react-router-dom";
import { Building2, Users, Layers, ArrowRight, ArrowLeft, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import revvinLogo from "@/assets/revvin-logo.png";

const ease = [0.16, 1, 0.3, 1] as const;

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.55, ease },
  }),
};

const options = [
  {
    role: "business" as const,
    icon: Building2,
    title: "I'm a business",
    pitch: "Looking for customers",
    desc: "List a referral offer, set what a closed deal is worth to you, and only pay when a referred customer actually closes.",
    bullets: ["Free to list", "You set the payout", "Pay only on closed deals"],
    cta: "Continue as Business",
    accent: "primary" as const,
  },
  {
    role: "referrer" as const,
    icon: Users,
    title: "I'm a referrer",
    pitch: "Looking to earn",
    desc: "Browse real businesses paying for warm introductions. Submit a referral and earn 100% of the advertised payout when the deal closes.",
    bullets: ["Free forever", "Earn the full advertised payout", "No audience required"],
    cta: "Continue as Referrer",
    accent: "earnings" as const,
  },
  {
    role: "both" as const,
    icon: Layers,
    title: "Both",
    pitch: "I'll list offers and refer customers",
    desc: "Create a business profile to receive referrals AND a referrer profile to send introductions to other businesses on Revvin.",
    bullets: ["Two profiles, one login", "Switch sides anytime", "Same free pricing"],
    cta: "Continue with Both",
    accent: "primary" as const,
  },
];

const Signup = () => {
  const [params] = useSearchParams();
  const presetRole = params.get("role");
  if (presetRole === "business" || presetRole === "referrer" || presetRole === "both") {
    return <Navigate to={`/auth?mode=signup&role=${presetRole}`} replace />;
  }
  return (
  <div className="min-h-screen bg-background">
    <SEOHead
      title="Sign Up — Revvin Pay-Per-Close Referral Marketplace"
      description="Create your free Revvin account. Choose to list your business and receive referrals, earn money sending warm introductions, or do both."
      path="/signup"
    />

    <div className="container py-10 md:py-16">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-10">
        <Link to="/" className="flex items-center">
          <img src={revvinLogo} alt="Revvin" className="h-9 w-auto object-contain" />
        </Link>
        <Button variant="ghost" size="sm" asChild className="gap-1">
          <Link to="/auth">
            <ArrowLeft className="h-4 w-4" /> Already have an account? Log in
          </Link>
        </Button>
      </div>

      {/* Heading */}
      <motion.div
        initial="hidden"
        animate="visible"
        className="mx-auto max-w-2xl text-center"
      >
        <motion.span
          variants={fadeUp}
          custom={0}
          className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary mb-5"
        >
          Create your free account
        </motion.span>
        <motion.h1
          variants={fadeUp}
          custom={1}
          className="text-3xl md:text-4xl font-bold tracking-tight text-foreground"
        >
          How will you use Revvin?
        </motion.h1>
        <motion.p
          variants={fadeUp}
          custom={2}
          className="mt-3 text-muted-foreground text-base max-w-lg mx-auto"
        >
          Pick the option that fits you best. You can change or add the other side later from your account.
        </motion.p>
      </motion.div>

      {/* Cards */}
      <motion.div
        initial="hidden"
        animate="visible"
        className="mt-12 grid gap-5 md:grid-cols-3 max-w-5xl mx-auto"
      >
        {options.map((opt, i) => (
          <motion.div
            key={opt.role}
            variants={fadeUp}
            custom={i + 3}
            className="rounded-2xl border border-border bg-card p-6 flex flex-col"
          >
            <div
              className={`mb-5 inline-flex h-11 w-11 items-center justify-center rounded-xl ${
                opt.accent === "earnings" ? "bg-earnings/10" : "bg-primary/5"
              }`}
            >
              <opt.icon
                className={`h-5 w-5 ${
                  opt.accent === "earnings" ? "text-earnings" : "text-primary"
                }`}
              />
            </div>
            <h2 className="text-lg font-bold text-foreground">{opt.title}</h2>
            <p className="text-xs font-medium text-muted-foreground mt-0.5 mb-3">
              {opt.pitch}
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed mb-5">
              {opt.desc}
            </p>
            <ul className="space-y-2 mb-6 flex-1">
              {opt.bullets.map((b) => (
                <li
                  key={b}
                  className="flex items-start gap-2 text-sm text-foreground"
                >
                  <CheckCircle2
                    className={`h-4 w-4 mt-0.5 shrink-0 ${
                      opt.accent === "earnings" ? "text-earnings" : "text-primary"
                    }`}
                  />
                  {b}
                </li>
              ))}
            </ul>
            <Button asChild className="w-full gap-2">
              <Link to={`/auth?mode=signup&role=${opt.role}`}>
                {opt.cta} <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </motion.div>
        ))}
      </motion.div>

      {/* Bottom note */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.55, ease }}
        className="mt-12 text-center"
      >
        <p className="text-xs text-muted-foreground max-w-md mx-auto">
          Referrers always earn 100% of the advertised payout. Businesses only
          pay a platform fee when a referred customer actually closes.
        </p>
      </motion.div>
    </div>
  </div>
  );
};

export default Signup;
