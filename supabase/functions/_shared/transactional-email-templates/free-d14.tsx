import * as React from 'npm:react@18.3.1'
import { Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { RevvinShell, ctaButton, heading, paragraph } from './revvin-shell.tsx'

/** Team introduction copy; the existing approval gate remains disabled. */
const TEAM_STORY = "Revvin is built by operators who have recruited, trained and managed door-to-door and phone sales teams of 120+ reps, selling 8,000+ accounts a year for national telecom carriers across North America. The cheapest jobs those teams ever closed came from happy customers. Revvin turns that play into software any home-service business can run without a sales team.";

interface Props {
  businessName?: string
  setupCallUrl?: string
  unsubscribeUrl?: string
  postalAddress?: string
}

const Email = ({ setupCallUrl, unsubscribeUrl, postalAddress }: Props) => (
  <RevvinShell previewText="Built by the Revvin team." unsubscribeUrl={unsubscribeUrl} postalAddress={postalAddress}>
    <Text style={heading}>Built by the Revvin team</Text>
    <Text style={paragraph}>{TEAM_STORY}</Text>
    {setupCallUrl ? <Text style={{ margin: '0 0 20px' }}>{ctaButton(setupCallUrl, 'Book a free 30-minute setup call')}</Text> : null}
    <Text style={paragraph}>The Revvin team</Text>
  </RevvinShell>
)

export const template = {
  component: Email,
  subject: 'Built by the Revvin team',
  displayName: 'Free, day 14 (team introduction)',
  previewData: {
    setupCallUrl: 'https://cal.com/revvin/30min',
    unsubscribeUrl: 'https://revvin.co/unsubscribe?token=sample',
    postalAddress: 'Revvin, 123 Example St, Dallas, TX (example only)',
  },
} satisfies TemplateEntry
