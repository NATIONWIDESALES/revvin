

# Revvin: Category-Defining Referral Acquisition Marketplace

## Overview

Transform Revvin from its current prototype state into a demo-ready, two-sided marketplace with coherent end-to-end flows. The core thesis: "Pay-per-close customer acquisition powered by human introductions."

This plan covers 10 major workstreams across new pages, upgraded existing pages, new components, enhanced flows, and growth mechanics. No database schema changes are required -- the existing tables (offers, referrals, businesses, profiles, user_roles, badges, user_badges) support all planned features.

---

## What Already Works Well

- Auth with role-based signup (business/referrer)
- Database trigger for auto-provisioning profiles, roles, and business records
- Business dashboard with offer management, referral inbox, and status updates
- Referrer dashboard with earnings tracking, charts, milestones, and badges
- Browse page with search, filters, category pills, list/map toggle
- Offer detail page with payout breakdown and referral submission form
- Map view with Leaflet pins and popups
- Create Offer wizard (3-step)

## What Needs to Change

### 1. Homepage Overhaul (Index.tsx)

**Current state:** Good foundation with hero, stats bar, split-entry gate, 3-step explainer, payout economics, featured offers, and trust strip.

**Changes:**
- Update hero headline to: "Businesses pay for closed deals. You earn for introductions."
- Add subheadline: "Businesses publish referral payouts. Referrers submit real opportunities. Revvin verifies outcomes and coordinates payouts."
- Swap CTA order: "Create Business Offer" first (primary), "Start Referring & Earning" second
- Add small "See Offers" secondary link below CTAs
- Add "Revvin vs Ads" comparison section (two side-by-side cards comparing traditional ads vs Revvin on cost model, risk, intent quality, and ROI predictability)
- Rename stats section to "Marketplace Momentum" and add "Top Categories" and "Active Cities" data points
- Enhance trust strip with "Dispute Process" and "Clear Qualification Rules" items

### 2. Browse Page Enhancement (Browse.tsx)

**Current state:** Search, category pills, payout/type/remote filters, sort by payout/rating/success, list/map toggle.

**Changes:**
- Add more categories to the filter list: Plumbing, Paving, HVAC, Legal, Mortgage, plus the existing ones
- Add close time filter: Fast (0-14d), Medium (15-45d), Long (45+d)
- Add sort options: "Fastest Close" and "Newest"
- Add "Verified Only" sort/filter toggle
- Update offer cards to include a "Submit Referral" CTA button and a "View Offer" secondary link directly on the card
- Add qualification rules tooltip (3 bullet preview) on hover/click of a small info icon on the card
- Update the mock data to include more diverse categories (add HVAC, Plumbing, Paving, Mortgage, Legal offers)

### 3. Offer Card Upgrade (OfferCard.tsx)

**Current state:** Shows payout, deal size, close time, location, rating, success rate, verification badge.

**Changes:**
- Make payout amount visually larger/bolder as the primary data point
- Add "Paid Net X after close" text based on closeTimeDays
- Add "Submit Referral" primary CTA button and "View Offer" secondary link
- Add a small qualification rules tooltip icon that shows 3 placeholder bullets on hover
- Prevent card link navigation when clicking the CTA buttons (use stopPropagation)

### 4. Map View Enhancement (MapView.tsx)

**Current state:** Circle markers with popups showing payout, business, category, deal size, close time.

**Changes:**
- Implement Leaflet marker clustering (using custom logic, not an external dependency) for when many pins overlap -- show cluster count and average payout in the cluster circle
- Improve popup with "Submit Referral" button linking to offer detail page
- Add city/region quick-jump buttons above the map (LA, NYC, Chicago, Dallas, Miami, Denver, Boston, SF)

### 5. Offer Detail Page Upgrade (OfferDetail.tsx)

**Current state:** Stats grid, description, deal details, payout breakdown, how-it-works steps, and referral form sidebar.

**Changes:**
- Add explicit "Qualification Rules" section with checklist-style items (pulled from offer data or placeholder)
- Add "Duplicate Lead Policy" note: "First submission wins, timestamped"
- Add "How Verification Works" mini-section explaining the process
- Add "Business Credibility" block with verification level, license/insurance placeholders, and reviews placeholder
- Add secondary CTA: "Invite this business to improve their offer" (shows a toast/message for now)
- Add consent checkbox to the referral form: "Customer has consented to being contacted"
- Make the referral submission write to the database (insert into referrals table) instead of just showing a toast
- Show referral ID placeholder on confirmation screen

### 6. Business Onboarding Upgrade (CreateOffer.tsx)

**Current state:** 3-step wizard with offer details, payout/timing, and preview.

**Changes:**
- Add Step 3 (shift current preview to Step 4): "Qualification Rules"
  - Checklist-style inputs: lead freshness requirement, reachability, minimum project size, eligible locations
  - Duplicate protection policy note
- Add "Payout Timeline" selector: Net 7 / Net 14 / Net 30
- Add "Monthly Referral Capacity" field (how many referrals they can handle)
- Add "Offer Competitiveness Score" placeholder on preview step (visual meter based on payout amount relative to category)
- Store qualification criteria as structured text

### 7. Business Dashboard Upgrade (BusinessDashboard.tsx)

**Current state:** 6 stat tiles, offers list with pause/activate, referrals inbox with status update buttons.

