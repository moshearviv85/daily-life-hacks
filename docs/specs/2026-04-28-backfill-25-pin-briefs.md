# SPEC: Backfill 25 missing pin-briefs

**Date:** 2026-04-28
**Author:** Claude (with Moshe)
**Status:** Draft, awaiting approval
**Depends on:** `2026-04-28-briefs-sql-migration.md` (must be complete)

## 1. Problem

50 articles are written and have hero images, but only 25 have pin-briefs.
The other 25 keep failing on `google/gemini-2.5-flash` with malformed JSON
(control chars, unbalanced quotes) — even the migration SPEC's `status='failed'`
visibility doesn't help when the model itself is the bottleneck.

The 25 missing slugs are known (captured in this conversation's prompt). They
include `aldi-shopping-hacks-large-family-meals`,
`easy-sourdough-discard-recipes-beginners`, `meal-prep-hacks-costco-rotisserie-chicken`,
and 22 others.

## 2. Goal

After this SPEC: 50/50 articles have `pin_briefs` rows with `status='ok'`,
4 pins each. `SELECT slug FROM v_brief_coverage WHERE pin_count_ok < 4` returns 0.

The 25 articles can then be deployed and their pins synced to D1 / Pinterest.

## 3. Approach

Switch `DEFAULT_MODEL` in `scripts/generate_pin_briefs.py` from
`google/gemini-2.5-flash` to `google/gemma-3-27b-it`. Fallback to
`anthropic/claude-haiku-4-5` if Gemma fails the bench.

**Why Gemma 3 27B over alternatives:**
- Moshe's prior benchmarks (article-writing pipeline) found Gemma's prose
  quality close to Gemini's, with slowness as the main downside.
- Pin-briefs are short (~2-3k tokens output), so Gemma's slower-per-token
  rate is not a meaningful constraint here.
- Cheaper than Haiku 4.5 (~$0.20 vs ~$1.00 for 25 articles).
- The structured-JSON failure mode of Gemini 2.5 Flash (control chars,
  unbalanced quotes) is a property of that specific model and prompt
  combination, not all Google models.

**Caveat:** prose-quality benchmarks are not the same as structured-JSON
reliability. The bench in Task 1 explicitly verifies JSON correctness on
one slug before committing to all 25.

**Validation gate:** the rewritten `generate_pin_briefs.py` already records
`status='failed'` rows on hard failure (Task 4 of migration SPEC). Any article
that still fails after the model switch becomes visible in SQL via
`SELECT * FROM pin_briefs WHERE status='failed'`. We re-run failed slugs
manually (not in this SPEC's scope).

### Why not also add `response_format={"type":"json_object"}`?

It's an OpenRouter parameter that some models honor and others ignore
silently. Adding it without verifying support per model is noise. Skip
unless Haiku alone is insufficient.

### Why not add a JSON repair pass?

The schema-level CHECK constraints already catch malformed structure.
A repair pass adds complexity for marginal benefit. Skip unless we hit
`status='failed'` rows that look like simple JSON noise we could repair.

## 4. Out-of-scope

- Replacing JSON repair logic anywhere
- Multi-model retry (Haiku → GPT-4o-mini fallback inside the same script)
- Touching the 25 articles already in `pin_briefs`
- D1 sync of the new pins (separate operation, requires explicit approval)

## 5. Plan

### Task 1: Bench on 1 slug with Haiku 4.5

- **File:** `scripts/generate_pin_briefs.py` (one-line `DEFAULT_MODEL` change,
  staged but not committed yet)
- **Action:** patch model, run on one missing slug
  (`aldi-shopping-hacks-large-family-meals`), inspect 4 pins for validity.
- **Acceptance:** `SELECT * FROM pin_briefs WHERE article_slug='aldi-shopping-hacks-large-family-meals' AND status='ok'`
  returns 4 rows, each passing length/uniqueness checks.
- **Verification:**
  ```
  python scripts/generate_pin_briefs.py --slug aldi-shopping-hacks-large-family-meals
  python -c "import sqlite3; con=sqlite3.connect('pipeline-data/topic-research.sqlite'); rows=con.execute(\"SELECT pin_index, length(title) FROM pin_briefs WHERE article_slug='aldi-shopping-hacks-large-family-meals' AND status='ok' ORDER BY pin_index\").fetchall(); assert len(rows)==4, rows; print('OK', rows)"
  ```
- **Stop criteria if Gemma fails the bench:** halt, present failure rows
  (visible in `pin_briefs WHERE status='failed'`) and the error text.
  Switch to `anthropic/claude-haiku-4-5` and re-run the bench. Do not
  silently fall back; surface the decision to user.

### Task 2: Run remaining 24 slugs

- **Action:** loop over the 24 remaining missing slugs (the 25 minus the one
  from Task 1), running `generate_pin_briefs.py --slug <slug>` for each.
  Sequential, one at a time, so failures are visible per-slug.
- **Acceptance:** every slug ends with 4 `status='ok'` rows OR clearly visible
  `status='failed'` rows so we can decide retry strategy per failure.
- **Verification:**
  ```
  python -c "from scripts.lib import brief_store; con=brief_store.connect('pipeline-data/topic-research.sqlite'); s=brief_store.coverage_summary(con); print(s); assert s['articles_with_pins_ok']>=49, s"
  ```
  (Allow >=49, not exactly 50, because one article can plausibly fail and we
  retry it manually.)

### Task 3: Final verification + SPEC close

- **Verification:**
  ```
  python -c "from scripts.lib import brief_store; con=brief_store.connect('pipeline-data/topic-research.sqlite'); m=brief_store.list_missing_pin_briefs(con, expected_per_article=4); print(f'missing={len(m)}: {m}'); assert len(m)==0, m"
  python -m pytest tests/lib tests/cli -q
  ```
  Both exit 0; missing list is empty; pytest stays at 214+.

## 6. Approval checkpoint

Awaiting Moshe's `אישור` / `תבצע` / `go` before patching `DEFAULT_MODEL`.
Cost: estimated ~$0.20 in OpenRouter API spend for 25 articles on Gemma 3
27B (or up to ~$1.25 if we end up on Haiku 4.5 fallback). Time: ~5-10
minutes wall-clock at sequential pace (Gemma is slower per token but each
call is short).
