# Organic Search Follow-Up

Date: 2026-05-19
Task: T06
Status: completed with Google Search Console export from 2026-05-19

## Scope

This follow-up checks what can be verified after the router and canonical stabilization work without repeating the completed full router audit.

Initial public checks were done before the export was provided. The follow-up analysis used the user's Google Search Console CSV export from:

`C:\Users\offic\Downloads\daily-life-hacks.com-Performance-on-Search-2026-05-19\`

It also used two Bing Webmaster Tools exports:

- `C:\Users\offic\Downloads\daily-life-hacks.com_SearchPerformanceOverview_All_5_19_2026.csv`
- `C:\Users\offic\Downloads\daily-life-hacks.com_AIPerformanceOverviewStats_5_19_2026.csv`
- `C:\Users\offic\Downloads\daily-life-hacks.com_AIPageStatsReport_5_19_2026.csv`

## Local And Public Checks Completed

- Read `AGENTS.md`, `docs/WORKLOG-CODEX.md`, and `docs/CODEX-TASKBOARD.md`.
- Claimed T06 in `docs/CODEX-TASKBOARD.md`.
- Checked local SEO tooling:
  - `seo/fetch_gsc.py` exists and exports 90-day query, page, and query-page CSVs to `seo/data/`.
  - `scripts/NEW_PIPELINE_2026-05-08/discover_gsc.py` exists for topic discovery from GSC.
  - `.github/workflows/pipeline-discover.yml` skips GSC discovery when `GSC_SERVICE_ACCOUNT_JSON` is missing.
  - No Bing Webmaster Tools integration or export was found.
- Checked live `robots.txt`:
  - Allows normal crawling.
  - Points to `https://www.daily-life-hacks.com/sitemap-index.xml`.
- Checked live sitemap:
  - `sitemap-index.xml` points to `sitemap-0.xml`.
  - `sitemap-0.xml` contains 145 URLs.
  - All 140 local article Markdown files in `src/data/articles/*.md` are present in the live sitemap.
  - The 4 non-article sitemap entries are `about`, `nutrition`, `recipes`, and `tips`.
- Spot-checked live canonical and robots behavior:
  - Two canonical article URLs returned HTTP 200, self-canonical links, and indexable meta robots.
  - Category pages `nutrition`, `recipes`, and `tips` returned HTTP 200, self-canonical links, and indexable meta robots.
  - A tag page returned `noindex, follow`, which matches the current sitemap exclusion strategy.

## GSC Export Summary

`Filters.csv` says the date filter is "Last 3 months", but `Chart.csv` contains only 18 daily rows:

- Date range in export: 2026-04-29 through 2026-05-16.
- Clicks: 4.
- Impressions: 1,980.
- CTR: 0.20%.
- Impression-weighted average position: 23.0.

Device split:

- Desktop: 2 clicks, 1,577 impressions, 0.13% CTR, position 25.61.
- Mobile: 2 clicks, 400 impressions, 0.5% CTR, position 12.67.
- Tablet: 0 clicks, 3 impressions, 0% CTR, position 10.67.

Search appearance:

- Recipe gallery: 0 clicks, 6 impressions, position 11.67.
- Recipe rich results: 0 clicks, 1 impression, position 10.

## Bing Export Summary

Bing Search Performance overview:

- Date range in export: 2026-05-03 through 2026-05-16.
- Clicks: 2.
- Impressions: 37.
- CTR: 5.41%.
- Days with impressions: 12 of 14.
- Best day by impressions: 2026-05-07, with 2 clicks and 6 impressions.

Bing AI Performance overview:

- Date range in export: 2026-05-04 through 2026-05-16.
- Citations: 18.
- Sum of daily cited pages: 9.
- Days with citations: 7 of 13.
- Strongest citation days:
  - 2026-05-10: 4 citations, 1 cited page.
  - 2026-05-13: 4 citations, 1 cited page.
  - 2026-05-07: 3 citations, 2 cited pages.
  - 2026-05-14: 3 citations, 2 cited pages.

Bing AI cited page report:

| Page | Citations | Current status |
|---|---:|---|
| `/prune-juice-alternatives-for-constipation/` | 8 | 200, indexable, self-canonical |
| `/high-fiber-pasta-alternatives/` | 2 | 200, indexable, self-canonical |
| `/amaranth-millet-teff-beginner-cooking-guide` | 2 | 200, indexable, canonical adds trailing slash |
| `/high-fiber-raspberry-jam-recipe-chia/` | 2 | 200, indexable, self-canonical |
| `/how-to-keep-bread-fresh-longer-without-mold/` | 1 | 200, indexable, self-canonical |
| `/split-pea-soup-recipe-high-fiber/` | 1 | 200, indexable, self-canonical |
| `/rotisserie-chicken-nutrition-facts-sodium-content/` | 1 | 200, `noindex, follow`, canonical alias to `/costco-rotisserie-chicken-meal-ideas-dinner/` |
| `/how-to-revive-wilted-lettuce-and-greens/` | 1 | 200, indexable, self-canonical |

