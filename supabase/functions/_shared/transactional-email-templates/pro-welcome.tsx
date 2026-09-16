import * as React from 'npm:react@18.3.1'
import { Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { RevvinShell, ctaButton, heading, paragraph } from './revvin-shell.tsx'

interface Props {
  businessName?: string
  customersUrl?: string
  unsubscribeUrl?: string
}

const step = { fontSize: '15px', lineHeight: '1.6', color: '#334155', margin: '0 0 10px' }

const Email = ({ businessName, customersUrl, unsubscribeUrl }: Props) => (
  <RevvinShell previewText="Three steps to get your list asking." unsubscribeUrl={unsubscribeUrl}>
    <Text style={heading}>Welcome to Revvin Pro. Here is where to start</Text>
    <Text style={paragraph}>
      Hi, it's Karm. Thanks for going Pro{businessName ? ` with ${businessName}` : ''}. Three steps and your past
      customers are working for you.
    </Text>
    <Text style={step}>1. Import your past customers in the Customers tab. A CSV works, or paste them in.</Text>
    <Text style={step}>2. Send your ask in batches from your own email, so it comes from you.</Text>
    <Text style={step}>3. Add your business address in Campaigns before sending a reactivation email.</Text>
    {customersUrl ? <Text style={{ margin: '16px 0 20px' }}>{ctaButton(customersUrl, 'Open the Customers tab')}</Text> : null}
    <Text style={paragraph}>Reply to this email if you get stuck. It comes straight to me.</Text>
    <Text style={paragraph}>Karm</Text>
  </RevvinShell>
)

export const template = {
  component: Email,
  category: 'setup',
  subject: 'Welcome to Revvin Pro. Here is where to start',
  displayName: 'Pro welcome',
  previewData: {
    businessName: 'Summit Roofing',
    customersUrl: 'https://revvin.co/dashboard?tab=customers',
    unsubscribeUrl: 'https://revvin.co/unsubscribe?token=sample',
  },
} satisfies TemplateEntry
