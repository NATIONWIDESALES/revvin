// Recency segments for reactivation campaigns. The keys mirror fn_contact_segments
// so the count the owner previews is the same group the server queues.

export interface Segment {
  key: string;
  label: string;
  description: string;
  minMonths: number | null;
  maxMonths: number | null;
}

export const SEGMENTS: Segment[] = [
  { key: "m24_plus", label: "24 months or more", description: "Biggest opportunity", minMonths: 24, maxMonths: null },
  { key: "m12_24", label: "12 to 24 months", description: "Long-lapsed customers", minMonths: 12, maxMonths: 24 },
  { key: "m6_12", label: "6 to 12 months", description: "Due for a check-in", minMonths: 6, maxMonths: 12 },
  { key: "recent", label: "Under 6 months", description: "Recent customers", minMonths: 0, maxMonths: 6 },
  { key: "unknown", label: "No last job date", description: "Add dates to improve targeting", minMonths: null, maxMonths: null },
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

export const recencyDate = (c: RecencyContact) => c.last_job_at ? new Date(c.last_job_at) : null;

export function inSegment(contact: RecencyContact, segment: Segment): boolean {
  if (!contact.last_job_at) return segment.key === "unknown";
  const timestamp = new Date(contact.last_job_at).getTime();
  if (!Number.isFinite(timestamp)) return segment.key === "unknown";
  if (segment.key === "unknown") return false;
  if (segment.minMonths !== null && timestamp > monthsAgo(segment.minMonths).getTime()) return false;
  if (segment.maxMonths == null) return true;
  return timestamp >= monthsAgo(segment.maxMonths).getTime();
}

export function segmentCounts(contacts: RecencyContact[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const s of SEGMENTS) out[s.key] = contacts.filter((c) => inSegment(c, s)).length;
  return out;
}
