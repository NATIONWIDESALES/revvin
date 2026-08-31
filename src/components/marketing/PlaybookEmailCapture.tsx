import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";
import { submitEmailLead, type EmailLeadSource } from "@/lib/emailLeads";

const emailSchema = z
  .string()
  .trim()
  .min(3, "Enter your email")
  .max(255, "Email is too long")
  .email("Enter a valid email");

type Status = "idle" | "submitting" | "error";

interface PlaybookEmailCaptureProps {
  /** Differentiates the capture surface for admin segmentation. */
  source?: EmailLeadSource;
  /** Section eyebrow above the headline. */
  eyebrow?: string;
  /** Main headline. */
  headline?: string;
  /** Subhead under the headline. */
  subhead?: string;
  /** Submit-button label. */
  ctaLabel?: string;
  /** Kept for backwards compatibility; the real asset is public at /ask-kit. */
  successCopy?: string;
  /** Fine-print disclaimer below the form. */
  disclaimer?: string;
  /** Wrap in the full surface-warm section (default true) or render plain (false). */
  withSection?: boolean;
}

const PlaybookEmailCapture = ({
  source = "playbook",
  eyebrow = "No commitment",
  headline = "Get the referral ask kit. The exact scripts, free.",
  subhead = "Six scripts for asking past customers for referrals, plus a plain-English payout agreement. Opens straight away, no waiting.",
  ctaLabel = "Get the scripts",
  successCopy = "Thanks - you're on the list.",
  disclaimer = "We'll email you when we add more. No drip campaign, no spam.",
  withSection = true,
}: PlaybookEmailCaptureProps = {}) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);

    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setStatus("error");
      setErrorMsg(parsed.error.issues[0]?.message ?? "Enter a valid email");
      return;
    }

    setStatus("submitting");
    try {
      const result = await submitEmailLead(parsed.data, source);
      if (!result.ok) {
        console.error(
          "Failed to save email lead:",
          "error" in result ? result.error : "unknown error",
        );
      }
    } catch (err) {
      console.error("Email lead submission error:", err);
    }

    // The kit is public, so never trap someone behind a broken capture.
    // Log any failure above and send them straight to the real thing.
    navigate("/ask-kit");
  };

  const card = (
    <div className="mx-auto max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-soft md:p-10">
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Mail className="h-5 w-5" aria-hidden="true" />
        </div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
          {eyebrow}
        </p>
        <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-foreground md:text-3xl">
          {headline}
        </h2>
        <p className="mt-3 text-sm text-muted-foreground md:text-base">
          {subhead}
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="mt-6 flex flex-col gap-3 sm:flex-row"
        noValidate
      >
        <label htmlFor="playbook-email" className="sr-only">
          Email address
        </label>
        <Input
          id="playbook-email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@company.com"
          aria-label="Email address for the referral ask kit"
          aria-invalid={status === "error"}
          aria-describedby={errorMsg ? "playbook-email-error" : undefined}
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (status === "error") {
              setStatus("idle");
              setErrorMsg(null);
            }
          }}
          disabled={status === "submitting"}
          className="h-11 flex-1"
        />
        <Button
          type="submit"
          disabled={status === "submitting"}
          className="h-11 sm:w-auto"
        >
          {status === "submitting" ? "Saving..." : ctaLabel}
        </Button>
      </form>

      {status === "error" && errorMsg && (
        <p
          id="playbook-email-error"
          role="alert"
          className="mt-2 text-center text-xs text-destructive"
        >
          {errorMsg}
        </p>
      )}

      <p className="mt-3 text-center text-[11px] text-muted-foreground">
        {disclaimer}
      </p>

      <div className="mt-2 text-center">
        <Link
          to="/ask-kit"
          className="text-xs text-primary underline-offset-2 hover:underline"
        >
          Or just read it
        </Link>
      </div>
    </div>
  );

  if (!withSection) return card;

  return (
    <section className="border-b border-border bg-surface-warm">
      <div className="container py-16 md:py-20">{card}</div>
    </section>
  );
};

export default PlaybookEmailCapture;
