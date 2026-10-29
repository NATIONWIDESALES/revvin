import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/track";
import { FREE_CTA_LABEL } from "@/config/planFeatures";

interface Props {
  heading?: string;
  body?: string;
  /** Fixed analytics label for the click. */
  cta?: string;
}

/** The forest closing band from the homepage, reused on marketing pages. */
const FinalBand = ({
  heading = "Your next job is already in your customer list.",
  body = "Set up your referral program in 5 minutes. Free for your first 100 customers.",
  cta = "footer_signup",
}: Props) => (
  <section className="bg-forest py-24 text-primary-foreground md:py-[120px]">
    <div className="mk-wrap">
      <h2 className="max-w-[13ch] font-display text-[clamp(52px,7vw,110px)] font-extrabold leading-[.9] text-primary-foreground">{heading}</h2>
      <p className="mt-6 max-w-[34em] text-xl text-primary-foreground/80">{body}</p>
      <Button size="lg" variant="sign" className="mt-9 w-full sm:w-auto" asChild>
        <Link to="/signup" onClick={() => track("cta_clicked", { cta })}>{FREE_CTA_LABEL}</Link>
      </Button>
    </div>
  </section>
);

export default FinalBand;
