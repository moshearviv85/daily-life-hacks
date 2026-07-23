# Search Recovery Baseline, 2026-07-23

## What the evidence says

The site does not have one proven global rendering, canonical, sitemap, or Core Web
Vitals failure. The production sitemap is successful in Google Search Console and
contains 226 discovered URLs. Google reported 132 indexed URLs across all known
historical URLs, but the all-known report also contains hundreds of retired,
redirected, canonicalized, and noindexed URLs from the site's previous shape.

The immediate problem is discovery and selection:

- Google URL Inspection reported two core studies as `Discovered - currently not
  indexed`. Both were present in the sitemap, had no detected referring page, and
  had never been crawled.
- The Daily Values explainer was still unknown to Google and had no detected sitemap
  or referring page in URL Inspection, despite the live sitemap being valid.
- The last 28 days of GSC data contained 135 impressions and 1 click. The preceding
  28 days contained 96 impressions and 1 click. Visibility is growing from a very
  small base, but the sample is nowhere near large enough for dramatic click growth.
- Bing showed 155 impressions and 1 click in the last 28 days, versus 87 impressions
  and 0 clicks in the preceding 28 days.

## Live actions completed before the code change

- Requested Google indexing for:
  - `/fiber-per-dollar-cheapest-high-fiber-foods/`
  - `/fast-food-protein-per-dollar-ranked/`
  - `/fiber-protein-daily-values-explained/`
- Submitted the fixed 20-URL recovery cohort in
  `search-recovery-cohort-2026-07-23.csv` to Bing. Bing confirmed all 20 submissions.
- Confirmed Bing's second site scan was queued.

## Code changes in this recovery batch

- Return `410 Gone` for two stale URLs that were still returning 404:
  - `/reheat-pizza-crust-stays-crisp/`
  - `/nuclear-electricity-benefits-and-negatives-really/`
- Add contextual links to the Daily Values explainer from the fiber-label explainer
  and the two core per-dollar studies.
- Add a contextual link to the grocery-trip study from the established grocery
  shopping guide.
- Add routing tests so the 410 behavior cannot quietly regress.

## Local verification

- On-page audit: 210 articles scanned, 0 checklist issues, 0 missing FAQs, 0
  articles without body links, and 0 thin articles below the audit's 800-word
  threshold.
- Cluster audit: 210 articles scanned and 0 issues in the controlled clusters.
- Canonical routing test: 16 of 16 tests passed.
- Checked build: 234 pages built; 210 canonical article pages verified; 8,490
  internal anchors checked; 0 rendered article orphans; 225 pin destinations
  verified; 80 declared recipes with 0 missing Recipe schema fields.
- Visual audit: all 210 articles have hero images and all 210 hero assets exist.
  Sixteen long articles have no supporting body image. That is a reader-experience
  backlog, not evidence of a sitewide indexing block.

## Separate technical risk, not an SEO diagnosis

The dependency audit found advisories in the Astro 5 toolchain and reported that a
fully clean result requires a major-version framework upgrade. The site is a static
build and the checked production output passed, but this should be handled as a
separate migration with its own regression pass. Mixing an Astro major upgrade into
an indexing recovery release would make both changes harder to diagnose.

## Measurement rule

Keep this cohort unchanged for at least 28 days. Check it daily, but do not rewrite
or rename a URL because a one-day graph is flat. Record Google index state, Bing
index state, impressions, clicks, and the first query that earns each URL a click.
Only make a new on-page change when the page has enough impressions to diagnose a
CTR problem or a live inspection reveals a concrete technical blocker.

## What would falsify this diagnosis

The diagnosis must be revisited if the same cohort remains uncrawled after repeated
live sitemap reads and 28 days of stable internal links, or if live inspection shows
canonical, robots, rendering, or server errors. Until then, publishing and rewriting
more URLs would add noise to a crawl-and-selection problem.
