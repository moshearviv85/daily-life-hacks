# Pipeline Critical Gaps: Validation Gate, Produce/Publish Split, Semantic Dedup

**Date:** 2026-05-14
**Status:** Design approved, pending implementation plan

## Problem

Three gaps in the article pipeline compromise quality and safety:

1. **No validation gate in run_pipeline.py.** Articles go from LLM review straight to image generation and deploy. The deterministic validator (20 rules) and LLM medical validator exist as code but are never called by the orchestrator. An article with em-dashes, medical claims, or broken frontmatter can deploy to production.

2. **No pipeline-publish.yml.** `pipeline-trigger.js` references it (line 19) but the file was never created. The produce workflows (`pipeline-produce.yml`, `pipeline-daily.yml`) commit and push directly to `main`, which auto-deploys via Cloudflare Pages. There is no review step between production and publication.

3. **No semantic dedup in topic discovery.** `filter_discovered_topics.py` (used in CI) only deduplicates by slug. "Healthy oatmeal breakfast ideas" and "quick healthy oatmeal recipes" have different slugs and both pass. The older `filter_topics.py` has working LLM-based semantic dedup but is not wired into the discovery flow.

## Goal

- Every article passes deterministic + LLM medical validation before it can reach `main` or the live site.
- Produce and publish are separate workflows: produce saves to a branch, publish validates and merges to `main`.
- Discovered topics are checked for semantic similarity against published articles and queued topics before entering the pipeline.

## Design

### 1. Validation Gate in run_pipeline.py

**New stage 2.5** between LLM review (stage 2) and hero brief (stage 3).

**Flow:**
1. Read reviewed markdown from `review_outputs` (status `reviewed`, matching slug)
2. Run `lib.validator.validate(text, context="article", slug=slug)` (Layer 1 - deterministic)
3. Run `lib.medical_validator.check_article(text, api_key=api_key)` (Layer 2 - LLM)
4. Decision:
   - Any tier-1 violation OR any unhedged medical violation: mark `review_outputs.status = 'validation_failed'`, log violations, **skip this article** (pipeline continues to next topic if batch, or exits 0 with warning if single)
   - Tier-2 warnings only: log warnings, continue to stage 3

**Database changes:** `review_outputs.status` gains a new value: `'validation_failed'`. No schema change needed (status is TEXT, not CHECK-constrained).

**Exit behavior:** `run_pipeline.py` returns exit code 0 on validation failure (not 1) because the failure is handled gracefully. The article is marked in DB and skipped. A non-zero exit would stop the produce workflow for remaining topics.

**Cost:** ~$0.001 per article (one Gemini Flash call for medical validator). Deterministic validator is free.

### 2. Produce/Publish Workflow Split

#### 2a. Produce workflows (modify existing)

**Changes to `pipeline-produce.yml` and `pipeline-daily.yml`:**

Replace the "Commit and push generated files" step. Instead of pushing to `main`:

```yaml
- name: Commit to pipeline branch
  env:
    GH_PAT: ${{ secrets.GH_PAT }}
  run: |
    BRANCH="pipeline/batch-$(date -u +%Y-%m-%d-%H%M)"
    git checkout -b "$BRANCH"
    git config user.name "github-actions[bot]"
    git config user.email "github-actions[bot]@users.noreply.github.com"
    git add src/data/articles/ public/images/ pipeline-data/ || true
    if git diff --cached --quiet; then
      echo "No new files to commit"
    else
      git commit -m "feat(pipeline): produce articles

    Co-Authored-By: GitHub Actions <github-actions[bot]@users.noreply.github.com>"
      git push https://x-access-token:${GH_PAT}@github.com/moshearviv85/daily-life-hacks.git "$BRANCH"
      echo "Pushed to branch: $BRANCH"
    fi
```

Branch naming: `pipeline/batch-YYYY-MM-DD-HHMM` (UTC timestamp for uniqueness).

#### 2b. Publish workflow (new file)

**File:** `.github/workflows/pipeline-publish.yml`

**Trigger:** `workflow_dispatch` only (called from dashboard via `pipeline-trigger.js`, or manually from GitHub Actions UI).

**Steps:**
1. Find the latest `pipeline/batch-*` branch (by commit date). If multiple branches exist, process only the latest. The user can run publish again for older batches.
2. Checkout that branch
3. For each `.md` file in `src/data/articles/` that is new or modified vs `main`:
   - Run `validate_article.py <path>`
   - If exit code 1 (tier-1 failure): `git rm` the article + its images, log the failure
   - If exit code 0: keep
