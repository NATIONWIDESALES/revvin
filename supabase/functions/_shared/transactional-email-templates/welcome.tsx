import * as React from 'npm:react@18.3.1'
import { Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { RevvinShell, ctaButton, heading, linkBox, paragraph } from './revvin-shell.tsx'

interface Props {
  businessName?: string
  publicUrl?: string
  publishUrl?: string
  isPublished?: boolean
  unsubscribeUrl?: string
}

const Email = ({ businessName, publicUrl, publishUrl, isPublished, unsubscribeUrl }: Props) => (
  <RevvinShell previewText="Your referral page and link are ready to share." unsubscribeUrl={unsubscribeUrl}>
    <Text style={heading}>Your Revvin page is ready</Text>
    <Text style={paragraph}>
      {businessName ? `Thanks for setting up ${businessName} on Revvin.` : 'Thanks for setting up your business on Revvin.'}{' '}
      This is your referral link. Anyone who opens it can send you a referral in about a minute.
    </Text>
    {publicUrl ? <Text style={linkBox}>{publicUrl}</Text> : null}
    {!isPublished && publishUrl ? (
      <>
        <Text style={paragraph}>Your page is not live yet. One tap fixes that.</Text>
        <Text style={{ margin: '0 0 20px' }}>{ctaButton(publishUrl, 'Publish my page')}</Text>
      </>
    ) : null}
    <Text style={paragraph}>Reply to this email if you get stuck. It comes straight to me. Karm</Text>
  </RevvinShell>
)

export const template = {
  component: Email,
  subject: 'Your Revvin page is ready',
  displayName: 'Welcome',
  previewData: {
    businessName: 'Summit Roofing',
    publicUrl: 'https://revvin.co/r/summit-roofing',
    publishUrl: 'https://revvin.co/dashboard?tab=page',
    isPublished: false,
    unsubscribeUrl: 'https://revvin.co/unsubscribe?token=sample',
  },
} satisfies TemplateEntry
