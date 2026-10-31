# Revvin team identity changelog

Date: October 31, 2026

## Result

- Public brand identity is the Revvin team. Article authors reference https://revvin.co/#organization, without Person or Organization.founder.
- Approved team paragraph, wordmark tile, setup-call labels, North American rollout copy and example cities replace personal and single-region branding.
- Existing metro records, route slugs, city matching, real business location data and geographic filter data were not changed. Database metro names appear only on their own Earn page. This avoids falsifying real business addresses or changing discovery behavior.
- Sender is Revvin <info@revvin.co>; sign-offs are The Revvin team. The rewritten team introduction remains behind the unchanged, disabled legacy FOUNDER_STORY_APPROVED gate.
- Redeployed lifecycle-emails, notify-business-signup, preview-transactional-email, partner-apply, partner-admin and partner-resend-link. No emails were triggered during verification.
- Per-page OG generation now uses the team-led About title and geography-neutral dynamic card titles. Existing fallback og-image.png was inspected and contains no retired identity or regional text.

## Verification

- Full suite: **721 passed, 3 skipped**; **55 test files passed, 1 skipped**. Includes Deno function checks.
- Automatic preview build: **build OK**, latest checked entry October 31, 2026 at 15:48:55 UTC.
- Browser: Home, About, referral text guide, ReferralWise comparison, Earn, Sample and Pricing at 1440x900 and 390x844. No horizontal overflow or page errors; team section and Organization author confirmed; no retired identity or regional static copy.
- Every static public page was server-rendered in tests and checked for retired identity; RSS and llms-full text checked. Metadata length and JSON-LD suites pass.
- Fresh production dist, regenerated PNG inspection, independent frontend typecheck and Lighthouse 100 scores are **not verified**: the automatic preview build does not expose its production artifact here, and manual project builds/typechecks are prohibited in this environment. No Lighthouse result is claimed from the development server.
- No publication. Website and prerendered document changes require publication; email function deployments are already live.
- Existing React server-render useLayoutEffect warnings remain during tests; tests pass.

## Exact changed files and strings

The following unified diffs list every changed source string relative to the revision at the start of this request. Deleted personal-section code and its replacement team-section file are listed separately. Tracking ids, including home_founder_call, remain unchanged because they are not displayed publicly.

### AGENTS.md

```diff
--- before/AGENTS.md

+++ after/AGENTS.md

@@ -10 +10,2 @@

 - Guides are data in src/content/guides.ts (+ guidesNew.ts) with optional table, copyGroups, terms and sources rendered by GuidePage and flattened into PrerenderRoute sections; every "Related" block comes from src/content/related.ts and trade-page extras from src/content/tradeExtras.ts. Why: one content source feeds the page, prerender, sitemap, RSS and llms-full.txt.
+- Public author identity and team copy come from src/config/brand.ts; the prerender validates public source and generated text before writing it. Why: runtime, structured data and generated documents cannot drift back to personal branding.
```

### index.html

```diff
--- before/index.html

+++ after/index.html

@@ -36,3 +36,3 @@

     <script type="application/ld+json">
-      {"@context":"https://schema.org","@type":"Organization","@id":"https://revvin.co/#organization","name":"Revvin","url":"https://revvin.co","logo":"https://revvin.co/android-chrome-192x192.png","founder":{"@type":"Person","name":"Karm Sandhu","jobTitle":"Founder","sameAs":["https://www.linkedin.com/in/karm"],"disambiguatingDescription":"Karm Sandhu is the founder of Revvin (revvin.co), referral program software for home-service businesses."},"disambiguatingDescription":"Revvin (revvin.co) is referral program software for service businesses. It is not affiliated with the Revvin digital mortgage platform.","slogan":"Your customer list, working for you","description":"Referral program software for service businesses. Turns a past-customer list into referrals. Publishing your referral page is free; Revvin Pro costs a flat $49/month USD. No platform fees. Businesses pay their referrers directly off-platform."}
+      {"@context":"https://schema.org","@type":"Organization","@id":"https://revvin.co/#organization","name":"Revvin","url":"https://revvin.co","logo":{"@type":"ImageObject","url":"https://revvin.co/android-chrome-192x192.png","width":192,"height":192},"disambiguatingDescription":"Revvin (revvin.co) is referral program software for service businesses. It is not affiliated with the Revvin digital mortgage platform.","slogan":"Your customer list, working for you","description":"Referral program software for service businesses. Turns a past-customer list into referrals. Publishing your referral page is free; Revvin Pro costs a flat $49/month USD. No platform fees. Businesses pay their referrers directly off-platform.","contactPoint":{"@type":"ContactPoint","email":"info@revvin.co","contactType":"customer support"},"areaServed":["US","CA"],"knowsAbout":["referral marketing","referral programs","home services marketing"]}
     </script>
```

### plugins/prerender.ts

```diff
--- before/plugins/prerender.ts

+++ after/plugins/prerender.ts

@@ -12,2 +12,3 @@

 import { FREE_FEATURES, PRO_FEATURES } from "../src/config/planFeatures";
+import { assertPublicBrand, validatePublicBrandSources } from "../src/content/publicBrandGuard";
 import { buildBusinessManifest, businessManifestPath } from "../src/lib/webManifest";
@@ -20,4 +21,3 @@

   ORG_DISAMBIGUATION,
-  FOUNDER_PERSON,
-  FOUNDER_REF,
+  TEAM_REF,
   ORG_ID,
@@ -105,9 +105,2 @@

   disambiguatingDescription: ORG_DISAMBIGUATION,
-  // The id points at the full Person node on /about; the name, profile and
-  // disambiguation stay inline so every page names the founder on its own.
-  founder: {
-    ...FOUNDER_REF,
-    sameAs: [...FOUNDER_PERSON.sameAs],
-    disambiguatingDescription: FOUNDER_PERSON.disambiguatingDescription,
-  },
   // Emitted only once real profile URLs exist; an empty sameAs says nothing.
@@ -275,5 +268,2 @@

   ];
-  // The founder's full Person node lives on /about; every author reference
-  // elsewhere points at its id.
-  if (route.path === "/about") graph.push(FOUNDER_PERSON);
   // The priced product description belongs on the pages that are actually about
@@ -294,3 +284,3 @@

       inLanguage: "en-US",
-      author: FOUNDER_REF,
+      author: TEAM_REF,
       publisher: { "@id": ORG_ID },
@@ -352,3 +342,3 @@

   const parts: string[] = [`<h1>${esc(route.h1)}</h1>`];
-  if (route.path.startsWith("/guides/") || route.article) parts.push(`<p>By ${esc(FOUNDER_REF.name)}, Founder of Revvin</p>`);
+  if (route.path.startsWith("/guides/") || route.article) parts.push(`<p>By the Revvin team</p>`);
   for (const s of route.sections) {
@@ -866,2 +856,3 @@

       // preloads everywhere, critical CSS inlined on the server-rendered ones.
+      validatePublicBrandSources(process.cwd());
       const docs: { file: string; html: string; inlineCss: boolean }[] = [];
@@ -904,3 +895,3 @@

           addDoc(`/earn/${m.slug}`, renderEarnMetroDoc(template, m));
-          ogCards.push({ path: `/earn/${m.slug}`, title: `Get paid for referrals in ${m.name}`, kind: "Earn" });
+          ogCards.push({ path: `/earn/${m.slug}`, title: "Get paid for local referrals", kind: "Earn" });
           count++;
@@ -920,3 +911,3 @@

           addDoc(`/r/${biz.slug}`, renderBusinessDoc(template, biz, ssr, earnMetro), Boolean(ssr));
-          ogCards.push({ path: `/r/${biz.slug}`, title: businessMeta(biz).title, kind: "Referral reward" });
+          ogCards.push({ path: `/r/${biz.slug}`, title: `Refer a customer to ${biz.name}`, kind: "Referral reward" });
           fs.mkdirSync(path.join(dist, "manifests"), { recursive: true });
@@ -962,2 +953,3 @@

         }
+        assertPublicBrand(html, doc.file);
         fs.mkdirSync(path.dirname(doc.file), { recursive: true });
@@ -986,2 +978,4 @@

       fs.writeFileSync(path.join(dist, "sitemap.xml"), renderSitemap(entries), "utf8");
+      assertPublicBrand(renderLlmsFull(), "llms-full.txt");
+      assertPublicBrand(renderRss(), "guides/rss.xml");
       fs.writeFileSync(path.join(dist, "llms-full.txt"), renderLlmsFull(), "utf8");
```

### public/llms.txt

```diff
--- before/public/llms.txt

+++ after/public/llms.txt

@@ -4,3 +4,3 @@

 
-Last updated: 2026-10-30
+Last updated: 2026-10-31
 
@@ -32,8 +32,8 @@

 - Locals earn a reward, paid directly by the business, when a referral turns into a job.
-- Earn opens city by city, starting with the Fraser Valley, BC.
+- Earn opens city by city across the US and Canada.
 - Free for referrers. No earnings are promised.
 
-## Founder
+## Team
 
-- Revvin was founded by Karm Sandhu.
+- Revvin is built by a team serving home-service businesses across the US and Canada.
 
@@ -43,3 +43,3 @@

 - [Pricing](/pricing): Free and Revvin Pro.
-- [About](/about): The company, what it does not do and the founder.
+- [About](/about): The company, what it does not do and the team.
 - [Earn](/earn): Get paid for referrals, city by city.
```

### src/components/ReferralWizard.tsx

