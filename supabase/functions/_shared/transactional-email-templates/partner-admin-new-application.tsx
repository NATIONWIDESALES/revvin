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
  email?: string
  country?: string
  channels?: string
  audienceSize?: string
  promoPlan?: string
  payoutMethod?: string
  adminLink?: string
}

const Email = ({
  name,
  email,
  country,
  channels,
  audienceSize,
  promoPlan,
  payoutMethod,
  adminLink,
}: Props) => (
  <PartnerShell previewText="New partner application waiting for review." internal>
    <Text style={partnerHeading}>New partner application</Text>
    <Text style={partnerParagraph}>Someone applied to the Revvin Partner Program.</Text>
    <Text style={partnerRow}>Name: {name || 'Not given'}</Text>
    <Text style={partnerRow}>Email: {email || 'Not given'}</Text>
    <Text style={partnerRow}>Country: {country || 'Not given'}</Text>
    <Text style={partnerRow}>Audience size: {audienceSize || 'Not given'}</Text>
    <Text style={partnerRow}>Payout preference: {payoutMethod || 'Not given'}</Text>
    <Text style={partnerRow}>Where they will share: {channels || 'Not given'}</Text>
    <Text style={partnerRow}>How they plan to promote: {promoPlan || 'Not given'}</Text>
    {adminLink ? <Text style={{ margin: '16px 0 0' }}>{partnerCta(adminLink, 'Review in admin')}</Text> : null}
  </PartnerShell>
)

export const template = {
  component: Email,
  subject: 'New Revvin partner application',
  displayName: 'Partner application, admin alert',
  to: 'info@revvin.co',
  previewData: {
    name: 'Alex Rivera',
    email: 'alex@example.com',
    country: 'United States',
    channels: 'youtube.com/@example',
    audienceSize: '10,000 to 50,000',
    promoPlan: 'A video walkthrough plus my newsletter',
    payoutMethod: 'paypal',
    adminLink: 'https://revvin.co/__sa',
  },
} satisfies TemplateEntry
