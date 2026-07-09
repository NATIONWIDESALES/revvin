-- Add a single, idempotent column so the stale-lead nudge fires at most once per lead.
-- Additive only. No policy changes, no CHECK constraint changes.
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS stale_nudge_sent_at timestamptz;

-- Small index to keep the nightly scan cheap once volume grows.
CREATE INDEX IF NOT EXISTS leads_stale_nudge_scan_idx
  ON public.leads (created_at)
  WHERE status = 'new' AND stale_nudge_sent_at IS NULL;