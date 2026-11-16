import { checkCronAuth, type CronCredentials } from '../_shared/cron-auth.ts'

/** Validate alternate managed service credentials with the project's Auth API. */
export async function authorizeEmailQueue(
  req: Request,
  credentials: CronCredentials,
  supabaseUrl: string,
  request: typeof fetch = fetch,
): Promise<boolean> {
  if (checkCronAuth(req, credentials).ok) return true
  const authorization = req.headers.get('Authorization') ?? ''
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : ''
  if (!token || !credentials.serviceRoleKey || !supabaseUrl) return false

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 5000)
  try {
    // This endpoint requires verified service-role authorization, not a user
    // session or an unverified role claim. Never read or log its user payload.
    const response = await request(`${supabaseUrl}/auth/v1/admin/users?per_page=1&page=1`, {
      headers: { Authorization: `Bearer ${token}`, apikey: credentials.serviceRoleKey },
      redirect: 'error',
      signal: controller.signal,
    })
    await response.body?.cancel()
    return response.status === 200
  } catch {
    return false
  } finally {
    clearTimeout(timeout)
  }
}