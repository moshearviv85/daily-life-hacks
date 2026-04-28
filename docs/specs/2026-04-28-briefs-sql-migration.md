# SPEC: Migrate pin-briefs and hero-briefs from JSONL to SQLite

**Date:** 2026-04-28
**Author:** Claude (with Moshe)
**Status:** Draft, awaiting approval

## 1. Problem

The brief generation pipeline writes to two flat JSONL files:
- `pipeline-data/pin-briefs.jsonl` (25 records, 100 pins, expected 50 records)
- `pipeline-data/hero-briefs.jsonl` (51 records, expected 50 — one stray)

This was good enough when there were 5 articles. With 50 articles and an unreliable LLM (`google/gemini-2.5-flash` via OpenRouter), the JSONL format is now actively losing work and hiding failures.

### Concrete symptoms

1. **25/50 articles have no pin-briefs at all.** `gemini-2.5-flash` emits malformed JSON (control chars, unbalanced quotes) on roughly half the articles. The script retries 10 times then gives up. The failure leaves no trace — there is no row anywhere saying "we tried, it failed, here is the error". Verified earlier this conversation: SQL `write_outputs.status='written'` shows 50 rows, `pin-briefs.jsonl` shows 25.
2. **All-or-nothing record writes.** Each JSONL line is one full record (article_slug + 4 pins). If pin #3 has a length-validation problem, the whole record is thrown away, including pins #1, #2, #4 that were perfectly valid. We pay for the LLM call and keep nothing.
3. **No structural validation.** Nothing prevents writing a pin with an empty title, a description of 5 chars, or a pin #2 missing entirely. Validation lives in scattered Python checks, easy to bypass.
4. **No status visibility.** `SELECT slugs WHERE pin_briefs are missing or failed` is impossible — requires diff between SQLite (`write_outputs`) and a JSONL file. Today this is a manual ad-hoc script run every time the question is asked.
5. **Hero-briefs JSONL has 51 records for 50 articles.** Silent dup, no UNIQUE constraint to surface it. Could be a stale record from a failed run; we don't know which one is canonical.
6. **Two sources of truth diverge.** `write_outputs` is in SQL, `pin-briefs.jsonl` is in flat file. Sync between them is tribal knowledge.

### Evidence (run earlier in this conversation)

```
SQL write_outputs (status='written'): 50
pin-briefs.jsonl records:             25
hero-briefs.jsonl records:            51
hero images on disk:                  50/50
slugs with >=4 pin images:            25
missing pin-briefs:                   25
```

### Business cost

- 25 articles ready to publish but blocked from Pinterest scheduling because their pins do not exist.
- Every retry of `generate_pin_briefs.py` re-burns OpenRouter tokens because partial successes are not preserved.
- Operator (Moshe) has to manually run a coverage diff every session to know what is missing. This breaks flow.

## 2. Goal

A single source of truth for briefs in `pipeline-data/topic-research.sqlite`, with structural validation enforced by the database, where:

1. **No silent loss.** Every brief generation attempt produces a row — `status='ok'` or `status='failed'` with the error captured. Nothing disappears.
2. **Pin-level granularity.** A failed pin #3 doesn't kill pins #1, #2, #4. Each pin is its own row, written in its own transaction.
3. **Structural validation by schema.** Length, NOT NULL, UNIQUE, FOREIGN KEY enforced by SQLite, not by Python that someone might forget to run.
4. **Coverage queryable in one SQL.** `SELECT slug FROM write_outputs WHERE status='written' AND slug NOT IN (SELECT article_slug FROM hero_briefs WHERE status='ok')` — answer in 50ms.
5. **No parallel JSONL files.** After migration, JSONL files deleted. SQL is the only place briefs live locally.

### Out of scope

- D1 (production) schema does not change. CSV upload to D1 stays as it is.
- Pin images on disk (`public/images/pins/*.jpg`) — files stay where they are.
- Pinterest CSV / `legacy_pins` flow — separate work, separate SPEC.
- LLM model selection — Task 7 will use a model that produces valid JSON, but choosing among Haiku 4.5 / GPT-4o-mini / Claude Sonnet 4.6 is a tactical decision inside Task 7, not architecture.
- The ~155 Publer pins missing from D1 (`--exclude-csv` flag) — separate SPEC.

## 3. Research

Not needed. No new external tool. SQLite is already the local pipeline DB.

## 4. Approach

**One DB (`topic-research.sqlite`), two tables (`hero_briefs`, `pin_briefs`), shared base columns.**

The base columns (`status`, `error`, `retry_count`, `model_id`, `created_at`, `updated_at`) repeat across both tables so that monitoring queries, retry logic, and "what's missing" reports work identically on both. The brief-specific columns differ because hero (1-to-1) and pin (1-to-many) are genuinely different shapes.

### Why this and not alternatives