```diff
--- before/src/components/ReferralWizard.tsx

+++ after/src/components/ReferralWizard.tsx

@@ -397,3 +397,3 @@

                   <label className="mb-1.5 block text-xs font-medium">Customer City</label>
-                  <Input placeholder="e.g. Vancouver" value={formData.city} onChange={(e) => setFormData((f) => ({ ...f, city: e.target.value }))} />
+                  <Input placeholder="e.g. Dallas" value={formData.city} onChange={(e) => setFormData((f) => ({ ...f, city: e.target.value }))} />
                 </div>
```

### src/components/ServiceAreaAutocomplete.tsx

```diff
--- before/src/components/ServiceAreaAutocomplete.tsx

+++ after/src/components/ServiceAreaAutocomplete.tsx

@@ -41,3 +41,3 @@

   onPlaceSelected,
-  placeholder = "Vancouver, BC",
+  placeholder = "Dallas, TX",
   id,
```

### src/components/content/ContentBlocks.tsx

```diff
--- before/src/components/content/ContentBlocks.tsx

+++ after/src/components/content/ContentBlocks.tsx

@@ -3,3 +3,3 @@

 import { Button } from "@/components/ui/button";
-import { FOUNDER, FOUNDER_BIO } from "@/config/brand";
+import { TEAM_BIO } from "@/config/brand";
 
@@ -33,6 +33,6 @@

     <h2 id="author-heading" className="text-2xl">About the author</h2>
-    <p className="mt-3 font-semibold text-foreground">{`${FOUNDER.name}, Founder of Revvin`}</p>
-    <p className="mt-2 text-[16px] leading-relaxed text-muted-foreground">{FOUNDER_BIO}</p>
-    <Link to="/about#karm-sandhu" className="mt-3 inline-block text-sm font-semibold text-primary underline">
-      More about Karm Sandhu
+    <p className="mt-3 font-semibold text-foreground">The Revvin team</p>
+    <p className="mt-2 text-[16px] leading-relaxed text-muted-foreground">{TEAM_BIO}</p>
+    <Link to="/about#team" className="mt-3 inline-block text-sm font-semibold text-primary underline">
+      More about the Revvin team
     </Link>
```

### src/components/dashboard/PageBrandingEditor.tsx

```diff
--- before/src/components/dashboard/PageBrandingEditor.tsx

+++ after/src/components/dashboard/PageBrandingEditor.tsx

@@ -333,3 +333,3 @@

           onPlaceSelected={setPlaceGeo}
-          placeholder="Vancouver, BC"
+          placeholder="Dallas, TX"
         />
```

### src/components/marketing/FounderSection.tsx

```diff
--- before/src/components/marketing/FounderSection.tsx

+++ after/src/components/marketing/FounderSection.tsx

@@ -1,43 +0,0 @@

-import { Button } from "@/components/ui/button";
-import { FOUNDER } from "@/config/brand";
-import { SETUP_CALL_URL } from "@/config/setupCall";
-import { track } from "@/lib/track";
-
-// Picks up src/assets/karm.jpg automatically once it is added; until then a
-// monogram stands in.
-const photos = import.meta.glob("../../assets/karm.jpg", { eager: true, import: "default" }) as Record<string, string>;
-const photo = Object.values(photos)[0];
-
-const FounderSection = () => (
-  <section id="karm-sandhu" aria-labelledby="founder-heading" className="mk-section scroll-mt-20">
-    <div className="mk-wrap grid items-center gap-10 md:grid-cols-[auto_minmax(0,1fr)] md:gap-14">
-      {photo ? (
-        <img src={photo} alt={FOUNDER.name} width={200} height={200} className="h-36 w-36 rounded-full object-cover md:h-[200px] md:w-[200px]" />
-      ) : (
-        <div aria-hidden className="grid h-36 w-36 place-items-center rounded-full bg-green font-display text-5xl font-extrabold text-primary-foreground md:h-[200px] md:w-[200px] md:text-[64px]">
-          KS
-        </div>
-      )}
-      <div className="min-w-0">
-        <h2 id="founder-heading" className="sr-only">Why Revvin exists</h2>
-        <blockquote className="max-w-[24ch] font-display text-[clamp(30px,3.2vw,44px)] font-bold leading-[1.08] text-forest">
-          The cheapest jobs we ever closed came from happy customers. Revvin lets every home-service business run that play without a sales team.
-        </blockquote>
-        <p className="mt-6 max-w-[36em] text-lg leading-relaxed text-muted-foreground">
-          I started selling door to door in 2016 and went on to run a 120-rep sales team doing $5.5M a year. I built Revvin for the owners I used to sell beside. Book 30 minutes and I'll set yours up with you.
-        </p>
-        <p className="mt-6 font-bold text-foreground">{FOUNDER.name}</p>
-        <p className="text-muted-foreground">{FOUNDER.jobTitle}, Revvin</p>
-        {SETUP_CALL_URL && (
-          <Button size="lg" variant="line" className="mt-7 h-auto min-h-14 w-full whitespace-normal py-3 sm:w-auto" asChild>
-            <a href={SETUP_CALL_URL} target="_blank" rel="noopener noreferrer" onClick={() => track("cta_clicked", { cta: "home_founder_call" })}>
-              Book a setup call with Karm
-            </a>
-          </Button>
-        )}
-      </div>
-    </div>
-  </section>
-);
-
-export default FounderSection;
```

### src/components/marketing/StepTrack.tsx

```diff
--- before/src/components/marketing/StepTrack.tsx

+++ after/src/components/marketing/StepTrack.tsx

@@ -18,3 +18,3 @@

         <div className="mk-mini-field"><small>Referring as</small>Dana</div>
-        <div className="mk-mini-field"><small>Who needs a roof?</small>Mike, 604 555 0142</div>
+        <div className="mk-mini-field"><small>Who needs a roof?</small>Mike, 555 0142</div>
         <div className="mk-mini-btn">Send referral</div>
```

### src/components/marketing/TeamSection.tsx

```diff
--- before/src/components/marketing/TeamSection.tsx

+++ after/src/components/marketing/TeamSection.tsx

@@ -0,0 +1,28 @@

+import { Button } from "@/components/ui/button";
+import { TEAM_HEADING, TEAM_BIO } from "@/config/brand";
+import { SETUP_CALL_URL } from "@/config/setupCall";
+import { track } from "@/lib/track";
+
+const TeamSection = () => (
+  <section id="team" aria-labelledby="team-heading" className="mk-section scroll-mt-20">
+    <div className="mk-wrap grid items-center gap-10 md:grid-cols-[auto_minmax(0,1fr)] md:gap-14">
+      <div aria-hidden className="grid h-36 w-36 place-items-center rounded-[18px] bg-green font-display text-2xl font-extrabold text-primary-foreground md:h-[200px] md:w-[200px] md:text-3xl">
+        REVVIN.CO
+      </div>
+      <div className="min-w-0">
+        <h2 id="team-heading" className="max-w-[24ch] font-display text-[clamp(30px,3.2vw,44px)] font-bold leading-[1.08] text-forest">{TEAM_HEADING}</h2>
+        <p className="mt-6 max-w-[36em] text-lg leading-relaxed text-muted-foreground">{TEAM_BIO}</p>
+        <p className="mt-6 font-bold text-foreground">The Revvin team</p>
+        {SETUP_CALL_URL && (
+          <Button size="lg" variant="line" className="mt-7 h-auto min-h-14 w-full whitespace-normal py-3 sm:w-auto" asChild>
+            <a href={SETUP_CALL_URL} target="_blank" rel="noopener noreferrer" onClick={() => track("cta_clicked", { cta: "home_founder_call" })}>
+              Book a free 30-minute setup call
+            </a>
+          </Button>
+        )}
+      </div>
+    </div>
+  </section>
+);
+
+export default TeamSection;
```

### src/config/brand.ts

