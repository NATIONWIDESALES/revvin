import * as React from 'npm:react@18.3.1'
import { Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { RevvinShell, ctaButton, heading, paragraph, quoted } from './revvin-shell.tsx'

interface Props {
  businessName?: string
  askMessage?: string
  customersUrl?: string
  unsubscribeUrl?: string
}

const Email = ({ businessName, askMessage, customersUrl, unsubscribeUrl }: Props) => (
  <RevvinShell previewText="Copy this, then use Open in Gmail." unsubscribeUrl={unsubscribeUrl}>
    <Text style={heading}>Your list is ready. Here is the first ask to send</Text>
    <Text style={paragraph}>
      Hi, it's Karm. {businessName || 'Your account'} has customers imported but no ask has gone out yet. This is the
      message I would send.
    </Text>
    {askMessage ? <Text style={quoted}>{askMessage}</Text> : null}
    <Text style={paragraph}>
      In the Customers tab, pick your batch and use the Open in Gmail button. It opens the draft in your own email, so it
      arrives from you.
    </Text>
    {customersUrl ? <Text style={{ margin: '0 0 20px' }}>{ctaButton(customersUrl, 'Send my first batch')}</Text> : null}
    <Text style={paragraph}>Karm</Text>
  </RevvinShell>
)

export const template = {
  component: Email,
  subject: 'Your list is ready. Here is the first ask to send',
  displayName: 'Pro, no ask after 7 days',
  previewData: {
    businessName: 'Summit Roofing',
    askMessage:
      "Hi, it's Summit Roofing. Thanks again for having us out. If anyone you know needs the same work, this link comes straight to me: https://revvin.co/r/summit-roofing. I pay $100 if it turns into a job.",
    customersUrl: 'https://revvin.co/dashboard?tab=customers',
    unsubscribeUrl: 'https://revvin.co/unsubscribe?token=sample',
  },
} satisfies TemplateEntry
