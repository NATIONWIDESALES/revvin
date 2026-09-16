import * as React from 'npm:react@18.3.1'
import { Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { RevvinShell, ctaButton, heading, paragraph } from './revvin-shell.tsx'
import { PRO_FEATURE_LABELS, PRO_PRICE_LINE } from '../pricing-copy.ts'

interface Props {
  businessName?: string
  pricingUrl?: string
  unsubscribeUrl?: string
  postalAddress?: string
}

const item = { fontSize: '15px', lineHeight: '1.6', color: '#334155', margin: '0 0 8px' }

const Email = ({ businessName, pricingUrl, unsubscribeUrl, postalAddress }: Props) => (
  <RevvinShell
    previewText="What Revvin Pro adds, and what it costs."
    unsubscribeUrl={unsubscribeUrl}
    postalAddress={postalAddress}
  >
    <Text style={heading}>Ask your whole customer list in about 10 minutes</Text>
    <Text style={paragraph}>
      Hi, it's Karm. Asking one customer at a time works{businessName ? `, and ${businessName} can keep doing that for free` : ' and it is free'}.
      Revvin Pro is for asking everyone.
    </Text>
    {PRO_FEATURE_LABELS.map((label) => (
      <Text key={label} style={item}>
        {label}
      </Text>
    ))}
    <Text style={paragraph}>{PRO_PRICE_LINE}</Text>
    {pricingUrl ? <Text style={{ margin: '0 0 20px' }}>{ctaButton(pricingUrl, 'See Revvin Pro')}</Text> : null}
    <Text style={paragraph}>Karm</Text>
  </RevvinShell>
)

export const template = {
  component: Email,
  subject: 'Ask your whole customer list in about 10 minutes',
  displayName: 'Free, day 10',
  previewData: {
    businessName: 'Summit Roofing',
    pricingUrl: 'https://revvin.co/pricing',
    unsubscribeUrl: 'https://revvin.co/unsubscribe?token=sample',
    postalAddress: 'Revvin, 123 Example St, Vancouver BC, Canada',
  },
} satisfies TemplateEntry
