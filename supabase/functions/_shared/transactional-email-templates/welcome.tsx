import * as React from 'npm:react@18.3.1'
import { Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { RevvinShell, ctaButton, heading, linkBox, paragraph } from './revvin-shell.tsx'
import { INSTALL_EMAIL_TIP } from '../install-copy.ts'

interface Props {
  businessName?: string
  publicUrl?: string
  publishUrl?: string
  isPublished?: boolean
  unsubscribeUrl?: string
}

const FINISH_URL = 'https://revvin.co/welcome'

const Email = ({ businessName, publicUrl, isPublished, unsubscribeUrl }: Props) => {
  const live = Boolean(isPublished && publicUrl)
  return (
    <RevvinShell
      previewText={live ? 'Your referral page and link are ready to share.' : 'Add your trade and reward and your page goes live.'}
      unsubscribeUrl={unsubscribeUrl}
    >
      {live ? (
        <>
          <Text style={heading}>Your Revvin page is ready</Text>
          <Text style={paragraph}>
            {businessName ? `Thanks for setting up ${businessName} on Revvin.` : 'Thanks for setting up your business on Revvin.'}{' '}
            This is your referral link. Anyone who opens it can send you a referral in about a minute.
          </Text>
          <Text style={linkBox}>{publicUrl}</Text>
        </>
      ) : (
        <>
          <Text style={heading}>Your account is ready</Text>
          <Text style={paragraph}>
            {businessName ? `Thanks for signing up ${businessName} on Revvin.` : 'Thanks for signing up on Revvin.'}{' '}
            Your page goes live as soon as you add your trade and reward.
          </Text>
          <Text style={{ margin: '0 0 20px' }}>{ctaButton(FINISH_URL, 'Finish my page')}</Text>
        </>
      )}
      <Text style={paragraph}>
        {INSTALL_EMAIL_TIP} <a href="https://revvin.co/dashboard">revvin.co/dashboard</a>
      </Text>
      <Text style={paragraph}>Reply to this email if you get stuck. It comes straight to our team.</Text>
      <Text style={paragraph}>The Revvin team</Text>
    </RevvinShell>
  )
}

export const isWelcomeLive = (d: Record<string, any>) => Boolean(d?.isPublished && d?.publicUrl)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) =>
    isWelcomeLive(d) ? 'Your Revvin page is ready' : 'Finish your Revvin page in about a minute',
  displayName: 'Welcome',
  previewData: {
    businessName: 'Summit Roofing',
    isPublished: false,
    unsubscribeUrl: 'https://revvin.co/unsubscribe?token=sample',
  },
} satisfies TemplateEntry
