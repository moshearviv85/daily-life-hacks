# Pinterest SEO Audit — Design Spec

**Date:** 2026-05-14
**Problem:** Pins on Pinterest pointed to non-existent slugs. Without a proper 404 page, all misses returned 200 OK (homepage redirect). Pinterest treated these as spam/low-quality, tanking impressions to near zero.
**Fix already applied:** 404 page now exists and `[[path]].js` returns proper 404 status. This audit verifies the current state and identifies remaining issues.

## Data Sources

| Source | Location | Records |
|--------|----------|---------|
| Live Pinterest pins | `pipeline-data/pinterest-pins-live.db` → `pins` table | 345 pins, 186 unique slugs |
| Dead pins (already deleted) | `pipeline-data/pinterest-audit-results.json` | 261 dead pins |
| Articles | `src/data/articles/*.md` | 140 articles |
| Slug aliases | `pipeline-data/slug-aliases.json` | 83 alias→canonical mappings |
| Router mapping (legacy v1-v4) | `pipeline-data/router-mapping.json` | v1/v2/v3/v4 variants per article |
| Pipeline pins DB | `pipeline-data/topic-research.sqlite` → `pinterest_pins` | 326 rows |
| D1 schema (pins_schedule) | `schema.sql` | Pin scheduling table |
| Catch-all router | `functions/[[path]].js` | KV + v-pattern + static fallback |
| Canonical logic | `src/pages/[slug].astro` + `src/layouts/BaseLayout.astro` | canonical = article.id always |
| Sitemap config | `astro.config.mjs` | Excludes variants + aliases |

## Audit Architecture — 6 Parallel Agents

All agents are **read-only**. No files are modified, no pins are deleted, no routes are changed. Each agent writes a structured JSON report to `pipeline-data/audit/`.

### Agent 1: Pin-to-Article Mapper

**Goal:** For every live pin (345), verify the slug resolves to an actual article.

**Logic:**
1. Load all 345 pins from `pinterest-pins-live.db`
2. Load all 140 article slugs from `src/data/articles/*.md`
3. Load all 83 aliases from `slug-aliases.json`
4. Load all variant slugs from `router-mapping.json`
5. For each pin:
   - Extract slug from `link` field (strip domain + trailing slash)
   - Check: does slug match an article directly?
   - Check: does slug exist as an alias key? → resolve to canonical
   - Check: does slug exist as a router-mapping variant `url_slug`? → resolve to canonical
   - Check: does slug match with/without `-v{n}` suffix?
   - Classify: `OK` | `ALIAS_OK` | `VARIANT_OK` | `BROKEN` | `EXTERNAL`

**Output:** `pipeline-data/audit/01-pin-to-article.json`
```json
{
  "total": 345,
  "ok": 280,
  "alias_ok": 30,
  "variant_ok": 15,
  "broken": 20,
  "external": 0,
  "pins": [
    {
      "pin_id": "...",
      "slug": "...",
      "link": "...",
      "status": "BROKEN",
      "resolved_to": null,
      "resolution_path": null
    }
  ]
}
```

### Agent 2: Dead Pins Analyzer

**Goal:** Analyze the 261 dead pins — classify what they were, whether the target article exists now, and whether they could be salvageable.

**Logic:**
1. Load `pinterest-audit-results.json` → `dead_pins` array
2. For each dead pin:
   - Parse `link` — is it our domain or external?
   - If our domain: extract slug, check against articles/aliases/mapping
   - Classify: `EXTERNAL` (not our problem) | `ARTICLE_EXISTS` (pin was deleted but article lives) | `ARTICLE_MISSING` (both dead) | `ALIAS_AVAILABLE` (could redirect)

**Output:** `pipeline-data/audit/02-dead-pins.json`

### Agent 3: Router Logic Auditor

**Goal:** Static analysis of `functions/[[path]].js` — identify scenarios where a non-existent slug could return 200 instead of 404.

