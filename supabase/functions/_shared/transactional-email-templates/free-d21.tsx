import * as React from 'npm:react@18.3.1'
import { Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { RevvinShell, ctaButton, heading, paragraph } from './revvin-shell.tsx'
import { LAUNCH_PACKAGE_LINE } from '../pricing-copy.ts'

interface Props {
  businessName?: string
  pricingUrl?: string
  unsubscribeUrl?: string
  postalAddress?: string
}

const Email = ({ businessName, pricingUrl, unsubscribeUrl, postalAddress }: Props) => (
  <RevvinShell
    previewText="The Launch Package, set up with you."
    unsubscribeUrl={unsubscribeUrl}
    postalAddress={postalAddress}
  >
    <Text style={heading}>Want us to set it all up for you?</Text>
    <Text style={paragraph}>
      Hi, it's Karm. If getting {businessName || 'your page'} in front of customers keeps sliding down the list, we can do
      the setup with you.
    </Text>
    <Text style={paragraph}>{LAUNCH_PACKAGE_LINE}</Text>
    {pricingUrl ? <Text style={{ margin: '0 0 20px' }}>{ctaButton(pricingUrl, 'See the Launch Package')}</Text> : null}
    <Text style={paragraph}>Karm</Text>
  </RevvinShell>
)

export const template = {
  component: Email,
  subject: 'Want us to set it all up for you?',
  displayName: 'Free, day 21 (Launch Package)',
  previewData: {
    businessName: 'Summit Roofing',
    pricingUrl: 'https://revvin.co/pricing',
    unsubscribeUrl: 'https://revvin.co/unsubscribe?token=sample',
    postalAddress: 'Revvin, 123 Example St, Vancouver BC, Canada',
  },
} satisfies TemplateEntry
