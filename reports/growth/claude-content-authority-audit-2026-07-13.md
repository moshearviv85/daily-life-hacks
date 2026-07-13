# Content Authority Audit — 2026-07-13 (Claude workstream)

Branch: `claude/content-authority-batch-2026-07-13` (worktree, based on origin/main @ cada34d).
Companion CSV: `reports/growth/claude-content-priority-2026-07-13.csv` (top 40 ranked).

## Evidence used

| Source | Date | What it proves |
|---|---|---|
| `pipeline-data/audit/gsc-post-deploy-action-plan-2026-06-29.csv` | 2026-06-29 | Per-URL GSC impressions and average position (newest local GSC evidence; ~2 weeks stale) |
| `pipeline-data/reports/content-clusters-2026-07-12.json` | 2026-07-12 | Cluster/pillar membership for 155 of 187 articles |
| Body scan of all 187 `src/data/articles/*.md` at HEAD | 2026-07-13 | Inbound internal links, visual state, opener quality, question H2s, FAQ presence, old-generation style markers |
| `reports/growth/article-visual-baseline-2026-07-13.md` (parallel workstream) | 2026-07-13 | Read-only, to avoid overlapping the visuals workstream (its 12 `long_form_hero_only` targets were not selected here) |

## Proven defects vs hypotheses

**Proven (local evidence is sufficient):**
- 69 of 187 articles carry GSC impressions in the 2026-06-29 export; the rest have zero recorded impressions (defect class: invisibility, addressed by indexing/link work, not rewrites).
- A distinct **old-generation content class** exists: articles from Dec 2025 to Mar 2026 with raw slug-style titles, filler-heavy "chatty AI" bodies (markers: "like,", "you know?", "Oh, honey", "hit different"), keyword-stuffed FAQ answers, and no hard numbers or tables. 32 articles flagged by signature; 5 of them carry real impressions at winnable positions.
- Several previously-flagged candidates (prebiotic-foods, selenium-foods, good-source-of-fiber-label, sourdough-discard, bran-muffins, costco-rotisserie, crockpot-meals, sandwich-sogginess, baking-sheet-liners) were **inspected and found already rewritten** to the current standard. My heuristic over-flagged them; they were excluded to avoid churn.

**Hypotheses (require live GSC URL Inspection to confirm):**
- Current position/impression numbers are 2 weeks old; pages may have moved after the July 12-13 cluster consolidation deploys.
- Zero-impression pages may be crawled-not-indexed vs not-crawled; the export can't distinguish. Needs URL Inspection sampling.
- CTR is not in the local export at page level, so "ranking but no clicks" is inferred from position 7-11 plus low site clicks, not measured per page.

## The selected batch (5 pages, shared purpose)

Shared topical purpose: **fiber-comparison and gut-health pages from the old-generation class that already rank on Google page 1-2** (positions 4-11). These are the highest-leverage rewrites because the ranking problem is already solved; the content just loses the click and the citation.

| # | Slug | GSC imp | Best pos | Proven defect |
|---|---|---|---|---|
| 1 | `gut-health-tea-peppermint-ginger` | 54 | 9.6 | Old-gen body ("groovy", "vibe killer"), fluffy excerpt, raw title, no numbers/table, near-medical framing without sources |
| 2 | `popcorn-vs-potato-chips-fiber-comparison` | 40 | 8.6 | Old-gen body ("Oh, honey", "ew"), vague numbers ("3-4 grams, if you're lucky"), keyword-stuffed FAQs, raw title |
| 3 | `oatmeal-vs-grits-fiber-content` | 37 | 9.0 | Old-gen body ("Okay, so", "real MVP"), answer buried ~800 words in, backtick keyword stuffing, no table |
| 4 | `high-fiber-pizza-crust-cauliflower` | 19 | 8.0 | Old-gen body ("clandestine affair", "Wild, I tell ya"), keyword-stuffed FAQs, no fiber numbers despite the title promising them |
| 5 | `whole-wheat-vs-white-pasta-fiber` | 8 | ~9 | Old-gen body ("What Even Are They, Dude?"), title/frontmatter mismatch ("...Nutrition" vs slug "...fiber"), no per-serving numbers |

