import * as React from 'npm:react@18.3.1'
import { Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { RevvinShell, ctaButton, heading, linkBox, paragraph } from './revvin-shell.tsx'

interface Props {
  businessName?: string
  publicUrl?: string
  publishUrl?: string
  /** When false the owner has not picked a reward yet, so that is the ask. */
  hasReward?: boolean
  rewardUrl?: string
  unsubscribeUrl?: string
}

const NoReward = ({ businessName, rewardUrl, unsubscribeUrl }: Props) => (
  <RevvinShell previewText="Pick the reward you will pay when a referred job closes." unsubscribeUrl={unsubscribeUrl}>
    <Text style={heading}>One step left: your referral reward</Text>
    <Text style={paragraph}>
      {businessName ? `Hi, it's Karm at Revvin. Your page for ${businessName} is almost ready.` : 'Hi, it is Karm at Revvin. Your page is almost ready.'}{' '}
      The only thing left is the reward you will pay when a referred job closes.
    </Text>
    <Text style={paragraph}>
      A common starting point is a flat amount like $100. You pay it yourself, only when the job closes, and you can
      change it any time.
    </Text>
    {rewardUrl ? <Text style={{ margin: '0 0 20px' }}>{ctaButton(rewardUrl, 'Finish my page')}</Text> : null}
    <Text style={paragraph}>Reply to this email if you get stuck. It comes straight to me.</Text>
    <Text style={paragraph}>Karm</Text>
  </RevvinShell>
)

const NotPublished = ({ businessName, publicUrl, publishUrl, unsubscribeUrl }: Props) => (
  <RevvinShell previewText="Publishing takes one tap and it is free." unsubscribeUrl={unsubscribeUrl}>
    <Text style={heading}>Your referral page isn't live yet</Text>
    <Text style={paragraph}>
      {businessName ? `Hi, it's Karm at Revvin. Your page for ${businessName} is set up` : 'Hi, it is Karm at Revvin. Your page is set up'}{' '}
      but still in draft, so nobody can send you a referral yet.
    </Text>
    <Text style={paragraph}>Publishing is free and takes one tap. You can edit the page any time after.</Text>
    {publishUrl ? <Text style={{ margin: '0 0 20px' }}>{ctaButton(publishUrl, 'Publish my page')}</Text> : null}
    {publicUrl ? <Text style={linkBox}>{publicUrl}</Text> : null}
    <Text style={paragraph}>Reply to this email if you get stuck. It comes straight to me.</Text>
    <Text style={paragraph}>Karm</Text>
  </RevvinShell>
)

const Email = (props: Props) => (props.hasReward ? <NotPublished {...props} /> : <NoReward {...props} />)

export const template = {
  component: Email,
  subject: (data: Record<string, any>) =>
    data?.hasReward ? "Your referral page isn't live yet" : 'One step left: your referral reward',
  displayName: 'Not published after 1 day',
  previewData: {
    businessName: 'Summit Roofing',
    publicUrl: 'https://revvin.co/r/summit-roofing',
    publishUrl: 'https://revvin.co/dashboard?tab=page',
    rewardUrl: 'https://revvin.co/welcome',
    hasReward: false,
    unsubscribeUrl: 'https://revvin.co/unsubscribe?token=sample',
  },
} satisfies TemplateEntry