```diff
--- before/src/config/brand.ts

+++ after/src/config/brand.ts

@@ -30,35 +30,10 @@

  */
-/** The founder, shown on the homepage, /about, guide bylines and in JSON-LD. */
-export const FOUNDER = {
-  name: "Karm Sandhu",
-  jobTitle: "Founder",
-  sameAs: ["https://www.linkedin.com/in/karm"],
-} as const;
-
-/** Stable id of the founder's Person node, emitted in full on /about. */
-export const PERSON_ID = `${SITE_URL}/about#karm-sandhu`;
-
-/** Third-person founder bio for structured data, from the /about founder section. */
-export const FOUNDER_BIO =
-  "Karm Sandhu started selling door to door in 2016 and went on to run a 120-rep sales team doing $5.5M a year. He built Revvin so every home-service business can run a referral program without a sales team.";
-
-/** The full Person node. Emitted once, on /about; everything else references it by id. */
-export const FOUNDER_PERSON = {
-  "@type": "Person",
-  "@id": PERSON_ID,
-  name: FOUNDER.name,
-  jobTitle: FOUNDER.jobTitle,
-  url: `${SITE_URL}/about`,
-  description: FOUNDER_BIO,
-  sameAs: [...FOUNDER.sameAs],
-  disambiguatingDescription: "Karm Sandhu is the founder of Revvin (revvin.co), referral program software for home-service businesses.",
-  worksFor: { "@id": ORG_ID },
-} as const;
-
-/** A reference to the founder: the id plus the name, so a page without the full node still names the author. */
-export const FOUNDER_REF = {
-  "@type": "Person",
-  "@id": PERSON_ID,
-  name: FOUNDER.name,
-  url: `${SITE_URL}/about`,
+/** Team identity shared by public copy and Article authors. */
+export const TEAM_HEADING = "Built by people who've run real sales teams.";
+export const TEAM_BIO = "Revvin is built by operators who have recruited, trained and managed door-to-door and phone sales teams of 120+ reps, selling 8,000+ accounts a year for national telecom carriers across North America. The cheapest jobs those teams ever closed came from happy customers. Revvin turns that play into software any home-service business can run without a sales team.";
+export const TEAM_REF = {
+  "@type": "Organization",
+  "@id": ORG_ID,
+  name: "Revvin",
+  url: SITE_URL,
 } as const;
```

### src/content/aboutPage.ts

```diff
--- before/src/content/aboutPage.ts

+++ after/src/content/aboutPage.ts

@@ -2,8 +2,5 @@

 import { PRICE_TEXT } from "../config/pricing";
-import { CANONICAL_SENTENCE, FOUNDER } from "../config/brand";
+import { CANONICAL_SENTENCE, TEAM_HEADING, TEAM_BIO } from "../config/brand";
 
-export const ABOUT_UPDATED_AT = "2026-10-29";
-
-export const FOUNDER_BIO =
-  "I'm Karm Sandhu. I started selling door to door in 2016 and went on to run a 120-rep sales team doing $5.5M a year. The cheapest jobs we ever closed came from happy customers. I built Revvin so every home-service business can run that play without a sales team. Book 30 minutes and I'll set yours up with you.";
+export const ABOUT_UPDATED_AT = "2026-10-31";
 
@@ -16,3 +13,3 @@

     heading: "Who it is for",
-    body: "Roofers, HVAC companies, plumbers, landscapers, electricians, painters and other home-service businesses, usually teams of 1 to 10, that want more jobs from happy customers instead of buying leads.",
+    body: "Roofers, HVAC companies, plumbers, landscapers, electricians, painters and other home-service businesses across the US and Canada, usually teams of 1 to 10, that want more jobs from happy customers instead of buying leads.",
   },
@@ -31,4 +28,4 @@

   {
-    heading: "Founder",
-    body: `${FOUNDER.name}, ${FOUNDER.jobTitle}. ${FOUNDER_BIO}`,
+    heading: TEAM_HEADING,
+    body: TEAM_BIO,
   },
```

### src/content/earnPage.ts

```diff
--- before/src/content/earnPage.ts

+++ after/src/content/earnPage.ts

@@ -4,3 +4,3 @@

   sub: "Know someone who needs a new roof, a furnace or a landscaper? Businesses on Revvin pay a cash reward when your referral turns into a job. Free to join.",
-  rollout: "Revvin is opening city by city, starting in the Fraser Valley, BC. Join the list and we'll tell you when businesses near you are live.",
+  rollout: "Revvin is opening city by city across the US and Canada. Join the list and we'll tell you when businesses near you are live.",
   rules: [
```

### src/content/guidesNew.ts

```diff
--- before/src/content/guidesNew.ts

+++ after/src/content/guidesNew.ts

@@ -362,3 +362,3 @@

         heading: "How do you start on Revvin Earn?",
-        body: "Revvin Earn lists local businesses that pay for referrals, city by city, starting with the Fraser Valley. Open the Earn page, join the list for your city, and get your own link for any business listed there. Where Earn is not live yet, you can join the waitlist.",
+        body: "Revvin Earn lists local businesses that pay for referrals, city by city across the US and Canada. Open the Earn page, join the list for your city, and get your own link for any business listed there. Where Earn is not live yet, you can join the waitlist.",
       },
```

### src/content/pageMeta.ts

```diff
--- before/src/content/pageMeta.ts

+++ after/src/content/pageMeta.ts

@@ -21,3 +21,3 @@

   "/about": {
-    title: "About Revvin and founder Karm Sandhu | Revvin",
+    title: "About Revvin and the team behind it | Revvin",
     description:
```

### src/content/publicBrandGuard.ts

```diff
--- before/src/content/publicBrandGuard.ts

+++ after/src/content/publicBrandGuard.ts

@@ -0,0 +1,29 @@

+import fs from "node:fs";
+import path from "node:path";
+
+/** Prevent retired personal identity from reappearing in public sources or output. */
+export const RETIRED_IDENTITY = /karm|sandhu|linkedin\.com\/in\/karm/i;
+
+export const assertPublicBrand = (text: string, label: string) => {
+  if (RETIRED_IDENTITY.test(text)) throw new Error(`Retired personal identity in public content: ${label}`);
+};
+
+export const validatePublicBrandSources = (root: string) => {
+  assertPublicBrand(fs.readFileSync(path.join(root, "index.html"), "utf8"), "index.html");
+  const visit = (dir: string) => {
+    if (!fs.existsSync(dir)) return;
+    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
+      const file = path.join(dir, entry.name);
+      if (entry.isDirectory()) visit(file);
+      else if (/\.(tsx?|html|txt|xml)$/.test(entry.name)) assertPublicBrand(fs.readFileSync(file, "utf8"), file);
+    }
+  };
+  for (const dir of ["src/pages", "src/components", "src/config", "public", "supabase/functions/_shared/transactional-email-templates"]) visit(path.join(root, dir));
+  // This guard contains the banned words itself, so exclude it from the content scan.
+  const content = path.join(root, "src/content");
+  for (const name of fs.readdirSync(content)) {
+    if (name !== "publicBrandGuard.ts" && /\.tsx?$/.test(name)) {
+      assertPublicBrand(fs.readFileSync(path.join(content, name), "utf8"), name);
+    }
+  }
+};
```

### src/pages/About.tsx

```diff
--- before/src/pages/About.tsx

+++ after/src/pages/About.tsx

@@ -2,5 +2,5 @@

 import SEOHead from "@/components/SEOHead";
-import FounderSection from "@/components/marketing/FounderSection";
+import TeamSection from "@/components/marketing/TeamSection";
 import { ABOUT_SECTIONS, ABOUT_UPDATED_AT } from "@/content/aboutPage";
-import { CANONICAL_SENTENCE, FOUNDER_PERSON, ORG_ID, SITE_URL, formatContentDate } from "@/config/brand";
+import { CANONICAL_SENTENCE, ORG_ID, SITE_URL, formatContentDate } from "@/config/brand";
 
@@ -19,3 +19,3 @@

         about: { "@id": ORG_ID },
-        mainEntity: { "@type": "Organization", "@id": ORG_ID, name: "Revvin", url: SITE_URL, founder: FOUNDER_PERSON },
+        mainEntity: { "@type": "Organization", "@id": ORG_ID, name: "Revvin", url: SITE_URL },
       }}
@@ -34,3 +34,3 @@

   </div>
-  <FounderSection />
+  <TeamSection />
   </>
```

### src/pages/ComparePage.tsx

```diff
--- before/src/pages/ComparePage.tsx

+++ after/src/pages/ComparePage.tsx

@@ -7,3 +7,3 @@

 import { FREE_CTA_LABEL } from "@/config/planFeatures";
-import { FOUNDER_REF, formatContentDate } from "@/config/brand";
+import { TEAM_REF, formatContentDate } from "@/config/brand";
 import {
@@ -86,3 +86,3 @@

       <p className="mt-5 border-b border-line pb-5 text-sm text-muted-foreground">
-        <span className="font-semibold text-foreground">By Karm Sandhu, Founder of Revvin</span>
+        <span className="font-semibold text-foreground">By the Revvin team</span>
         <br />
@@ -132,3 +132,3 @@

   mainEntityOfPage: `${BASE}${path}`,
-  author: FOUNDER_REF,
+  author: TEAM_REF,
   publisher: { "@id": `${BASE}/#organization` },
```

### src/pages/Earn.tsx

```diff
--- before/src/pages/Earn.tsx

+++ after/src/pages/Earn.tsx

@@ -29,3 +29,3 @@

                   <li key={m.slug} className="flex items-center justify-between gap-4 py-3">
-                    <span className="font-semibold text-foreground">{m.name}</span>
+                    <span className="font-semibold text-foreground">Live city</span>
                     <Link to={`/earn/${m.slug}`} className="font-semibold text-primary underline underline-offset-4">See businesses</Link>
```

### src/pages/EarnMetro.tsx

```diff
--- before/src/pages/EarnMetro.tsx

+++ after/src/pages/EarnMetro.tsx

@@ -8,2 +8,3 @@

 import GetMyLink from "@/components/earn/GetMyLink";
+import { EARN_COPY } from "@/content/earnPage";
 import { earnDescription, earnTitle, metroBusinesses, metroInfo, submitEarnLead, waitingCount, type EarnBusiness } from "@/lib/earn";
@@ -49,3 +50,3 @@

           ) : (
-            <p className="mt-4 text-muted-foreground">{info.name} is not live yet. Join the list and we'll tell you when businesses near you are live.</p>
+            <p className="mt-4 text-muted-foreground">{EARN_COPY.rollout}</p>
           )}
```

### src/pages/GuidePage.tsx

```diff
--- before/src/pages/GuidePage.tsx

+++ after/src/pages/GuidePage.tsx

@@ -11,3 +11,3 @@

   formatContentDate,
-  FOUNDER_REF,
+  TEAM_REF,
 } from "@/config/brand";
@@ -57,3 +57,3 @@

             mainEntityOfPage: `${BASE}${path}`,
-            author: FOUNDER_REF,
+            author: TEAM_REF,
             publisher: { "@id": `${BASE}/#organization` },
