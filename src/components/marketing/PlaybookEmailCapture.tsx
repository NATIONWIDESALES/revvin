import { useState, type FormEvent } from "react";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Check, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const emailSchema = z
  .string()
  .trim()
  .min(3, "Enter your email")
  .max(255, "Email is too long")
  .email("Enter a valid email");

type Status = "idle" | "submitting" | "success" | "error";

const PlaybookEmailCapture = () => {
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
      const { error } = await supabase.from("email_leads").insert({
        email: parsed.data.toLowerCase(),
        source: "landing",
        user_agent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 500) : null,
        referrer: typeof document !== "undefined" ? document.referrer.slice(0, 500) : null,
      });
      if (error) throw error;
      setStatus("success");
      setEmail("");
    } catch (err) {
      console.error("[PlaybookEmailCapture] insert failed", err);
      setStatus("error");
      setErrorMsg("Something went wrong. Please try again.");
    }
  };

  return (
    <section className="border-b border-border bg-surface-warm">
      <div className="container py-16 md:py-20">
        <div className="mx-auto max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-soft md:p-10">
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Mail className="h-5 w-5" aria-hidden="true" />
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              No commitment
            </p>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-foreground md:text-3xl">
              Not ready yet? Get the 1-page referral playbook.
            </h2>
            <p className="mt-3 text-sm text-muted-foreground md:text-base">
              A short, practical guide on turning customers into a referral pipeline. We'll send
              it once — no drip campaign, unsubscribe anytime.
            </p>
          </div>

          {status === "success" ? (
            <div
              role="status"
              aria-live="polite"
              className="mt-6 flex items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-medium text-foreground"
            >
              <Check className="h-4 w-4 text-primary" aria-hidden="true" />
              Check your inbox — it's on the way.
            </div>
          ) : (
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
                aria-label="Email address for the referral playbook"
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
                {status === "submitting" ? "Sending..." : "Send it to me"}
              </Button>
            </form>
          )}

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
            We'll only email you the playbook. No spam, no sales blast.
          </p>
        </div>
      </div>
    </section>
  );
};

export default PlaybookEmailCapture;