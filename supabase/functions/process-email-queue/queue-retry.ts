// Pure decisions for app email delivery failures and payload repair.

export const TOKEN_PATTERN = /^[a-zA-Z0-9_-]{16,200}$/

/** Transactional payloads must carry an unsubscribe token for the email API. */
export function needsUnsubscribeToken(payload: Record<string, unknown>): boolean {
  if (payload.purpose !== 'transactional') return false
  if (typeof payload.to !== 'string' || !payload.to.trim()) return false
  return !(typeof payload.unsubscribe_token === 'string' && TOKEN_PATTERN.test(payload.unsubscribe_token))
}

export async function withUnsubscribeToken(
  payload: Record<string, unknown>,
  mint: (email: string) => Promise<string | null>,
): Promise<Record<string, unknown>> {
  if (!needsUnsubscribeToken(payload)) return payload
  const token = await mint(String(payload.to))
  if (!token) throw new Error('unsubscribe_token_unavailable')
  return { ...payload, unsubscribe_token: token }
}

function statusOf(error: unknown): number | null {
  if (error && typeof error === 'object' && 'status' in error) {
    const s = Number((error as { status: unknown }).status)
    if (Number.isFinite(s)) return s
  }
  const m = /Email API error:\s*(\d{3})/.exec(error instanceof Error ? error.message : String(error ?? ''))
  return m ? Number(m[1]) : null
}

/**
 * rekey: the API refuses this idempotency key forever ("already failed"), so
 *        the next attempt must use a new key.
 * permanent: the request itself is invalid; retrying the same body cannot work.
 * retry: transient, keep the normal backoff.
 */
export function classifySendFailure(error: unknown): 'rekey' | 'permanent' | 'retry' {
  const status = statusOf(error)
  const text = error instanceof Error ? error.message : String(error ?? '')
  if (status === 409 && /run_failed|already failed/i.test(text)) return 'rekey'
  if (status === 400) return 'permanent'
  return 'retry'
}

/** A fresh idempotency key derived from the original, one per attempt. */
export function rekeyPayload(payload: Record<string, unknown>, attempt: number): Record<string, unknown> {
  const base = String(payload.idempotency_key ?? payload.message_id ?? crypto.randomUUID()).replace(/:retry\d+$/, '')
  return { ...payload, idempotency_key: `${base}:retry${attempt}` }
}