- **Why not one unified table with a discriminator?** Anti-normalization. Half the columns NULL on every row. Every query has to filter by type. Adding a third brief type later means more nullable columns. Pin-vs-hero are different objects, not variants of the same object.
- **Why not one table with a JSON payload column?** That is JSONL inside SQL — same validation problem we're escaping, dressed up.
- **Why not D1 directly?** D1 is for production scheduling state (`pins_schedule`, `articles_schedule`). Briefs are a generation-time artifact, never read at runtime by the website. They belong with `write_outputs` in `topic-research.sqlite`.
- **Why not Postgres or DuckDB?** SQLite is already in use. CHECK + UNIQUE + FK are sufficient. No new dependency.

## 5. Plan

### Task 1: Define schema in a SQL migration file

- **Files:**
  - `scripts/migrations/2026-04-28-brief-tables.sql` (new)
- **Schema:**

```sql
CREATE TABLE IF NOT EXISTS hero_briefs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  article_slug TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'ok' CHECK (status IN ('ok','failed','pending')),
  error TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  model_id TEXT,
  prompt TEXT NOT NULL CHECK (length(prompt) >= 30),
  scene TEXT,
  composition TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS pin_briefs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  article_slug TEXT NOT NULL,
  pin_index INTEGER NOT NULL CHECK (pin_index BETWEEN 0 AND 9),
  status TEXT NOT NULL DEFAULT 'ok' CHECK (status IN ('ok','failed','pending')),
  error TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  model_id TEXT,
  pin_slug TEXT,
  title TEXT CHECK (status='failed' OR (length(title) BETWEEN 30 AND 100)),
  description TEXT CHECK (status='failed' OR (length(description) BETWEEN 50 AND 500)),
  prompt TEXT CHECK (status='failed' OR length(prompt) >= 30),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT,
  UNIQUE (article_slug, pin_index)
);

CREATE INDEX IF NOT EXISTS idx_hero_briefs_status ON hero_briefs(status);
CREATE INDEX IF NOT EXISTS idx_pin_briefs_article ON pin_briefs(article_slug);
CREATE INDEX IF NOT EXISTS idx_pin_briefs_status ON pin_briefs(status);

CREATE VIEW IF NOT EXISTS v_brief_coverage AS
SELECT
  w.slug,
  CASE WHEN h.status = 'ok' THEN 1 ELSE 0 END AS has_hero,
  COALESCE(SUM(CASE WHEN p.status = 'ok' THEN 1 ELSE 0 END), 0) AS pin_count_ok,
  COALESCE(SUM(CASE WHEN p.status = 'failed' THEN 1 ELSE 0 END), 0) AS pin_count_failed
FROM write_outputs w
LEFT JOIN hero_briefs h ON h.article_slug = w.slug
LEFT JOIN pin_briefs p ON p.article_slug = w.slug
WHERE w.status = 'written'
GROUP BY w.slug;
```

- **Acceptance:** running the migration on a fresh DB creates `hero_briefs`, `pin_briefs` tables, three indexes, and the `v_brief_coverage` view. Re-running is idempotent (no errors).
- **Verification:**
  ```
  python -c "import sqlite3; con=sqlite3.connect('pipeline-data/topic-research.sqlite'); con.executescript(open('scripts/migrations/2026-04-28-brief-tables.sql').read()); names=[r[0] for r in con.execute(\"SELECT name FROM sqlite_master WHERE name IN ('hero_briefs','pin_briefs','v_brief_coverage')\")]; assert sorted(names)==['hero_briefs','pin_briefs','v_brief_coverage'], names; print('OK', names)"
  ```
  Exit 0, prints `OK ['hero_briefs', 'pin_briefs', 'v_brief_coverage']`.
- **Depends on:** none.

### Task 2: Build the brief data-access library with tests (TDD)

- **Files:**
  - `scripts/lib/brief_store.py` (new)
  - `tests/lib/test_brief_store.py` (new)
- **API:**
  - `connect(db_path) -> sqlite3.Connection`
  - `upsert_hero_brief(con, *, article_slug, prompt, scene=None, composition=None, model_id=None, status='ok', error=None, retry_count=0)`
  - `get_hero_brief(con, article_slug) -> dict | None`
  - `upsert_pin_brief(con, *, article_slug, pin_index, ..., status='ok')` — one pin, one transaction
  - `list_pin_briefs(con, article_slug) -> list[dict]`
  - `list_missing_hero_briefs(con) -> list[str]` (slugs with `write_outputs.status='written'` but no `hero_briefs.status='ok'`)
  - `list_missing_pin_briefs(con, expected_per_article=4) -> list[tuple[str,int]]` (slug, count_ok)
  - `record_failure_pin(con, article_slug, pin_index, error, model_id=None)` — writes a `status='failed'` row so failures are not silent
  - `record_failure_hero(con, article_slug, error, model_id=None)`
