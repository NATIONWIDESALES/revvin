import * as React from 'npm:react@18.3.1'
import { Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { RevvinShell, ctaButton, heading, paragraph, quoted } from './revvin-shell.tsx'

interface Props {
  businessName?: string
  askMessage?: string
  dashboardUrl?: string
  unsubscribeUrl?: string
}

const Email = ({ businessName, askMessage, dashboardUrl, unsubscribeUrl }: Props) => (
  <RevvinShell previewText="Copy this text and send it to five recent customers." unsubscribeUrl={unsubscribeUrl}>
    <Text style={heading}>The text to send your last 5 customers</Text>
    <Text style={paragraph}>
      {businessName ? `Your page for ${businessName} is live.` : 'Your page is live.'} The fastest first referral comes from
      the customers you finished with recently. Copy this and send it to five of them.
    </Text>
    {askMessage ? <Text style={quoted}>{askMessage}</Text> : null}
    <Text style={paragraph}>That is the whole task. It takes about five minutes.</Text>
    {dashboardUrl ? <Text style={{ margin: '0 0 20px' }}>{ctaButton(dashboardUrl, 'Open my dashboard')}</Text> : null}
    <Text style={paragraph}>Reply to this email if you get stuck. It comes straight to me. Karm</Text>
  </RevvinShell>
)

export const template = {
  component: Email,
  subject: 'The text to send your last 5 customers',
  displayName: 'No share after 3 days',
  previewData: {
    businessName: 'Summit Roofing',
    askMessage:
      "Hi, it's Summit Roofing. Thanks again for having us out. If anyone you know needs the same work, this link comes straight to me: https://revvin.co/r/summit-roofing. I pay $100 if it turns into a job.",
    dashboardUrl: 'https://revvin.co/dashboard',
    unsubscribeUrl: 'https://revvin.co/unsubscribe?token=sample',
  },
} satisfies TemplateEntry
