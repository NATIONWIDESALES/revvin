import * as React from 'npm:react@18.3.1'
import { Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { RevvinShell, ctaButton, heading, paragraph } from './revvin-shell.tsx'

interface Props {
  businessName?: string
  setupCallUrl?: string
  unsubscribeUrl?: string
}

const Email = ({ businessName, setupCallUrl, unsubscribeUrl }: Props) => (
  <RevvinShell previewText="A free 30 minute call to work out who to ask." unsubscribeUrl={unsubscribeUrl}>
    <Text style={heading}>Your page has been live for a month</Text>
    <Text style={paragraph}>
      Hi, it's Karm. {businessName || 'Your page'} has been live for a month and no referrals have come in yet. That is
      almost always about who has seen the link, not the page itself.
    </Text>
    <Text style={paragraph}>
      Grab a free 30 minute call with me. We work out who to ask, what to send them, and send the first few while we are
      on the phone.
    </Text>
    {setupCallUrl ? <Text style={{ margin: '0 0 20px' }}>{ctaButton(setupCallUrl, 'Book a free 30 minute call')}</Text> : null}
    <Text style={paragraph}>Karm</Text>
  </RevvinShell>
)

export const template = {
  component: Email,
  subject: 'Your page has been live for a month',
  displayName: 'No leads after 30 days',
  previewData: {
    businessName: 'Summit Roofing',
    setupCallUrl: 'https://cal.com/revvin/30min',
    unsubscribeUrl: 'https://revvin.co/unsubscribe?token=sample',
  },
} satisfies TemplateEntry
