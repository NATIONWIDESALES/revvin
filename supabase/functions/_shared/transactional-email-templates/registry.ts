import type { ComponentType } from 'npm:react@18.3.1'
import { template as welcomeTemplate } from './welcome.tsx'
import { template as notPublishedD1Template } from './not-published-d1.tsx'
import { template as notPublishedD3Template } from './not-published-d3.tsx'
import { template as noShareD3Template } from './no-share-d3.tsx'
import { template as noLeadsD7Template } from './no-leads-d7.tsx'
import { template as noLeadsD30Template } from './no-leads-d30.tsx'
import { template as proWelcomeTemplate } from './pro-welcome.tsx'
import { template as proNoImportD2Template } from './pro-no-import-d2.tsx'
import { template as proNoAskD7Template } from './pro-no-ask-d7.tsx'
import { template as cancelFeedbackTemplate } from './cancel-feedback.tsx'
import { template as freeD5Template } from './free-d5.tsx'
import { template as freeD10Template } from './free-d10.tsx'
import { template as freeD14Template } from './free-d14.tsx'
import { template as freeD21Template } from './free-d21.tsx'
import { template as firstLeadNextDayTemplate } from './first-lead-next-day.tsx'
import { template as winbackD30Template } from './winback-d30.tsx'

// Every template's category lives in _shared/lifecycle-categories.ts, which is
// plain TypeScript so the app's test suite can cover the promotional rules.
export { templateCategory, LIFECYCLE_CATEGORIES } from '../lifecycle-categories.ts'
export type { LifecycleCategory as TemplateCategory } from '../lifecycle-categories.ts'

export interface TemplateEntry {
  component: ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  displayName?: string
  previewData?: Record<string, any>
  /** Fixed recipient — overrides caller-provided recipientEmail when set. */
  to?: string
}

/**
 * Template registry — maps template names to their React Email components.
 * Import and register new templates here after creating them in this directory.
 *
 * Lifecycle mail is rendered from this registry and sent through the existing
 * Resend gateway by _shared/lifecycle-email.ts. The first-lead coaching section
 * is not a separate template: it is appended to the existing new-lead email in
 * _shared/owner-notification-worker.ts so an owner never gets two emails for
 * the same lead.
 */
export const TEMPLATES: Record<string, TemplateEntry> = {
  welcome: welcomeTemplate,
  not_published_d1: notPublishedD1Template,
  not_published_d3: notPublishedD3Template,
  no_share_d3: noShareD3Template,
  no_leads_d7: noLeadsD7Template,
  no_leads_d30: noLeadsD30Template,
  pro_welcome: proWelcomeTemplate,
  pro_no_import_d2: proNoImportD2Template,
  pro_no_ask_d7: proNoAskD7Template,
  cancel_feedback: cancelFeedbackTemplate,
  free_d5: freeD5Template,
  free_d10: freeD10Template,
  free_d14: freeD14Template,
  free_d21: freeD21Template,
  first_lead_next_day: firstLeadNextDayTemplate,
  winback_d30: winbackD30Template,
}