4. If any articles remain after validation:
   - Amend commit (remove failed articles)
   - Checkout `main`, merge the pipeline branch
   - Push to `main` (triggers Cloudflare deploy)
   - Delete the remote pipeline branch
5. Sync pipeline status to D1
6. Mark topics as published in D1

**Dashboard integration:** `pipeline-trigger.js` already has `publish: "pipeline-publish.yml"` in its WORKFLOWS map. No changes needed.

### 3. Semantic Dedup in filter_discovered_topics.py

**What changes:** After slug-based dedup (existing), add LLM semantic dedup before pushing to D1.

**Data sources for comparison (in CI, no local SQLite):**
- Published article titles: read from `src/data/articles/*.md` frontmatter in the checkout
- Already-queued topics: fetched from D1 via existing `GET /api/pipeline-topics?key=...`

**LLM call (adapted from filter_topics.py):**
- Model: `google/gemini-2.5-flash` via OpenRouter
- Prompt: candidate topic + list of all published titles + approved topic titles
- Response: `{ is_similar: bool, category: string, reason: string }`
- Temperature: 0.1

**Flow for each candidate topic after slug dedup:**
1. Check for hard-banned medical terms (deterministic, from `content_policy.MEDICAL_TERMS_HARD_BAN`) - reject immediately if found
2. Build dedup prompt with all known titles (published + approved queue)
3. Call LLM
4. `is_similar: true` - skip, do not push to D1
5. `is_similar: false` - push to D1, add title to comparison list for next candidate

**Batching optimization:** The published+queued title list is the same for the whole run; only the "already approved in this batch" portion grows.

**Cost:** ~$0.001 per topic. A typical discovery run finds ~30 candidates, so ~$0.03 per run.

**Changes to pipeline-discover.yml:** Add `OPENROUTER_API_KEY` secret to the "Filter and push to D1" step. Add `httpx` to the pip install step (used by OpenRouter client).

## Files Changed

| File | Change |
|------|--------|
| `scripts/NEW_PIPELINE_2026-05-08/run_pipeline.py` | Add validation stage 2.5 between review and hero brief |
| `scripts/NEW_PIPELINE_2026-05-08/filter_discovered_topics.py` | Add LLM semantic dedup after slug dedup |
| `.github/workflows/pipeline-produce.yml` | Commit to branch instead of main |
| `.github/workflows/pipeline-daily.yml` | Commit to branch instead of main |
| `.github/workflows/pipeline-publish.yml` | **New file** - validate + merge to main |
| `.github/workflows/pipeline-discover.yml` | Add OPENROUTER_API_KEY to filter step |

## Files NOT Changed

| File | Why |
|------|-----|
| `lib/validator.py` | Already complete, just needs to be called |
| `lib/medical_validator.py` | Already complete, just needs to be called |
| `validate_article.py` | CLI wrapper, used by publish workflow as-is |
| `filter_topics.py` | Reference only; logic adapted into filter_discovered_topics.py |
| `bulk_deploy_articles.py` | Local-use script, not part of CI flow |
| `pipeline-trigger.js` | Already has `publish` in WORKFLOWS map |

## Acceptance Criteria

1. `python run_pipeline.py "test topic" --category tips --dry-run` runs validation between review and hero brief stage
2. An article with an em-dash in review_outputs is marked `validation_failed` and skipped (not deployed)
3. `pipeline-produce.yml` commits to `pipeline/batch-*` branch, NOT to `main`
4. `pipeline-publish.yml` dispatches successfully, validates articles, merges clean ones to `main`
5. `filter_discovered_topics.py --dry-run` with a known duplicate topic (same meaning, different slug) rejects it
6. `filter_discovered_topics.py --dry-run` with a genuinely new topic approves it

## Verification Commands

```bash
# Gap 1: Validation gate exists in run_pipeline.py
grep -n "validate" scripts/NEW_PIPELINE_2026-05-08/run_pipeline.py

# Gap 2: Produce no longer pushes to main
grep -n "HEAD:main" .github/workflows/pipeline-produce.yml  # should return nothing
grep -n "HEAD:main" .github/workflows/pipeline-daily.yml    # should return nothing

# Gap 2: Publish workflow exists
test -f .github/workflows/pipeline-publish.yml && echo "EXISTS"

# Gap 3: Semantic dedup in filter_discovered_topics.py
grep -n "is_similar" scripts/NEW_PIPELINE_2026-05-08/filter_discovered_topics.py
```