**Logic:**
1. Read `[[path]].js` code
2. Trace all code paths:
   - KV hit → internal proxy → what if base_slug article doesn't exist? Does it 404?
   - KV hit → external redirect → OK (302)
   - No KV → v-pattern match → proxy to base slug → what if article doesn't exist?
   - No KV → no v-pattern → ASSETS.fetch → 404 check exists
3. Identify: is the ASSETS.fetch proxy for KV/v-pattern routes checking 404 status?
4. Check: what happens when `env.ROUTES_KV` is undefined (no KV bound)?

**Output:** `pipeline-data/audit/03-router-logic.json`
```json
{
  "code_paths": [
    {
      "path": "KV internal proxy",
      "returns_404_on_missing": false,
      "risk": "HIGH",
      "explanation": "If KV maps slug X to base_slug Y, but Y article doesn't exist, proxy returns whatever ASSETS gives — could be 200 if ASSETS falls through to index"
    }
  ],
  "overall_risk": "HIGH|MEDIUM|LOW",
  "recommendations": ["..."]
}
```

### Agent 4: Canonical & SEO Auditor

**Goal:** Verify that aliases and variants get correct canonical tags, noindex directives, and sitemap exclusion.

**Logic:**
1. Read `[slug].astro` — verify:
   - `canonicalURL` always points to `article.id` (the canonical slug), not the variant/alias
   - `isVariant` detection works: `currentSlug !== article.id`
   - `robotsMeta` = `noindex, follow` for variants
2. Read `BaseLayout.astro` — verify:
   - canonical `<link>` tag uses the passed URL
   - The `-v\d+` regex strip in default canonical computation
3. Read `astro.config.mjs` — verify:
   - All alias keys excluded from sitemap
   - All router-mapping variant slugs excluded from sitemap
   - Unreleased articles excluded
4. Cross-check: are there any aliases or variants that would slip through?

**Output:** `pipeline-data/audit/04-canonical-seo.json`

### Agent 5: D1 Schema & Pipeline Consistency

**Goal:** Verify that the pipeline's pin data (`pipeline_pins`, `pins_schedule` schema) matches reality.

**Logic:**
1. Read `pipeline-data/topic-research.sqlite` → `pinterest_pins` table:
   - For each `article_slug`: does the article exist?
   - For each `pin_slug`: is it a valid alias or direct article slug?
2. Read `schema.sql` → `pins_schedule` table definition:
   - The `link` field — what URL format is stored?
   - Would these links resolve correctly through the router?
3. Cross-reference `pinterest_pins` (local sqlite) vs `pins` (pinterest-pins-live.db):
   - Are there pins in the pipeline DB that aren't on Pinterest?
   - Are there pins on Pinterest that aren't in the pipeline DB?

**Output:** `pipeline-data/audit/05-pipeline-consistency.json`

### Agent 6: Router-Mapping vs Aliases Crosscheck

**Goal:** Find overlaps, conflicts, and orphans between the two routing systems.

**Logic:**
1. Load `router-mapping.json` — extract all `url_slug` values, map to their canonical article
2. Load `slug-aliases.json` — extract all alias→canonical pairs
3. Check:
   - Slugs that appear in BOTH systems — do they point to the same article?
   - Router-mapping slugs that have NO corresponding alias (legacy-only)
   - Aliases that have NO corresponding router-mapping entry (new-only)
   - Router-mapping articles that don't exist in `src/data/articles/`
   - Alias targets that don't exist in `src/data/articles/`
4. Determine which router-mapping entries are still "in use" (have live pins pointing to them)

**Output:** `pipeline-data/audit/06-mapping-vs-aliases.json`

## Master Report

After all 6 agents complete, a consolidation step:

1. Merge all 6 JSON reports
2. Produce `pipeline-data/audit/MASTER-REPORT.md` with:
   - Executive summary (counts by severity)
   - Per-pin status table (all 345 live + 261 dead)
   - Router risk assessment
   - SEO compliance check
   - Recommended actions ranked by priority
3. Present findings to user before any fixes

## Non-Goals

- This audit does NOT modify any files
- This audit does NOT delete pins from Pinterest
- This audit does NOT update routing or aliases
- This audit does NOT make HTTP requests to the live site
- All checks are local/offline against the codebase and local databases
