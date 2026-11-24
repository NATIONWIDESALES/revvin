import { isSaleLive, salePrices } from '../promo.ts'
import { MONTHLY_PRICE, ANNUAL_PRICE } from '../pricing-copy.ts'
import * as React from 'npm:react@18.3.1'
import { Text } from 'npm:@react-email/components@0.0.22'
import { RevvinShell, ctaButton, heading, paragraph } from './revvin-shell.tsx'
import type { TemplateEntry } from './registry.ts'
interface Props { today?: boolean; unsubscribeUrl?: string }
const sale = salePrices(MONTHLY_PRICE, ANNUAL_PRICE)
const Email = ({ today = false, unsubscribeUrl }: Props) => (
  <RevvinShell previewText={today ? 'Your Pro trial ends today.' : 'Your Pro trial ends in 3 days.'} unsubscribeUrl={unsubscribeUrl}>
    <Text style={heading}>{today ? 'Your Pro trial ends today' : 'Your Pro trial ends in 3 days'}</Text>
    <Text style={paragraph}>When the trial ends, your referral page stays live on Free. Free covers your first 500 customers. Pro includes unlimited customers, automatic Job done and job-software/API/Zapier review and referral asks, reactivation email campaigns, ROI reporting and monthly recap, and custom page branding. Your contacts, settings and connections are kept and nothing is deleted. Asks beyond the first 500 and automatic asks pause.</Text>
    <Text style={paragraph}>No card was required for your trial and you will not be charged automatically.</Text>
    {isSaleLive() && <Text style={paragraph}>Early Black Friday: upgrade by November 30 and Pro is ${sale.monthly.toFixed(2)} a month or ${sale.annual} a year, locked in for as long as you stay subscribed.</Text>}
    <Text style={{ margin: '0 0 20px' }}>{ctaButton('https://revvin.co/dashboard?tab=billing', 'Keep Pro')}</Text>
    <Text style={paragraph}>Questions? Reply to reach our team.</Text>
    <Text style={paragraph}>The Revvin team</Text>
  </RevvinShell>
)
export const template = { component: Email, subject: (data: Record<string, unknown>) => data.today ? 'Your Pro trial ends today' : 'Your Pro trial ends in 3 days', displayName: 'Pro trial ending', previewData: { today: false } } satisfies TemplateEntry