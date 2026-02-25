

# Plan: Production-Ready Cleanup & Business Onboarding

## Summary

Remove mock data from functional app flows (Browse, OfferDetail, ReferralWizard), keep landing page illustrative examples, add business logo upload during onboarding, and polish key areas for real customer use.

---

## Technical Details

### 1. Remove Mock Data from App Flows

**Files affected:** `useDbOffers.ts`, `OfferDetail.tsx`, `ReferralWizard.tsx`, `OfferCard.tsx`, `Browse.tsx`

- **`useDbOffers.ts`**: Remove `mockOffers` import. When DB returns zero offers, return empty array instead of mock fallback. Remove the `[...realOffers, ...mockOffers]` merge — return only `realOffers`.
- **`OfferDetail.tsx`**: Replace `mockOffers.find(id)` with a Supabase query: `supabase.from("offers").select("*, businesses(*)").eq("id", id).single()`. Add loading/error states. Transform DB result to `Offer` type using the same mapping logic from `useDbOffers.ts`.
- **`ReferralWizard.tsx`**: Currently does a fragile title-match lookup (lines 87-109). Since OfferDetail will now pass a real DB offer with a real UUID `id`, update the wizard to use `offer.id` directly as `offer_id` and look up `business_id` from the offer record, eliminating the title-match fallback.
- **`OfferCard.tsx`**: Move `calculateOfferScore` out of `mockOffers.ts` into a standalone utility (e.g., `src/lib/offerScore.ts`) so it doesn't import from mock data.
- **`Browse.tsx`**: Import `categories` and `calculateOfferScore` from the new utility instead of `mockOffers.ts`. Show an empty state when no DB offers exist.

### 2. Extract Utilities from mockOffers.ts

**New file:** `src/lib/offerUtils.ts`

Move these exports out of `mockOffers.ts` into a standalone utility:
- `categories` array
- `calculateOfferScore()` function
- `getCitySlots()` — refactor to accept offers as a parameter instead of reading from `mockOffers`
- `cityJumpsCA`, `cityJumpsUS` arrays

Update all imports across: `Browse.tsx`, `OfferCard.tsx`, `CitySlots.tsx`, `MapView.tsx`, `CreateOffer.tsx`.

### 3. Keep Landing Page Mock Examples

**`Index.tsx`**: Keep the `scenarios` array (illustrative examples) and the "Featured Cities" section. However:
- Replace `mockOffers.filter(o => o.featured)` for the "Featured Offers" section with a DB query using `useDbOffers` — show real featured offers, or hide the section if none exist.
- For city counts in the "Featured Cities" section, use DB offer counts instead of mock counts (query from `useDbOffers` data).

**`LeaderboardPreview.tsx`**: Keep placeholder entries but add a note label "Example leaderboard — coming soon" to be transparent.

### 4. Business Logo Upload on Onboarding

**Database migration:**
```sql
INSERT INTO storage.buckets (id, name, public) VALUES ('business-logos', 'business-logos', true);

CREATE POLICY "Anyone can view logos" ON storage.objects FOR SELECT USING (bucket_id = 'business-logos');
CREATE POLICY "Business owners upload logos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'business-logos' AND auth.uid()::text = (storage.fspath(name))[1]);
CREATE POLICY "Business owners update logos" ON storage.objects FOR UPDATE USING (bucket_id = 'business-logos' AND auth.uid()::text = (storage.fspath(name))[1]);
CREATE POLICY "Business owners delete logos" ON storage.objects FOR DELETE USING (bucket_id = 'business-logos' AND auth.uid()::text = (storage.fspath(name))[1]);
```

**New component:** `src/components/BusinessLogoUpload.tsx`
- File input with drag-and-drop zone
- Upload to `business-logos/{user_id}/logo.{ext}` using Supabase Storage
- Update `businesses.logo_url` with the public URL on successful upload
- Show preview of uploaded logo

**Onboarding prompt flow:**
- After a business user signs up and lands on `BusinessDashboard.tsx` for the first time, check if `business.logo_url` is null
- If no logo, show a prominent card/modal: "Welcome! Upload your business logo — it'll appear on your marketplace listing"
- Include the `BusinessLogoUpload` component
- Allow skipping, but nudge via the existing `DashboardChecklist`

**Update `DashboardChecklist`** in `BusinessDashboard.tsx`:
- Add a new checklist item: "Upload business logo" with `done: !!business?.logo_url`

### 5. Update Offer Display to Use Real Logos

- In `useDbOffers.ts` offer mapping, use `businesses.logo_url` for the `businessLogo` field. If it's a URL (starts with `http`), render as `<img>` in `OfferCard.tsx` and `OfferDetail.tsx` instead of emoji.
- Update `OfferCard.tsx`: Check if `businessLogo` is a URL — if so, render `<img>` with rounded styling; otherwise render the emoji as before.
- Same update in `OfferDetail.tsx` header section.

### 6. Remove Wallet Funding Requirement from CreateOffer

Since customers won't fund accounts initially:
- In `CreateOffer.tsx` step 4 (Fund Wallet), change to an informational step: "Wallet funding is optional at launch. You can add funds later to display the 'Funds Secured' badge."
- Keep the step visible but make it non-blocking — the "Next" button always enabled on step 4.
- Remove the `addFunds` quick-add buttons that simulate funding (or keep them but label clearly as "Coming soon").

### 7. Polish Areas

**`ProfileEdit.tsx` for businesses:**
- Add business-specific fields when the user role is `business`: Business Name, Website, Description, Industry, Service Area
- Load from `businesses` table, save back to `businesses` table
- Include the `BusinessLogoUpload` component here as well

**`Auth.tsx` business signup step 2:**
- The business name, industry, and service area collected in step 2 are currently NOT persisted to the `businesses` table (they're captured in local state but never saved). Fix: after successful signup, the `handle_new_user` trigger creates the business record with a default name. Update the trigger or add a post-signup update to store industry and service area (via the auth metadata → trigger reads it).

**`LeaderboardPreview.tsx`:**
- Add "Example data" label to be transparent about placeholder nature.

---

## File Change Summary

| Action | File |
|--------|------|
| Create | `src/lib/offerUtils.ts` |
| Create | `src/components/BusinessLogoUpload.tsx` |
| Migration | Storage bucket + policies |
| Migration | Update `handle_new_user` trigger to read industry metadata |
| Edit | `src/hooks/useDbOffers.ts` — remove mock merge |
| Edit | `src/pages/OfferDetail.tsx` — DB query instead of mock lookup |
| Edit | `src/components/ReferralWizard.tsx` — use offer.id directly |
| Edit | `src/components/OfferCard.tsx` — logo rendering, import fix |
| Edit | `src/pages/Browse.tsx` — import fix, empty state |
| Edit | `src/pages/Index.tsx` — DB featured offers, fix city counts |
| Edit | `src/components/CitySlots.tsx` — import fix |
| Edit | `src/components/MapView.tsx` — import fix |
| Edit | `src/pages/dashboard/CreateOffer.tsx` — import fix, soften wallet step |
| Edit | `src/pages/dashboard/BusinessDashboard.tsx` — logo checklist, onboarding prompt |
| Edit | `src/pages/dashboard/ProfileEdit.tsx` — business fields + logo upload |
| Edit | `src/components/LeaderboardPreview.tsx` — transparency label |
| Edit | `src/pages/Auth.tsx` — persist business metadata |

