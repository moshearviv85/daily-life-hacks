# Evidence-first article pruning matrix

Date: 2026-07-29

## Bottom line

- Articles classified: **267**.
- KEEP: **267**.
- MERGE: **0**.
- NOINDEX: **0**.
- REMOVE: **0**.
- Protected fixed recovery-cohort articles: **14**.
- URLs missing from the built sitemap: **0**.

No article was edited, redirected, noindexed, or removed by this audit. Traffic absence alone is not a pruning instruction.

## Evidence sources

- Local Markdown: `src\data\articles`.
- Current built sitemap: `dist\sitemap-0.xml`.
- GSC page export: `C:\Users\offic\Downloads\daily-life-hacks.com-Performance-on-Search-2026-07-28 (1).zip` (filter: Web, last 3 months).
- Bing Site Explorer export: `C:\Users\offic\Downloads\daily-life-hacks.com_SiteExplorerUrls_7_26_2026.csv`.
- Fixed recovery cohort: `reports\growth\search-recovery-cohort-2026-07-23.csv`.

Search exports are snapshots, not a complete value judgment. A URL absent from an export is recorded as zero observed evidence in that snapshot. It is not treated as proof that Google or Bing rejected the page.

## Decision gates

MERGE requires all four gates: Jaccard duplicate-intent score at least 0.90 with at least three meaningful shared title/slug tokens; objective thinness; zero GSC/Bing impressions, clicks, and Bing backlinks; and a target at least 200 words and 25% deeper with stronger search or internal-link evidence.

NOINDEX and REMOVE require manual facts this dataset cannot prove, such as a non-search utility page or an obsolete/unsafe article with no redirect target. Neither is inferred automatically.

## Audit signals

- Any observed GSC or Bing search/link evidence: **93**.
- GSC evidence: **70** articles.
- Bing evidence: **49** articles (overlaps GSC).
- Zero observed search/link evidence: **174**.
- Objectively thin under the conservative structural rule: **0**.
- Strong duplicate-intent match: **0**.

## Proven merge set

None. No article passed all four gates, so the safe action is to freeze the corpus rather than manufacture a pruning experiment.

## Highest-priority manual review candidates

These remain KEEP. They are shown because they have zero observed search evidence plus either thinness or a Jaccard intent overlap of at least 0.70, but at least one required merge gate failed.

| Decision | Slug | Words | GSC impr. | Bing impr. | Inlinks | Closest intent | Score |
|---|---|---:|---:|---:|---:|---|---:|
| KEEP | `plant-protein-per-dollar-ranked` | 1107 | 0 | 0 | 18 | `protein-per-dollar-cheapest-protein-sources` | 0.86 |
| KEEP | `chicken-thighs-vs-breast-protein-cost` | 766 | 0 | 0 | 13 | `lentils-vs-chicken-breast-protein-cost` | 0.75 |
| KEEP | `lentils-vs-chicken-breast-protein-cost` | 805 | 0 | 0 | 5 | `chicken-thighs-vs-breast-protein-cost` | 0.75 |
| KEEP | `one-dollar-protein-what-it-buys` | 936 | 0 | 0 | 12 | `one-dollar-fiber-what-it-buys` | 0.75 |
| KEEP | `high-protein-meals-on-a-budget` | 994 | 0 | 0 | 2 | `high-protein-on-a-budget-complete-guide` | 0.75 |
| KEEP | `one-dollar-fiber-what-it-buys` | 1066 | 0 | 0 | 9 | `one-dollar-protein-what-it-buys` | 0.75 |
| KEEP | `high-protein-on-a-budget-complete-guide` | 3161 | 0 | 0 | 43 | `high-protein-meals-on-a-budget` | 0.75 |
| KEEP | `what-30-grams-of-fiber-costs-per-day` | 1923 | 0 | 0 | 9 | `what-50-grams-of-protein-costs-per-day` | 0.71 |
| KEEP | `what-50-grams-of-protein-costs-per-day` | 2104 | 0 | 0 | 18 | `what-30-grams-of-fiber-costs-per-day` | 0.71 |

## Interpretation

The matrix is a guardrail against blind pruning, not a promise of ranking growth. The current exports are too young and incomplete to justify sitewide deletions. Re-run the exact matrix after the fixed cohort has had a full measurement window; only rows that continue to pass all four gates should enter a merge plan.

Machine-readable matrix: `reports\growth\article-pruning-matrix-2026-07-29.csv`.
