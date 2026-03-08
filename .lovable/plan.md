

## Plan: Framer-Quality Landing Page Redesign

A comprehensive visual overhaul of the four public marketing pages to achieve a top-tier B2C SaaS feel. Less text, more breathing room, simulated product UI as visual proof, and scroll-driven motion.

### Design Philosophy

The current pages read like a feature list. Framer-quality B2C sites feel like a product demo you scroll through. The core shift: replace walls of text and bullet lists with **simulated product moments** (a notification arriving, a payout hitting, a lead card appearing) that let the reader *feel* the product without reading about it.

### New Components to Create

**1. `PhoneNotification.tsx`** - A realistic iOS-style notification mockup component
- Renders a phone frame with a notification sliding in (framer-motion spring animation)
- Two variants: "business receives a lead" and "referrer gets paid"
- Business variant: shows a Revvin notification card with lead name, service requested, referrer name
- Referrer variant: shows a payout notification with amount, business name, "Deal closed" status
- Triggers animation on scroll into viewport

**2. `iMessageThread.tsx`** - A simulated iMessage conversation
- Clean iOS message bubble layout (grey left, blue right)
- Shows a natural conversation: friend asks for recommendation, user sends Revvin link, friend thanks them
- Messages animate in sequentially on scroll (staggered 400ms per bubble)
- Used on ForReferrers page to show how effortless the referral flow is

### Page-by-Page Changes

**Index.tsx (Landing Page)** - The biggest overhaul

Current: 8 sections, heavy text, constellation background, scenario cards with long quotes, 6 trust cards, full FAQ accordion.

New structure:
1. **Hero** - Strip down to headline + one sentence + two buttons. Remove ConstellationBackground. Replace with a very subtle dot grid or nothing. Much larger headline (text-5xl md:text-6xl). Add a soft gradient pill badge above: "Pay-per-close referral marketplace"
2. **Visual explainer** (replaces 3-step) - Three columns but instead of numbered cards, each column is a mini visual moment: (a) a mockup of an offer card being created, (b) a phone notification of a lead arriving, (c) a payout amount animating up. Minimal text beneath each.
3. **PhoneNotification section** - Full-width section with two phone mockups side by side: business gets a lead notification, referrer gets a payout notification. Section heading: "See it in action." No paragraph text.
4. **Social proof strip** - Simple horizontal row: "Free to list. 90/10 payout split. Pay only on close." as three pill badges, not a heavy section.
5. **Comparison** - Keep Revvin vs Ads but simplify heavily. Two columns, 3 rows max (not 4). Remove icons from each row. Just text pairs.
6. **Choose your path** - Keep but remove the bullet lists. Just: icon + title + one sentence + button. Much more whitespace.
7. **FAQ** - Keep accordion, reduce to 4 questions max.
8. **CTA** - Simpler. One headline, one button. Remove the second CTA option.

**ForBusinesses.tsx**
- Replace the "How It Works" 3-card grid with the PhoneNotification component showing a business receiving a lead notification
- Remove the "What You Get" bulleted list section entirely (redundant with How It Works page)
- Remove the CitySlots component from this page (it's too data-heavy for a marketing page)
- Simplify Cross-Border to a single clean row with two flag icons and currency labels

**ForReferrers.tsx**
- Replace the "How You Earn" 3-card section with the iMessageThread component showing a natural referral conversation followed by a payout notification
- Remove the "Payout Methods by Country" section (move to dashboard/trust center)
- Simplify "Why Referrers Love Revvin" to 2 items max, or remove entirely

**HowItWorks.tsx**
- Merge the For Referrers and For Businesses sections into one unified vertical timeline instead of two separate card grids
- Add the PhoneNotification between the timeline steps as visual breathers
- Remove the Platform Economics section (it's on the landing page and trust center already)

### CSS / Animation Changes

**`src/index.css`:**
- Add a subtle dot-grid pattern class for hero backgrounds (CSS background-image with radial-gradient dots)
- Add `.glass-card` class: backdrop-blur, subtle white/10 background, softer border
- Increase default section padding to `py-28 lg:py-36`

**Animations:**
- All framer-motion animations use `whileInView` with `viewport={{ once: true, margin: "-100px" }}`
- Slower, more deliberate easing: `[0.16, 1, 0.3, 1]` (custom ease-out)
- Phone notifications use spring physics: `type: "spring", damping: 20, stiffness: 300`

### What Gets Removed
- ConstellationBackground from hero (too busy, not Framer-tier)
- ScenarioCard component and all 4 scenario long-form quotes (replaced by visual mockups)
- Trust & Protection 6-card grid on Index (link to /trust instead, one line)
- CitySlots from ForBusinesses
- Platform Economics from HowItWorks
- Payout Methods section from ForReferrers

### What Stays
- FAQ accordion (shortened)
- Revvin vs Ads comparison (simplified)
- Choose Your Path dual CTA
- All routing, SEO metadata, and schema.org JSON-LD
- Navbar and Footer unchanged

### Files Modified
- `src/pages/Index.tsx` - Major rewrite
- `src/pages/ForBusinesses.tsx` - Major rewrite
- `src/pages/ForReferrers.tsx` - Major rewrite
- `src/pages/HowItWorks.tsx` - Major rewrite
- `src/index.css` - Add new utility classes
- `src/components/PhoneNotification.tsx` - New
- `src/components/iMessageThread.tsx` - New

### Files NOT Modified
- Navbar, Footer, Layout, Auth, Dashboard pages, all utility/hook files, all backend code

