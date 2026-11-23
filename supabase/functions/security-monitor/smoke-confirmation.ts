export interface SmokeRun {
  ran_at: string;
  ok: boolean;
  failed_step: string | null;
  steps: { step: string; ok: boolean; error?: string }[];
}

/** Runs are newest first. A single historical failure is not a confirmation. */
export function smokeFailureConfirmed(runs: SmokeRun[]): boolean {
  const [latest, previous] = runs;
  if (!latest || !previous || latest.ok !== false || previous.ok !== false) return false;
  const elapsed = new Date(latest.ran_at).getTime() - new Date(previous.ran_at).getTime();
  return Number.isFinite(elapsed) && elapsed >= 0 && elapsed <= 60_000;
}