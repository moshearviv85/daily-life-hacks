# P0 Live Verification - 2026-06-14

Scope: read-only verification after generating `content-indexing-audit.sqlite`.

## Canonical Redirect P0

The dominant P0 bucket is canonical URL shape, not deletion.

- `131` P0 article URLs need canonical redirect enforcement.
- `117` are bare-host/no-slash URLs from Bing (`daily-life-hacks.com/slug`).
- `14` are www/no-slash URLs from GSC (`www.daily-life-hacks.com/slug`).
- Target convention remains `https://www.daily-life-hacks.com/slug/`.

Implemented locally in `functions/[[path]].js`:

- non-www article URL without slash redirects directly to `www + trailing slash` when the slash asset exists.
- www article URL without slash redirects to the trailing-slash URL when the slash asset exists.
- missing no-slash paths do not redirect to fake canonical pages.
- static assets do not get a trailing slash.
- router variants keep serving noindex proxy pages instead of being converted to canonical redirects.

## Alias P0

These P0 alias URLs already emit the intended `noindex, follow` and self-contained canonical target behavior in both local build output and live checks:

- `https://www.daily-life-hacks.com/sourdough-discard-nutrition-facts-health-benefits/`
  - canonical: `https://www.daily-life-hacks.com/easy-sourdough-discard-recipes-beginners/`
  - robots: `noindex, follow`
- `https://www.daily-life-hacks.com/rotisserie-chicken-nutrition-facts-sodium-content/`
  - canonical: `https://www.daily-life-hacks.com/costco-rotisserie-chicken-meal-ideas-dinner/`
  - robots: `noindex, follow`

No code change is needed for these two before staging.

## Unmatched Live 200 P0

These URLs returned live `200` in the exported/live checks but do not exist in the current clean build output:

- `oatmeal-vs-grits-fiber-content-guide`
- `30-day-high-fiber-challenge-meal-plan-guide`
- `how-to-revive-wilted-salad-greens`
- `high-fiber-gluten-free-bread-recipe-v2`
- `high-fiber-smoothies-for-kids-picky-eaters-guide`

Live pages currently expose canonical links to related canonical articles, but `meta robots` is `index, follow`. Because the current branch does not build these pages and they are not in `slug-aliases.json` or `router-mapping.json`, treat them as stale/live surface to verify after staging deploy before adding manual redirects.

## Off-topic P0

These two Bing zero-byte/off-topic URLs now return live `404` after host redirect:

- `most-very-important-guidance-skill-set`
- `usual-excuses-made-by-high-conflict-parents`

No deletion is needed in this branch because no matching source article exists in the clean worktree.

## Verification Commands

- `node --test tests/canonical-routing.test.mjs`
- `py -3 -m pytest tests/cli/test_audit_content.py -q`
- `npm run build`
- `npm run verify:routing`
