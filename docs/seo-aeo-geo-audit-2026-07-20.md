# SEO, AEO, and GEO Audit - 2026-07-20

## Scope and evidence

- Live crawl of all 226 URLs in `sitemap-0.xml`
- Current local source audit of 207 article files
- Google Search Console Page Indexing and Performance reports
- Astro build output, routing tests, internal-link tests, JSON-LD parsing, and repository audits
- Current `origin/main` comparison

Machine-readable article details: `pipeline-data/reports/seo-onpage-2026-07-20.json`.

## Executive status

The canonical production surface is technically healthy: all 226 submitted URLs returned 200, stayed on the requested URL, exposed exactly one self-canonical, remained indexable, contained one H1, and included a description and JSON-LD. No noindex URL is present in the sitemap.

The remaining growth problem is concentrated in crawl efficiency, article quality and differentiation, source transparency, and entity/schema completeness. GSC's 486 excluded URLs are mostly historical or intentional states; the actionable Google-system queue is 74 discovered-not-indexed plus 42 crawled-not-indexed, based on a report last updated July 10.

## Remediation completed in this run

- Retired the generated tag-archive surface and removed article links into it. Regression tests lock both behaviors.
- Reduced the on-page checklist from 68 affected articles to 0 of 207: no body below 800 words, no article with fewer than three H2 sections, no missing FAQ, and no body without an internal link.
- Added reviewed 40-70 word quick answers to 72 priority articles, up from 0. Added or retained honest `dateModified` values only on reviewed files; 143 of 207 now have one.
- Increased articles with body-level external citations from 17 to 32, concentrated on nutrition, food-safety, constipation, fiber, satiety, and weight-related claims.
- Brought all 207 source titles to 60 characters or fewer and all excerpts to 160 characters or fewer; removed the forced title suffix in the shared layout.
- Corrected recipe JSON-LD: optional factual cuisine/category values, valid `PT0M` zero durations, and connected WebPage, Article/Recipe, Breadcrumb, FAQ, and Dataset identifiers.
- Added sitemap `lastmod`, expanded the research hub to all six datasets, corrected `llms.txt` provenance claims, and expanded visible author/editorial/corrections disclosure.
- Differentiated the overlapping food-prep, quick-dinner, and chickpea-curry pages by page title and intent without deleting URLs or inventing consolidation evidence.
- Final local audit: 0 checklist issues, 0 titles above 60, 0 excerpts above 160, 0 controlled-cluster issues, 0 canonical articles missing from the built output, and 0 leaked alias HTML pages.

## P0 - must fix

### Crawl bloat from tag archives

- 457 generated `/tag/` pages were noindex.
- 391 contained two articles or fewer; 321 contained only one.
- Article pages still sent 989 internal links into this noindex surface.
- Fix: stop tag page generation, render article tags as labels rather than links, and lock the policy with tests.

### Misleading public data claims

- `llms.txt` claimed that every CSV contained exact USDA IDs and enough source detail for independent reconstruction.
- The current CSVs do not contain those IDs or source URLs.
- Fix: state the limitation honestly and link the methodology/correction policy until full provenance columns are published.

### Thin and weakly structured article cohort

- 68 of 207 articles had at least one checklist issue.
- 56 bodies were below 800 words.
- 16 had fewer than three useful H2 sections.
- 56 had only one contextual body link.
- Full per-slug inventory is in the JSON report named above.
- Fix: bounded content cohorts with specific decision help, answer-first summaries, useful headings, contextual canonical links, concise excerpts, and honest modification dates.

### Nutrition and medical-claim trust

- Only 17 of 207 article bodies contained an external source link.
- Priority constipation, weight, gut-health, fiber, and satiety pages need claim-level authoritative citations and cautious language.
- Fix: add primary/authoritative sources, remove certainty and treatment language, and state the site's non-clinical editorial limits accurately.

## P1 - high impact

### Recipe structured-data accuracy

- Every recipe was hardcoded as `recipeCategory: Healthy` and `recipeCuisine: American`, including curry, Indian, Tuscan, and taco pages.
- Ten no-cook recipes lost `cookTime` because `0 minutes` was omitted from JSON-LD.
- Fix: emit optional recipe category/cuisine only when explicitly supplied and serialize zero duration as `PT0M`.

