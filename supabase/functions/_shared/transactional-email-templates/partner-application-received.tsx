import * as React from 'npm:react@18.3.1'
import { Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { PartnerShell, partnerHeading, partnerParagraph } from './partner-shell.tsx'

interface Props {
  name?: string
}

const Email = ({ name }: Props) => (
  <PartnerShell previewText="We got your Revvin partner application.">
    <Text style={partnerHeading}>We got your application</Text>
    <Text style={partnerParagraph}>{name ? `Hi ${name},` : 'Hi,'}</Text>
    <Text style={partnerParagraph}>
      Thanks for applying to the Revvin Partner Program. We review every application personally and will
      email you within a few days.
    </Text>
    <Text style={partnerParagraph}>
      If you have not looked at the product yet, build a free referral page for yourself first. It is the
      quickest way to know what you are talking about.
    </Text>
    <Text style={partnerParagraph}>Reply with any questions. It comes straight to me.</Text>
    <Text style={partnerParagraph}>Karm</Text>
  </PartnerShell>
)

export const template = {
  component: Email,
  subject: 'We got your Revvin partner application',
  displayName: 'Partner application received',
  previewData: { name: 'Alex' },
} satisfies TemplateEntry
