import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import ToolShell from "@/components/toolkit/ToolShell";
import { track } from "@/lib/track";
import { TOOLKIT_CTAS } from "@/lib/toolkit/analytics";
import {
  GRADER_QUESTIONS,
  scoreProgram,
  type GraderAnswers,
  type GraderQuestionId,
} from "@/lib/toolkit/grader";

/**
 * The questionnaire is a list of fieldsets, each with a legend and two native
 * radios, so it is keyboard and screen-reader navigable without any custom
 * widget behaviour. Answers live in component state only: nothing is stored,
 * put in the address bar, or sent anywhere.
 */
const ProgramGrader = () => {
  const [answers, setAnswers] = useState<GraderAnswers>({});
  const [submitted, setSubmitted] = useState(false);
  const [started, setStarted] = useState(false);

  const result = scoreProgram(answers);

  const choose = (id: GraderQuestionId, value: boolean) => {
    if (!started) {
      setStarted(true);
      track("cta_clicked", { cta: TOOLKIT_CTAS.graderStarted });
    }
    setAnswers((prev) => ({ ...prev, [id]: value }));
  };

  const show = () => {
    setSubmitted(true);
    track("cta_clicked", { cta: TOOLKIT_CTAS.graderCompleted });
  };

  const retake = () => {
    setAnswers({});
    setSubmitted(false);
  };

  return (
    <ToolShell
      path="/tools/referral-program-grader"
      metaTitle="Referral Program Grader | Score Your Referral Program | Revvin"
      metaDescription="Answer eight yes or no questions about how referrals work in your business today and get a score out of 100 plus the three things to fix first. Free, no account, nothing saved."
      eyebrow="Free tool"
      h1="Grade your referral program in eight questions."
      intro="Each question is about what is true today, not what you plan to do. Answer all eight and you get a score out of 100 and the three things worth fixing first. This is an operational checklist, not a forecast, and not professional advice."
      appName="Referral Program Grader"
      appDescription="An eight-item checklist that scores how completely a service business has set up its referral program and names the next three fixes. Runs in the browser with no account and no saved input."
      ctaHeading="Fix the gaps on a page that is free to publish."
      ctaCta={TOOLKIT_CTAS.graderSignup}
    >
      {!submitted ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            show();
          }}
        >
          <div className="space-y-4">
            {GRADER_QUESTIONS.map((q, i) => (
              <fieldset key={q.id} className="rounded-xl border border-border bg-background p-5">
                {/* `float-left w-full` keeps a wrapping legend inside the card
                    instead of sitting across the top border on narrow screens. */}
                <legend className="float-left mb-1 w-full text-sm font-bold text-foreground">
                  {i + 1}. {q.legend}
                </legend>
                <p className="text-sm leading-relaxed text-muted-foreground">{q.help}</p>
                <div className="mt-4 flex gap-2">
                  {[
                    { value: true, label: "Yes" },
                    { value: false, label: "Not yet" },
                  ].map((option) => {
                    const checked = answers[q.id] === option.value;
                    return (
                      <label
                        key={option.label}
                        className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors ${
                          checked
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <input
                          type="radio"
                          name={q.id}
                          value={option.label}
                          checked={checked}
                          onChange={() => choose(q.id, option.value)}
                          className="h-4 w-4 accent-primary"
                        />
                        {option.label}
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            ))}
          </div>

          <div className="mt-8">
            <Button type="submit" size="lg" className="h-12 w-full sm:w-auto sm:px-8" disabled={!result.complete}>
              Show my score
            </Button>
            <p className="mt-3 text-sm text-muted-foreground" aria-live="polite">
              {result.complete
                ? "All eight answered."
                : `${result.answeredCount} of ${result.total} answered.`}
            </p>
          </div>
        </form>
      ) : (
        <div className="rounded-2xl border border-border bg-background p-6 md:p-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Your result
          </p>
          <p className="mt-3 text-5xl font-extrabold tracking-tight text-foreground">
            {result.score}
            <span className="text-xl font-bold text-muted-foreground">/100</span>
          </p>
          <p className="mt-2 text-lg font-bold text-primary">{result.grade}</p>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {`You have ${result.answeredYes} of the ${result.total} basics in place. Every item counts the same, because we have no evidence that would justify weighting one above another. This is a checklist of what is set up, not a prediction of how many referrals you will get, and it is not professional advice.`}
          </p>

          <h2 className="mt-8 text-lg font-bold tracking-tight text-foreground">
            {result.actions.length > 0 ? "Fix these next, in this order" : "Nothing missing on this checklist"}
          </h2>
          {result.actions.length > 0 ? (
            <ol className="mt-4 space-y-3">
              {result.actions.map((a, i) => (
                <li key={a.id} className="flex gap-3 rounded-xl border border-border bg-card p-4">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {i + 1}
                  </span>
                  <span className="text-sm leading-relaxed text-foreground">{a.action}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              All eight basics are in place. The next thing that usually helps is asking more of the
              customers you have already served, rather than adding another step.
            </p>
          )}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button size="lg" className="h-12 sm:px-7" asChild>
              <Link to="/signup" onClick={() => track("cta_clicked", { cta: TOOLKIT_CTAS.graderSignup })}>
                Build my referral page free
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="h-12 sm:px-7" onClick={retake}>
              Retake the grader
            </Button>
          </div>

          <p className="mt-6 text-sm text-muted-foreground">
            Working out the amount next?{" "}
            <Link
              to="/tools/referral-reward-calculator"
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              Use the reward calculator
            </Link>
            .
          </p>
        </div>
      )}
    </ToolShell>
  );
};

export default ProgramGrader;
