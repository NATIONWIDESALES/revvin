# Marketing SEO and trust fixes, November 17, 2026

## Status

Implemented and verified locally. Not published. No Stripe, RLS, migration, edge function, pricing, email, dashboard, referral page or Origami changes.

## Verification

- Full suite: `bunx vitest run --maxWorkers=2`, 85 files passed, 1 skipped; 1086 tests passed, 3 skipped.
- TypeScript: `oj typecheck -b --noEmit`, passed.
- Automatic preview validation: latest build entry reports `build OK`.
- Prerendered HTML: tests invoke the actual `src/entry-server.tsx` renderer used by the prerender pipeline, then pass its result to `renderRoute` with the existing `index.html` template. No hydration or browser JavaScript is needed for these checks.
- The full public-route loop verifies the exact Instagram link and external-link attributes in each server-rendered document that contains a footer. It verifies the main Organization's exact `sameAs` array on every non-redirect public route. Existing graph tests retain the no-founder and no-Person guarantees.
- The homepage raw-document test verifies `data-ssr="1"`, exactly one H1, the eyebrow as its first element, the unchanged headline following it, and both requested H2 texts. Title and description are pinned to their existing literal values. All OG and Twitter tags are compared with the unchanged head generated from the same route configuration.
- Playwright verified the headings and exact Instagram destination at 1280px, 390px and 320px. Element screenshots confirmed the small muted eyebrow, unchanged large headline styling, and small icon before the footer link.
- A production `dist` build and the published site's HTML were not checked: no manual build or publish was run. Raw-document verification uses the production prerender functions directly.

## Changelog

| File | Change |
| --- | --- |
| `src/components/Footer.tsx` | Added Instagram directly below Contact in Company, reusing footer link styling, with the requested URL, icon, accessible name, target and rel. |
| `src/config/brand.ts` | Set `ORG_SAME_AS` to the supplied Instagram URL array. |
| `src/pages/Index.tsx` | Added the small muted block eyebrow inside the existing H1 and changed only the two requested H2 texts; retained headline classes and existing copy. |
| `src/test/homepage-reposition.test.tsx` | Updated the existing H1 text expectation to include the eyebrow. |
| `src/test/seo-sitemap-robots.test.ts` | Replaced the absent-sameAs assertion with the exact supplied array; retained no-founder coverage. |
| `src/test/footer-social.test.tsx` | Added a rendered footer test for the exact Instagram href and external-link attributes. |
| `src/test/public-brand.test.ts` | Extended the existing full public-route prerender loop with footer-link and Organization sameAs checks. |
| `src/test/server-render.test.tsx` | Added raw homepage HTML checks for H1/eyebrow order, both H2s and unchanged title, description, OG and Twitter tags. |
| `roadmap.md` | Recorded completion and validation of this request only. |
| `docs/marketing-seo-trust-2026-11-17.md` | Added this verification record and file-by-file changelog. |

## Automatic sandbox follow-up

Pre-existing sandbox changes were saved separately after the clean-worktree check required them. They were present during all verification above and were not introduced by the SEO edits:

- `package.json`: automatic development-only HMR gate version update from `^1.8.0` to `^1.8.3`.
- `bun.lock`: matching automatic HMR gate dependency resolution update.