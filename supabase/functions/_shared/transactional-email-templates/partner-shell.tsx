import * as React from 'npm:react@18.3.1'
import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

/**
 * Shared frame for Revvin Partner Program email. Same plain look as the
 * lifecycle shell, with a footer that says why a partner is hearing from us.
 *
 * Partner mail is transactional: it answers an application, an approval or a
 * payout the partner asked for. It is not commercial email to a list, so it
 * carries no promotional opt-out. A partner who wants out replies and is
 * removed from the program.
 */
export interface PartnerShellProps {
  previewText: string
  children: React.ReactNode
  /** Set for an internal alert so the footer does not address a partner. */
  internal?: boolean
}

export const PartnerShell = ({ previewText, children, internal }: PartnerShellProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{previewText}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={wordmark}>Revvin</Text>
        <Section>{children}</Section>
        <Hr style={rule} />
        <Text style={footer}>
          {internal
            ? 'Internal alert from the Revvin Partner Program.'
            : 'You are getting this because you applied to the Revvin Partner Program. Reply to stop hearing from us about it.'}
        </Text>
        <Text style={footer}>
          <Link href="https://revvin.co/partners/terms" style={footerLink}>
            Partner Terms
          </Link>
        </Text>
      </Container>
    </Body>
  </Html>
)

export const partnerCta = (href: string, label: string) => (
  <Link href={href} style={cta}>
    {label}
  </Link>
)

const main = {
  backgroundColor: '#ffffff',
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', Segoe UI, Roboto, Arial, sans-serif",
  color: '#0F172A',
}
const container = { maxWidth: '560px', margin: '0 auto', padding: '32px 24px' }
const wordmark = { fontSize: '20px', fontWeight: 700, color: '#15803D', margin: '0 0 24px' }

export const partnerHeading = { fontSize: '22px', lineHeight: '1.3', fontWeight: 600, margin: '0 0 12px' }
export const partnerParagraph = {
  fontSize: '15px',
  lineHeight: '1.6',
  color: '#334155',
  margin: '0 0 16px',
}
export const partnerRow = { fontSize: '15px', lineHeight: '1.6', color: '#334155', margin: '0 0 8px' }
export const partnerBox = {
  fontSize: '15px',
  lineHeight: '1.6',
  color: '#0F172A',
  background: '#F8FAFC',
  border: '1px solid #E2E8F0',
  borderRadius: '10px',
  padding: '16px',
  margin: '0 0 20px',
  wordBreak: 'break-all' as const,
}

const cta = {
  display: 'inline-block',
  background: '#15803D',
  color: '#ffffff',
  textDecoration: 'none',
  padding: '12px 22px',
  borderRadius: '10px',
  fontWeight: 600,
  fontSize: '14px',
}
const rule = { borderColor: '#E2E8F0', margin: '32px 0 16px' }
const footer = { fontSize: '12px', lineHeight: '1.6', color: '#94A3B8', margin: '0 0 4px' }
const footerLink = { color: '#64748B' }
