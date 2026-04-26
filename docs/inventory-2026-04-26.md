# Project Inventory — 2026-04-26

**Status:** read-only mapping. No deletions, no moves. Generated to support a future cleanup SPEC.

**Method:** all numbers and statuses verified by tool calls in this session (Bash, Read, Glob). Memory snapshots ignored per truth.md rule #6.

## TL;DR — what's actually messy

1. **`scripts/` has 39 .py files at the root** (plus 4 sub-dirs). 18+ of them are pre-2026-04-22 and have no clear owner. Active new pipeline + legacy old pipeline coexist with **two name-collision pairs**: `generate-pinterest-pins.py` vs `generate_pinterest_pins.py`, and `generate-site-media.py` vs `generate_site_media.py`.
2. **`src/data/articles/` = 142 .md files in a flat dir.** No batch separation. `write_outputs` table has 66 rows TOTAL, of which **50 are unique production slugs** (`status='written' AND disqualified=0`) and the other 16 rows are writer retries on the same slugs. So the corpus is **50 production + 92 legacy = 142**, all mixed in one folder.
3. **`pipeline_v2/` SPEC already drafted** at `docs/specs/2026-04-26-pipeline-v2.md`. It governs the future of the article writer + visual brief + image gen pipeline. **Not yet executed.** Anything not covered by v2 stays as legacy in `scripts/`.
4. **Top-level dirs accumulate large drift:** `kinetic-video-bundle/` (1.3 GB, 16k files), `publer published/` (77 MB, name has a space!), `memory-backup-2026-04-22/`, `n8n/` (9 files, unclear), `experiments/` (215 MB).
5. **Two parallel research DBs** in `pipeline-data/`: `topic-research.sqlite` (6.5 MB, current writer pipeline) and `pipeline.db` (376 KB, older research). Both alive, no clear winner documented.

---

## A. `scripts/` — by category

Files at `scripts/*.py` only. Excludes sub-directories (`topic_research/`, `lib/`, `archive/`, `_archive/`, `adspower/`, `stage_1_5/`, `stage_1_75/`).

### A1. Active production (keep — used by GitHub Actions or live cron)

| File | Date | Size | Purpose |
|---|---|---|---|
| `post-pins.py` | 2026-04-21 | 11.3 KB | Pinterest auto-poster (cron via GitHub Actions) |
| `publish-articles.py` | 2026-04-24 | 12.7 KB | Daily article publisher |
| `fetch-pinterest-analytics.py` | 2026-04-14 | 8.4 KB | Pinterest analytics fetcher |
| `generate-pinterest-pins.py` | 2026-04-24 | 13.6 KB | Pin generation (newer hyphenated version) |
| `generate-site-media.py` | 2026-04-22 | 12.6 KB | Site media gen (newer hyphenated version) |

### A2. Active new pipeline (SPEC-driven, written 2026-04-23+) — COPY in v2 SPEC

| File | Date | Size | Purpose |
|---|---|---|---|
| `write.py` | 2026-04-23 | 19.6 KB | Production article writer |
| `write_prompt.py` | 2026-04-23 | 9.3 KB | Audience-first prompt builder |
| `validate_article.py` | 2026-04-23 | 16.8 KB | Deterministic validator |
| `test_validate_article.py` | 2026-04-23 | 14.2 KB | Validator tests |
| `judge_articles.py` | 2026-04-23 | 13.2 KB | LLM rubric judge (stage 1.75) |
| `image_engine.py` | 2026-04-22 | 4.2 KB | Image gen API caller |
| `topic_research/` (dir) | 2026-04-24 | — | stage1, stage2, db, sources, llm |

### A3. Active new pipeline (built specifically for v2 this week) — MV in v2 SPEC

| File | Date | Size | Purpose |
|---|---|---|---|
| `generate_hero_brief.py` | 2026-04-25 | 9.0 KB | Hero image brief per article |
| `generate_pin_briefs.py` | 2026-04-25 | 9.9 KB | 4 pin briefs per article |
| `lib/` (dir) | 2026-04-25 | — | `hero_brief.py`, `pin_brief.py`, `slugify.py` |

### A4. Wrappers / shims (388 B and 599 B — likely just `from X import *`)

| File | Date | Size | Notes |
|---|---|---|---|
| `generate_pinterest_pins.py` | 2026-04-22 | 388 B | "Wrapper module." — confusingly named like A1's `generate-pinterest-pins.py` |
| `generate_site_media.py` | 2026-04-22 | 599 B | "Wrapper module." — confusingly named like A1's `generate-site-media.py` |

**Action item:** confirm if A4 files are still imported anywhere. If not, candidates for archiving.

### A5. Already deprecated

| File | Date | Size | Notes |
|---|---|---|---|
| `generate_visual_brief.py` | 2026-04-25 | 992 B | First line says "DEPRECATED — split into two scripts on 2026-04-25" |
| `_archive/generate_visual_brief.py.deprecated` | — | — | Already moved out |

