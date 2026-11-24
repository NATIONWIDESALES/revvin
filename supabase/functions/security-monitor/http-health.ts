export interface ScheduledHttpHealth {
  total: number;
  failures: number;
  real_errors: number;
  consecutive_jobs: string[];
  by_status: Record<string, number>;
}

/** Transport noise stays logged; only serious or sustained failures email. */
export function scheduledHttpFailing(health: ScheduledHttpHealth): boolean {
  return health.real_errors > 0 || health.consecutive_jobs.length > 0 ||
    (health.total > 0 && health.failures * 5 >= health.total);
}

/** Only a successfully sent failure opens a recovery notification. */
export function scheduledHttpWasFailing(previous: { alert_type: string; details?: { email_sent?: boolean } } | undefined): boolean {
  return previous?.alert_type === "health_http" && previous.details?.email_sent === true;
}