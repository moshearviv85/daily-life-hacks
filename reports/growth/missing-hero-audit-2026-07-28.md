# Missing hero audit and creative queue, 2026-07-28

## Bottom line

The current source tree contains exactly 57 articles whose frontmatter points to
a hero image that doesn't exist under `public/`. A live check on July 28 found
56 article URLs returning 200 while their hero URLs returned 404. The remaining
source URL, `/how-to-meal-plan-on-a-budget/`, returned 301 to
`/how-to-meal-prep-on-a-budget-for-one-person/`; its referenced hero also returned
404.

This lane produced briefs and tests only. It didn't generate images, change
article frontmatter, call a paid provider, touch D1 or Pinterest, push, deploy, or
publish.

Machine-readable queue:
`reports/growth/missing-hero-creative-briefs-2026-07-28.json`

## What the live check proved

- Local cohort: 57 absent files referenced by 57 Markdown articles.
- Direct pages: 56 article URLs returned 200.
- Broken assets: all 57 referenced hero URLs returned 404.
- Repeated damage: each of the 56 direct pages included the broken path seven
  times in live HTML, covering the visible image plus social and schema metadata.
- Redirect exception: `/how-to-meal-plan-on-a-budget/` returned 301 and didn't
  render the missing path. Producing that hero before deciding which URL owns the
  topic would be wasted work.

The manifest records this exception instead of forcing every row into the old
`200 / 404 / seven references` pattern.

## What the search exports did and didn't prove

Sources checked:

- GSC `daily-life-hacks.com-Performance-on-Search-2026-07-28.zip`, window
  2026-04-29 through 2026-07-26.
- Bing `daily-life-hacks.com_SiteExplorerUrls_7_26_2026.csv`.
- Pinterest `Pinterest Analytics overview 20260619-20260719 (1).csv`.

None of the 57 paths appears in GSC `Pages.csv`. That means the export has no
page-level observation for them. It doesn't justify reporting 57 measured
zeroes.

Bing lists only `/how-to-meal-plan-on-a-budget`, with zero impressions and zero
clicks and a last crawl date of 2026-04-03. The other 56 paths aren't present in
the Bing URL export, so their page-level performance is unavailable there too.

The Pinterest export contains board and pin results but no destination URL
column. It can't assign performance to this article cohort.

## Production order

The JSON manifest contains 57 unique, text-free, non-chart concepts. The first
three retain the only useful topic-level search signals found in the prior audit:

1. `tofu-vs-chicken-protein-cost`
2. `how-much-protein-in-peanut-butter`
3. `best-high-fiber-foods-ranked-by-fiber-content`

The remaining direct pages are ordered by slug for a deterministic production
queue. The redirected meal-plan page is last and blocked pending a canonical
decision.

## Shared creative rules

- 1200 by 675 JPG.
- One clear editorial food joke or art-directed still life.
- Brand orange is an accent, never the dominant field.
- No charts, dashboards, fake receipts, nutrition labels, package lettering, or
  generated words.
- No embedded title or overlay. The article already renders an H1.
- No medical symbolism, transformation claims, supplements, or bodybuilder
  shorthand.
- Every concept should visually answer the article's actual promise or caveat.

## Recommended next batch

Generate and visually review the first 12 direct-page heroes, then reject any
asset with malformed food, accidental words, unclear subject hierarchy, or a
repeated visual formula. Don't generate all 56 in one paid batch before that
quality gate.

The meal-plan redirect isn't an image task yet. Decide whether the new source
article should replace the old destination, remain redirected, or be removed
from the source queue. Then create a hero only for the surviving canonical page.

## Validation contract

`tests/missing-hero-creative-briefs.test.mjs` fails if:

- the repository cohort isn't exactly 57;
- the manifest omits or adds a current missing path;
- any manifest path differs from article frontmatter or already exists locally;
- the live evidence isn't exactly 56 direct broken pages plus the one known
  redirect;
- GSC/Bing absence is mislabeled as a measured zero;
- priorities aren't exactly 1 through 57;
- a brief requests embedded text, an overlay, a chart, or a dashboard;
- concepts repeat or violate David Miller's copy bans.
