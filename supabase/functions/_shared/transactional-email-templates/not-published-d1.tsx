import * as React from 'npm:react@18.3.1'
import { Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { RevvinShell, ctaButton, heading, linkBox, paragraph } from './revvin-shell.tsx'

interface Props {
  businessName?: string
  publicUrl?: string
  publishUrl?: string
  unsubscribeUrl?: string
}

const Email = ({ businessName, publicUrl, publishUrl, unsubscribeUrl }: Props) => (
  <RevvinShell previewText="Publishing takes one tap and it is free." unsubscribeUrl={unsubscribeUrl}>
    <Text style={heading}>Your referral page isn't live yet</Text>
    <Text style={paragraph}>
      {businessName ? `Hi, it's Karm at Revvin. Your page for ${businessName} is set up` : 'Hi, it is Karm at Revvin. Your page is set up'}{' '}
      but still in draft, so nobody can send you a referral yet.
    </Text>
    <Text style={paragraph}>Publishing is free and takes one tap. You can edit the page any time after.</Text>
    {publishUrl ? <Text style={{ margin: '0 0 20px' }}>{ctaButton(publishUrl, 'Publish my page')}</Text> : null}
    {publicUrl ? <Text style={linkBox}>{publicUrl}</Text> : null}
    <Text style={paragraph}>Reply to this email if you get stuck. It comes straight to me. Karm</Text>
  </RevvinShell>
)

export const template = {
  component: Email,
  subject: "Your referral page isn't live yet",
  displayName: 'Not published after 1 day',
  previewData: {
    businessName: 'Summit Roofing',
    publicUrl: 'https://revvin.co/r/summit-roofing',
    publishUrl: 'https://revvin.co/dashboard?tab=page',
    unsubscribeUrl: 'https://revvin.co/unsubscribe?token=sample',
  },
} satisfies TemplateEntry
