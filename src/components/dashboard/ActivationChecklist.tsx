import { Link } from "react-router-dom";
import { CheckCircle2, Circle } from "lucide-react";

export interface ActivationStep {
  label: string;
  done: boolean;
  href?: string;
  onClick?: () => void;
  actionLabel?: string;
}

interface Props {
  steps: ActivationStep[];
}

const ActivationChecklist = ({ steps }: Props) => {
  const completed = steps.filter((s) => s.done).length;
  const total = steps.length;
  const pct = Math.round((completed / total) * 100);
  const allDone = completed === total;

  return (
    <div className={`mb-8 rounded-2xl border p-5 ${allDone ? "border-primary/30 bg-primary/5" : "border-border bg-card"}`}>
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            {allDone ? "Your program is live" : "Get your program live"}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {allDone
              ? "All activation steps complete. You can start sending invites."
              : `${completed} of ${total} steps complete`}
          </p>
        </div>
        <div className="text-xs font-medium text-muted-foreground tabular-nums">{pct}%</div>
      </div>

      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden mb-4">
        <div
          className={`h-full rounded-full transition-all ${allDone ? "bg-primary" : "bg-foreground/70"}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <ul className="space-y-1.5">
        {steps.map((s, i) => (
          <li
            key={i}
            className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm ${
              s.done ? "text-muted-foreground" : "text-foreground"
            }`}
          >
            <span className="flex items-center gap-2">
              {s.done ? (
                <CheckCircle2 className="h-4 w-4 text-primary" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground/50" />
              )}
              <span className={s.done ? "line-through" : ""}>{s.label}</span>
            </span>
            {!s.done && (s.href || s.onClick) && (
              s.href ? (
                <Link to={s.href} className="text-xs font-medium text-primary hover:underline">
                  {s.actionLabel ?? "Do it"}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={s.onClick}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  {s.actionLabel ?? "Do it"}
                </button>
              )
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ActivationChecklist;