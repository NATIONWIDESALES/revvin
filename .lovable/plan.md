

## Plan: Comprehensive SEO, Structured Data, and Crawler Optimization

No visible UI changes. All work is in document head, JSON-LD scripts, public files, and HTML attributes.

### 1. Upgrade SEOHead Component

**File: `src/components/SEOHead.tsx`**

Rewrite to support all meta tags, OG/Twitter cards, JSON-LD structured data, and canonical URLs. Instead of adding `react-helmet-async` (adds a dependency + provider wrapping), keep the current `useEffect`-based approach but expand it to:

- Set `document.title` (without " | Revvin" suffix — use exact titles from spec)
- Set/create meta tags: `description`, `og:title`, `og:description`, `og:url`, `og:type`, `og:site_name`, `og:image`, `og:locale`, `twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`, `theme-color`
- Set/create canonical `<link>` tag
- Inject/update a `<script type="application/ld+json">` tag for structured data
- Accept new props: `canonicalUrl`, `jsonLd` (object or array of objects), `ogImage`
- Clean up injected elements on unmount
- Base URL: `https://revvin.co`

### 2. Update Every Page's SEOHead Call

Apply the exact titles, descriptions, canonical URLs, and JSON-LD from the spec:

**`Index.tsx`**: Title, description, canonical `/`. JSON-LD: Organization + WebSite (with SearchAction) + FAQPage schemas.

**`HowItWorks.tsx`**: Title, description, canonical `/how-it-works`.

**`ForBusinesses.tsx`**: Title, description, canonical `/for-businesses`. JSON-LD: Service schema.

**`ForReferrers.tsx`**: Appropriate title/desc, canonical `/for-referrers`.

**`Browse.tsx`**: Title, description, canonical `/browse`. JSON-LD: dynamic `ItemList` schema built from loaded offers data.

**`OfferDetail.tsx`**: Dynamic title from offer data. JSON-LD: `LocalBusiness` + `Offer` schema for the specific business.

**`Auth.tsx`**: Sign up/log in title and description, canonical `/auth`.

**`TrustCenter.tsx`**: Title, description, canonical `/trust`.

**`Terms.tsx`**: Title, description, canonical `/terms`.

**`Privacy.tsx`**: Title, description, canonical `/privacy`.

**`ReferralAgreement.tsx`**: Title, description, canonical `/referral-agreement`.

**`NotFound.tsx`**: "Page Not Found" title, noindex meta.

### 3. index.html Updates

- Update default canonical to `https://revvin.co`
- Update all `og:url` references from `revvin.lovable.app` to `revvin.co`
- Add `<meta name="theme-color" content="#15803D">`
- Add `<meta property="og:locale" content="en_CA">`
- Expand keywords meta with full keyword list from spec
- Add `<noscript>` block with site description and category keywords
- Keep existing OG image URL (user will replace later)

### 4. Static Files

**`public/robots.txt`** — Replace with full spec: Allow `/`, Disallow dashboard/admin/api/auth, explicit rules for GPTBot, Google-Extended, ChatGPT-User, Claude-Web, Anthropic-AI, Bingbot, Applebot. Sitemap reference.

**`public/sitemap.xml`** — Create with all public routes: `/`, `/how-it-works`, `/for-businesses`, `/for-referrers`, `/browse`, `/auth`, `/trust`, `/terms`, `/privacy`, `/referral-agreement`. Proper priorities and changefreqs.

### 5. Files Changed

- `src/components/SEOHead.tsx` — rewrite with expanded capabilities
- `index.html` — meta updates, noscript block, theme-color
- `public/robots.txt` — replace
- `public/sitemap.xml` — create
- `src/pages/Index.tsx` — SEOHead props + JSON-LD
- `src/pages/HowItWorks.tsx` — SEOHead props
- `src/pages/ForBusinesses.tsx` — SEOHead props + JSON-LD
- `src/pages/ForReferrers.tsx` — SEOHead props
- `src/pages/Browse.tsx` — SEOHead props + dynamic JSON-LD
- `src/pages/OfferDetail.tsx` — SEOHead props + dynamic JSON-LD
- `src/pages/Auth.tsx` — SEOHead props
- `src/pages/TrustCenter.tsx` — SEOHead props
- `src/pages/Terms.tsx` — SEOHead props
- `src/pages/Privacy.tsx` — SEOHead props
- `src/pages/ReferralAgreement.tsx` — SEOHead props
- `src/pages/NotFound.tsx` — SEOHead props

### What stays untouched
- No UI, styling, routing, auth, Stripe, or database changes
- No new npm dependencies
- All visible page content identical

