import * as React from 'npm:react@18.3.1'
import { Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { RevvinShell, ctaButton, heading, paragraph, quoted } from './revvin-shell.tsx'

interface Props {
  businessName?: string
  askMessage?: string
  dashboardUrl?: string
  unsubscribeUrl?: string
  postalAddress?: string
}

const Email = ({ businessName, askMessage, dashboardUrl, unsubscribeUrl, postalAddress }: Props) => (
  <RevvinShell
    previewText="Pick 10 customers from the last 6 months and send them your link."
    unsubscribeUrl={unsubscribeUrl}
    postalAddress={postalAddress}
  >
    <Text style={heading}>The fastest referrals come from customers you already finished</Text>
    <Text style={paragraph}>
      Hi, it's Karm. {businessName || 'Your page'} is live. The quickest first referral comes from people who already know
      your work.
    </Text>
    <Text style={paragraph}>Pick 10 customers from the last 6 months and send them your link. This is the message.</Text>
    {askMessage ? <Text style={quoted}>{askMessage}</Text> : null}
    {dashboardUrl ? <Text style={{ margin: '0 0 20px' }}>{ctaButton(dashboardUrl, 'Open my dashboard')}</Text> : null}
    <Text style={paragraph}>When you want to ask your whole list at once, that is what Revvin Pro is for.</Text>
    <Text style={paragraph}>Karm</Text>
  </RevvinShell>
)

export const template = {
  component: Email,
  subject: 'The fastest referrals come from customers you already finished',
  displayName: 'Free, day 5',
  previewData: {
    businessName: 'Summit Roofing',
    askMessage:
      "Hi, it's Summit Roofing. Thanks again for having us out. If anyone you know needs the same work, this link comes straight to me: https://revvin.co/r/summit-roofing. I pay $100 if it turns into a job.",
    dashboardUrl: 'https://revvin.co/dashboard',
    unsubscribeUrl: 'https://revvin.co/unsubscribe?token=sample',
    postalAddress: 'Revvin, 123 Example St, Vancouver BC, Canada',
  },
} satisfies TemplateEntry
