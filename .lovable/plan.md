
# Fix Phone Screen Content Spacing

## Changes to `src/components/PhoneMockup.tsx`

### Font Size Reductions
- StatusBar time: `15px` → `13px`
- App header "Revvin": `17px` → `15px`
- Green banner text: `14px` → `12px`
- Section headings: `18px` → `16px` (Business), `16px` → `14px` (Referrer)
- Lead card titles: `14px` → `13px`
- Lead card sub-text: `12px` → `11px`
- Payout amounts: `14px` → `13px`
- Hero "$2,340": `42px` → `36px`
- Transaction row names: `14px` → `13px`
- Transaction row times: `12px` → `11px`
- Action buttons: `14px` → `12px`
- Progress card text: `14px` → `13px`, sub-text `12px` → `11px`

### Padding & Spacing Fixes
- StatusBar/Header horizontal padding: `px-6` / `px-4` → `px-4` (16px)
- Lead cards container: `px-4` stays, add `space-y-3` to ensure 12px gap between cards
- App header: remove `mt-[46px]` (pushing content down), change to `mt-4` (16px below Dynamic Island)
- Green banner: `mx-4` stays (16px side padding)
- Transaction rows: add `py-2` for 8px vertical gaps
- Progress card: `mx-4` stays, reduce `p-4` to `p-3`

### Scroll Position Fix
- The `mt-[46px]` on the app header was causing the content to start too far down
- Change to `mt-4` (16px) so header appears right below Dynamic Island + status bar
- Status bar `pt-[14px]` combined with Dynamic Island already provides top spacing

### Content Fit Adjustments
- Reduce icon sizes in lead cards: `w-10 h-10` → `w-9 h-9`, icons `h-5 w-5` → `h-4 w-4`
- Reduce hero block vertical margins on referrer screen
- Ensure progress card is at least 50% visible by tightening spacing above

## Files Modified
| File | Change |
|------|--------|
| `src/components/PhoneMockup.tsx` | All spacing and font size adjustments |
