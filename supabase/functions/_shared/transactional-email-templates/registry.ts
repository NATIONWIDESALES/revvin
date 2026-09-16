import type { ComponentType } from 'npm:react@18.3.1'
import { template as welcomeTemplate } from './welcome.tsx'
import { template as notPublishedD1Template } from './not-published-d1.tsx'
import { template as noShareD3Template } from './no-share-d3.tsx'
import { template as noLeadsD7Template } from './no-leads-d7.tsx'

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
  no_share_d3: noShareD3Template,
  no_leads_d7: noLeadsD7Template,
}
