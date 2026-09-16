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
 * Shared frame for the lifecycle emails Revvin sends to its own business
 * owners. It is deliberately plain: short lines, one green accent, one button.
 *
 * Every lifecycle email carries an unsubscribe link. The link is backed by
 * unsubscribe_tokens and handled by the handle-unsubscribe function, which
 * writes suppressed_contacts, so a click stops future lifecycle mail.
 */
export interface ShellProps {
  previewText: string
  children: React.ReactNode
  unsubscribeUrl?: string
  /** Set for promotional email only. Required in the footer by CAN-SPAM and CASL. */
  postalAddress?: string
}

export const RevvinShell = ({ previewText, children, unsubscribeUrl, postalAddress }: ShellProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{previewText}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={wordmark}>Revvin</Text>
        <Section>{children}</Section>
        <Hr style={rule} />
        <Text style={footer}>
          You are getting this because you created a Revvin account.
          {unsubscribeUrl ? (
            <>
              {' '}
              <Link href={unsubscribeUrl} style={footerLink}>
                Unsubscribe
              </Link>{' '}
              to stop these emails.
            </>
          ) : null}
        </Text>
        {postalAddress ? <Text style={footer}>{postalAddress}</Text> : null}
      </Container>
    </Body>
  </Html>
)

export const ctaButton = (href: string, label: string) => (
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

const wordmark = {
  fontSize: '20px',
  fontWeight: 700,
  color: '#15803D',
  margin: '0 0 24px',
}

export const heading = { fontSize: '22px', lineHeight: '1.3', fontWeight: 600, margin: '0 0 12px' }
export const paragraph = { fontSize: '15px', lineHeight: '1.6', color: '#334155', margin: '0 0 16px' }
export const quoted = {
  fontSize: '15px',
  lineHeight: '1.6',
  color: '#0F172A',
  background: '#F8FAFC',
  border: '1px solid #E2E8F0',
  borderRadius: '10px',
  padding: '16px',
  margin: '0 0 20px',
}
export const linkBox = {
  fontSize: '14px',
  color: '#15803D',
  wordBreak: 'break-all' as const,
  margin: '0 0 20px',
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
const footer = { fontSize: '12px', lineHeight: '1.6', color: '#94A3B8', margin: 0 }
const footerLink = { color: '#64748B' }
