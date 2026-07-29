// Recency segments for reactivation campaigns. Kept byte-for-byte in step with
// supabase/functions/_shared/segments.ts so the count the owner previews is the
// same set the worker sends to.

export interface Segment {
  key: string;
  label: string;
  description: string;
  minMonths: number;
  maxMonths: number | null;
}

export const SEGMENTS: Segment[] = [
  { key: "0_6", label: "Under 6 months", description: "Recent customers", minMonths: 0, maxMonths: 6 },
  { key: "6_12", label: "6 to 12 months", description: "Going quiet", minMonths: 6, maxMonths: 12 },
  { key: "12_24", label: "12 to 24 months", description: "Dormant", minMonths: 12, maxMonths: 24 },
  { key: "24_plus", label: "24 months or more", description: "Long lapsed", minMonths: 24, maxMonths: null },
  { key: "all", label: "Everyone on the list", description: "No recency filter", minMonths: 0, maxMonths: null },
];

export const segmentByKey = (key: string) => SEGMENTS.find((s) => s.key === key) ?? null;

const monthsAgo = (months: number) => {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return d;
};

export interface RecencyContact {
  last_job_at?: string | null;
  created_at: string;
}

export const recencyDate = (c: RecencyContact) => new Date(c.last_job_at ?? c.created_at);

export function inSegment(contact: RecencyContact, segment: Segment): boolean {
  const d = recencyDate(contact).getTime();
  if (d > monthsAgo(segment.minMonths).getTime()) return false;
  if (segment.maxMonths == null) return true;
  return d >= monthsAgo(segment.maxMonths).getTime();
}

export function segmentCounts(contacts: RecencyContact[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const s of SEGMENTS) out[s.key] = contacts.filter((c) => inSegment(c, s)).length;
  return out;
}
