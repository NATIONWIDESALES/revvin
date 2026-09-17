import * as React from 'npm:react@18.3.1'
import { Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import {
  PartnerShell,
  partnerCta,
  partnerHeading,
  partnerParagraph,
  partnerRow,
} from './partner-shell.tsx'

interface Props {
  name?: string
  amount?: string
  method?: string
  reference?: string
  dashboardLink?: string
}

const Email = ({ name, amount, method, reference, dashboardLink }: Props) => (
  <PartnerShell previewText="Your Revvin partner payout is on its way.">
    <Text style={partnerHeading}>Your payout is on its way</Text>
    <Text style={partnerParagraph}>{name ? `Hi ${name},` : 'Hi,'}</Text>
    <Text style={partnerParagraph}>Thanks for sending business our way. Here are the details.</Text>
    <Text style={partnerRow}>Amount: {amount || '$0.00'}</Text>
    <Text style={partnerRow}>Method: {method || 'PayPal'}</Text>
    {reference ? <Text style={partnerRow}>Reference: {reference}</Text> : null}
    {dashboardLink ? <Text style={{ margin: '16px 0 20px' }}>{partnerCta(dashboardLink, 'See it in your dashboard')}</Text> : null}
    <Text style={partnerParagraph}>
      If anything looks wrong, reply and I will check it with you. It comes straight to me.
    </Text>
    <Text style={partnerParagraph}>Karm</Text>
  </PartnerShell>
)

export const template = {
  component: Email,
  subject: 'Your Revvin partner payout is on its way',
  displayName: 'Partner payout sent',
  previewData: {
    name: 'Alex',
    amount: '$196.00',
    method: 'PayPal',
    reference: 'PAY-2026-0917',
    dashboardLink: 'https://revvin.co/partners/dashboard?t=sample-token',
  },
} satisfies TemplateEntry
