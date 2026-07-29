# Google Search Console Coverage Triage

Date checked: 2026-07-29
Property: `daily-life-hacks.com`

## Source exports

- `daily-life-hacks.com-Coverage-2026-07-29.zip`
- `daily-life-hacks.com-Coverage-Validation-2026-07-29.zip`
- `daily-life-hacks.com-Coverage-Drilldown-2026-07-28.zip`
- `daily-life-hacks.com-Coverage-Validation-2026-07-28.zip`

The aggregate Coverage export ends on 2026-07-24. It predates the routing,
internal-link, hero-image, query-cluster, food-database, and IndexNow releases
deployed on 2026-07-28.

## Aggregate snapshot

| Metric | 2026-07-24 |
|---|---:|
| Indexed | 119 |
| Not indexed | 535 |
| Search impressions | 9 |

These are Google-known URL totals, not the current canonical sitemap inventory.
They include aliases, retired WordPress paths, tag URLs, pin variants, legal
pages, and other non-canonical URLs.

## Live validation of the noindex cohort

The validation export contains 187 URLs:

| Current live behavior | URLs | Interpretation |
|---|---:|---|
| Redirects to a live indexable canonical URL | 110 | Correct |
| HTTP 404 | 76 | Intentional retired/tag URLs |
| Live `noindex` page | 1 | `/dashboard/`, intentional |

The failed Search Console validation does not identify a current sitewide
noindex defect. The cohort mixes URLs that should remain excluded with old URLs
that now redirect correctly. Starting another validation for the same mixed
cohort would not be a useful acceptance test.

## Live validation of discovered URLs

All 109 URLs in the latest `Discovered - currently not indexed` drilldown are
currently:

- HTTP 200;
- self-canonical;
- indexable;
- present in the live sitemap.

Their exported `Last crawled` value is `1970-01-01`, which is Search Console's
placeholder for not yet crawled. This is a crawl/indexing backlog, not a shared
rendering, canonical, robots, or sitemap defect.

## Live validation of crawled URLs

The 44-URL `Crawled - currently not indexed` validation cohort now breaks down
as follows:

| Current live behavior | URLs |
|---|---:|
| Direct healthy index candidate | 14 |
| Redirects to a canonical sitemap URL | 15 |
| Intentional live noindex | 4 |
| Legal-page redirect to intentional noindex | 3 |
| Intentional 410 | 6 |
| Intentional 404 | 2 |

Only the 14 direct index candidates belong in a future page/query quality
review. Redirected, legal, 404, and 410 URLs should not be rewritten or restored
merely to make an old validation cohort pass.

### Direct index candidates

| URL | Last crawled | Validation |
|---|---|---|
| `/how-to-season-cast-iron-skillet-properly/` | 2026-05-10 | Pending |
| `/how-to-make-grocery-shopping-cheaper/` | 2026-05-09 | Pending |
| `/kitchen-tools-that-save-time-and-money/` | 2026-05-07 | Pending |
| `/chia-pudding-variations-for-breakfast/` | 2026-05-06 | Pending |
| `/how-to-use-leftover-rice-creative-ideas/` | 2026-05-05 | Pending |
| `/high-protein-high-fiber-meals-for-weight-loss/` | 2026-05-04 | Pending |
| `/how-to-store-fresh-herbs-to-last-longer/` | 2026-05-03 | Pending |
| `/big-flavor-less-salt-citrus-herbs-umami-swaps/` | 2026-07-05 | Failed |
| `/good-source-of-fiber-label-meaning/` | 2026-07-05 | Failed |
| `/how-to-pack-salad-for-work-not-soggy/` | 2026-07-04 | Failed |
| `/how-to-pack-cold-pasta-salad-picnics/` | 2026-06-22 | Failed |
| `/natto-japanese-fermented-soybeans-gut-health/` | 2026-06-14 | Failed |
| `/freezer-organization-tips-large-family-meals/` | 2026-05-31 | Failed |
| `/high-fiber-meals-for-constipation-relief/` | 2026-05-12 | Failed |

## Actions

1. Keep the 109 discovered URLs stable while the 2026-07-28 release is crawled.
2. Improve discovery using the existing sitemap, contextual graph, IndexNow,
   RSS, Atom, and JSON Feed surfaces.
3. Re-export the issue tables after Google processes the new sitemap state.
4. Review the 14 direct crawled-not-indexed pages against page/query evidence,
   not against the aggregate excluded count.
5. Do not request validation for a mixed cohort containing intentional noindex,
   404, and 410 URLs.

## Decision

No emergency robots, canonical, sitemap, or mass-rewrite change is justified by
these exports. The correct current status is `WAIT_FOR_RECRAWL` for the 109
healthy discovered URLs and `TARGETED_REVIEW` for the 14 direct healthy
crawled-not-indexed URLs.