@@ -118,3 +118,3 @@

           <p className="mt-5 border-b border-line pb-5 text-sm text-muted-foreground">
-            <span className="font-semibold text-foreground">By Karm Sandhu, Founder of Revvin</span>
+            <span className="font-semibold text-foreground">By the Revvin team</span>
             <br />
```

### src/pages/Index.tsx

```diff
--- before/src/pages/Index.tsx

+++ after/src/pages/Index.tsx

@@ -4,3 +4,3 @@

 import { track } from "@/lib/track";
-import FounderSection from "@/components/marketing/FounderSection";
+import TeamSection from "@/components/marketing/TeamSection";
 import ReferralWorthCalculator from "@/components/marketing/ReferralWorthCalculator";
@@ -18,3 +18,3 @@

  * Homepage, yard-sign design. Order: hero, how one text turns into a job,
- * referral worksheet, two ways referrals reach you, founder, pricing, questions,
+ * referral worksheet, two ways referrals reach you, team, pricing, questions,
  * final action. Copy rule: every line has to be true of the shipped product.
@@ -36,5 +36,5 @@

 const LOCALS = [
-  ["Summit Roofing, Langley", "$250"],
-  ["Cedar HVAC, Surrey", "$150"],
-  ["Greenline Landscaping, Maple Ridge", "$100"],
+  ["Summit Roofing, Dallas", "$250"],
+  ["Cedar HVAC, Phoenix", "$150"],
+  ["Greenline Landscaping, Toronto", "$100"],
 ];
@@ -90,3 +90,3 @@

                 <a href={SETUP_CALL_URL} target="_blank" rel="noopener noreferrer" onClick={() => track("cta_clicked", { cta: "hero_setup_link" })} className="font-semibold text-forest underline underline-offset-4">
-                  book a 30-minute setup call with Karm
+                  Book a free 30-minute setup call
                 </a>
@@ -151,3 +151,3 @@

             <p className="mt-5 text-sm text-primary-foreground/80">
-              Examples. The network opens city by city, starting in the Fraser Valley.{" "}
+              Examples. The Revvin network is opening city by city across the US and Canada.{" "}
               <Link to="/earn" onClick={() => track("cta_clicked", { cta: "home_earn" })} className="font-semibold text-sign underline underline-offset-4">How earning works</Link>
@@ -159,3 +159,3 @@

 
-    <FounderSection />
+    <TeamSection />
 
```

### src/pages/Onboarding.tsx

```diff
--- before/src/pages/Onboarding.tsx

+++ after/src/pages/Onboarding.tsx

@@ -244,3 +244,3 @@

                     <Label htmlFor="service-area">City</Label>
-                    <ServiceAreaAutocomplete id="service-area" value={serviceArea} onChange={setServiceArea} onPlaceSelected={setPlaceGeo} placeholder="Vancouver, BC" />
+                    <ServiceAreaAutocomplete id="service-area" value={serviceArea} onChange={setServiceArea} onPlaceSelected={setPlaceGeo} placeholder="Dallas, TX" />
                   </div>
```

### src/pages/dashboard/CreateOffer.tsx

```diff
--- before/src/pages/dashboard/CreateOffer.tsx

+++ after/src/pages/dashboard/CreateOffer.tsx

@@ -327,3 +327,3 @@

               <div><Label>Minimum Project Size ($)</Label><Input type="number" value={form.minProjectSize} onChange={(e) => update("minProjectSize", e.target.value)} placeholder="e.g. 5000" className="mt-1" /></div>
-              <div><Label>Eligible Locations</Label><Input value={form.eligibleLocations} onChange={(e) => update("eligibleLocations", e.target.value)} placeholder="e.g. Metro Vancouver, Fraser Valley" className="mt-1" /></div>
+              <div><Label>Eligible Locations</Label><Input value={form.eligibleLocations} onChange={(e) => update("eligibleLocations", e.target.value)} placeholder="e.g. Dallas, TX" className="mt-1" /></div>
               <div>
```

### src/pages/dashboard/ProfileEdit.tsx

```diff
--- before/src/pages/dashboard/ProfileEdit.tsx

+++ after/src/pages/dashboard/ProfileEdit.tsx

@@ -226,3 +226,3 @@

                   <Label>City</Label>
-                  <Input value={form.city} onChange={(e) => update("city", e.target.value)} placeholder="e.g. Vancouver" className="mt-1" />
+                  <Input value={form.city} onChange={(e) => update("city", e.target.value)} placeholder="e.g. Dallas" className="mt-1" />
                 </div>
@@ -230,3 +230,3 @@

                   <Label>Province / State</Label>
-                  <Input value={form.state} onChange={(e) => update("state", e.target.value)} placeholder="e.g. BC, TX, or Dubai" className="mt-1" />
+                  <Input value={form.state} onChange={(e) => update("state", e.target.value)} placeholder="e.g. TX or ON" className="mt-1" />
                 </div>
@@ -310,3 +310,3 @@

                         onChange={(e) => updateBiz("city", e.target.value)}
-                        placeholder="Vancouver"
+                        placeholder="Dallas"
                         className="mt-1"
@@ -319,3 +319,3 @@

                         onChange={(e) => updateBiz("state", e.target.value)}
-                        placeholder="BC"
+                        placeholder="TX"
                         className="mt-1"
```

### src/test/batch-one-guards.test.ts

```diff
--- before/src/test/batch-one-guards.test.ts

+++ after/src/test/batch-one-guards.test.ts

