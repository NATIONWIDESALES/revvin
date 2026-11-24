# OpenAI automatic advanced matching allowed (2026-11-24)

Decision: the account owner approved OpenAI automatic advanced matching on Nov 24 2026. Ads Manager has no switch to disable it, and the fail-closed preflight meant the pixel never loaded.

Changes:
- `src/lib/openAiAds.ts`: removed the pixel-config preflight and fetch; SDK loads whenever the existing permission boundary allows. No `user` object is passed.
- `src/config/brand.ts`: `OPENAI_PIXEL_DEBUG = false`.
- `src/content/legal.ts`, `public/llms.txt`: disclose in-browser SHA-256 hashing of typed form values (email, phone on signup); raw values not sent; opt-out stops it. Meta wording unchanged.
- Tests updated; fail-closed matching tests removed.

All eligibility rules (region, refusal, Privacy opt-out, GPC/DNT, bot, demo, signed-in, excluded routes, one init, reg_<uuid> dedup, signup snapshot) are unchanged.