### A6. Old pipeline (Apr 22 batch — orchestrator-style)

| File | Date | Size | Purpose |
|---|---|---|---|
| `orchestrator.py` | 2026-04-22 | 6.0 KB | Category balance orchestration |
| `text_engine.py` | 2026-04-22 | 5.9 KB | Text/article engine |
| `telegram_bot.py` | 2026-04-22 | 8.1 KB | Telegram integration |
| `topic_manager.py` | 2026-04-22 | 4.9 KB | Topic state machine |
| `gatekeeper.py` | 2026-04-22 | 1.9 KB | Slugify + dedupe gate |
| `live_registry_sync.py` | 2026-04-22 | 4.7 KB | Sync frontmatter to registry |
| `publish_wrapper.py` | 2026-04-22 | 1.3 KB | Stub for D1 insert |
| `punisher.py` | 2026-04-22 | 3.3 KB | YMYL keyword punisher |
| `generation.py` | 2026-04-22 | 1.4 KB | LLM API wrapper (mockable) |

**Action item:** these look like an alternate / experimental orchestration layer. Confirm whether anything imports them. If orphaned, candidates for archiving.

### A7. Old import scripts (numbered scheme)

| File | Date | Size | Notes |
|---|---|---|---|
| `1-research.py` | 2026-04-24 | 17.3 KB | Keyword research pipeline |
| `1b-import-websearch.py` | 2026-04-22 | 8.4 KB | Import WebSearch findings |
| `1c-import-comet.py` | 2026-04-22 | 2.5 KB | Import Comet/Reddit findings |
| `1d-import-audience.py` | 2026-04-22 | 7.6 KB | Import Pinterest Audience |
| `1-keyword-research.py` | 2026-03-04 | 11.9 KB | Old (March) keyword research |
| `2-write-articles.py` | 2026-03-04 | 14.4 KB | Old (March) article writer |

**Action item:** 1-keyword-research.py and 2-write-articles.py are March artifacts; almost certainly superseded. The 1- / 1b- / 1c- / 1d- batch overlaps with `topic_research/`. Confirm overlap.

### A8. Standalone / one-off

| File | Date | Size | Notes |
|---|---|---|---|
| `gen-one-image.py` | 2026-04-19 | 2.7 KB | One-shot single-article image |
| `quality-gate.py` | 2026-04-04 | 5.2 KB | (No header docstring) |
| `sync_content_tracker.py` | 2026-04-04 | 1.5 KB | Sync content-tracker.json with articles dir |
| `create-kit-broadcasts.py` | 2026-03-14 | 9.7 KB | Kit / ConvertKit broadcast creator |

### A9. Already archived inside `scripts/archive/`

20+ files including: `1-research.py`, `2-generate.py`, `3-generate-images.py`, `3-validate.py`, `3-test_samples.py`, `4-export-publer.py`, `4-images.py`, `4-qc.py`, `5-publish.py`, `6-deploy.py`, `append_tracker.js`, audit / build / check scripts. Already out of the active path.

**Note:** `scripts/archive/1-research.py` exists AND `scripts/1-research.py` exists at the same level — possibly a duplicate that was archived but a newer copy was added at root.

---

## B. `src/data/articles/` — 142 files, all in one flat dir

- All 142 files have mtime in April 2026 (likely recent re-touches; original creation dates earlier).
- DB `pipeline-data/topic-research.sqlite::write_outputs` was cleaned on 2026-04-26: 16 rows removed (13 early-run retries from runs 1–4 + 3 disqualified rows). Backup at `pipeline-data/topic-research.sqlite.backup-2026-04-26` (6.59 MB).
  - **Current state: exactly 50 rows = 50 unique slugs, all `status='written' AND disqualified=0`.** One row per production article, no duplicates.
- So the corpus split is: **50 production + 92 legacy = 142**.
- No subdirectory separation by batch (legacy / production / experiments).
- Astro content collection points here, so any restructure is a production-change.

**Action items for future SPEC:**
- Decide: keep flat or split into `articles/legacy/`, `articles/production/`, `articles/experiments/`?
- Splitting requires Astro content collection config update — production risk.

---

## C. `pipeline-data/` — data + a few scripts mixed

Top-level files in `pipeline-data/` (203 files total):
- **DB files:**
  - `topic-research.sqlite` (6.5 MB) — current writer pipeline. 18 tables.
  - `pipeline.db` (376 KB) — older research. 11 tables. Possibly orphan.
- **Misplaced scripts in data dir:**
  - `add_briefs.py` (Feb 22, 59 KB) — script in pipeline-data. Should be in scripts/ or archived.
- **Large JSON/CSV blobs:**
  - `content-registry.json` (312 KB), `content-tracker.json` (154 KB), `batch.json`, `batch-table.csv`, `content-batch-60.json`, `content-inventory-2026.xlsx` — accumulated state files.