- **Acceptance:** unit tests cover happy path, validation rejection (e.g. title too short raises `IntegrityError`), upsert overwrites, failure recording, and missing-coverage queries. Tests use `:memory:` DB initialized with the migration SQL.
- **Verification:**
  ```
  python -m pytest tests/lib/test_brief_store.py -v
  ```
  Exit 0, all tests pass.
- **Depends on:** Task 1.

### Task 3: One-time migration script — JSONL to SQL

- **Files:**
  - `scripts/migrate_briefs_to_sql.py` (new)
  - `tests/cli/test_migrate_briefs_to_sql.py` (new)
- **Behavior:**
  - Reads `pipeline-data/hero-briefs.jsonl` line by line. For each record, calls `upsert_hero_brief`. On the 51-vs-50 dup: last-write-wins via UNIQUE upsert, prints a warning naming the dup slug.
  - Reads `pipeline-data/pin-briefs.jsonl`. For each record, calls `upsert_pin_brief` per pin (pin_index 0..N-1).
  - Idempotent: running twice produces the same final state.
  - `--dry-run` flag prints what would happen without writing.
- **Acceptance:** after running, `SELECT COUNT(*) FROM hero_briefs WHERE status='ok'` >= 50 (the JSONL had 51 records — the 51st is `how-to-choose-granola-not-dessert`, a slug from an earlier pipeline batch whose article is live on the site but is not in current `write_outputs`. Not a dup, just historical. Kept.); `SELECT COUNT(DISTINCT article_slug) FROM pin_briefs WHERE status='ok'` = 25; `SELECT COUNT(*) FROM pin_briefs WHERE status='ok'` = 100.
- **Verification:**
  ```
  python scripts/migrate_briefs_to_sql.py --dry-run
  python scripts/migrate_briefs_to_sql.py
  python -c "import sqlite3; con=sqlite3.connect('pipeline-data/topic-research.sqlite'); h=con.execute(\"SELECT COUNT(*) FROM hero_briefs WHERE status='ok'\").fetchone()[0]; ps=con.execute(\"SELECT COUNT(DISTINCT article_slug) FROM pin_briefs WHERE status='ok'\").fetchone()[0]; pn=con.execute(\"SELECT COUNT(*) FROM pin_briefs WHERE status='ok'\").fetchone()[0]; assert h>=50, h; assert ps==25, ps; assert pn==100, pn; print('OK', h, ps, pn)"
  python -m pytest tests/cli/test_migrate_briefs_to_sql.py -v
  ```
  Exit 0, prints `OK 51 25 100`.
- **Depends on:** Task 1, Task 2.

### Task 4: Rewrite `generate_pin_briefs.py` to read/write SQL

- **Files:**
  - `scripts/generate_pin_briefs.py` (rewrite I/O layer; LLM call logic untouched)
  - `tests/cli/test_generate_pin_briefs.py` (update fixtures: SQL not JSONL)
- **Behavior change:**
  - Removes `OUTPUT_PATH` JSONL writes, `read_existing`, `write_or_replace`.
  - On success: per-pin upsert into `pin_briefs` with `status='ok'`. Each pin in its own transaction. A length-violation `IntegrityError` on pin #3 does not roll back pins #1, #2.
  - On total LLM failure (after retries): `record_failure_pin(article_slug, pin_index=N, error=...)` for each missing pin so the failure is visible.
  - `--description-only` flag: updates `description` column on existing `status='ok'` rows.
  - `--force` flag: deletes existing rows for slug, regenerates.
- **Acceptance:** existing 192 tests stay green; new test "pin #3 length error preserves pins #1, #2, #4" passes; new test "all-LLM-failure produces 4 failed rows" passes.
- **Verification:**
  ```
  python -m pytest tests/cli/test_generate_pin_briefs.py -v
  python -m pytest tests/lib tests/cli -q
  ```
  Both exit 0. The second command must show >=192 passed.
- **Depends on:** Task 2, Task 3.

### Task 5: Rewrite `generate_hero_brief.py` to read/write SQL

- **Files:**
  - `scripts/generate_hero_brief.py`
  - `tests/cli/test_generate_hero_brief.py` (update fixtures)
- **Same pattern as Task 4.**
- **Verification:**
  ```
  python -m pytest tests/cli/test_generate_hero_brief.py -v
  python -m pytest tests/lib tests/cli -q
  ```
- **Depends on:** Task 2, Task 3.

### Task 6: Update consumers — read from SQL instead of JSONL

- **Files:**
  - `scripts/generate_pin_images.py` — replace `pin-briefs.jsonl` reads with `list_pin_briefs(con, slug)`
  - `scripts/generate_hero_image.py` (if exists) — same for hero
  - `scripts/sync_to_d1.py` — replace JSONL load with SQL query
  - `scripts/lib/d1_sources.py` — replace `load_pin_briefs_jsonl`-style with SQL
  - `scripts/discover_pin_models.py` — replace JSONL read with SQL
