import * as React from 'npm:react@18.3.1'
import { Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { RevvinShell, ctaButton, heading, paragraph } from './revvin-shell.tsx'

interface Props {
  businessName?: string
  customersUrl?: string
  unsubscribeUrl?: string
}

const Email = ({ businessName, customersUrl, unsubscribeUrl }: Props) => (
  <RevvinShell previewText="Any spreadsheet with a name and email works." unsubscribeUrl={unsubscribeUrl}>
    <Text style={heading}>Need a hand importing your customer list?</Text>
    <Text style={paragraph}>
      Hi, it's Karm. {businessName || 'Your account'} is on Pro but there are no customers in the list yet, and the list is
      where the referrals come from.
    </Text>
    <Text style={paragraph}>
      Any spreadsheet with a name and an email works. You can also paste names straight from your phone contacts. If it is
      quicker, reply to this email with the file and I will import it for you.
    </Text>
    {customersUrl ? <Text style={{ margin: '0 0 20px' }}>{ctaButton(customersUrl, 'Import my customers')}</Text> : null}
    <Text style={paragraph}>Karm</Text>
  </RevvinShell>
)

export const template = {
  component: Email,
  subject: 'Need a hand importing your customer list?',
  displayName: 'Pro, no import after 2 days',
  previewData: {
    businessName: 'Summit Roofing',
    customersUrl: 'https://revvin.co/dashboard?tab=customers',
    unsubscribeUrl: 'https://revvin.co/unsubscribe?token=sample',
  },
} satisfies TemplateEntry