- Sub-directories: `drafts/`, others not enumerated.

**Action items for future SPEC:**
- Move `add_briefs.py` out of pipeline-data/.
- Decide if `pipeline.db` is dead (no rows being added) → archive.
- Decide if old JSON state files (content-registry, content-tracker, batch.json) are still authoritative or replaced by the SQLite DB.

---

## D. Top-level directories

| Dir | Files | Size | Notes |
|---|---|---|---|
| `archive/` | 14 | 106 KB | 2026-04-25-cleanup/ (just created) |
| `docs/` | 24 | 114 KB | Specs + this inventory |
| `experiments/` | 192 | 215 MB | `pinterest-50/` only |
| `functions/` | 39 | 158 KB | Cloudflare Pages Functions — production |
| `kinetic-video-bundle/` | 16,077 | 1.34 GB | Bundle for kinetic video tooling. **Largest dir on disk.** |
| `memory-backup-2026-04-22/` | 17 | 44 KB | Memory backup from V4 refactor |
| `n8n/` | 9 | 92 KB | n8n workflow exports — purpose unclear |
| `pipeline-data/` | 203 | 12 MB | See section C |
| `publer published/` | 150 | 77 MB | **Has space in directory name** |
| `public/` | 949 | 382 MB | Astro static assets — production |
| `scripts/` | 220 | 1.3 MB | See section A |
| `src/` | 170 | 1.3 MB | Astro source — production |
| `template/` | 1 | 1 KB | Single-file template |
| `tests/` | 55 | 568 KB | Pytest suite |

**Action items for future SPEC:**
- `kinetic-video-bundle/` (1.34 GB) — should it be in this repo? gitignored? in a separate repo?
- `publer published/` rename to `publer-published/` or archive entirely.
- `n8n/` purpose — confirm with user.
- `memory-backup-2026-04-22/` — tagged for reference, candidate for archive (already preserved in git history at the V4 commit).
- `template/` (1 file) — is it still needed?
- `experiments/pinterest-50/` (215 MB) — long-term plan? Folded into pipeline_v2 or kept as separate?

---

## E. `experiments/pinterest-50/`

Sub-dirs: `data/`, `docs/`, `research/`, `scripts/`. Mirrors a mini-project structure inside experiments. The `scripts/` here contain **discovery and image-generation runners** that are referenced in `media.md` (e.g., `experiments/pinterest-50/scripts/discovery/hero_recraft_run.py`).

**Action items for future SPEC:**
- Decide: experiment is over → fold winning artifacts into `pipeline_v2/`. Or experiment continues → keep as parallel.
- 215 MB suggests image artifacts are stored there (probably runs of test images).

---

## F. Mapping to existing pipeline_v2 SPEC

The SPEC at `docs/specs/2026-04-26-pipeline-v2.md` is **draft, not executed**. It plans:

- **COPY** into `pipeline_v2/`: `topic_research/`, `write.py`, `validate_article.py`, `test_validate_article.py` (presumed), `judge_articles.py`, `image_engine.py`, plus DB + 50 article MDs.
- **MV** into `pipeline_v2/`: `lib/`, `generate_hero_brief.py`, `generate_pin_briefs.py`, `tests/lib/`, `tests/cli/`.

**Files NOT covered by the v2 SPEC** (will remain in `scripts/` even after v2 ships):
- All of A1 (production cron scripts: `post-pins.py`, `publish-articles.py`, `fetch-pinterest-analytics.py`, `generate-pinterest-pins.py`, `generate-site-media.py`)
- All of A4 (wrappers — confirm if used)
- All of A6 (Apr 22 orchestrator-style files — likely orphan)
- All of A7 (old import scripts — likely orphan)
- All of A8 (standalone one-offs)
- `write_prompt.py` is also presumed to follow `write.py` into v2, but the SPEC text does not enumerate it — verify.

---

## G. Recommended next step

Open a separate cleanup SPEC at `docs/specs/2026-04-26-scripts-cleanup.md` AFTER the pipeline_v2 SPEC is executed. The cleanup SPEC handles:

1. **Confirm-orphan-and-archive** sweep on A4, A6, A7, A8 — for each file, grep the codebase for imports/references; if zero, move to `scripts/archive/`.
2. **Resolve naming collisions** — pick one of (`generate-pinterest-pins.py`, `generate_pinterest_pins.py`) and archive the other. Same for site-media.
3. **`pipeline-data/add_briefs.py`** — move to scripts/ or archive.
4. **`pipeline.db`** — confirm dead → archive.
5. **Top-level dirs** — `n8n/`, `template/`, `publer published/`, `kinetic-video-bundle/`, `memory-backup-2026-04-22/` each get a yes/no/archive decision.
6. **Articles dir restructure** — separate SPEC, production risk; not in scope until much later.

This inventory is the input. The cleanup SPEC is the next deliverable.