**Changes:**
- Add "Revenue Influenced" placeholder stat and "Avg Time-to-Close" placeholder stat
- Add offer edit capability: button to edit payout amount (inline or modal)
- Add "Expand Service Areas" placeholder action on each offer
- Add "Offer Competitiveness" widget showing how they rank vs similar category (placeholder bar/meter)
- Suggestions panel: "Increase payout", "Shorten payout timeline", "Verify business"
- Enhance referral inbox with more granular statuses: New, Contacted, Qualified, Closed, Paid
- Add "Mark as duplicate/invalid" action with reason input
- Add "Invite Referrers" button that generates a shareable offer link (copy to clipboard)

### 8. Referrer Dashboard Upgrade (ReferrerDashboard.tsx)

**Current state:** 6 stat tiles, earnings chart, milestones, badges, referral history.

**Changes:**
- Add "Current Leaderboard Rank" stat tile (placeholder: "Top 15 in Austin")
- Add "Nudge Business" action on pending referrals (sends a toast notification for now)
- Add earnings breakdown by category (small table or list)
- Add leaderboard preview section: "Top Earners in Your City" with 5 placeholder entries
- Add streak tracker: "Referrals submitted this week" with visual indicator
- Add "Invite a Business" button with flow: enter business name + email, show success message
- Add "Recommended Offers" section based on placeholder matching

### 9. New Page: Trust Center (/trust)

Create a dedicated Trust & Protection page explaining:
- Business verification levels (Unverified, Verified Email, Verified Business)
- How outcomes are verified (simulated flow diagram)
- How payouts work (timeline visualization)
- Dispute resolution process (step-by-step)
- Fraud prevention messaging
- Platform fee transparency (the 90/10 split explained)

### 10. Growth Loop Mechanics

**Invite Flows:**
- Referrer Dashboard: "Invite a Business" button opens a modal with business name + email fields, generates a simulated invite with a landing page message
- Business Dashboard: "Invite Referrers" button copies a shareable offer link with social preview text
- Add shareable offer link functionality on Offer Detail page (copy link button with social preview metadata)

**Liquidity CTAs:**
- Add "Create an Offer" CTA strip on Browse page (for non-business users seeing the marketplace)
- Add "Submit a Referral" floating CTA on relevant pages
- Add "Add Your Business" callout in the footer

---

## Technical Details

### Files to Create
1. `src/pages/TrustCenter.tsx` -- Trust & Protection page
2. `src/components/InviteBusinessModal.tsx` -- Modal for referrer-to-business invite flow
3. `src/components/ShareOfferLink.tsx` -- Shareable link component with copy functionality
4. `src/components/OfferCompetitiveness.tsx` -- Competitiveness score meter component
5. `src/components/LeaderboardPreview.tsx` -- Placeholder leaderboard widget
6. `src/components/QualificationTooltip.tsx` -- Qualification rules tooltip for offer cards

### Files to Modify
1. `src/App.tsx` -- Add /trust route and any new dashboard sub-routes
2. `src/pages/Index.tsx` -- Hero headline, Revvin vs Ads section, enhanced trust strip
3. `src/pages/Browse.tsx` -- Close time filter, new sort options, verified toggle, updated categories, CTA on cards
4. `src/components/OfferCard.tsx` -- Larger payout, CTA buttons, qualification tooltip, payout timeline text
5. `src/pages/OfferDetail.tsx` -- Qualification rules, verification section, consent checkbox, database write for referral submission, credibility block
6. `src/pages/dashboard/CreateOffer.tsx` -- Step 4 qualification rules, payout timeline, capacity, competitiveness preview
7. `src/pages/dashboard/BusinessDashboard.tsx` -- Edit payout, competitiveness widget, invite referrers, enhanced referral statuses, duplicate/invalid marking
8. `src/pages/dashboard/ReferrerDashboard.tsx` -- Leaderboard, nudge action, category breakdown, invite business, streak tracker
9. `src/components/MapView.tsx` -- Cluster grouping, city quick-jump, enhanced popups
10. `src/components/Navbar.tsx` -- Add Trust Center link
11. `src/components/Footer.tsx` -- Add Trust Center link, "Add Your Business" callout
12. `src/data/mockOffers.ts` -- Add more offers across HVAC, Plumbing, Paving, Mortgage, Legal categories with qualification rules
13. `src/types/offer.ts` -- Add qualificationRules, payoutTimeline, monthlyCapacity fields

### Database Interactions (No Schema Changes Needed)
- Offer Detail referral submission: INSERT into `referrals` table using authenticated user's ID
- All existing CRUD operations remain unchanged
- Qualification criteria stored in existing `qualification_criteria` text column on offers table

### No New Dependencies Required
- Leaflet clustering can be implemented with custom grouping logic
- All UI components use existing shadcn/ui primitives
- Charts use existing recharts dependency

---

## Implementation Sequence

Due to the scope, this should be implemented in logical batches:

**Batch 1 -- Core Data & Types**
- Update mock data with new offers and categories
- Update Offer type with new fields
- Create shared small components (QualificationTooltip, OfferCompetitiveness, ShareOfferLink)

**Batch 2 -- Homepage + Browse + Cards**
- Homepage overhaul with new hero, Revvin vs Ads, enhanced trust
- Browse page with new filters and sort options
- OfferCard with CTAs and larger payout display

**Batch 3 -- Offer Detail + Submission Flow**
- Offer Detail with qualification rules, credibility block, consent
- Wire referral submission to database
- Map view enhancement

**Batch 4 -- Dashboard Upgrades**
- Business Dashboard with edit, competitiveness, invite referrers
- Referrer Dashboard with leaderboard, nudge, invite business, streaks

**Batch 5 -- Trust Center + Growth Loops + Nav Updates**
- Trust Center page
- Invite modals and shareable links
- Nav and footer updates

