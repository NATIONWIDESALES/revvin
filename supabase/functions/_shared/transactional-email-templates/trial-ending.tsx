import * as React from 'npm:react@18.3.1'
import { Text } from 'npm:@react-email/components@0.0.22'
import { RevvinShell, ctaButton, heading, paragraph } from './revvin-shell.tsx'
import type { TemplateEntry } from './registry.ts'
interface Props { today?: boolean; unsubscribeUrl?: string }
const Email = ({ today = false, unsubscribeUrl }: Props) => (
  <RevvinShell previewText={today ? 'Your Pro trial ends today.' : 'Your Pro trial ends in 3 days.'} unsubscribeUrl={unsubscribeUrl}>
    <Text style={heading}>{today ? 'Your Pro trial ends today' : 'Your Pro trial ends in 3 days'}</Text>
    <Text style={paragraph}>When the trial ends, your referral page stays live on Free. Free asks your first 100 customers and does not include reactivation campaigns. Your contacts stay visible and nothing is deleted. Asks to customers beyond the first 100 pause.</Text>
    <Text style={paragraph}>No card was required for your trial and you will not be charged automatically.</Text>
    <Text style={{ margin: '0 0 20px' }}>{ctaButton('https://revvin.co/dashboard?tab=billing', 'Keep Pro')}</Text>
    <Text style={paragraph}>Questions? Reply to reach our team. The Revvin team</Text>
  </RevvinShell>
)
export const template = { component: Email, subject: (data: Record<string, unknown>) => data.today ? 'Your Pro trial ends today' : 'Your Pro trial ends in 3 days', displayName: 'Pro trial ending', previewData: { today: false } } satisfies TemplateEntry