

# Hero Text Update + Remove Emdashes

## 1. Hero Headline (Index.tsx lines 91-95)

Replace:
```
Businesses pay for closed deals.
You earn for introductions.
```

With:
```
Turn your customers into your best salespeople.
They already love what you do. Now they get paid to tell people about it.
```

The second line stays in `text-accent`. The subtext below remains as-is (but with emdash removed per below).

## 2. Remove All Emdashes in Index.tsx

Every `—` replaced with `. ` or restructured naturally:

| Line | Current | Replacement |
|------|---------|-------------|
| 30 | `Submit in 5 minutes — Revvin handles the rest.` | `Submit in 5 minutes. Revvin handles the rest.` |
| 31 | `$500–$1,500` | `$500-$1,500` (en-dash to hyphen) |
| 81 | `Revvin — Pay-Per-Close` | `Revvin - Pay-Per-Close` |
| 97 | `acquisition — powered by` | `acquisition. Powered by` |
| 117 | `{/* Hero Visual — sample */}` | `{/* Hero Visual - sample */}` |
| 135 | `Marketplace — Canada` | `Marketplace. Canada` |
| 209 | `First submission wins — timestamped.` | `First submission wins. Timestamped.` |
| 210 | `Deal closes → Revvin verifies → payout processed.` | Keep arrows (not emdashes) |
| 245 | `scenarios — not user testimonials` | `scenarios, not user testimonials` |
| 328 | `High — spend before results` | `High. Spend before results` |
| 329 | `Low — cold audiences` | `Low. Cold audiences` |
| 330 | `Uncertain — rising CPMs` | `Uncertain. Rising CPMs` |
| 358 | `Zero — no deal, no cost` | `Zero. No deal, no cost` |
| 359 | `High — warm introductions` | `High. Warm introductions` |
| 501 | `someone who knows the right people — Revvin` | `someone who knows the right people, Revvin` |

Also update the SEO `description` on line 81 to remove its emdash.

## 3. Other Files with Emdashes (styling-only scope)

These are outside the landing page and inside functional components (ReferralWizard, InviteBusinessModal, CreateOffer, LeaderboardPreview). Per the plan scope, I'll also clean emdashes in those files since it's a copy change only, no logic impact:

- `LeaderboardPreview.tsx` line 23: `leaderboard — coming soon` → `leaderboard. Coming soon`
- `ReferralWizard.tsx` line 123 (comment), line 245: `Verified Business — payout` → `Verified Business. Payout`
- `InviteBusinessModal.tsx` line 53: `referred anyway — pay` → `referred anyway. Pay`
- `CreateOffer.tsx` line 302: `"—"` placeholder in currency display → keep as-is (this is a UI placeholder dash, not an emdash in prose)

## Files Changed

| File | Change |
|------|--------|
| `src/pages/Index.tsx` | New hero text + remove all emdashes |
| `src/components/LeaderboardPreview.tsx` | Remove emdash |
| `src/components/ReferralWizard.tsx` | Remove emdashes |
| `src/components/InviteBusinessModal.tsx` | Remove emdash |

