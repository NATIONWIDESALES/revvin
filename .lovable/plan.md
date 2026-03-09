

## Account UI & Infrastructure Audit

After reviewing the full dashboard stack — auth context, routing, profile editing, business/referrer/admin dashboards, notifications, and payout setup — here is what exists, what's incomplete, and what needs to be built or improved.

---

### What Already Works

- **Auth flow**: Signup (business/referrer), login, password reset, email verification
- **Role-based routing**: DashboardRouter correctly dispatches to role-specific dashboards
- **ProtectedRoute**: Guards dashboard routes, redirects unauthenticated users
- **Profile editing**: Personal info + business info (logo upload, industry, service area)
- **Notification bell**: In-app notifications with mark-read / mark-all-read
- **Payout method setup**: Referrers can select ACH/Interac/EFT preferences
- **Business dashboard**: Offer CRUD, referral pipeline with accept/decline/won/lost, deposit flow
- **Admin dashboard**: Full oversight with verification, disputes, payouts, audit log
- **Onboarding checklist**: Both roles get contextual getting-started checklists

---

### Issues & Gaps to Address

#### 1. No Account Settings / Security Page
There is no dedicated "Account Settings" screen. Users cannot:
- Change their email address
- Change their password (from within the app — only via forgot-password flow)
- Delete their account
- View active sessions

**Recommendation**: Build a `/dashboard/settings` page with password change, email display, and account deletion (soft or hard).

#### 2. No Sign-Out Confirmation
`signOut()` fires immediately with no confirmation dialog. Accidental sign-outs on mobile are likely.

#### 3. Avatar is URL-only — No Upload
The profile edit page has a raw text input for `avatar_url`. There is no file upload for personal avatars (business logos have an uploader, but personal profiles do not). Users are expected to paste a URL, which is a poor UX.

**Recommendation**: Add a file upload component for profile avatars, similar to `BusinessLogoUpload`, using the existing storage bucket or a new `avatars` bucket.

#### 4. No Email Change Flow
There is no UI for changing the authenticated user's email. The Supabase `updateUser({ email })` API supports this, but it requires confirmation from both old and new email addresses.

#### 5. Checklist Dismiss State is Not Persisted
`DashboardChecklist` uses `useState(false)` for dismissal. Refreshing the page brings the checklist back. This should be persisted to `localStorage` or a user preferences table.

#### 6. Notification Bell Has No Realtime Updates
Notifications only refresh when the popover is opened (`open` is in the dependency array). There is no realtime subscription, so users must manually open the bell to see new notifications. Adding a Supabase realtime channel would fix this.

#### 7. Mobile Nav Missing Profile/Notification Access
The mobile hamburger menu shows "Dashboard" and "Sign Out" but does not include:
- Profile link
- Notification bell
- The "in beta" badge

#### 8. No "Referrer" Nav Link
The navbar has "For Businesses" but no "For Referrers" link, making the referrer landing page hard to discover.

#### 9. Role Display Missing from User Menu
The user dropdown shows initials but does not indicate the user's role (business vs. referrer). Adding a small role badge would reduce confusion.

#### 10. No Loading/Error Boundaries on Dashboard Data
All three dashboards fetch data with `useEffect` + manual state. There are no error states shown if queries fail — the UI just shows empty data. Adding error handling or `react-query` integration would improve reliability.

---

### Prioritized Build List

| Priority | Item | Effort |
|----------|------|--------|
| High | Account settings page (password change, account info) | Medium |
| High | Avatar file upload on profile edit | Small |
| Medium | Persist checklist dismissal | Small |
| Medium | Realtime notifications subscription | Small |
| Medium | Mobile nav: add profile + notification bell | Small |
| Low | Sign-out confirmation dialog | Small |
| Low | Role badge in user dropdown | Small |
| Low | Error states on dashboard data fetches | Medium |

---

### Technical Notes

- Password change uses `supabase.auth.updateUser({ password })` — requires the user to be authenticated
- Avatar upload needs a new `avatars` storage bucket (public) or reuse `business-logos` with a subfolder
- Realtime notifications: `ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;` then subscribe in `NotificationBell`
- Checklist persistence: simplest via `localStorage` keyed by user ID
- Account deletion: either soft-delete (mark profile inactive) or call `supabase.auth.admin.deleteUser()` via an edge function

