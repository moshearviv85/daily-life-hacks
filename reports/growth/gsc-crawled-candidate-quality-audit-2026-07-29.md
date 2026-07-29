# Crawled-Not-Indexed Candidate Quality Audit

Date: 2026-07-29
Scope: the 14 direct healthy candidates in `gsc-coverage-triage-2026-07-29.md`

## Bottom line

All 14 pages are technically valid index candidates. None has a broken internal
link, missing hero, missing responsive hero variant, missing Article schema, or
obvious duplicate search intent. Crawled-not-indexed status alone does not
justify another rewrite.

The correct decision is `FREEZE` for all 14 until Google recrawls the July 28
release and page/query evidence shows which page has an actual demand, CTR, or
intent problem.

## Objective fixes made

Only five deterministic defects were corrected:

- Replaced two stale hard-ban phrases in
  `how-to-make-grocery-shopping-cheaper.md`: an unhedged medical term and the
  banned `future self` construction. The surrounding point and David Miller
  voice were preserved.
- Normalized tags to the enforced four-to-six range in:
  `how-to-pack-cold-pasta-salad-picnics.md`,
  `natto-japanese-fermented-soybeans-gut-health.md`, and
  `freezer-organization-tips-large-family-meals.md`.

No title, excerpt, answer, heading structure, page length, target keyword, or
article intent was rewritten.

## Evidence summary

| Page | Answer first | Words | In / out | Source trail | Intent review | Decision |
|---|---:|---:|---:|---|---|---|
| Season cast iron | Yes | 893 | 3 / 3 | Practical technique; temperature/time uncited | Distinct from skillet preheating | Freeze |
| Make groceries cheaper | No | 1,875 | 6 / 8 | Internal studies linked; one sale-timing claim uncited | Distinct from list and store-detour pages | Freeze |
| Kitchen tools | Yes | 838 | 3 / 4 | Low-risk practical advice | Distinct from food-prep workflow | Freeze |
| Chia pudding | No | 1,251 | 3 / 3 | Fiber/fullness claims uncited | Savory-chia page is a recipe variant | Freeze |
| Leftover rice | Yes | 923 | 8 / 4 | Food-safety timing lacks official citation | No direct duplicate | Freeze |
| Protein + fiber meals | No | 1,385 | 3 / 5 | Numeric/satiety guidance uncited | Monitor query overlap with satiety comparison | Freeze |
| Store fresh herbs | Yes | 854 | 2 / 4 | Storage-duration claim uncited | Different foods from other storage pages | Freeze |
| Flavor with less salt | Yes | 982 | 5 / 4 | Practical formulas | Distinct modifier from sugar-swap page | Freeze |
| Good source of fiber | Yes | 1,155 | 4 / 8 | Official documents named but not linked | Unique legal-label intent | Freeze |
| Pack work salad | No | 975 | 3 / 3 | Low-risk practical advice | Different food/occasion from picnic pasta | Freeze |
| Pack picnic pasta | No | 940 | 5 / 3 | Safety thresholds lack official citation | Potluck page is recipe intent | Freeze |
| Natto | Yes | 886 | 3 / 3 | PubMed and NIH linked | No direct duplicate | Freeze |
| Freezer organization | No | 958 | 2 / 5 | Safety/storage numbers lack official citation | Distinct from large-family meal pages | Freeze |
| Constipation meals | Yes | 1,348 | 3 / 5 | NIDDK guidance linked | Distinct from fiber rankings/cost studies | Freeze |

`In / out` counts unique Markdown source pages linking in and contextual
Markdown links out. Rendered related cards and global navigation are excluded.

## Validator interpretation

- `scripts/validate_article.py`: zero Tier 1 failures after the scoped fixes.
- Eight pages pass cleanly. Six have Tier 2 warnings only.
- Several `S-23` warnings are literal false positives on phrases such as
  `treat oatmeal like dessert`, `treat it like a first question`, and
  `treat the packing process`.
- The newer production validator's 1,400-word minimum is a commissioning rule,
  not evidence that an older healthy URL should be padded or rewritten.
- Six pages lack an answer-first opener. That is a quality opportunity, not an
  indexing diagnosis. Change it only when query/impression evidence supports a
  focused refresh.

## Source follow-up, not a rewrite queue

If any of these pages begins receiving impressions, the first source-enrichment
pass should prioritize:

1. leftover rice;
2. cold pasta salad;
3. freezer organization;
4. the official FDA links in the fiber-label explainer;
5. quantified satiety guidance in the protein-and-fiber article.

These are citation improvements. They are not grounds for changing the page's
search intent, title, or structure now.