## Findings

### F1: It is still early to judge recovery

The router/canonical stabilization happened on 2026-05-18, but the export ends on 2026-05-16. That means this export is useful as a pre-fix baseline, not a post-fix recovery measurement.

Practical follow-up windows:

- First post-fix sanity check: around 2026-05-25.
- More meaningful trend check: around 2026-06-01 to 2026-06-15.

### F2: Public crawlability is mostly healthy, but GSC exposes active 404 opportunities

The live `robots.txt`, sitemap index, sitemap URL count, article sitemap coverage, and sampled canonical/meta robots behavior do not show a broad current indexing blocker.

However, GSC has impressions for several URLs that are currently 404s. These are the highest-priority technical opportunities because Google is already testing them:

| URL | Impressions | Position | Current status |
|---|---:|---:|---|
| `/prebiotic-foods-beyond-the-buzzwords/` | 106 | 10.77 | 404 |
| `/selenium-containing-foods-easy-ways/` | 91 | 54.41 | 404 |
| `/protein-per-serving-beans-chicken-tofu-compared/` | 24 | 20.75 | 404 |
| `/how-to-quick-soak-dried-beans-same-day/` | 18 | 77.5 | 404 |
| `/how-to-preheat-skillet-even-browning/` | 15 | 16.47 | 404 |
| `/keep-berries-fresh-longer-when-to-wash/` | 14 | 23.93 | 404 |
| `/savory-chia-seed-recipes-breakfast/` | 9 | 41.22 | 404 |
| `/how-to-pack-lunch-crisp-sandwiches-salads/` | 6 | 37.83 | 404 |

Two non-local URLs are already handled by canonical routing:

- `/sourdough-discard-nutrition-facts-health-benefits/` returns 200 and canonicalizes to `/easy-sourdough-discard-recipes-beginners/`.
- `/rotisserie-chicken-nutrition-facts-sodium-content/` returns 200 and canonicalizes to `/costco-rotisserie-chicken-meal-ideas-dinner/`.

### F3: Strongest near-term SEO wins are pages in positions 6-15 with low CTR

The following pages already have impressions and rank close enough to earn clicks, but CTR is weak:

| Page | Clicks | Impressions | CTR | Position |
|---|---:|---:|---:|---:|
| `/high-fiber-fast-food-options-guide/` | 0 | 320 | 0% | 14.63 |
| `/how-to-store-homemade-salad-dressing-safely/` | 1 | 163 | 0.61% | 12.32 |
| `/how-to-double-recipe-seasoning-without-guessing/` | 0 | 141 | 0% | 6.86 |
| `/prebiotic-foods-beyond-the-buzzwords/` | 0 | 106 | 0% | 10.77, but currently 404 |
| `/good-source-of-fiber-label-meaning/` | 0 | 79 | 0% | 7.39 |
| `/comparing-fiber-content-different-pizza-crusts/` | 0 | 57 | 0% | 7.77 |
| `/best-low-cost-protein-sources-large-families/` | 1 | 51 | 1.96% | 7.47 |
| `/gut-health-tea-peppermint-ginger/` | 0 | 48 | 0% | 9.77 |
| `/sourdough-discard-nutrition-facts-health-benefits/` | 0 | 41 | 0% | 8.85, canonical alias |
| `/rotisserie-chicken-nutrition-facts-sodium-content/` | 0 | 37 | 0% | 12.11, canonical alias |
| `/popcorn-vs-potato-chips-fiber-comparison/` | 0 | 32 | 0% | 9.09 |

### F4: Query clusters show a clear first content focus

Manual query grouping from `Queries.csv`:

| Cluster | Queries | Clicks | Impressions | CTR | Weighted position |
|---|---:|---:|---:|---:|---:|
| fiber | 89 | 2 | 239 | 0.84% | 37.8 |
| fast food | 30 | 1 | 112 | 0.89% | 17.9 |
| selenium | 37 | 0 | 56 | 0% | 79.1 |
| smoke point | 39 | 0 | 54 | 0% | 76.6 |
| sourdough discard | 3 | 0 | 11 | 0% | 9.5 |
| prebiotic | 7 | 0 | 9 | 0% | 32.2 |
| pizza crust | 3 | 0 | 6 | 0% | 12.7 |

