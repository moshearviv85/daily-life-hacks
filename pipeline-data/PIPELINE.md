# DLH Pipeline Map — Canonical

**Last verified:** 2026-04-26 (from running tool calls — DB rows, script docstrings, GitHub Actions workflows).

Source of truth = the code in `scripts/` + the DB at `pipeline-data/topic-research.sqlite`. This file is the human-readable index of which script serves which stage. **A script lives here only if it has produced verified output.** Anything not listed is either archived or unused.

---

## DB at-a-glance

`pipeline-data/topic-research.sqlite` (6.4 MB, 18 tables). The article writer pipeline lives here; the production CRM tables (D1) live separately on Cloudflare.

Key tables (with current row counts as of 2026-04-26):
- `reddit_posts` (1,750), `pinterest_trends` (1,200), `audience_interests` (1,086), `pin_inspector_keywords` (825), `autocomplete` (648) → raw research inputs
- `stage1_output` (200) → keyword research results
- `stage2_output` (100) → topic ranking results, 20:15:15 quota
- `stage_1_5_outputs` (172), `stage_1_5_runs` (5) → multi-model discovery
- `stage_1_75_runs` (3), `stage_1_75_scores` (320) → judge scoring of discovery
- `write_runs` (9), **`write_outputs` (50)** → the 50 production articles
- `write_judge_runs` (3), `write_judge_scores` (60) → LLM judge on production
- `runs` (12) → meta runs index

---

## Stages

### Stage 0 — Raw research data ingestion

**Scripts:** `scripts/topic_research/sources/*` (Reddit, Pinterest trends, autocomplete, audience). Imported by stage1.

**Inputs:** Pinterest API, Reddit, Google autocomplete, audience CSVs.
**Writes:** `reddit_posts`, `pinterest_trends`, `autocomplete`, `audience_interests`, `pin_inspector_keywords`.

### Stage 1 — Keyword research

**Script:** `scripts/topic_research/stage1.py`
**CLI:** `python -m scripts.topic_research stage1 --audience-csv PATH [PATH ...] [--db PATH]`
**Reads:** stage 0 tables.
**Writes:** `stage1_output` (200 rows = top keywords).
**Status:** ACTIVE.

### Stage 2 — Topic ranking with category balance

**Script:** `scripts/topic_research/stage2.py`
**CLI:** `python -m scripts.topic_research stage2 --keywords-csv PATH --boards-csv PATH [--balance "20:15:15"]`
**Reads:** Pin Inspector CSVs + `stage1_output`.
**Writes:** `stage2_output` (100 rows ranked, default quota 20 recipes / 15 nutrition / 15 tips).
**Tests:** `tests/topic_research/test_stage2.py` (35 passing, including 9 balance-logic tests).
**Status:** ACTIVE.

### Stage 1.5 / 1.75 — Multi-model writer discovery (ONE-TIME, COMPLETED)

**Scripts:** `scripts/stage_1_5/*` (writer runner — multi-model discovery + production-time helpers), `scripts/stage_1_75/*` (Gemini judge).
**Reads:** `stage2_output`.
**Writes:** `stage_1_5_outputs`, `stage_1_75_scores`.
**Outcome (2026-04-23, $0.68 spend):** `google/gemini-3-flash-preview` won (89.4 quality on 13 topics, $0.009/article, 20s latency). `google/gemma-4-31b-it` is backup for pillar pages.
**Status:** ACTIVE. Although the original blind-discovery sweep is COMPLETED, the modules in `stage_1_5/` are still imported at runtime by `write.py`, `generate_hero_brief.py`, `generate_pin_briefs.py`, and `stage_1_75/judge.py` (OpenRouter client, prompt template, model selector, writer wrapper). Do not move this directory; do not delete from it.

### Stage 3 — Article writing

**Scripts:** `scripts/write.py` + `scripts/write_prompt.py`
**CLI examples:**
- `python scripts/write.py --count 5`
- `python scripts/write.py --ranks 1,3,7`
- `python scripts/write.py --run-id 12 --model google/gemma-4-31b-it --ranks 2`
- `python scripts/write.py --count 3 --dry-run`
**Reads:** `stage2_output` (top topics).
**Writes:** `write_runs` (one row per invocation), `write_outputs` (one row per topic), `src/data/articles/{slug}.md` (the article markdown file).
**Status:** ACTIVE.

### Stage 4 — Validation (deterministic)

**Scripts:** `scripts/validate_article.py` + `scripts/test_validate_article.py`
**Spec:** `scripts/article_spec.md` (numbered Tier 1 / Tier 2 / Tier 3 rules).
**Reads:** the markdown text passed in.
**Updates:** `write_outputs.compliance_score`, `compliance_details`, `disqualified`, `disqualify_reason`.
**Status:** ACTIVE.

### Stage 5 — LLM judging

**Script:** `scripts/judge_articles.py`
**Imports:** `scripts.stage_1_75.rubric.judge_one` (Gemini 2.5 Flash). Voice / Flow / SEO / Hook + total quality.
**Reads:** `write_outputs` (status='written').
**Writes:** `write_judge_runs`, `write_judge_scores`.
**Status:** ACTIVE.

### Stage 6 — Visual brief generation (NEW, 2026-04-25)

