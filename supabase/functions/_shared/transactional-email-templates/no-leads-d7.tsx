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
  <RevvinShell previewText="A free 15 minute call to get your first referral in." unsubscribeUrl={unsubscribeUrl}>
    <Text style={heading}>Want me to set this up with you?</Text>
    <Text style={paragraph}>
      {businessName ? `Hi, it's Karm at Revvin. ${businessName} has been live for a week` : 'Hi, it is Karm at Revvin. Your page has been live for a week'}{' '}
      and no referrals have come in yet. That is almost always because the link has not gone out to enough past customers.
    </Text>
    <Text style={paragraph}>
      I will do it with you on a free 15 minute call. We pick the customers, write the message, and send it while we are on
      the phone.
    </Text>
    {setupCallUrl ? <Text style={{ margin: '0 0 20px' }}>{ctaButton(setupCallUrl, 'Book a free 15 minute call')}</Text> : null}
    <Text style={paragraph}>Reply to this email if you get stuck. It comes straight to me. Karm</Text>
  </RevvinShell>
)

export const template = {
  component: Email,
  subject: 'Want me to set this up with you?',
  displayName: 'No leads after 7 days',
  previewData: {
    businessName: 'Summit Roofing',
    setupCallUrl: 'https://revvin.co/setup-call',
    unsubscribeUrl: 'https://revvin.co/unsubscribe?token=sample',
  },
} satisfies TemplateEntry
