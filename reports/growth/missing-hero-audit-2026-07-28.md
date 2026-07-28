# Missing hero audit and creative queue, 2026-07-28

## Bottom line

Exactly 17 current articles reference hero files that don't exist locally or in production. Every article URL returns 200, every referenced hero URL returns 404, and the missing path appears seven times in each live HTML document, including visible and metadata surfaces.

This lane produced briefs only. It didn't generate images, edit frontmatter, change public content, touch D1 or Pinterest, push, or deploy.

Machine-readable briefs: `reports/growth/missing-hero-creative-briefs-2026-07-28.json`

The broken path isn't limited to one `<img>`. Live HTML repeats it in the visible hero, `og:image`, `twitter:image`, WebPage and Article schema, `thumbnailUrl`, and Pinterest save metadata. One missing asset therefore weakens the page preview and the on-page experience at the same time.

## Evidence and ranking limits

- Local source: 227 Markdown articles in `src/data/articles/`, compared with their `image` frontmatter paths under `public/`.
- Live verification on 2026-07-28: 17/17 article URLs returned 200; 17/17 referenced hero URLs returned 404.
- GSC: `daily-life-hacks.com-Performance-on-Search-2026-07-28.zip`, covering 2026-04-29 through 2026-07-26.
- Bing URLs: `daily-life-hacks.com_SiteExplorerUrls_7_26_2026.csv`.
- Bing queries: `daily-life-hacks.com_KeywordReport_7_26_2026.csv`.
- Pinterest: `Pinterest Analytics overview 20260619-20260719 (1).csv`.

All 17 paths have zero page-level impressions and clicks in the available GSC and Bing URL exports. Pinterest exports board and pin URLs, but not destination URLs, so article-level Pinterest results can't be assigned to this cohort.

The ranking therefore uses the two direct topic-query signals that do exist, followed by relevant Pinterest board reach:

- `does tofu have more protein than chicken`: 1 GSC impression, position 48.
- `is peanut butter a cheap protein when broke`: 1 Bing impression, position 5.
- Gut Health & Nutrition Tips: 173 impressions, 14 engagements, 10 pin clicks.
- High Protein Meals & Smart Swaps: 50 impressions, 2 engagements, 1 outbound click.
- Grocery Math: 18 impressions, 2 engagements.
- Budget Meals & Grocery Hacks: 16 impressions, no engagement.

Within equal evidence tiers, broader article promise and a clearer non-statistical visual hook break the tie. This is a production order, not a claim that the later articles have no search value.

## Ranked generation queue

| Rank | Article | Current search evidence | Pinterest context | Hero concept |
| ---: | --- | --- | --- | --- |
| 1 | `tofu-vs-chicken-protein-cost` | Direct GSC topic query, 1 impression at 48 | High Protein, 50 | Tofu and chicken race down a checkout belt; chicken finishes first |
| 2 | `how-much-protein-in-peanut-butter` | Direct Bing topic query, 1 impression at 5 | High Protein, 50 | Two loaded spoons in a miniature coin-operated diner |
| 3 | `best-high-fiber-foods-ranked-by-fiber-content` | No page/query signal | Nutrition Tips, 173 | Chia, flax, and split peas on a grocery-shelf awards podium |
| 4 | `frozen-vs-fresh-vegetables-fiber-cost` | No page/query signal | Nutrition Tips, 173 | Frozen peas arm-wrestle fresh broccoli; carrots wait nearby |
| 5 | `popcorn-vs-almonds-fiber-cost` | No page/query signal | Nutrition Tips, 173 | Popcorn fills several movie seats beside one small almond bag |
| 6 | `whole-wheat-flour-vs-quinoa-fiber-cost` | No page/query signal | Nutrition Tips, 173 | Flour arrives with a baking crew; quinoa is already in one pot |
| 7 | `ground-beef-vs-beans-protein-cost` | No page/query signal | High Protein, 50 | Pinto beans pull ground beef and coins in a grocery-cart tug-of-war |
| 8 | `chicken-thighs-vs-breast-protein-cost` | No page/query signal | High Protein, 50 | Three chicken cuts carry dramatically different bargain baskets |
| 9 | `lentils-vs-chicken-breast-protein-cost` | No page/query signal | High Protein, 50 | Lentils lift chicken breast and a coin purse on a kitchen seesaw |
| 10 | `eggs-vs-greek-yogurt-protein-cost` | No page/query signal | High Protein, 50 | Eggs and Greek yogurt sit on an almost level kitchen balance |
| 11 | `how-much-protein-in-a-can-of-beans` | No page/query signal | High Protein, 50 | A bean can opens like a tiny bank vault and spills beans with coins |
| 12 | `how-much-protein-in-two-eggs` | No page/query signal | High Protein, 50 | Two eggs occupy one quarter of a four-section breakfast plate |
| 13 | `peanut-butter-vs-almonds-protein-cost` | No page/query signal | High Protein, 50 | Similar portions, but almonds drag a much longer coin chain |
| 14 | `how-much-rice-and-beans-per-person-per-day` | No page/query signal | High Protein, 50; Budget Meals, 16 | A one-day pantry kit with measured beans, rice, one pot, and one plate |
| 15 | `how-to-save-money-on-groceries-at-walmart` | No page/query signal | Grocery Math, 18; Budget Meals, 16 | A plain bean bag gets red-carpet treatment in a generic blue big-box aisle |
| 16 | `grocery-budget-for-one-person-per-month` | No page/query signal | Grocery Math, 18; Budget Meals, 16 | A tiny one-person cart tries to carry four weekly grocery bags |
| 17 | `how-to-grocery-shop-for-a-month-on-a-budget` | No page/query signal | Grocery Math, 18; Budget Meals, 16 | Eight pantry staples pack into one small suitcase beneath a month calendar |

## Shared visual rules

- 1200 by 675 JPG.
- Interesting editorial illustration, photographic surrealism, or an art-directed still life.
- Brand orange is an accent only.
- No charts, dashboards, orange data cards, fake receipts, nutrition labels, or generated packaging text.
- No embedded text or overlay in the image. The rendered article already supplies the H1, and image-model lettering is an unnecessary failure point.
- No medical symbolism, transformation claims, supplements, or bodybuilder shorthand.
- Every concept must show the article's actual answer or caveat, not merely place two ingredients on a table.

## Deferred decisions and dependencies

- Image generation is deferred because this lane explicitly excludes generation and public changes.
- Frontmatter edits are deferred until reviewed assets exist. Swapping paths now would only trade one missing dependency for another.
- Generation cost is unknown. A provider, model, output policy, and regeneration allowance haven't been selected.
- Explicit approval is required for a separate 17-image generation and visual-QA batch.
- A realistic approval should cover 17 accepted 1200 by 675 assets plus regeneration of any image with malformed food, unintended text, weak subject hierarchy, or a repeated visual formula.
- Pinterest-specific portrait variants aren't part of this dependency. These are landscape article heroes only.

## Validation contract

`tests/missing-hero-creative-briefs.test.mjs` fails if:

- the repository's missing-hero cohort isn't exactly 17;
- the manifest omits or adds an article;
- a manifest path doesn't match frontmatter;
- any referenced file already exists;
- priority numbers aren't exactly 1 through 17;
- a brief requests embedded text, an overlay, a chart, or a dashboard;
- live evidence fields don't record article 200, hero 404, and seven HTML references.
