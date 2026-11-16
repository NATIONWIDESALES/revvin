import { describe, expect, it } from 'vitest'
import { emailHtml } from '../../supabase/functions/process-email-queue/queue-body'

describe('plain-text queue delivery', () => {
  it('provides the HTML required by the provider for text-only failure alerts', () => {
    expect(emailHtml({ label: 'failure_alert', text: 'Step: image_upload\nError: <bad> & "quoted"' }))
      .toBe('<pre>Step: image_upload\nError: &lt;bad&gt; &amp; &quot;quoted&quot;</pre>')
  })

  it('preserves existing rendered email HTML and does not invent missing content', () => {
    expect(emailHtml({ html: '<p>Existing email</p>', text: 'Other text' })).toBe('<p>Existing email</p>')
    expect(emailHtml({})).toBeUndefined()
  })
})