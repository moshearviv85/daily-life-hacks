# Bing Query Opportunity Pass, 2026-07-26

## Scope

This pass combines the July 26 Bing Webmaster exports with the live three-month
Search Performance report for April 26 through July 25, 2026. The purpose is to
separate an actual CTR problem from stale crawl data before changing titles.

## What Bing is serving now

| Page | Impressions | Clicks | Average position |
|---|---:|---:|---:|
| `/how-to-measure-sourdough-discard-grams` | 38 | 0 | 7.32 |
| `/how-to-revive-wilted-lettuce-and-greens/` | 31 | 0 | 7.90 |
| `/split-pea-soup-recipe-high-fiber/` | 9 | 0 | 6.44 |
| `/prune-juice-alternatives-for-constipation/` | 8 | 0 | 6.75 |

The page totals above come from the live Bing Search Performance page. They use a
different report and date window from Site Explorer, so they should not be added
to or substituted for Site Explorer's cumulative totals.

## Query evidence

| Query | Impressions | Clicks | Average position | Best-matching page |
|---|---:|---:|---:|---|
| `measure sourdough instead of weight in grams` | 7 | 0 | 8.57 | Sourdough discard conversion |
| `how many grams in 1 cup of sourdough discard` | 5 | 0 | 9.20 | Sourdough discard conversion |
| `how many grams is half a cup of sourdough discard` | 2 | 0 | 5.50 | Sourdough discard conversion |
| `wilted greens revive ice water` | 3 | 0 | 4.33 | Wilted lettuce rescue |
| `wilted lettuce ice water bath revive` | 2 | 0 | 10.00 | Wilted lettuce rescue |
| `wilted greens ice water bath` | 2 | 0 | 8.50 | Wilted lettuce rescue |
| `wilted greens revive with ice water` | 2 | 0 | 9.00 | Wilted lettuce rescue |
| `ice bath lettuce` | 2 | 0 | 9.50 | Wilted lettuce rescue |
| `how much fiber in a bowl pf split pea soupfiber` | 2 | 0 | 1.50 | Split pea soup |
| `prune juice alternative` | 2 | 0 | 7.00 | Prune juice alternatives |

## Why three titles were held stable

Bing's last Site Explorer crawl dates for the four pages predate their current
July copy:

- Wilted lettuce: last crawled March 1; file modified July 18.
- Sourdough discard conversion: last crawled June 5; file modified July 18.
- Split pea soup: last crawled April 5; file modified July 26 in this pass.
- Prune juice alternatives: last crawled June 22; file modified July 20.

The sourdough and wilted-lettuce titles already match the live queries closely.
Changing them again before Bing crawls the current version would mix two
experiments and make the result impossible to read. The prune-juice title may
eventually benefit from adding "for Constipation," but that decision is held
until Bing evaluates the July rewrite.

## Changes made in this pass

1. Added ten natural contextual inbound links to the ten research and economics
   URLs that entered Bing Site Explorer between the July 23 and July 26 exports.
2. Collapsed non-www Git aliases and eligible versioned pin URLs directly to
   their canonical destination, removing one redirect hop while preserving query
   strings, KV route precedence, intentional 410 behavior, and canonical targets.
3. Corrected the split-pea recipe's unsupported 8 to 10 grams per cup and
   380-calorie serving claims. The recipe now states about 6 grams per cup,
   13 grams per two-cup serving, and about 250 calories per serving, with USDA
   FoodData Central IDs and calculation assumptions recorded in the article.
4. Left the other three opportunity-page titles and excerpts unchanged.

## Measurement rule

Keep the fixed July 23 recovery cohort and these titles stable for 28 days.
Check crawl date, indexed state, impressions, clicks, average position, and the
first query that earns a click each day. A new title experiment is justified
only after Bing has crawled the current copy or a live inspection finds a
specific technical blocker.

## Sources

- `C:\Users\offic\Downloads\daily-life-hacks.com_SiteExplorerUrls_7_26_2026.csv`
- `C:\Users\offic\Downloads\daily-life-hacks.com_SearchPerformanceOverview_All_7_26_2026.csv`
- Bing Webmaster Tools, live Search Performance report, three-month view,
  inspected July 26, 2026.
- USDA FoodData Central entries recorded in
  `src/data/articles/split-pea-soup-recipe-high-fiber.md`.
