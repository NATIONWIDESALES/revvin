import * as React from 'npm:react@18.3.1'
import { Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { RevvinShell, heading, paragraph } from './revvin-shell.tsx'

interface Props {
  businessName?: string
  unsubscribeUrl?: string
}

const Email = ({ businessName, unsubscribeUrl }: Props) => (
  <RevvinShell previewText="One line back would help me a lot." unsubscribeUrl={unsubscribeUrl}>
    <Text style={heading}>Can I ask what didn't work?</Text>
    <Text style={paragraph}>
      Hi, it's Karm. I saw {businessName || 'your account'} cancelled Pro. If you have a second, reply with one line on
      what did not work. I read every one myself.
    </Text>
    <Text style={paragraph}>
      Nothing is lost. Your referral page stays live and free, and your leads and your customer list are still there.
    </Text>
    <Text style={paragraph}>Karm</Text>
  </RevvinShell>
)

export const template = {
  component: Email,
  category: 'setup',
  subject: "Can I ask what didn't work?",
  displayName: 'Cancel feedback',
  previewData: {
    businessName: 'Summit Roofing',
    unsubscribeUrl: 'https://revvin.co/unsubscribe?token=sample',
  },
} satisfies TemplateEntry
