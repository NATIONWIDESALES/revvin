import * as React from 'npm:react@18.3.1'
import { Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { RevvinShell, ctaButton, heading, paragraph } from './revvin-shell.tsx'

/**
 * FOUNDER_STORY_DRAFT
 *
 * The body below is placeholder text for Karm to replace in his own words.
 * This template stays disabled until FOUNDER_STORY_APPROVED in
 * _shared/lifecycle-config.ts is set to true.
 */
export const FOUNDER_STORY_DRAFT = [
  'FOUNDER_STORY_DRAFT: replace this paragraph with the real reason you built Revvin, in your own words.',
  'FOUNDER_STORY_DRAFT: replace this paragraph with what you saw contractors doing instead, and why buying leads bothered you.',
  'FOUNDER_STORY_DRAFT: replace this paragraph with what you want Revvin to be for the owner reading this.',
]

interface Props {
  businessName?: string
  setupCallUrl?: string
  unsubscribeUrl?: string
  postalAddress?: string
}

const Email = ({ setupCallUrl, unsubscribeUrl, postalAddress }: Props) => (
  <RevvinShell previewText="Why I built Revvin." unsubscribeUrl={unsubscribeUrl} postalAddress={postalAddress}>
    <Text style={heading}>Why I built Revvin</Text>
    {FOUNDER_STORY_DRAFT.map((line) => (
      <Text key={line} style={paragraph}>
        {line}
      </Text>
    ))}
    {setupCallUrl ? <Text style={{ margin: '0 0 20px' }}>{ctaButton(setupCallUrl, 'Book a free 30 minute call')}</Text> : null}
    <Text style={paragraph}>Karm</Text>
  </RevvinShell>
)

export const template = {
  component: Email,
  category: 'promo',
  subject: 'Why I built Revvin',
  displayName: 'Free, day 14 (founder story, draft)',
  previewData: {
    setupCallUrl: 'https://cal.com/revvin/30min',
    unsubscribeUrl: 'https://revvin.co/unsubscribe?token=sample',
    postalAddress: 'Revvin, 123 Example St, Vancouver BC, Canada',
  },
} satisfies TemplateEntry
