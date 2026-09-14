# Traffic recovery release, September 14, 2026

This is a release record, not evidence that traffic has recovered. Publication and live checks are recorded separately.

## Evidence used

- Started from current remote main `b0bcfa2` in a separate worktree. The original working checkout was at August 12 and contains unrelated local changes, which were preserved.
- Audited all 191 URLs in the live sitemap. All returned HTTP 200, self-canonical URLs, no noindex directive, and one H1. Every sitemap URL had an inbound link from another sitemap page. This does not prove Google indexed those URLs or that historical Search Console exclusions are resolved.
- The supplied Google export covers June 11 through September 10: 1,242 impressions and 9 property-level clicks. Clarity's August 15–September 13 export shows 118 sessions. The internal legacy page-view counter is not comparable to either metric.
- Google page evidence: discard recipes 7 clicks/129 impressions; bran muffins 1/77; rotisserie chicken 1/33; protein per serving 0/85. Pizza and discard conversion were not listed in that Pages export, so their baseline is unavailable, not an asserted zero.
- Pinterest workflow run `34797599339` succeeded. The reporting bug was mixed snapshots: the endpoint summed 104 cache timestamps, showing 8,847 impressions/124 outbound clicks. The latest snapshot at September 14 02:00 UTC held 70 top pins, 2,226 impressions/32 outbound clicks, including 29 clicks to this site. These are the selected top pins over a 90-day window, not total account traffic or verified site sessions.

## Changes

| Area | Concrete change |
|---|---|
| All 80 declared recipe pages | Direct jump to the real ingredient/instruction card; automatic newsletter overlay suppressed while following recipes |
| Discard recipe collection | Measured flatbread and attributed cracker instructions, realistic separate timings, clearer pancake yield, storage and troubleshooting |
| Discard pizza | Added missing water, explicit 100% hydration basis, measured flour, oven-preheat allowance, corrected crust-only calorie estimate |
| Discard conversion | Embedded cups/grams and flour/water calculator, scaling examples, recipe connections; removed only this upgraded URL from the prune set |
| Bran muffins | Whole wheat is the default ingredient, clearer batch size and smaller-muffin estimates, practical substitutions and texture fixes |
| Rotisserie chicken dinners | Measured alternatives for four, explicit chicken requirements, rice state, refrigerator/freezer boundaries, reheating instructions |
| Protein comparison | Label-based portion calculator, worked examples, correction of unsupported coagulant-causation wording, metadata describing the tool |
| Measurement | New browser_page_view event, distinct successful-HTML server_request diagnostic; historical mixed events remain untouched and excluded from the new audience series |
| Pinterest reports | Latest snapshot only, real freshness flag, own-site click subtotal, atomic snapshot writes that fail honestly |

Browser views count visible, indexable browser executions once per navigation. They are not unique people and are not guaranteed human traffic. Known automation is excluded where identifiable; ad blockers and network failures can reduce collection. The weekly report uses a new metric key so it cannot compare the new series to legacy inflated totals. Its first full week remains N/A until observed; it is not backfilled with invented zeros.

No bulk article production, outreach, Pinterest posting, paid campaign, database migration, historical event rewrite, or manual D1 mutation was performed. Existing scheduled ingestion continues to use its existing endpoint. The save implementation now commits each snapshot atomically.

## Verification

- `npm run build:checked`: Astro build, technical SEO, routing, internal links, pin destinations, recipe audit.
- Build output: 268 article pages, 330 HTML files, 192 indexable sitemap targets after restoring the conversion page; 80 structured recipes; zero rendered article orphans.
- Regression tests cover browser navigation/visibility/source attribution, request-versus-browser separation, rejection of invalid browser events, calculator arithmetic, popup suppression, Pinterest snapshot failures and freshness.
- Actual SQLite tests execute the production browser-count and latest-snapshot queries.
- Existing routing, pruning, schema, content UI, engagement and recipe-scaler tests run alongside the new tests. An old conversion test's exact copy expectation was updated to the already-existing weekly-email wording; the product promise was not changed.
- Cloudflare Pages Functions bundle compiled locally. No remote database commands were used.
- Desktop discard calculator: 227 g -> 1 cup, 113.5 g flour, 113.5 g water. Mobile protein calculator: 25 g target, label 8 g/85 g -> 266 g food rounded, 9.4 oz. Verified no horizontal page overflow at the tested mobile size.
- Recipe edits were checked for ingredient arithmetic, internal consistency, source support and rendering. They were not cooked or tasted during this work. Calorie figures are estimates, not laboratory results. The cracker method is explicitly attributed to King Arthur Baking.

## Evaluate the intervention

Implementation is successful when the deployed commit and six pages match this release, the new browser metric is served, recipe jumps work, and the Pinterest endpoint reports one dated snapshot. These are release checks, not growth outcomes.

The business outcome is additional search clicks and attributable browser activity on the changed cohort, followed by calculator use or recipe interaction. Google/Bing clicks, Clarity sessions, browser events and Pinterest outbound clicks stay separate. AI citations and impressions alone do not count as recovered traffic.

Use matched complete 28-day search windows for the next outcome comparison and inspect the six URLs individually. The existing page export is a 92-day baseline and must not be compared as a raw total with a shorter window. A handful of extra clicks is a signal to investigate, not proof that the intervention caused growth. If impressions grow without clicks, reassess query fit and snippets; if visits arrive without useful actions, inspect the page experience. Don't expand production based only on crawler activity or citations.

## Publication

Pending the repository's CI and deployment workflow at the time this document was authored. The completion message links the verified production pages and deployment evidence.