The first useful cluster is high-fiber fast food because it has the strongest page-level impressions and several related queries in striking distance:

- `best high fiber fast food`: 10 impressions, position 10.6.
- `high fiber fast food options`: 8 impressions, position 10.5.
- `best fiber fast food`: 9 impressions, position 11.56.
- `fiber fast food`: 7 impressions, position 12.71.
- `best fast food for fiber`: 7 impressions, position 11.14.

### F5: Slash and no-slash URLs are both returning 200

GSC shows both:

- `https://www.daily-life-hacks.com/high-fiber-fast-food-options-guide/`
- `https://www.daily-life-hacks.com/high-fiber-fast-food-options-guide`

Both return 200 today. The no-slash version canonicalizes to the slash version, which is acceptable, but a 301 redirect from no-slash to slash would reduce duplicate URL signals and better match Astro's `trailingSlash: 'always'` intent.

### F6: Bing search volume is tiny, but AI citations are already appearing

The Bing Search Performance export is too small for page-level prioritization by itself: 37 impressions and 2 clicks across 14 days.

The more interesting signal is Bing AI Performance: 18 citations across 13 days. The page-level export shows that Bing AI is already citing mostly valid, indexable article pages. This supports keeping AEO work active: structured data, clear answer blocks, strong headings, and direct factual summaries are relevant.

The leading cited page is `/prune-juice-alternatives-for-constipation/`, with 8 of 18 citations. That page is the first AEO page to preserve and potentially improve, not rewrite casually.

One citation points at a noindexed alias URL: `/rotisserie-chicken-nutrition-facts-sodium-content/`. This is probably residual URL discovery from older routing or pins. It is not urgent, but it is worth watching to see whether future Bing AI exports cite the canonical page instead.

No local Bing Webmaster Tools API script or recurring workflow was found. Bing can still be reviewed manually through exports, but it is not wired into the repo the way GSC partially is.

## Prioritized Next Fixes

### P0: Fix or intentionally redirect active 404s

Start with the 404 URLs that have impressions:

- Recover/publish the article if the topic is still useful and compliant.
- Otherwise add a deliberate alias to the closest canonical article.
- Do not leave impression-bearing 404s as accidental dead ends.

Priority order:

1. `/prebiotic-foods-beyond-the-buzzwords/`
2. `/selenium-containing-foods-easy-ways/`
3. `/protein-per-serving-beans-chicken-tofu-compared/`
4. `/how-to-preheat-skillet-even-browning/`
5. `/keep-berries-fresh-longer-when-to-wash/`

### P1: Normalize no-slash article URLs

Add a 301 redirect from no-slash canonical article paths to trailing-slash paths if approved.

This is lower priority than the impression-bearing 404s because canonical tags already point to the slash version, but it would reduce duplicate URL reporting noise in GSC.

### P2: Improve CTR on close-ranking pages

After fixing 404s, work on titles/excerpts and intro structure for:

- `/how-to-double-recipe-seasoning-without-guessing/`
- `/good-source-of-fiber-label-meaning/`
- `/comparing-fiber-content-different-pizza-crusts/`
- `/gut-health-tea-peppermint-ginger/`
- `/high-fiber-fast-food-options-guide/`

Focus on aligning titles and first-screen copy to the exact query intent. Avoid mass edits across the whole site until the next export confirms movement.

### P3: Re-export after the stabilization window

Run the same GSC export again after 2026-06-01. Compare:

- 404 URLs: impressions should fall after redirect/recovery.
- Canonical alias URLs: impressions should consolidate into canonical article URLs.
- High-fiber fast food and close-ranking pages: CTR and average position should improve after targeted changes.

Also re-export Bing Search Performance and Bing AI Performance. If the Bing UI can export AI cited page URLs, include that next time; it would identify which pages are already being cited by AI search.

### P4: Preserve and strengthen current AI-cited pages

Do not make broad, stylistic rewrites to pages already cited by Bing AI. Start with light AEO improvements only:

- Add or improve concise answer blocks where the article naturally supports them.
- Keep headings literal and question-answer friendly.
- Preserve canonical URLs and indexability.
- Watch `/prune-juice-alternatives-for-constipation/` first because it currently carries 44% of observed Bing AI citations.

## Handoff

T06 is complete as an investigation. The next work should be a targeted implementation task:

- Recover or redirect the impression-bearing 404 URLs.
- Add a no-slash to trailing-slash redirect if approved.
- Then optimize CTR for the close-ranking pages.

Do not repeat the completed router audit unless a new failing URL, GSC indexing error, or Bing crawl issue is provided.
