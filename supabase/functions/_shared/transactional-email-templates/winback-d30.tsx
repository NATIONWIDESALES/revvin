import * as React from 'npm:react@18.3.1'
import { Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { RevvinShell, ctaButton, heading, paragraph } from './revvin-shell.tsx'
import { PRO_PRICE_LINE } from '../pricing-copy.ts'

interface Props {
  businessName?: string
  publicUrl?: string
  pricingUrl?: string
  unsubscribeUrl?: string
  postalAddress?: string
}

const Email = ({ businessName, publicUrl, pricingUrl, unsubscribeUrl, postalAddress }: Props) => (
  <RevvinShell
    previewText="Your page is still live and still free."
    unsubscribeUrl={unsubscribeUrl}
    postalAddress={postalAddress}
  >
    <Text style={heading}>Your page is still live</Text>
    <Text style={paragraph}>
      Hi, it's Karm. Just so you know, {businessName || 'your'} referral page is still live and still free, and your leads
      and your customer list are all still there.
      {publicUrl ? ` ${publicUrl}` : ''}
    </Text>
    <Text style={paragraph}>{PRO_PRICE_LINE}</Text>
    {pricingUrl ? <Text style={{ margin: '0 0 20px' }}>{ctaButton(pricingUrl, 'See Revvin Pro')}</Text> : null}
    <Text style={paragraph}>Karm</Text>
  </RevvinShell>
)

export const template = {
  component: Email,
  subject: 'Your page is still live',
  displayName: 'Win back, 30 days after cancel',
  previewData: {
    businessName: 'Summit Roofing',
    publicUrl: 'https://revvin.co/r/summit-roofing',
    pricingUrl: 'https://revvin.co/pricing',
    unsubscribeUrl: 'https://revvin.co/unsubscribe?token=sample',
    postalAddress: 'Revvin, 123 Example St, Vancouver BC, Canada',
  },
} satisfies TemplateEntry
