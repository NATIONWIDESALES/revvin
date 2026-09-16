import * as React from 'npm:react@18.3.1'
import { Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { RevvinShell, ctaButton, heading, paragraph } from './revvin-shell.tsx'

interface Props {
  businessName?: string
  pricingUrl?: string
  unsubscribeUrl?: string
  postalAddress?: string
}

const Email = ({ businessName, pricingUrl, unsubscribeUrl, postalAddress }: Props) => (
  <RevvinShell
    previewText="The next ones come faster when everyone has seen your link."
    unsubscribeUrl={unsubscribeUrl}
    postalAddress={postalAddress}
  >
    <Text style={heading}>Nice work on your first referral</Text>
    <Text style={paragraph}>
      Hi, it's Karm. {businessName || 'Your page'} got its first referral. That is the hard one.
    </Text>
    <Text style={paragraph}>
      The next ones come faster when every past customer has seen your link. Revvin Pro imports your whole list and helps
      you ask everyone in a few batches, sent from your own email.
    </Text>
    {pricingUrl ? <Text style={{ margin: '0 0 20px' }}>{ctaButton(pricingUrl, 'See Revvin Pro')}</Text> : null}
    <Text style={paragraph}>Karm</Text>
  </RevvinShell>
)

export const template = {
  component: Email,
  category: 'promo',
  subject: 'Nice work on your first referral',
  displayName: 'Day after first lead',
  previewData: {
    businessName: 'Summit Roofing',
    pricingUrl: 'https://revvin.co/pricing',
    unsubscribeUrl: 'https://revvin.co/unsubscribe?token=sample',
    postalAddress: 'Revvin, 123 Example St, Vancouver BC, Canada',
  },
} satisfies TemplateEntry
