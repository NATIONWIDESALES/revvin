import { FREE_CTA_LABEL } from "@/config/planFeatures";
import { Link } from "react-router-dom";
import Wordmark from "@/components/brand/Wordmark";
import { PRICE_TEXT } from "@/config/pricing";
import { INDUSTRIES } from "@/content/industries";
import { COMPARISONS, ROUNDUP } from "@/content/comparisons";

const link = "block text-[15px] text-primary-foreground/80 transition-colors hover:text-primary-foreground";
const heading = "mb-4 text-sm font-bold text-primary-foreground";

const Footer = () => {
  return (
    <footer className="bg-forest-night text-primary-foreground/70">
      <div className="mk-wrap py-14">
        <div className="grid gap-12 md:grid-cols-12">
          <div className="md:col-span-6">
            <Link to="/" aria-label="Revvin.co home" className="inline-block">
              <Wordmark size="lg" variant="white" />
            </Link>
            <p className="mt-5 max-w-md text-[15px] leading-relaxed text-primary-foreground/70">
              Your customer list, working for you. Revvin turns the people who already paid you into referrals, repeat work, and reviews. You handle the relationship.
            </p>
            <p className="mt-5 text-sm text-primary-foreground/60">
              {`Free to publish. ${PRICE_TEXT.monthlyPerMonth} for Pro.`}
            </p>
          </div>

          <div className="md:col-span-3">
            <p className={heading}>Product</p>
            <div className="space-y-3">
              <Link to="/how-it-works" className={link}>How it works</Link>
              <Link to="/tools" className={link}>Contractor Growth Toolkit</Link>
              <Link to="/marketplace" className={link}>Referral marketplace</Link>
              <Link to="/pricing" className={link}>Pricing</Link>
              <Link to="/referral-programs" className={link}>Referral programs by industry</Link>
              <Link to="/ask-kit" className={link}>Referral ask kit</Link>
              <Link to="/guides" className={link}>Referral program guides</Link>
              <Link to="/signup" className={link}>{FREE_CTA_LABEL}</Link>
              <Link to="/auth" className={link}>Log in</Link>
            </div>
          </div>

          <div className="md:col-span-3">
            <p className={heading}>Company</p>
            <div className="space-y-3">
              <Link to="/about" className={link}>About</Link>
              <Link to="/earn" className={link}>Earn money</Link>
              <Link to="/partners" className={link}>Partners</Link>
              <Link to="/terms" className={link}>Terms</Link>
              <Link to="/privacy" className={link}>Privacy</Link>
              <a href="mailto:info@revvin.co" className={link}>Contact: info@revvin.co</a>
            </div>
          </div>
        </div>

        <nav aria-label="Compare" className="mt-12 border-t border-primary-foreground/10 pt-8">
          <p className={heading}>Compare</p>
          <div className="flex flex-wrap gap-x-6 gap-y-3">
            {COMPARISONS.map((c) => (
              <Link key={c.slug} to={`/compare/${c.slug}`} className="text-sm text-primary-foreground/70 transition-colors hover:text-primary-foreground">
                {c.h1}
              </Link>
            ))}
            <Link to={`/guides/${ROUNDUP.slug}`} className="text-sm text-primary-foreground/70 transition-colors hover:text-primary-foreground">
              {ROUNDUP.h1}
            </Link>
            <Link to="/compare" className="text-sm text-primary-foreground/70 transition-colors hover:text-primary-foreground">
              All comparisons
            </Link>
          </div>
        </nav>

        <nav aria-label="Referral programs by trade" className="mt-12 border-t border-primary-foreground/10 pt-8">
          <p className={heading}>Referral programs by trade</p>
          <div className="flex flex-wrap gap-x-6 gap-y-3">
            {INDUSTRIES.map((i) => (
              <Link key={i.slug} to={`/referral-program/${i.slug}`} className="text-sm text-primary-foreground/70 transition-colors hover:text-primary-foreground">
                {i.label} referral program
              </Link>
            ))}
          </div>
        </nav>

        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-primary-foreground/10 pt-6 sm:flex-row sm:items-center">
          <p className="text-sm text-primary-foreground/60">&copy; {new Date().getFullYear()} Revvin. All rights reserved.</p>
          <p className="text-sm text-primary-foreground/60">Free to publish, {PRICE_TEXT.monthlyPerMonth} for Pro, referrers join free</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