**Scripts:** `scripts/generate_hero_brief.py`, `scripts/generate_pin_briefs.py`
**Helpers:** `scripts/lib/hero_brief.py`, `scripts/lib/pin_brief.py`, `scripts/lib/slugify.py`
**CLI:** `python scripts/generate_hero_brief.py --slug <slug>` and `python scripts/generate_pin_briefs.py --slug <slug>`
**Reads:** `src/data/articles/{slug}.md`
**Writes:** `pipeline-data/hero-briefs.jsonl`, `pipeline-data/pin-briefs.jsonl` (one record per article).
**Output schema:** hero = 1 photograph (no overlay text); pins = 4 unique angles (`how-to | curiosity | listicle | contrast`), each with title overlay required.
**Status:** ACTIVE. SPEC for moving these into `pipeline_v2/` is at `docs/specs/2026-04-26-pipeline-v2.md` (draft).

### Stage 7 — Image generation

**Scripts (all currently in `scripts/`):**
- `scripts/image_engine.py` — shared image-API caller. Imported by the others.
- `scripts/generate-pinterest-pins.py` (hyphen) — 5 portrait pins (3:4) per article via Nano Banana Pro `:generateContent`. Output: `public/images/pins/{slug}_v{1-5}.jpg`.
- `scripts/generate-site-media.py` (hyphen) — hero (16:9) + ingredients via Imagen 4 Ultra `:predict`. Reads `pipeline-data/production-sheet.csv`. Output: `public/images/{slug}-main.jpg`.
- `scripts/gen-one-image.py` — one-shot single article image (orphan, candidate for archive).

**FAL discovery (2026-04-25, completed):** Recraft v4 Pro won the hero blind test on Moshe's judgment over qwen-image, seedream-4-5, ideogram-v3, imagen-4-ultra, nano-banana-2, gpt-image-2, flux-2-pro. Used through `experiments/pinterest-50/scripts/discovery/hero_recraft_run.py`. The production hero pipeline still uses Imagen via the older `generate-site-media.py` until cutover.

**Status:** ACTIVE (legacy production), with a v2 hero-via-Recraft replacement under `experiments/pinterest-50/`.

### Stage 8 — Article publishing (production)

**Script:** `scripts/publish-articles.py`
**GitHub Action:** `.github/workflows/publish-articles.yml` (runs daily 07:00 UTC).
**Reads:** D1 `articles_schedule` (Cloudflare D1 — separate from this DB).
**Writes:** Git commits to `src/data/articles/` for any due article whose images exist.
**Status:** ACTIVE.

### Stage 9 — Pinterest posting (production)

**Script:** `scripts/post-pins.py`
**GitHub Action:** `.github/workflows/post-pins.yml` (every 30 minutes).
**Reads:** D1 `pins_schedule` via `/api/pins-next`.
**Writes:** Pinterest API v5 → posts a pin → calls `/api/pins-mark-posted` to update D1.
**Known issues:** see `~/.claude/projects/.../memory/pinterest.md` (Error 2786 transient, NULL scheduled_time stuck queue, mark_posted timeout fix in commit 143951d).
**Status:** ACTIVE.

### Stage 10 — Pinterest analytics

**Script:** `scripts/fetch-pinterest-analytics.py`
**GitHub Action:** `.github/workflows/fetch-analytics.yml`
**Uses:** `user_account/top_pins_analytics` endpoint (3 API calls instead of 100+).
**Status:** ACTIVE.

---

## Cloudflare D1 (separate DB, on the production site)

Not in this file's SQLite. Tables:
- `articles_schedule` — pipeline of articles to publish (PENDING → PUBLISHED → DUPLICATE).
- `pins_schedule` — pipeline of pins to post (PENDING → POSTED → FAILED).
- `subscriptions` — Beehiiv newsletter signups.

Endpoints in `functions/api/*.js` (Cloudflare Pages Functions). Schema in `schema.sql`.

---

## Archived / superseded (in `scripts/archive/`)

The pre-2026-04-22 numbered pipeline (`1-research.py`, `2-generate.py`, `3-validate.py`, `4-images.py`, `5-publish.py`, `6-deploy.py`, ...) is fully superseded by stages 0–8 above. Kept for reference but not invoked.

`scripts/_archive/generate_visual_brief.py.deprecated` — split into `generate_hero_brief.py` + `generate_pin_briefs.py` on 2026-04-25.

---

## Next planned reorganization

`docs/specs/2026-04-26-pipeline-v2.md` (draft) plans to move the active stages into a parallel `pipeline_v2/` directory so legacy `scripts/` can be cleaned without touching live code. Until that SPEC is approved and executed, the paths in this file are authoritative.

---

## Update protocol

When adding a new script that becomes part of the pipeline:

1. Verify the script ran end-to-end on real data and produced expected output (`write_outputs`, JSONL, image files, etc).
2. Add a section above with the pattern: stage name → script path → CLI → reads → writes → status.
3. Update the row counts in the **DB at-a-glance** section if a new table appears.

When archiving a script:

1. Verify with `grep -rln <module_name> scripts/ src/ functions/ tests/ .github/ experiments/` that nothing references it.
2. Move to `scripts/archive/`. Note in the **Archived / superseded** section above.

Never rely on memory or assumption for the row counts or "what stage X does" — re-run the relevant query.