### Disconnected entity graph

- WebPage, Article/Recipe, Breadcrumb, FAQ, and Dataset nodes were emitted without stable cross-links.
- Fix: stable `@id` values plus `mainEntity`, `mainEntityOfPage`, `isPartOf`, and breadcrumb references.

### Weak answer-engine surface

- The template supports `quickAnswer`, but none of the 207 source articles used it at audit time.
- Fix: add a concrete 40-70 word answer to priority pages during human-quality review, not as a blind excerpt copy.

### Author and editorial transparency

- Person schema existed, but the visible About page did not clearly state role, sourcing process, correction policy, or limits of expertise.
- Fix: honest founder/editor identity, stable entity ID, sourcing and corrections workflow, and an explicit statement that the site is not medical care.

### Research inventory mismatch

- Six Dataset definitions existed in article schema, while the research hub exposed only four studies.
- Fix: expose all six studies and downloadable datasets, with methodology and responsibility links.

## P2 - important cleanup

### Titles and excerpts

- 29 source titles exceeded 60 characters; live pages added a forced ` | DLH` suffix, producing 66 live titles above 60 characters.
- 25 source excerpts exceeded 160 characters, though BaseLayout clamps meta descriptions.
- Fix: stop forcing the suffix and shorten priority titles/excerpts when editing those articles.

### Sitemap freshness

- Submitted URLs had no `lastmod` values.
- Fix: emit article `dateModified` when present and otherwise the real publication date; do not invent update dates.

### Freshness metadata

- 106 of 207 articles lacked `dateModified`; schema fell back to publication date.
- Fix only when an article is actually reviewed or changed. A mass fake date update is prohibited.

### Long articles with hero only

- Sixteen articles above 1,500 words have no body visual or chart after the content review expanded several priority pages.
- This is a reading-experience opportunity, not an indexing blocker. Add visuals only in a separate approved asset batch.
- The existing hero for `how-to-store-fresh-ginger` depicts herb jars rather than ginger. Its alt text was made truthful, but the asset itself remains a separate image-production task.

### Near-duplicate intent decisions

- `food-prep-guide-blog-recipes` and `food-prep-guide-recipes` now have distinct recipe titles and intent: sheet-pan chicken and vegetables versus chicken-and-quinoa bowls.
- `vegetarian-high-fiber-dinners-for-natural-relief` now targets a specific chickpea-cauliflower curry rather than posing as a second constipation guide.
- `quick-dinner-recipes` is explicitly a one-pan lemon-herb chicken recipe, while `quick-dinner-recipes-for-family` remains a family roundup.
- No URL was deleted or redirected without URL-level GSC evidence.

## P3 - measurement and external dependencies

### Core Web Vitals

- Chrome DevTools trace was unavailable and PageSpeed API returned rate limiting, so current LCP, INP, CLS, and TBT were not measured in this audit.
- Static checks found reserved image dimensions, prioritized hero loading, and deferred Analytics/Clarity.
- Do not claim a performance fix without a real trace or CrUX evidence.

### HTML caching

- Sample HTML responses were dynamic with `Cache-Control: public, max-age=0, must-revalidate`.
- Origin response was fast in the sample, so impact is unproven. Investigate Cloudflare cache behavior separately before changing the catch-all function.

### GSC report lag

- The Page Indexing report was last updated July 10, while live production and sitemap have moved since then.
- Validate with live URL behavior and URL Inspection; do not treat every historical exclusion as a current defect.

## Verified good

- 226/226 sitemap URLs: HTTP 200, no redirects, one self-canonical, indexable robots, one H1, description present, JSON-LD present.
- No duplicate live titles, descriptions, or canonicals.
- No alias HTML leaked into the static build.
- Internal-link verifier found no orphan canonical articles or noncanonical internal targets before the tag-label change.
- Robots, sitemap index, child sitemap, www/non-www redirects, slash redirects, 404 noindex behavior, and legacy route behavior are working.

## Delivery constraints

- The original checkout was four commits behind `origin/main` and contained unrelated user work.
- Integration must use a clean worktree based on current `origin/main`, carrying only the files from this audit.
- No D1 mutation, Pinterest queue operation, article production workflow, or external Search Console submission is part of the local remediation.
