import { describe, expect, it, vi } from 'vitest'
import { authorizeEmailQueue } from '../../supabase/functions/process-email-queue/queue-auth'

const credentials = { cronSecret: 'fixture-cron', serviceRoleKey: 'fixture-service' }
const url = 'https://fixture.invalid'
const bearer = (token: string) => new Request(url, { headers: { Authorization: `Bearer ${token}` } })

describe('email queue service authorization', () => {
  it('keeps exact configured service and cron credentials without an API call', async () => {
    const request = vi.fn()
    expect(await authorizeEmailQueue(bearer(credentials.serviceRoleKey), credentials, url, request)).toBe(true)
    expect(await authorizeEmailQueue(new Request(url, { headers: { 'x-cron-secret': credentials.cronSecret } }), credentials, url, request)).toBe(true)
    expect(request).not.toHaveBeenCalled()
  })

  it('accepts an alternate service credential only after server verification', async () => {
    const request = vi.fn().mockResolvedValue(new Response(null, { status: 200 }))
    expect(await authorizeEmailQueue(bearer('fixture-alternate-service'), credentials, url, request)).toBe(true)
    expect(request).toHaveBeenCalledWith(`${url}/auth/v1/admin/users?per_page=1&page=1`, expect.objectContaining({
      headers: { Authorization: 'Bearer fixture-alternate-service', apikey: credentials.serviceRoleKey },
      redirect: 'error',
    }))
  })

  it.each([401, 403, 500])('rejects a user, forged or unavailable credential with status %s', async status => {
    const token = `fixture.${btoa(JSON.stringify({ role: 'service_role' }))}.unsigned`
    const request = vi.fn().mockResolvedValue(new Response(null, { status }))
    expect(await authorizeEmailQueue(bearer(token), credentials, url, request)).toBe(false)
  })

  it('fails closed when verification is unreachable or credentials are absent', async () => {
    const request = vi.fn().mockRejectedValue(new Error('network unavailable'))
    expect(await authorizeEmailQueue(bearer('fixture-alternate'), credentials, url, request)).toBe(false)
    request.mockClear()
    expect(await authorizeEmailQueue(new Request(url), credentials, url, request)).toBe(false)
    expect(await authorizeEmailQueue(bearer('fixture-alternate'), { cronSecret: '', serviceRoleKey: '' }, url, request)).toBe(false)
    expect(request).not.toHaveBeenCalled()
  })
})