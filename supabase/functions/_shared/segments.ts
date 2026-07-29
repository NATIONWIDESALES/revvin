// Recency segments for reactivation campaigns. Kept byte-for-byte in step with
// src/lib/campaignSegments.ts so the preview count the owner sees matches what
// the worker actually sends to.

export interface Segment {
  key: string;
  label: string;
  /** Inclusive lower bound in months since the last job. */
  minMonths: number;
  /** Exclusive upper bound in months, or null for open ended. */
  maxMonths: number | null;
}

export const SEGMENTS: Segment[] = [
  { key: "0_6", label: "Under 6 months", minMonths: 0, maxMonths: 6 },
  { key: "6_12", label: "6 to 12 months", minMonths: 6, maxMonths: 12 },
  { key: "12_24", label: "12 to 24 months", minMonths: 12, maxMonths: 24 },
  { key: "24_plus", label: "24 months or more", minMonths: 24, maxMonths: null },
  { key: "all", label: "Everyone on the list", minMonths: 0, maxMonths: null },
];

export const segmentByKey = (key: string) => SEGMENTS.find((s) => s.key === key) ?? null;

const monthsAgo = (months: number) => {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return d;
};

/**
 * The recency date for a contact: the real last-job date when the owner has
 * captured one, otherwise the date the contact was added. Callers must tell the
 * owner which one is in play.
 */
export const recencyDate = (c: { last_job_at?: string | null; created_at: string }) =>
  new Date(c.last_job_at ?? c.created_at);

export function inSegment(
  contact: { last_job_at?: string | null; created_at: string },
  segment: Segment,
): boolean {
  const d = recencyDate(contact).getTime();
  const newerBound = monthsAgo(segment.minMonths).getTime();
  if (d > newerBound) return false;
  if (segment.maxMonths == null) return true;
  return d >= monthsAgo(segment.maxMonths).getTime();
}