- **Acceptance:** every reference to `pin-briefs.jsonl` and `hero-briefs.jsonl` in `scripts/` is gone (except the migration script and archive); full test suite green; `python scripts/sync_to_d1.py --dry-run` produces the same CSV row counts as it did before migration.
- **Verification:**
  ```
  python -c "import subprocess,sys; r=subprocess.run(['grep','-rn','pin-briefs.jsonl\\|hero-briefs.jsonl','scripts/','--exclude-dir=archive','--exclude-dir=__pycache__','--exclude-dir=migrations'], capture_output=True, text=True); allowed=['migrate_briefs_to_sql.py']; bad=[l for l in r.stdout.splitlines() if not any(a in l for a in allowed)]; assert not bad, bad; print('OK no JSONL refs')"
  python -m pytest tests/lib tests/cli -q
  python scripts/sync_to_d1.py --dry-run > /tmp/sync_after.txt 2>&1 || true
  ```
  Both pytest and the grep check exit 0.
- **Depends on:** Task 4, Task 5.

### Task 7: Backup JSONL to archive, then delete the originals

- **Backup step (mandatory before deletion):**
  - Create `pipeline-data/archive/2026-04-28/`
  - Copy `pipeline-data/pin-briefs.jsonl` and `pipeline-data/hero-briefs.jsonl` into it
  - Note: `hero-briefs.jsonl` is NOT tracked in git, so this backup is the only safety net for it. `pin-briefs.jsonl` is in git history but the archive copy keeps the pre-migration snapshot reachable without `git show`.
- **Delete step:**
  - Remove `pipeline-data/pin-briefs.jsonl` (tracked — `git rm`)
  - Remove `pipeline-data/hero-briefs.jsonl` (untracked — plain `rm`)
- **Files updated:**
  - `.gitignore` if it lists these — remove the entries
  - `CLAUDE.md` "Core Pipeline Locations" section — replace JSONL bullets with SQL table names
  - `README.md` if it documents JSONL paths
- **Acceptance:** archive copies exist; original files do not exist on disk or in git index; `git ls-files pipeline-data/*.jsonl` returns empty; full test suite green.
- **Verification:**
  ```
  test -f pipeline-data/archive/2026-04-28/pin-briefs.jsonl && test -f pipeline-data/archive/2026-04-28/hero-briefs.jsonl && echo "OK backups present"
  test ! -f pipeline-data/pin-briefs.jsonl && test ! -f pipeline-data/hero-briefs.jsonl && echo "OK originals gone"
  python -m pytest tests/lib tests/cli -q
  ```
  All exit 0.
- **Depends on:** Task 6.

### Follow-up SPEC (not part of this one): backfill 25 missing pin-briefs

After Tasks 1-7 land, a **separate** short SPEC will cover:
- Bench-test 1-2 articles on Claude Haiku 4.5 vs GPT-4o-mini for structured-JSON reliability
- Cost estimate (25 articles × 4 pins × ~2k tokens)
- User approves model + cost
- Run `generate_pin_briefs.py` on the 25 missing slugs, now writing to SQL with per-pin transactions and visible failures
- Acceptance: `SELECT COUNT(DISTINCT article_slug) FROM pin_briefs WHERE status='ok'` = 50, every slug has >=4 ok pins

Why split: model selection is a tactical decision with cost implications. Keeping it in a separate SPEC means the infrastructure migration here can be reviewed and approved on its own, without that decision blocking it. If Haiku also fails on JSON we want flexibility to investigate without Tasks 1-7 sitting in limbo.

## 6. Out-of-scope (deferred)

- **Backfilling the 25 missing pin-briefs.** Moved to a follow-up SPEC after Task 7. See note at end of Section 5.
- **LLM model selection (Haiku 4.5 vs GPT-4o-mini vs other).** Decided in the follow-up SPEC, not here.
- **D1 schema changes.** Production CSV upload stays as is.
- **`--exclude-csv` flag for `sync_legacy_pins.py`.** Separate problem (Pinterest dedup), separate SPEC.
- **Generic `briefs` table with discriminator or JSON payload.** Rejected in Section 4.
- **LLM provider switch.** OpenRouter stays as the gateway.
- **Backfilling status='failed' rows for the 25 articles' historical attempts.** Once the new pipeline runs cleanly, the past failures are not interesting.
- **Telemetry / metrics dashboard for brief generation success rate.** Future work, useful but not load-bearing now.
- **Migrating `pipeline-data/pins.json`** (legacy site pin index). Different artifact, different consumer.

## Approval checkpoint

I do not start Task 1 until Moshe says "תבצע" / "אישור" / "go" / "proceed" on this SPEC.