@@ -5,8 +5,9 @@

 
-describe("founder identity", () => {
-  it("names Karm Sandhu as founder in brand facts, guides and structured data", () => {
-    expect(read("src/config/brand.ts")).toMatch(/name: "Karm Sandhu"/);
-    expect(read("src/pages/GuidePage.tsx")).toContain("By Karm Sandhu, Founder of Revvin");
-    expect(read("src/pages/GuidePage.tsx")).toContain("author: FOUNDER_REF");
-    expect(read("plugins/prerender.ts")).toContain("...FOUNDER_REF,");
+describe("team identity", () => {
+  it("uses the Organization as author and excludes personal identity from public sources", () => {
+    for (const p of ["src/config/brand.ts", "src/pages/GuidePage.tsx", "src/pages/ComparePage.tsx", "src/pages/About.tsx", "plugins/prerender.ts", "public/llms.txt"]) {
+      expect(read(p), p).not.toMatch(/Karm|Sandhu|linkedin\.com\/in\/karm/i);
+    }
+    expect(read("src/pages/GuidePage.tsx")).toContain("author: TEAM_REF");
+    expect(read("src/pages/ComparePage.tsx")).toContain("author: TEAM_REF");
   });
@@ -21,3 +22,3 @@

     expect(read("src/config/planFeatures.ts")).toContain('FREE_CTA_LABEL = "Start free"');
-    expect(read("src/pages/Index.tsx")).toContain("book a 30-minute setup call with Karm");
+    expect(read("src/pages/Index.tsx")).toContain("Book a free 30-minute setup call");
     expect(read("src/pages/Index.tsx")).not.toContain("overflow-x-clip");
```

### src/test/comparison-pages.test.ts

```diff
--- before/src/test/comparison-pages.test.ts

+++ after/src/test/comparison-pages.test.ts

@@ -45,3 +45,3 @@

       const art = graph.find((n: { "@type": string }) => n["@type"] === "Article");
-      expect(art?.author?.name).toBe("Karm Sandhu");
+      expect(art?.author?.name).toBe("Revvin");
       expect(art?.publisher).toBeTruthy();
```

### src/test/content-build.test.ts

```diff
--- before/src/test/content-build.test.ts

+++ after/src/test/content-build.test.ts

@@ -8,3 +8,3 @@

 import { render } from "@/entry-server";
-import { PERSON_ID } from "@/config/brand";
+import { ORG_ID } from "@/config/brand";
 import { INDUSTRIES } from "@/content/industries";
@@ -42,3 +42,3 @@

       const article = graph(p).find((n) => n["@type"] === "Article")!;
-      expect(article.author["@id"]).toBe(PERSON_ID);
+      expect(article.author["@id"]).toBe(ORG_ID);
       expect(article.dateModified).toBe("2026-10-30");
@@ -54,3 +54,3 @@

       expect(html).toContain('data-block="author"');
-      expect(html).toContain('href="/about#karm-sandhu"');
+      expect(html).toContain('href="/about#team"');
       expect(html).toContain("Last updated October 30, 2026");
```

### src/test/earn-metros.test.tsx

```diff
--- before/src/test/earn-metros.test.tsx

+++ after/src/test/earn-metros.test.tsx

@@ -58,3 +58,3 @@

     metroPage();
-    await screen.findByText(/is not live yet/);
+    await screen.findByText(/Revvin is opening city by city across the US and Canada/);
     expect(document.querySelector('meta[name="robots"]')?.getAttribute("content")).toMatch(/noindex/);
```

### src/test/homepage-reposition.test.tsx

```diff
--- before/src/test/homepage-reposition.test.tsx

+++ after/src/test/homepage-reposition.test.tsx

@@ -101,3 +101,3 @@

     "src/pages/Index.tsx", "src/pages/About.tsx", "src/pages/Earn.tsx", "src/pages/Pricing.tsx",
-    "src/components/Navbar.tsx", "src/components/marketing/FounderSection.tsx",
+    "src/components/Navbar.tsx", "src/components/marketing/TeamSection.tsx",
     "src/components/marketing/ReferralWorthCalculator.tsx", "src/components/marketing/LeadCaptureForm.tsx",
```

### src/test/lifecycle-emails.test.ts

```diff
--- before/src/test/lifecycle-emails.test.ts

+++ after/src/test/lifecycle-emails.test.ts

@@ -45,4 +45,4 @@

 
-  it("sends from Karm at Revvin with the info@revvin.co address", () => {
-    expect(LIFECYCLE_FROM).toBe("Karm at Revvin <info@revvin.co>");
+  it("sends from Revvin with the info@revvin.co address", () => {
+    expect(LIFECYCLE_FROM).toBe("Revvin <info@revvin.co>");
     expect(LIFECYCLE_REPLY_TO).toBe("info@revvin.co");
```

### src/test/public-brand.test.ts

```diff
--- before/src/test/public-brand.test.ts

+++ after/src/test/public-brand.test.ts

@@ -0,0 +1,53 @@

+// @vitest-environment node
+import { describe, expect, it } from "vitest";
+import fs from "node:fs";
+import { assertPublicBrand, validatePublicBrandSources } from "@/content/publicBrandGuard";
+import { PRERENDER_ROUTES } from "@/content/seoRoutes";
+import { TEAM_BIO, TEAM_REF, ORG_ID } from "@/config/brand";
+import { EARN_COPY } from "@/content/earnPage";
+import { render } from "@/entry-server";
+import { renderRoute, renderLlmsFull, renderRss, jsonLd } from "../../plugins/prerender";
+import { FOUNDER_STORY_APPROVED, LIFECYCLE_FROM } from "../../supabase/functions/_shared/lifecycle-config";
+
+describe("public team identity", () => {
+  it.each(["Karm", "Sandhu", "https://www.linkedin.com/in/karm"])("rejects retired identity %s", (value) => {
+    expect(() => assertPublicBrand(value, "fixture")).toThrow(/Retired personal identity/);
+  });
+  it("validates every public source", () => {
+    expect(() => validatePublicBrandSources(process.cwd())).not.toThrow();
+  });
+  it("authors articles as the organization", () => {
+    expect(TEAM_REF).toMatchObject({ "@type": "Organization", "@id": ORG_ID, name: "Revvin" });
+    for (const r of PRERENDER_ROUTES) {
+      const graph = JSON.parse(jsonLd(r))["@graph"];
+      expect(graph.some((n: Record<string, unknown>) => n["@type"] === "Person"), r.path).toBe(false);
+      for (const n of graph) {
+        if (n["@type"] === "Organization") expect(n).not.toHaveProperty("founder");
+        if (n["@type"] === "Article") expect(n.author).toEqual(TEAM_REF);
+      }
+    }
+  });
+  it("validates prerendered pages, RSS and AI text", async () => {
+    const template = fs.readFileSync("index.html", "utf8");
+    const regional = /Pitt Meadows|Fraser Valley|Langley|Surrey|Maple Ridge|Abbotsford|Vancouver|British Columbia|\bBC\b/;
+    for (const r of PRERENDER_ROUTES.filter((r) => !r.redirectTo)) {
+      const body = await render(r.path);
+      const html = renderRoute(template, r, body);
+      expect(() => assertPublicBrand(html, r.path)).not.toThrow();
+      expect(html, r.path).not.toMatch(regional);
+      expect(html, r.path).not.toContain("\u2014");
+    }
+    for (const text of [renderLlmsFull(), renderRss(), fs.readFileSync("public/llms.txt", "utf8")]) {
+      expect(() => assertPublicBrand(text, "generated text")).not.toThrow();
+      expect(text).not.toMatch(regional);
+    }
+  }, 60000);
+  it("keeps the supplied team experience and country rollout", () => {
+    expect(TEAM_BIO).toContain("120+ reps, selling 8,000+ accounts a year");
+    expect(EARN_COPY.rollout).toBe("Revvin is opening city by city across the US and Canada. Join the list and we'll tell you when businesses near you are live.");
+  });
+  it("keeps the legacy story send gate disabled and uses the brand sender", () => {
+    expect(FOUNDER_STORY_APPROVED).toBe(false);
+    expect(LIFECYCLE_FROM).toBe("Revvin <info@revvin.co>");
+  });
+});
```

### src/test/seo-pass.test.ts

```diff
--- before/src/test/seo-pass.test.ts

+++ after/src/test/seo-pass.test.ts

@@ -18,3 +18,3 @@

 import { buildSitemapEntries } from "../../plugins/sitemap";
-import { PERSON_ID } from "@/config/brand";
+import { ORG_ID } from "@/config/brand";
 import { COMPARISONS, ROUNDUP } from "@/content/comparisons";
@@ -72,3 +72,3 @@

 describe("structured data", () => {
-  it("Organization: logo ImageObject, contact point, US and CA, knowsAbout, founder by id", () => {
+  it("Organization: logo ImageObject, contact point, US and CA, knowsAbout, no founder", () => {
     const org = graphOf(renderRoute(template, live.find((r) => r.path === "/")!)).find((n) => n["@type"] === "Organization")!;
@@ -78,13 +78,9 @@

     expect(org.knowsAbout).toEqual(["referral marketing", "referral programs", "home services marketing"]);
-    expect(org.founder["@id"]).toBe("https://revvin.co/about#karm-sandhu");
-    expect(org.founder.sameAs).toEqual(["https://www.linkedin.com/in/karm"]);
+    expect(org).not.toHaveProperty("founder");
   });
 
-  it("the full Person node is on /about with job title, employer, LinkedIn and bio", () => {
-    const person = graphOf(renderRoute(template, live.find((r) => r.path === "/about")!)).find((n) => n["@type"] === "Person")!;
-    expect(person["@id"]).toBe(PERSON_ID);
-    expect(person.jobTitle).toBe("Founder");
-    expect(person.worksFor).toEqual({ "@id": "https://revvin.co/#organization" });
-    expect(person.sameAs).toEqual(["https://www.linkedin.com/in/karm"]);
-    expect(person.description).toMatch(/door to door in 2016/);
+  it("no public route emits a Person node", () => {
+    for (const r of live) {
+      expect(graphOf(renderRoute(template, r)).some((n) => n["@type"] === "Person"), r.path).toBe(false);
+    }
   });
@@ -96,4 +92,5 @@

       const art = graphOf(renderRoute(template, r)).find((n) => n["@type"] === "Article")!;
-      expect(art.author["@id"], r.path).toBe(PERSON_ID);
-      expect(art.author.name).toBe("Karm Sandhu");
+      expect(art.author["@id"], r.path).toBe(ORG_ID);
+      expect(art.author.name).toBe("Revvin");
+      expect(art.author["@type"]).toBe("Organization");
       expect(art.datePublished).toMatch(/^\d{4}-\d{2}-\d{2}$/);
```

### src/test/seo-sitemap-robots.test.ts

```diff
--- before/src/test/seo-sitemap-robots.test.ts

+++ after/src/test/seo-sitemap-robots.test.ts

@@ -33,3 +33,3 @@

 
-  it("Organization has founder with sameAs and disambiguation, no empty sameAs; WebSite has alternateName", () => {
+  it("Organization has no founder or empty sameAs; WebSite has alternateName", () => {
     const html = renderRoute(template, PRERENDER_ROUTES.find((r) => r.path === "/")!);
@@ -37,5 +37,3 @@

     const org = graph.find((n: { "@type": string }) => n["@type"] === "Organization");
-    expect(org.founder.name).toBe("Karm Sandhu");
-    expect(org.founder.sameAs.length).toBeGreaterThan(0);
-    expect(org.founder.disambiguatingDescription).toBeTruthy();
+    expect(org).not.toHaveProperty("founder");
     expect("sameAs" in org).toBe(false);
@@ -45,3 +43,3 @@

 
-  it("guides keep Article with Person author and Organization publisher", () => {
+  it("guides keep Article with Organization author and publisher", () => {
     const g = PRERENDER_ROUTES.find((r) => r.path.startsWith("/guides/"))!;
@@ -49,3 +47,3 @@

     const art = graph.find((n: { "@type": string }) => n["@type"] === "Article");
-    expect(art.author["@type"]).toBe("Person");
+    expect(art.author["@type"]).toBe("Organization");
     expect(art.publisher["@id"]).toContain("#organization");
```

### supabase/functions/_shared/lifecycle-config.ts

```diff
--- before/supabase/functions/_shared/lifecycle-config.ts

+++ after/supabase/functions/_shared/lifecycle-config.ts

@@ -16,3 +16,3 @@

 
-export const LIFECYCLE_FROM = "Karm at Revvin <info@revvin.co>";
+export const LIFECYCLE_FROM = "Revvin <info@revvin.co>";
 export const LIFECYCLE_REPLY_TO = "info@revvin.co";
@@ -32,4 +32,4 @@

 /**
- * The founder story email (free_d14) ships with placeholder copy that Karm
- * will replace. It stays disabled until this is true.
+ * The team introduction email (free_d14) remains disabled.
+ * The legacy approval gate is unchanged by the copy update.
  */
```

### supabase/functions/_shared/partner-email.ts

```diff
--- before/supabase/functions/_shared/partner-email.ts

+++ after/supabase/functions/_shared/partner-email.ts

@@ -3,3 +3,3 @@

 // Reuses the existing path: templates come from the transactional registry, the
-// send goes through the Resend gateway with the same "Karm at Revvin" sender,
+// send goes through the Resend gateway with the same "Revvin" sender,
 // the global suppression list is honoured, and every attempt is written to
```

### supabase/functions/_shared/transactional-email-templates/cancel-feedback.tsx

```diff
--- before/supabase/functions/_shared/transactional-email-templates/cancel-feedback.tsx

+++ after/supabase/functions/_shared/transactional-email-templates/cancel-feedback.tsx

@@ -11,7 +11,7 @@

 const Email = ({ businessName, unsubscribeUrl }: Props) => (
-  <RevvinShell previewText="One line back would help me a lot." unsubscribeUrl={unsubscribeUrl}>
-    <Text style={heading}>Can I ask what didn't work?</Text>
+  <RevvinShell previewText="One line back would help our team a lot." unsubscribeUrl={unsubscribeUrl}>
+    <Text style={heading}>Can we ask what didn't work?</Text>
     <Text style={paragraph}>
-      Hi, it's Karm. I saw {businessName || 'your account'} cancelled Pro. If you have a second, reply with one line on
-      what did not work. I read every one myself.
+      Hi, it's the Revvin team. We saw {businessName || 'your account'} cancelled Pro. If you have a second, reply with one line on
+      what did not work. Our team reads every reply.
     </Text>
@@ -20,3 +20,3 @@

     </Text>
-    <Text style={paragraph}>Karm</Text>
+    <Text style={paragraph}>The Revvin team</Text>
   </RevvinShell>
@@ -26,3 +26,3 @@

   component: Email,
-  subject: "Can I ask what didn't work?",
+  subject: "Can we ask what didn't work?",
   displayName: 'Cancel feedback',
```

### supabase/functions/_shared/transactional-email-templates/first-lead-next-day.tsx

```diff
--- before/supabase/functions/_shared/transactional-email-templates/first-lead-next-day.tsx

+++ after/supabase/functions/_shared/transactional-email-templates/first-lead-next-day.tsx

@@ -20,3 +20,3 @@

     <Text style={paragraph}>
-      Hi, it's Karm. {businessName || 'Your page'} got its first referral. That is the hard one.
+      Hi, it's the Revvin team. {businessName || 'Your page'} got its first referral. That is the hard one.
     </Text>
@@ -27,3 +27,3 @@

     {pricingUrl ? <Text style={{ margin: '0 0 20px' }}>{ctaButton(pricingUrl, 'See Revvin Pro')}</Text> : null}
-    <Text style={paragraph}>Karm</Text>
+    <Text style={paragraph}>The Revvin team</Text>
   </RevvinShell>
@@ -39,3 +39,3 @@

     unsubscribeUrl: 'https://revvin.co/unsubscribe?token=sample',
-    postalAddress: 'Revvin, 123 Example St, Vancouver BC, Canada',
+    postalAddress: 'Revvin, 123 Example St, Dallas, TX (example only)',
   },
```

### supabase/functions/_shared/transactional-email-templates/free-d10.tsx

```diff
--- before/supabase/functions/_shared/transactional-email-templates/free-d10.tsx

+++ after/supabase/functions/_shared/transactional-email-templates/free-d10.tsx

@@ -23,3 +23,3 @@

     <Text style={paragraph}>
-      Hi, it's Karm. Asking one customer at a time works{businessName ? `, and ${businessName} can keep doing that for free` : ' and it is free'}.
+      Hi, it's the Revvin team. Asking one customer at a time works{businessName ? `, and ${businessName} can keep doing that for free` : ' and it is free'}.
       Revvin Pro is for asking everyone.
@@ -33,3 +33,3 @@

     {pricingUrl ? <Text style={{ margin: '0 0 20px' }}>{ctaButton(pricingUrl, 'See Revvin Pro')}</Text> : null}
-    <Text style={paragraph}>Karm</Text>
+    <Text style={paragraph}>The Revvin team</Text>
   </RevvinShell>
@@ -45,3 +45,3 @@

     unsubscribeUrl: 'https://revvin.co/unsubscribe?token=sample',
-    postalAddress: 'Revvin, 123 Example St, Vancouver BC, Canada',
+    postalAddress: 'Revvin, 123 Example St, Dallas, TX (example only)',
   },
```

### supabase/functions/_shared/transactional-email-templates/free-d14.tsx

```diff
--- before/supabase/functions/_shared/transactional-email-templates/free-d14.tsx

+++ after/supabase/functions/_shared/transactional-email-templates/free-d14.tsx

@@ -5,14 +5,4 @@

 
-/**
- * FOUNDER_STORY_DRAFT
- *
- * The body below is placeholder text for Karm to replace in his own words.
- * This template stays disabled until FOUNDER_STORY_APPROVED in
- * _shared/lifecycle-config.ts is set to true.
- */
-export const FOUNDER_STORY_DRAFT = [
-  'FOUNDER_STORY_DRAFT: replace this paragraph with the real reason you built Revvin, in your own words.',
-  'FOUNDER_STORY_DRAFT: replace this paragraph with what you saw contractors doing instead, and why buying leads bothered you.',
-  'FOUNDER_STORY_DRAFT: replace this paragraph with what you want Revvin to be for the owner reading this.',
-]
+/** Team introduction copy; the existing approval gate remains disabled. */
+const TEAM_STORY = "Revvin is built by operators who have recruited, trained and managed door-to-door and phone sales teams of 120+ reps, selling 8,000+ accounts a year for national telecom carriers across North America. The cheapest jobs those teams ever closed came from happy customers. Revvin turns that play into software any home-service business can run without a sales team.";
 
@@ -26,11 +16,7 @@

 const Email = ({ setupCallUrl, unsubscribeUrl, postalAddress }: Props) => (
-  <RevvinShell previewText="Why I built Revvin." unsubscribeUrl={unsubscribeUrl} postalAddress={postalAddress}>
-    <Text style={heading}>Why I built Revvin</Text>
-    {FOUNDER_STORY_DRAFT.map((line) => (
-      <Text key={line} style={paragraph}>
-        {line}
-      </Text>
-    ))}
-    {setupCallUrl ? <Text style={{ margin: '0 0 20px' }}>{ctaButton(setupCallUrl, 'Book a free 30 minute call')}</Text> : null}
-    <Text style={paragraph}>Karm</Text>
+  <RevvinShell previewText="Built by the Revvin team." unsubscribeUrl={unsubscribeUrl} postalAddress={postalAddress}>
+    <Text style={heading}>Built by the Revvin team</Text>
+    <Text style={paragraph}>{TEAM_STORY}</Text>
+    {setupCallUrl ? <Text style={{ margin: '0 0 20px' }}>{ctaButton(setupCallUrl, 'Book a free 30-minute setup call')}</Text> : null}
+    <Text style={paragraph}>The Revvin team</Text>
   </RevvinShell>
@@ -40,4 +26,4 @@

   component: Email,
-  subject: 'Why I built Revvin',
-  displayName: 'Free, day 14 (founder story, draft)',
+  subject: 'Built by the Revvin team',
+  displayName: 'Free, day 14 (team introduction)',
   previewData: {
@@ -45,3 +31,3 @@

     unsubscribeUrl: 'https://revvin.co/unsubscribe?token=sample',
-    postalAddress: 'Revvin, 123 Example St, Vancouver BC, Canada',
+    postalAddress: 'Revvin, 123 Example St, Dallas, TX (example only)',
   },
```

### supabase/functions/_shared/transactional-email-templates/free-d21.tsx

```diff
--- before/supabase/functions/_shared/transactional-email-templates/free-d21.tsx

+++ after/supabase/functions/_shared/transactional-email-templates/free-d21.tsx

@@ -21,3 +21,3 @@

     <Text style={paragraph}>
-      Hi, it's Karm. If getting {businessName || 'your page'} in front of customers keeps sliding down the list, we can do
+      Hi, it's the Revvin team. If getting {businessName || 'your page'} in front of customers keeps sliding down the list, we can do
       the setup with you.
@@ -26,3 +26,3 @@

     {pricingUrl ? <Text style={{ margin: '0 0 20px' }}>{ctaButton(pricingUrl, 'See the Launch Package')}</Text> : null}
-    <Text style={paragraph}>Karm</Text>
+    <Text style={paragraph}>The Revvin team</Text>
   </RevvinShell>
@@ -38,3 +38,3 @@

     unsubscribeUrl: 'https://revvin.co/unsubscribe?token=sample',
-    postalAddress: 'Revvin, 123 Example St, Vancouver BC, Canada',
+    postalAddress: 'Revvin, 123 Example St, Dallas, TX (example only)',
   },
```

### supabase/functions/_shared/transactional-email-templates/free-d5.tsx

```diff
--- before/supabase/functions/_shared/transactional-email-templates/free-d5.tsx

+++ after/supabase/functions/_shared/transactional-email-templates/free-d5.tsx

@@ -21,3 +21,3 @@

     <Text style={paragraph}>
-      Hi, it's Karm. {businessName || 'Your page'} is live. The quickest first referral comes from people who already know
+      Hi, it's the Revvin team. {businessName || 'Your page'} is live. The quickest first referral comes from people who already know
       your work.
@@ -28,3 +28,3 @@

     <Text style={paragraph}>When you want to ask your whole list at once, that is what Revvin Pro is for.</Text>
-    <Text style={paragraph}>Karm</Text>
+    <Text style={paragraph}>The Revvin team</Text>
   </RevvinShell>
@@ -42,3 +42,3 @@

     unsubscribeUrl: 'https://revvin.co/unsubscribe?token=sample',
-    postalAddress: 'Revvin, 123 Example St, Vancouver BC, Canada',
+    postalAddress: 'Revvin, 123 Example St, Dallas, TX (example only)',
   },
```

### supabase/functions/_shared/transactional-email-templates/no-leads-d30.tsx

```diff
--- before/supabase/functions/_shared/transactional-email-templates/no-leads-d30.tsx

+++ after/supabase/functions/_shared/transactional-email-templates/no-leads-d30.tsx

@@ -12,6 +12,6 @@

 const Email = ({ businessName, setupCallUrl, unsubscribeUrl }: Props) => (
-  <RevvinShell previewText="A free 30 minute call to work out who to ask." unsubscribeUrl={unsubscribeUrl}>
+  <RevvinShell previewText="A free 30-minute setup call to work out who to ask." unsubscribeUrl={unsubscribeUrl}>
     <Text style={heading}>Your page has been live for a month</Text>
     <Text style={paragraph}>
-      Hi, it's Karm. {businessName || 'Your page'} has been live for a month and no referrals have come in yet. That is
+      Hi, it's the Revvin team. {businessName || 'Your page'} has been live for a month and no referrals have come in yet. That is
       almost always about who has seen the link, not the page itself.
@@ -19,7 +19,7 @@

     <Text style={paragraph}>
-      Grab a free 30 minute call with me. We work out who to ask, what to send them, and send the first few while we are
+      Grab a free 30-minute setup call with our team. We work out who to ask, what to send them, and send the first few while we are
       on the phone.
     </Text>
-    {setupCallUrl ? <Text style={{ margin: '0 0 20px' }}>{ctaButton(setupCallUrl, 'Book a free 30 minute call')}</Text> : null}
-    <Text style={paragraph}>Karm</Text>
+    {setupCallUrl ? <Text style={{ margin: '0 0 20px' }}>{ctaButton(setupCallUrl, 'Book a free 30-minute setup call')}</Text> : null}
+    <Text style={paragraph}>The Revvin team</Text>
   </RevvinShell>
```

### supabase/functions/_shared/transactional-email-templates/no-leads-d7.tsx

```diff
--- before/supabase/functions/_shared/transactional-email-templates/no-leads-d7.tsx

+++ after/supabase/functions/_shared/transactional-email-templates/no-leads-d7.tsx

@@ -12,6 +12,6 @@

 const Email = ({ businessName, setupCallUrl, unsubscribeUrl }: Props) => (
-  <RevvinShell previewText="A free 30 minute call to get your first referral in." unsubscribeUrl={unsubscribeUrl}>
-    <Text style={heading}>Want me to set this up with you?</Text>
+  <RevvinShell previewText="A free 30-minute setup call to get your first referral in." unsubscribeUrl={unsubscribeUrl}>
+    <Text style={heading}>Want us to set this up with you?</Text>
     <Text style={paragraph}>
-      {businessName ? `Hi, it's Karm at Revvin. ${businessName} has been live for a week` : 'Hi, it is Karm at Revvin. Your page has been live for a week'}{' '}
+      {businessName ? `Hi, it's the Revvin team. ${businessName} has been live for a week` : 'Hi, it is the Revvin team. Your page has been live for a week'}{' '}
       and no referrals have come in yet. That is almost always because the link has not gone out to enough past customers.
@@ -19,7 +19,7 @@

     <Text style={paragraph}>
-      I will do it with you on a free 30 minute call. We pick the customers, write the message, and send it while we are on
+      We will do it with you on a free 30-minute setup call. We pick the customers, write the message, and send it while we are on
       the phone.
     </Text>
-    {setupCallUrl ? <Text style={{ margin: '0 0 20px' }}>{ctaButton(setupCallUrl, 'Book a free 30 minute call')}</Text> : null}
-    <Text style={paragraph}>Reply to this email if you get stuck. It comes straight to me. Karm</Text>
+    {setupCallUrl ? <Text style={{ margin: '0 0 20px' }}>{ctaButton(setupCallUrl, 'Book a free 30-minute setup call')}</Text> : null}
+    <Text style={paragraph}>Reply to this email if you get stuck. It comes straight to our team. The Revvin team</Text>
   </RevvinShell>
@@ -29,3 +29,3 @@

   component: Email,
-  subject: 'Want me to set this up with you?',
+  subject: 'Want us to set this up with you?',
   displayName: 'No leads after 7 days',
```

### supabase/functions/_shared/transactional-email-templates/no-share-d3.tsx

```diff
--- before/supabase/functions/_shared/transactional-email-templates/no-share-d3.tsx

+++ after/supabase/functions/_shared/transactional-email-templates/no-share-d3.tsx

@@ -22,3 +22,3 @@

     {dashboardUrl ? <Text style={{ margin: '0 0 20px' }}>{ctaButton(dashboardUrl, 'Open my dashboard')}</Text> : null}
-    <Text style={paragraph}>Reply to this email if you get stuck. It comes straight to me. Karm</Text>
+    <Text style={paragraph}>Reply to this email if you get stuck. It comes straight to our team. The Revvin team</Text>
   </RevvinShell>
```

### supabase/functions/_shared/transactional-email-templates/not-published-d1.tsx

```diff
--- before/supabase/functions/_shared/transactional-email-templates/not-published-d1.tsx

+++ after/supabase/functions/_shared/transactional-email-templates/not-published-d1.tsx

@@ -19,3 +19,3 @@

     <Text style={paragraph}>
-      {businessName ? `Hi, it's Karm at Revvin. Your page for ${businessName} is almost ready.` : 'Hi, it is Karm at Revvin. Your page is almost ready.'}{' '}
+      {businessName ? `Hi, it's the Revvin team. Your page for ${businessName} is almost ready.` : 'Hi, it is the Revvin team. Your page is almost ready.'}{' '}
       The only thing left is the reward you will pay when a referred job closes.
@@ -27,4 +27,4 @@

     {rewardUrl ? <Text style={{ margin: '0 0 20px' }}>{ctaButton(rewardUrl, 'Finish my page')}</Text> : null}
-    <Text style={paragraph}>Reply to this email if you get stuck. It comes straight to me.</Text>
-    <Text style={paragraph}>Karm</Text>
+    <Text style={paragraph}>Reply to this email if you get stuck. It comes straight to our team.</Text>
+    <Text style={paragraph}>The Revvin team</Text>
   </RevvinShell>
@@ -36,3 +36,3 @@

     <Text style={paragraph}>
-      {businessName ? `Hi, it's Karm at Revvin. Your page for ${businessName} is set up` : 'Hi, it is Karm at Revvin. Your page is set up'}{' '}
+      {businessName ? `Hi, it's the Revvin team. Your page for ${businessName} is set up` : 'Hi, it is the Revvin team. Your page is set up'}{' '}
       but still in draft, so nobody can send you a referral yet.
@@ -42,4 +42,4 @@

     {publicUrl ? <Text style={linkBox}>{publicUrl}</Text> : null}
-    <Text style={paragraph}>Reply to this email if you get stuck. It comes straight to me.</Text>
-    <Text style={paragraph}>Karm</Text>
+    <Text style={paragraph}>Reply to this email if you get stuck. It comes straight to our team.</Text>
+    <Text style={paragraph}>The Revvin team</Text>
   </RevvinShell>
```

### supabase/functions/_shared/transactional-email-templates/not-published-d3.tsx

```diff
--- before/supabase/functions/_shared/transactional-email-templates/not-published-d3.tsx

+++ after/supabase/functions/_shared/transactional-email-templates/not-published-d3.tsx

@@ -13,7 +13,7 @@

 const Email = ({ businessName, publishUrl, setupCallUrl, unsubscribeUrl }: Props) => (
-  <RevvinShell previewText="Reply with your logo and reward and I will set the page up." unsubscribeUrl={unsubscribeUrl}>
-    <Text style={heading}>Want me to set it up for you?</Text>
+  <RevvinShell previewText="Reply with your logo and reward and we will set the page up." unsubscribeUrl={unsubscribeUrl}>
+    <Text style={heading}>Want us to set it up for you?</Text>
     <Text style={paragraph}>
-      Hi, it's Karm. Your Revvin page for {businessName || 'your business'} is still in draft. If it is easier, reply with
-      your logo and the reward you want to offer and I will set the page up for you. Or grab a free 30 minute call and we
+      Hi, it's the Revvin team. Your Revvin page for {businessName || 'your business'} is still in draft. If it is easier, reply with
+      your logo and the reward you want to offer and we will set the page up for you. Or grab a free 30-minute setup call and we
       will do it together.
@@ -21,4 +21,4 @@

     {publishUrl ? <Text style={{ margin: '0 0 12px' }}>{ctaButton(publishUrl, 'Publish my page')}</Text> : null}
-    {setupCallUrl ? <Text style={{ margin: '0 0 20px' }}>{ctaButton(setupCallUrl, 'Book a free 30 minute call')}</Text> : null}
-    <Text style={paragraph}>Karm</Text>
+    {setupCallUrl ? <Text style={{ margin: '0 0 20px' }}>{ctaButton(setupCallUrl, 'Book a free 30-minute setup call')}</Text> : null}
+    <Text style={paragraph}>The Revvin team</Text>
   </RevvinShell>
@@ -28,3 +28,3 @@

   component: Email,
-  subject: 'Want me to set it up for you?',
+  subject: 'Want us to set it up for you?',
   displayName: 'Not published after 3 days',
```

### supabase/functions/_shared/transactional-email-templates/partner-application-received.tsx

```diff
--- before/supabase/functions/_shared/transactional-email-templates/partner-application-received.tsx

+++ after/supabase/functions/_shared/transactional-email-templates/partner-application-received.tsx

@@ -21,4 +21,4 @@

     </Text>
-    <Text style={partnerParagraph}>Reply with any questions. It comes straight to me.</Text>
-    <Text style={partnerParagraph}>Karm</Text>
+    <Text style={partnerParagraph}>Reply with any questions. It comes straight to our team.</Text>
+    <Text style={partnerParagraph}>The Revvin team</Text>
   </PartnerShell>
```

### supabase/functions/_shared/transactional-email-templates/partner-approved.tsx

```diff
--- before/supabase/functions/_shared/transactional-email-templates/partner-approved.tsx

+++ after/supabase/functions/_shared/transactional-email-templates/partner-approved.tsx

@@ -53,4 +53,4 @@

     </Text>
-    <Text style={partnerParagraph}>Reply with any questions. It comes straight to me.</Text>
-    <Text style={partnerParagraph}>Karm</Text>
+    <Text style={partnerParagraph}>Reply with any questions. It comes straight to our team.</Text>
+    <Text style={partnerParagraph}>The Revvin team</Text>
   </PartnerShell>
```

### supabase/functions/_shared/transactional-email-templates/partner-payout-sent.tsx

```diff
--- before/supabase/functions/_shared/transactional-email-templates/partner-payout-sent.tsx

+++ after/supabase/functions/_shared/transactional-email-templates/partner-payout-sent.tsx

@@ -29,5 +29,5 @@

     <Text style={partnerParagraph}>
-      If anything looks wrong, reply and I will check it with you. It comes straight to me.
+      If anything looks wrong, reply and we will check it with you. It comes straight to our team.
     </Text>
-    <Text style={partnerParagraph}>Karm</Text>
+    <Text style={partnerParagraph}>The Revvin team</Text>
   </PartnerShell>
```

### supabase/functions/_shared/transactional-email-templates/pro-no-ask-d7.tsx

```diff
--- before/supabase/functions/_shared/transactional-email-templates/pro-no-ask-d7.tsx

+++ after/supabase/functions/_shared/transactional-email-templates/pro-no-ask-d7.tsx

@@ -16,4 +16,4 @@

     <Text style={paragraph}>
-      Hi, it's Karm. {businessName || 'Your account'} has customers imported but no ask has gone out yet. This is the
-      message I would send.
+      Hi, it's the Revvin team. {businessName || 'Your account'} has customers imported but no ask has gone out yet. This is the
+      message we would send.
     </Text>
@@ -25,3 +25,3 @@

     {customersUrl ? <Text style={{ margin: '0 0 20px' }}>{ctaButton(customersUrl, 'Send my first batch')}</Text> : null}
-    <Text style={paragraph}>Karm</Text>
+    <Text style={paragraph}>The Revvin team</Text>
   </RevvinShell>
```

### supabase/functions/_shared/transactional-email-templates/pro-no-import-d2.tsx

```diff
--- before/supabase/functions/_shared/transactional-email-templates/pro-no-import-d2.tsx

+++ after/supabase/functions/_shared/transactional-email-templates/pro-no-import-d2.tsx

@@ -15,3 +15,3 @@

     <Text style={paragraph}>
-      Hi, it's Karm. {businessName || 'Your account'} is on Pro but there are no customers in the list yet, and the list is
+      Hi, it's the Revvin team. {businessName || 'Your account'} is on Pro but there are no customers in the list yet, and the list is
       where the referrals come from.
@@ -20,6 +20,6 @@

       Any spreadsheet with a name and an email works. You can also paste names straight from your phone contacts. If it is
-      quicker, reply to this email with the file and I will import it for you.
+      quicker, reply to this email with the file and we will import it for you.
     </Text>
     {customersUrl ? <Text style={{ margin: '0 0 20px' }}>{ctaButton(customersUrl, 'Import my customers')}</Text> : null}
-    <Text style={paragraph}>Karm</Text>
+    <Text style={paragraph}>The Revvin team</Text>
   </RevvinShell>
```

### supabase/functions/_shared/transactional-email-templates/pro-welcome.tsx

```diff
--- before/supabase/functions/_shared/transactional-email-templates/pro-welcome.tsx

+++ after/supabase/functions/_shared/transactional-email-templates/pro-welcome.tsx

@@ -18,3 +18,3 @@

     <Text style={paragraph}>
-      Hi, it's Karm. Thanks for going Pro{businessName ? ` with ${businessName}` : ''}. Three steps and your past
+      Hi, it's the Revvin team. Thanks for going Pro{businessName ? ` with ${businessName}` : ''}. Three steps and your past
       customers are working for you.
@@ -28,4 +28,4 @@

     </Text>
-    <Text style={paragraph}>Reply to this email if you get stuck. It comes straight to me.</Text>
-    <Text style={paragraph}>Karm</Text>
+    <Text style={paragraph}>Reply to this email if you get stuck. It comes straight to our team.</Text>
+    <Text style={paragraph}>The Revvin team</Text>
   </RevvinShell>
```

### supabase/functions/_shared/transactional-email-templates/welcome.tsx

```diff
--- before/supabase/functions/_shared/transactional-email-templates/welcome.tsx

+++ after/supabase/functions/_shared/transactional-email-templates/welcome.tsx

@@ -31,3 +31,3 @@

     </Text>
-    <Text style={paragraph}>Reply to this email if you get stuck. It comes straight to me. Karm</Text>
+    <Text style={paragraph}>Reply to this email if you get stuck. It comes straight to our team. The Revvin team</Text>
   </RevvinShell>
```

### supabase/functions/_shared/transactional-email-templates/winback-d30.tsx

```diff
--- before/supabase/functions/_shared/transactional-email-templates/winback-d30.tsx

+++ after/supabase/functions/_shared/transactional-email-templates/winback-d30.tsx

@@ -22,3 +22,3 @@

     <Text style={paragraph}>
-      Hi, it's Karm. Just so you know, the referral page for {businessName || 'your business'} is still live and still
+      Hi, it's the Revvin team. Just so you know, the referral page for {businessName || 'your business'} is still live and still
       free, and your leads and your customer list are all still there.
@@ -28,3 +28,3 @@

     {pricingUrl ? <Text style={{ margin: '0 0 20px' }}>{ctaButton(pricingUrl, 'See Revvin Pro')}</Text> : null}
-    <Text style={paragraph}>Karm</Text>
+    <Text style={paragraph}>The Revvin team</Text>
   </RevvinShell>
@@ -41,3 +41,3 @@

     unsubscribeUrl: 'https://revvin.co/unsubscribe?token=sample',
-    postalAddress: 'Revvin, 123 Example St, Vancouver BC, Canada',
+    postalAddress: 'Revvin, 123 Example St, Dallas, TX (example only)',
   },
```

### supabase/functions/mcp/index.ts

```diff
--- before/supabase/functions/mcp/index.ts

+++ after/supabase/functions/mcp/index.ts

@@ -5,3 +5,3 @@

 // src/lib/mcp/index.ts
-import { defineMcp, auth } from "npm:@lovable.dev/mcp-js@0.20.0";
+import { defineMcp, auth } from "npm:@lovable.dev/mcp-js@0.20.1";
 
@@ -9,3 +9,3 @@

 import { createClient } from "npm:@supabase/supabase-js@^2.97.0";
-import { defineTool } from "npm:@lovable.dev/mcp-js@0.20.0";
+import { defineTool } from "npm:@lovable.dev/mcp-js@0.20.1";
 import { z } from "npm:zod@^3.25.76";
@@ -64,3 +64,3 @@

 import { createClient as createClient2 } from "npm:@supabase/supabase-js@^2.97.0";
-import { defineTool as defineTool2 } from "npm:@lovable.dev/mcp-js@0.20.0";
+import { defineTool as defineTool2 } from "npm:@lovable.dev/mcp-js@0.20.1";
 import { z as z2 } from "npm:zod@^3.25.76";
@@ -98,3 +98,3 @@

 import { createClient as createClient3 } from "npm:@supabase/supabase-js@^2.97.0";
-import { defineTool as defineTool3 } from "npm:@lovable.dev/mcp-js@0.20.0";
+import { defineTool as defineTool3 } from "npm:@lovable.dev/mcp-js@0.20.1";
 function sb3() {
@@ -139,3 +139,3 @@

 // lovable-mcp-supabase-entry.ts
-import { createSupabaseHandler } from "npm:@lovable.dev/mcp-js@0.20.0/stacks/supabase";
+import { createSupabaseHandler } from "npm:@lovable.dev/mcp-js@0.20.1/stacks/supabase";
 Deno.serve(createSupabaseHandler(mcp_default, { functionName: "mcp" }));
```

### supabase/functions/partner-admin/index.ts

```diff
--- before/supabase/functions/partner-admin/index.ts

+++ after/supabase/functions/partner-admin/index.ts

@@ -1,2 +1,2 @@

-// Admin only: everything Karm needs to run the partner program.
+// Admin only: everything the team needs to run the partner program.
 //
```

### roadmap.md

Marked branding implementation, guard tests, email redeployment and changelog complete; retained production-artifact/Lighthouse verification as blocked by unavailable automatic build output.

### Project preference memory

Replaced the earlier personal-founder preference with the user-approved team identity, North American copy, sender/sign-off and setup-call wording. No pricing, billing or entitlement preference was changed.
