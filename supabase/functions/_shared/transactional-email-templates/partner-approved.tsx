import * as React from 'npm:react@18.3.1'
import { Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import {
  PartnerShell,
  partnerBox,
  partnerCta,
  partnerHeading,
  partnerParagraph,
  partnerRow,
} from './partner-shell.tsx'

interface Props {
  name?: string
  code?: string
  partnerLink?: string
  dashboardLink?: string
  commissionLine?: string
  payoutLine?: string
}

const Email = ({ name, code, partnerLink, dashboardLink, commissionLine, payoutLine }: Props) => (
  <PartnerShell previewText="You are in. Here is your Revvin partner link.">
    <Text style={partnerHeading}>You are in</Text>
    <Text style={partnerParagraph}>{name ? `Hi ${name},` : 'Hi,'}</Text>
    <Text style={partnerParagraph}>
      Your application is approved. Here is everything you need to start sharing Revvin.
    </Text>
    {partnerLink ? (
      <>
        <Text style={partnerRow}>Your link</Text>
        <Text style={partnerBox}>{partnerLink}</Text>
      </>
    ) : null}
    {code ? (
      <>
        <Text style={partnerRow}>Your partner code</Text>
        <Text style={partnerBox}>{code}</Text>
      </>
    ) : null}
    {dashboardLink ? <Text style={{ margin: '4px 0 20px' }}>{partnerCta(dashboardLink, 'Open your dashboard')}</Text> : null}
    <Text style={partnerParagraph}>
      Keep that dashboard link private. It is the only way in, so treat it like a password.
    </Text>
    <Text style={partnerRow}>The short version of the rules:</Text>
    <Text style={partnerRow}>{commissionLine || 'You earn a share of the cash we collect from customers you refer.'}</Text>
    <Text style={partnerRow}>{payoutLine || 'Commissions clear 30 days after your customer pays.'}</Text>
    <Text style={partnerRow}>Say clearly that you earn a commission on anything you post.</Text>
    <Text style={partnerRow}>Do not promise anyone income or claim results Revvin has not produced.</Text>
    <Text style={partnerRow}>Do not bid on Revvin or revvin.co as ad keywords, and do not sign yourself up.</Text>
    <Text style={partnerParagraph}>
      The full terms are at revvin.co/partners/terms. We need a tax form before your first payout.
    </Text>
    <Text style={partnerParagraph}>Reply with any questions. It comes straight to me.</Text>
    <Text style={partnerParagraph}>Karm</Text>
  </PartnerShell>
)

export const template = {
  component: Email,
  subject: 'You are approved as a Revvin partner',
  displayName: 'Partner approved',
  previewData: {
    name: 'Alex',
    code: 'alex-builds',
    partnerLink: 'https://revvin.co/?via=alex-builds',
    dashboardLink: 'https://revvin.co/partners/dashboard?t=sample-token',
    commissionLine: 'You earn 40% of the cash we collect from customers you refer, for as long as they pay.',
    payoutLine: 'Commissions clear 30 days after payment. We pay on the 15th once your balance reaches $50.',
  },
} satisfies TemplateEntry
