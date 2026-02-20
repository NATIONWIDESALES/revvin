import { CheckCircle2, Circle } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface ChecklistItem {
  label: string;
  done: boolean;
  action?: () => void;
  actionLabel?: string;
}

interface DashboardChecklistProps {
  title: string;
  items: ChecklistItem[];
  onDemoMode?: () => void;
}

const DashboardChecklist = ({ title, items, onDemoMode }: DashboardChecklistProps) => {
  const [dismissed, setDismissed] = useState(false);
  const completedCount = items.filter((i) => i.done).length;
  const allDone = completedCount === items.length;

  if (dismissed) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`mb-6 rounded-2xl border-2 p-5 shadow-sm ${
        allDone
          ? "border-earnings/30 bg-earnings/5"
          : "border-primary/20 bg-primary/5"
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-display text-sm font-bold flex items-center gap-2">
            {allDone ? (
              <CheckCircle2 className="h-4 w-4 text-earnings" />
            ) : (
              <Circle className="h-4 w-4 text-primary" />
            )}
            {title}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {completedCount}/{items.length} complete
          </p>
        </div>
        <div className="flex items-center gap-2">
          {onDemoMode && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7 px-2.5 gap-1"
              onClick={onDemoMode}
            >
              🎮 Demo Mode
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-7 px-2"
            onClick={() => setDismissed(true)}
          >
            ✕
          </Button>
        </div>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden mb-3">
        <div
          className={`h-full rounded-full transition-all ${
            allDone ? "bg-earnings" : "bg-primary"
          }`}
          style={{ width: `${(completedCount / items.length) * 100}%` }}
        />
      </div>
      <div className="space-y-1.5">
        {items.map((item, i) => (
          <div
            key={i}
            className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
              item.done
                ? "bg-earnings/5 text-earnings"
                : "bg-card text-muted-foreground"
            }`}
          >
            <span className="flex items-center gap-2">
              {item.done ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : (
                <Circle className="h-3.5 w-3.5" />
              )}
              {item.label}
            </span>
            {!item.done && item.action && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs px-2 text-primary"
                onClick={item.action}
              >
                {item.actionLabel ?? "Do it →"}
              </Button>
            )}
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default DashboardChecklist;
