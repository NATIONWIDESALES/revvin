import * as React from 'npm:react@18.3.1'
import { Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { RevvinShell, ctaButton, heading, paragraph } from './revvin-shell.tsx'

interface Props {
  businessName?: string
  publishUrl?: string
  setupCallUrl?: string
  unsubscribeUrl?: string
}

const Email = ({ businessName, publishUrl, setupCallUrl, unsubscribeUrl }: Props) => (
  <RevvinShell previewText="Reply with your logo and reward and I will set the page up." unsubscribeUrl={unsubscribeUrl}>
    <Text style={heading}>Want me to set it up for you?</Text>
    <Text style={paragraph}>
      Hi, it's Karm. Your Revvin page for {businessName || 'your business'} is still in draft. If it is easier, reply with
      your logo and the reward you want to offer and I will set the page up for you. Or grab a free 30 minute call and we
      will do it together.
    </Text>
    {publishUrl ? <Text style={{ margin: '0 0 12px' }}>{ctaButton(publishUrl, 'Publish my page')}</Text> : null}
    {setupCallUrl ? <Text style={{ margin: '0 0 20px' }}>{ctaButton(setupCallUrl, 'Book a free 30 minute call')}</Text> : null}
    <Text style={paragraph}>Karm</Text>
  </RevvinShell>
)

export const template = {
  component: Email,
  category: 'setup',
  subject: 'Want me to set it up for you?',
  displayName: 'Not published after 3 days',
  previewData: {
    businessName: 'Summit Roofing',
    publishUrl: 'https://revvin.co/dashboard?tab=page',
    setupCallUrl: 'https://cal.com/revvin/30min',
    unsubscribeUrl: 'https://revvin.co/unsubscribe?token=sample',
  },
} satisfies TemplateEntry