The seven budget-fiber/protein core pages modified July 12-13 were excluded per brief. No layouts, components, scripts, workflows, or pin/D1 assets were touched.

## What changed in each rewrite (before → after)

Applied uniformly, per the house GEO/citability standard:
- **Answer-first opener**: the ranked query's answer with real numbers in sentence one (e.g. oatmeal ~4g vs grits ~1-2g per cooked cup) instead of 100-800 words of throat-clearing.
- **Comparison table near the top** with a named source line (USDA FoodData Central; FDA 28g DV used as the reference denominator).
- **Question-shaped H2s** matching search intent ("Why does popcorn win so hard?", "Are stone-ground grits worth it?").
- **FAQ rewritten**: keyword-stuffed answers ("a comprehensive popcorn vs potato chips fiber comparison guide will...") replaced with direct, hedged, number-bearing answers.
- **Titles fixed** from raw slug-case ("Popcorn Vs Potato Chips Fiber Comparison") to intent titles ("Popcorn vs Potato Chips: The Fiber Numbers, Compared"). Slugs unchanged; no routing impact.
- **Excerpts** rewritten answer-style, all ≤155 chars (147-155 measured).
- **Cautious health language preserved**: all digestive/satiety claims hedged (may/could/might); no cure/treat/prevent language; tea article explicitly disclaims treatment framing.
- **Internal links**: every page now links its pillar (`how-to-eat-more-fiber-on-a-budget-complete-guide`) plus 3-5 verified siblings (fiber-per-dollar study, 30g-day study, pizza-crust comparison, popcorn toppings, pasta alternatives, breakfast ideas, ginger storage, granola guide removed where not natural). All targets verified to exist on disk.
- **`dateModified: 2026-07-13`** added (bodies materially changed); `date` preserved.
- **Recipe integrity**: cauliflower crust kept its full ingredients/steps frontmatter (Recipe JSON-LD unchanged); only title/excerpt/FAQ/body replaced.
- **Numbers audited**: popcorn 14.5g/100g matches the site's audited fiber CSV (rank #5, 57.7 g/$); oats 10.2g/100g dry consistent with the same CSV; chips/grits/pasta figures cross-checked against USDA FoodData Central ranges and hedged with "about/roughly" plus check-your-label guidance.

## Validation results

- `scripts/validate_article.py`: **PASS** on all 5 changed articles.
- Hard-ban scan (em dash U+2014, emojis, banned AI phrases, generic-blog phrases, `your ... will thank you` pattern, medical-claim verbs): **clean** after 2 fixes ("cleanse language" meta-mention, "fights back").
- Excerpt length: all ≤155.
- `git diff --check`: see commit (run pre-commit).
- `npm run build:checked`: see result note in the handoff message (worktree needs node_modules; run recorded there).

## Top opportunities NOT in this batch

1. **Zero-impression long tail (118 articles)** — biggest structural issue. Needs live URL Inspection sampling to split "not indexed" from "indexed, never shown", then an interlink + consolidation plan. Highest total upside, lowest per-page certainty.
2. **`cooking-oils-smoke-points-best-uses`** (167 imp, pos 75) and **`high-fiber-bran-muffins-that-taste-good`** (134 imp, pos 66) — high demand, page 6-7 positions. Content is already good; these need links/authority, not rewrites. Candidates for the next link-mesh pass and pin batch.
3. **`healthy-alternatives-potato-chips-snacking`** (70 imp, pos 61) — same class as #2.
4. **Remaining old-generation class (27 articles, mostly zero-impression recipes)** — same rewrite treatment when they earn impressions, or batch-refresh opportunistically. List derivable from the style-marker scan.
5. **`how-to-keep-sandwiches-from-getting-soggy`** (27 imp, pos 20.1) — already decent content; a smaller intent-polish candidate for a future batch.

## Claims still requiring live GSC verification

- Whether the 5 rewritten pages' positions moved after the July 12-13 deploys (baseline here is 2026-06-29).
- Index status of the 118 zero-impression articles.
- Page-level CTR for positions 7-11 pages (inferred, not measured).
- Whether `oatmeal-vs-grits` alias variants (3 URL forms in the export) consolidated into the canonical after the CP2 301s.
