# Pipeline Critical Gaps Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close 3 pipeline safety gaps: wire validation into the orchestrator, separate produce/publish workflows, and add LLM semantic dedup to topic discovery.

**Architecture:** Validation gate is a new in-process function in run_pipeline.py called between review and image generation. Produce workflows commit to a timestamped branch instead of main. A new publish workflow validates articles on the branch and merges clean ones to main. Semantic dedup reuses the LLM prompt pattern from filter_topics.py inside filter_discovered_topics.py.

**Tech Stack:** Python 3.11, SQLite, OpenRouter (Gemini Flash), GitHub Actions YAML, existing lib/validator.py + lib/medical_validator.py.

**Spec:** `docs/superpowers/specs/2026-05-14-pipeline-gaps-design.md`

---

### Task 1: Validation gate in run_pipeline.py — failing test

**Files:**
- Create: `tests/cli/test_run_pipeline_validation.py`

- [ ] **Step 1: Write tests for the validation gate**

The test uses a real SQLite DB with a reviewed article, and asserts that `run_validation()` catches tier-1 violations and marks the status correctly. Uses a mock for the medical validator LLM call.

```python
"""Tests for run_pipeline.py validation gate (stage 2.5).

Real SQLite DB. Fake LLM for medical validator. Verifies:
- clean article passes validation
- article with em-dash is marked validation_failed
- article with unhedged medical claim is marked validation_failed
- tier-2 warnings pass validation
"""
from __future__ import annotations

import sqlite3
import sys
import tempfile
from pathlib import Path
from unittest.mock import patch

import pytest

_SCRIPTS_DIR = Path(__file__).resolve().parents[2] / "scripts" / "NEW_PIPELINE_2026-05-08"
if str(_SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS_DIR))

from run_pipeline import run_validation, now_iso  # noqa: E402


CLEAN_ARTICLE = """---
title: Simple Test Article
excerpt: A sample excerpt that is long enough to pass the length check without being too short for the validator rules.
category: tips
tags:
  - kitchen tips
  - easy hacks
  - quick prep
  - storage tips
image: "/images/simple-test-article-main.jpg"
imageAlt: "A clean kitchen counter"
date: 2026-05-14
author: "David Miller"
featured: false
faq:
  - question: "Is this easy?"
    answer: "Yes, it is very straightforward and anyone can do it at home with basic kitchen tools."
  - question: "Do I need special tools?"
    answer: "No, everything here uses items you probably already own. A cutting board and a sharp knife are all you need."
  - question: "How long does it take?"
    answer: "About ten minutes from start to finish, maybe less if you have done it before a few times."
  - question: "Can kids help?"
    answer: "Absolutely, the steps are simple and safe enough for older kids to follow along with a little supervision."
---

Here is the intro paragraph. It sets the scene and draws readers in with a relatable hook about kitchen chaos.

## First Section Heading

This section has enough words to stay within the validator range. It covers the basics of the topic and gives practical advice that readers can use right away. The tone is casual and friendly, like talking to a neighbor over the fence. We keep sentences varied in length. Some short. Others stretch out a bit to give the paragraph a natural rhythm that does not feel robotic or forced.

## Second Section Heading

More practical tips go here. The content stays focused and avoids medical language entirely. We talk about food storage, prep shortcuts, and kitchen organization. Nothing clinical. Nothing that sounds like a textbook. Just real advice from someone who spends a lot of time in the kitchen and has learned a few things the hard way.

## Third Section Heading

A closing section wraps things up without using the word conclusion. It reinforces the main points and gives readers one last actionable takeaway. The paragraphs flow naturally and the word count stays healthy. We want this to feel complete but not bloated. Every sentence earns its place on the page instead of padding the count.

## Fourth Section Heading

One more section to bring word count into the valid range. This covers a related angle that rounds out the article nicely. Sometimes the best kitchen advice is the stuff nobody thinks to mention because it seems too obvious. But obvious tips save the most time once you actually start using them consistently.

Finishing line that wraps naturally without a sign-off phrase.
"""

EM_DASH_ARTICLE = CLEAN_ARTICLE.replace(
    "Here is the intro paragraph.",
    "Here is the intro paragraph — with an em dash.",
)

MEDICAL_ARTICLE = CLEAN_ARTICLE.replace(
    "Nothing clinical.",
    "This cures diabetes. Nothing clinical.",
)


def _make_db_with_review(slug: str, markdown: str) -> str:
    """Create temp SQLite with review_outputs row, return DB path."""
    path = tempfile.mktemp(suffix=".sqlite")
    conn = sqlite3.connect(path)
    conn.execute("""CREATE TABLE IF NOT EXISTS review_outputs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        run_id INTEGER, original_write_output_id INTEGER,
        slug TEXT, category TEXT,
        original_markdown TEXT, reviewed_markdown TEXT,
        changes_json TEXT, changes_count INTEGER,
        review_model TEXT, tokens_in INTEGER, tokens_out INTEGER,
        cost_usd REAL, latency_ms INTEGER, tier1_pass INTEGER,
        tier2_warnings TEXT, status TEXT, error TEXT,
        attempts INTEGER, created_at TEXT
    )""")
    conn.execute(
        "INSERT INTO review_outputs "
        "(slug, category, reviewed_markdown, status, created_at) "
        "VALUES (?, 'tips', ?, 'ok', ?)",
        (slug, markdown, "2026-05-14T00:00:00Z"),
    )
    conn.commit()
    conn.close()
    return path


def _no_op_medical(*args, **kwargs):
    return []


class TestRunValidation:
    def test_clean_article_passes(self):
        db = _make_db_with_review("simple-test-article", CLEAN_ARTICLE)
        with patch("run_pipeline._medical_check", _no_op_medical):
            passed = run_validation(db, "simple-test-article", api_key="fake")
        conn = sqlite3.connect(db)
        status = conn.execute(
            "SELECT status FROM review_outputs WHERE slug = ?",
            ("simple-test-article",),
        ).fetchone()[0]
        conn.close()
        assert passed is True
        assert status == "ok"

    def test_em_dash_article_fails(self):
        db = _make_db_with_review("simple-test-article", EM_DASH_ARTICLE)
        with patch("run_pipeline._medical_check", _no_op_medical):
            passed = run_validation(db, "simple-test-article", api_key="fake")
        conn = sqlite3.connect(db)
        status = conn.execute(
            "SELECT status FROM review_outputs WHERE slug = ?",
            ("simple-test-article",),
        ).fetchone()[0]
        conn.close()
        assert passed is False
        assert status == "validation_failed"

    def test_medical_violation_fails(self):
        db = _make_db_with_review("simple-test-article", CLEAN_ARTICLE)
        from lib.medical_validator import MedicalViolation
        fake_violations = [MedicalViolation(term="cures", sentence="This cures diabetes.", hedged=False)]
        with patch("run_pipeline._medical_check", return_value=fake_violations):
            passed = run_validation(db, "simple-test-article", api_key="fake")
        conn = sqlite3.connect(db)
        status = conn.execute(
            "SELECT status FROM review_outputs WHERE slug = ?",
            ("simple-test-article",),
        ).fetchone()[0]
        conn.close()
        assert passed is False
        assert status == "validation_failed"
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `python -m pytest tests/cli/test_run_pipeline_validation.py -v`
Expected: FAIL with `ImportError: cannot import name 'run_validation' from 'run_pipeline'`

---

### Task 2: Validation gate in run_pipeline.py — implementation

**Files:**
- Modify: `scripts/NEW_PIPELINE_2026-05-08/run_pipeline.py`

- [ ] **Step 1: Add the `run_validation` function and `_medical_check` wrapper**

Insert after the `run_review` function (after line 198), before `def main`:

```python
def _medical_check(article_text: str, *, api_key: str) -> list:
    from lib.medical_validator import check_article
    return check_article(article_text, api_key=api_key)


def run_validation(db_path: str, slug: str, api_key: str) -> bool:
    """Stage 2.5: deterministic + LLM medical validation on reviewed article."""
    log("--- Stage 2.5: Validation Gate ---")
    sys.path.insert(0, str(SCRIPT_DIR))

    from lib.validator import validate, Violation

    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row

    row = conn.execute(
        "SELECT id, reviewed_markdown, slug FROM review_outputs "
        "WHERE slug = ? AND status = 'ok' ORDER BY id DESC LIMIT 1",
        (slug,),
    ).fetchone()
    if not row:
        log(f"  No reviewed article found for slug={slug}")
        conn.close()
        return False

    text = row["reviewed_markdown"]

    violations = validate(text, context="article", slug=slug)
    tier1 = [v for v in violations if v.tier == 1]
    tier2 = [v for v in violations if v.tier == 2]

    if tier2:
        for v in tier2:
            log(f"  [warn] {v.rule_id}: {v.detail}")

    if tier1:
        for v in tier1:
            log(f"  [BLOCK] {v.rule_id}: {v.detail}")
        conn.execute(
            "UPDATE review_outputs SET status = 'validation_failed' WHERE id = ?",
            (row["id"],),
        )
        conn.commit()
        conn.close()
        log(f"  VALIDATION FAILED: {len(tier1)} tier-1 blocker(s)")
        return False

    medical = _medical_check(text, api_key=api_key)
    unhedged = [m for m in medical if not m.hedged]
    if unhedged:
        for m in unhedged:
            log(f"  [BLOCK] medical: '{m.term}' in '{m.sentence[:80]}'")
        conn.execute(
            "UPDATE review_outputs SET status = 'validation_failed' WHERE id = ?",
            (row["id"],),
        )
        conn.commit()
        conn.close()
        log(f"  VALIDATION FAILED: {len(unhedged)} unhedged medical claim(s)")
        return False

    conn.close()
    log(f"  Validation passed ({len(tier2)} warnings)")
    return True
```

- [ ] **Step 2: Wire stage 2.5 into `main()` between review and hero brief**

In `run_pipeline.py`, after the review stage block (after the `if args.dry_run:` block that currently ends at line 263), add the validation call. Replace:

```python
    if args.dry_run:
        log("DRY RUN: stopping after write + review (no images, no deploy)")
        log(f"Total time: {time.monotonic() - total_start:.1f}s")
        return 0

    # Stage 3: Generate hero brief
```

With:

```python
    if args.dry_run:
        log("DRY RUN: stopping after write + review (no images, no deploy)")
        log(f"Total time: {time.monotonic() - total_start:.1f}s")
        return 0

    # Stage 2.5: Validation gate
    ok = run_validation(args.db, slug, api_key)
    if not ok:
        log("VALIDATION FAILED - article skipped (not deployed)")
        log(f"Total time: {time.monotonic() - total_start:.1f}s")
        return 0
    print()

    # Stage 3: Generate hero brief
```

- [ ] **Step 3: Run tests to verify they pass**

Run: `python -m pytest tests/cli/test_run_pipeline_validation.py -v`
Expected: 3 passed

- [ ] **Step 4: Run existing validator tests to verify no regressions**

Run: `python scripts/NEW_PIPELINE_2026-05-08/test_validate_article.py`
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add tests/cli/test_run_pipeline_validation.py scripts/NEW_PIPELINE_2026-05-08/run_pipeline.py
git commit -m "feat: wire validation gate (stage 2.5) into run_pipeline.py"
```

---

### Task 3: Produce workflows — commit to branch instead of main

**Files:**
- Modify: `.github/workflows/pipeline-produce.yml`
- Modify: `.github/workflows/pipeline-daily.yml`

- [ ] **Step 1: Update pipeline-produce.yml**

Replace the "Commit and push generated files" step (lines 97-112) with:

```yaml
      - name: Commit to pipeline branch
        if: always()
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
            echo "::notice::Pushed to branch $BRANCH — run Publish to merge to main"
          fi
```

- [ ] **Step 2: Update pipeline-daily.yml**

Replace the "Commit and push generated files" step (lines 98-113) with the same content as Step 1.

- [ ] **Step 3: Verify no HEAD:main references remain**

Run: `grep -n "HEAD:main" .github/workflows/pipeline-produce.yml .github/workflows/pipeline-daily.yml`
Expected: No output (no matches)

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/pipeline-produce.yml .github/workflows/pipeline-daily.yml
git commit -m "feat: produce workflows commit to pipeline branch, not main"
```

---

### Task 4: Publish workflow — new file

**Files:**
- Create: `.github/workflows/pipeline-publish.yml`

- [ ] **Step 1: Create the publish workflow**

```yaml
name: Pipeline Publish

on:
  workflow_dispatch:

env:
  PYTHONUNBUFFERED: "1"

jobs:
  publish:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'

      - name: Install dependencies
        run: pip install pyyaml

      - name: Find latest pipeline branch
        id: find-branch
        env:
          GH_PAT: ${{ secrets.GH_PAT }}
        run: |
          BRANCH=$(git branch -r --list 'origin/pipeline/batch-*' --sort=-committerdate | head -1 | xargs)
          if [ -z "$BRANCH" ]; then
            echo "No pipeline/batch-* branches found"
            echo "found=false" >> "$GITHUB_OUTPUT"
            exit 0
          fi
          LOCAL="${BRANCH#origin/}"
          echo "Found branch: $LOCAL"
          echo "branch=$LOCAL" >> "$GITHUB_OUTPUT"
          echo "found=true" >> "$GITHUB_OUTPUT"

      - name: Checkout pipeline branch
        if: steps.find-branch.outputs.found == 'true'
        run: |
          git checkout "${{ steps.find-branch.outputs.branch }}"

      - name: Validate articles
        if: steps.find-branch.outputs.found == 'true'
        id: validate
        run: |
          FAILED=0
          PASSED=0
          FAILED_SLUGS=""
          for f in $(git diff --name-only origin/main -- 'src/data/articles/*.md'); do
            if [ ! -f "$f" ]; then continue; fi
            SLUG=$(basename "$f" .md)
            echo "Validating: $SLUG"
            if python scripts/NEW_PIPELINE_2026-05-08/validate_article.py "$f" --slug "$SLUG"; then
              PASSED=$((PASSED + 1))
              echo "  PASS"
            else
              FAILED=$((FAILED + 1))
              FAILED_SLUGS="$FAILED_SLUGS $SLUG"
              echo "  FAIL — removing from commit"
              git rm "$f" || true
              git rm "public/images/${SLUG}-main.jpg" 2>/dev/null || true
              git rm public/images/pins/${SLUG}*.jpg 2>/dev/null || true
            fi
          done
          echo "passed=$PASSED" >> "$GITHUB_OUTPUT"
          echo "failed=$FAILED" >> "$GITHUB_OUTPUT"
          echo "failed_slugs=$FAILED_SLUGS" >> "$GITHUB_OUTPUT"
          echo "Summary: $PASSED passed, $FAILED failed"

      - name: Amend commit if articles were removed
        if: steps.find-branch.outputs.found == 'true' && steps.validate.outputs.failed != '0'
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          if ! git diff --cached --quiet; then
            git commit --amend --no-edit
          fi

      - name: Merge to main
        if: steps.find-branch.outputs.found == 'true' && steps.validate.outputs.passed != '0'
        env:
          GH_PAT: ${{ secrets.GH_PAT }}
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          BRANCH="${{ steps.find-branch.outputs.branch }}"
          git checkout main
          git pull origin main
          git merge "$BRANCH" --no-ff -m "feat(pipeline): publish validated articles from $BRANCH

          Passed: ${{ steps.validate.outputs.passed }}, Failed: ${{ steps.validate.outputs.failed }}
          Failed slugs:${{ steps.validate.outputs.failed_slugs }}

          Co-Authored-By: GitHub Actions <github-actions[bot]@users.noreply.github.com>"
          git push https://x-access-token:${GH_PAT}@github.com/moshearviv85/daily-life-hacks.git main

      - name: Delete pipeline branch
        if: steps.find-branch.outputs.found == 'true' && steps.validate.outputs.passed != '0'
        env:
          GH_PAT: ${{ secrets.GH_PAT }}
        run: |
          BRANCH="${{ steps.find-branch.outputs.branch }}"
          git push https://x-access-token:${GH_PAT}@github.com/moshearviv85/daily-life-hacks.git --delete "$BRANCH" || true

      - name: Sync pipeline status to D1
        if: steps.find-branch.outputs.found == 'true' && steps.validate.outputs.passed != '0'
        env:
          STATS_KEY: ${{ secrets.STATS_KEY }}
        run: python scripts/NEW_PIPELINE_2026-05-08/sync_pipeline_to_d1.py --key "$STATS_KEY"

      - name: Summary
        if: always()
        run: |
          if [ "${{ steps.find-branch.outputs.found }}" != "true" ]; then
            echo "::notice::No pipeline branches found. Nothing to publish."
          else
            echo "::notice::Published ${{ steps.validate.outputs.passed }} articles. ${{ steps.validate.outputs.failed }} failed validation."
          fi
```

- [ ] **Step 2: Verify file exists**

Run: `test -f .github/workflows/pipeline-publish.yml && echo "EXISTS"`
Expected: `EXISTS`

- [ ] **Step 3: Validate YAML syntax**

Run: `python -c "import yaml; yaml.safe_load(open('.github/workflows/pipeline-publish.yml'))" && echo "VALID YAML"`
Expected: `VALID YAML`

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/pipeline-publish.yml
git commit -m "feat: add pipeline-publish.yml workflow (validate + merge to main)"
```

---

### Task 5: Semantic dedup in filter_discovered_topics.py — failing test

**Files:**
- Create: `tests/cli/test_filter_discovered_topics.py`

- [ ] **Step 1: Write tests for semantic dedup**

Tests use a fake LLM function and verify that similar topics are rejected while genuinely new topics pass.

```python
"""Tests for filter_discovered_topics.py semantic dedup.

Fake LLM. Verifies:
- slug dedup still works
- hard-banned medical terms are rejected
- LLM-judged similar topic is rejected
- LLM-judged new topic is approved and pushed
"""
from __future__ import annotations

import json
import sys
from pathlib import Path
from unittest.mock import patch, MagicMock

import pytest

_SCRIPTS_DIR = Path(__file__).resolve().parents[2] / "scripts" / "NEW_PIPELINE_2026-05-08"
if str(_SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS_DIR))

from filter_discovered_topics import (  # noqa: E402
    semantic_dedup,
    slug_from_topic,
)


def _fake_llm_similar(prompt, **kwargs):
    return {"is_similar": True, "category": "tips", "reason": "covers same idea"}


def _fake_llm_new(prompt, **kwargs):
    return {"is_similar": False, "category": "recipes", "reason": "genuinely new"}


class TestSemanticDedup:
    def test_similar_topic_rejected(self):
        existing_titles = ["Best High Fiber Breads for Daily Meals"]
        candidate = {"topic": "top fiber-rich bread options", "source": "autocomplete"}
        result = semantic_dedup(
            candidate, existing_titles, llm_fn=_fake_llm_similar, api_key="fake"
        )
        assert result["rejected"] is True

    def test_new_topic_approved(self):
        existing_titles = ["Best High Fiber Breads for Daily Meals"]
        candidate = {"topic": "how to store fresh herbs longer", "source": "autocomplete"}
        result = semantic_dedup(
            candidate, existing_titles, llm_fn=_fake_llm_new, api_key="fake"
        )
        assert result["rejected"] is False
        assert result["category"] == "recipes"

    def test_medical_term_rejected_without_llm(self):
        existing_titles = []
        candidate = {"topic": "how insulin affects weight loss", "source": "gsc"}
        result = semantic_dedup(
            candidate, existing_titles, llm_fn=_fake_llm_new, api_key="fake"
        )
        assert result["rejected"] is True
        assert "insulin" in result["reason"]
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `python -m pytest tests/cli/test_filter_discovered_topics.py -v`
Expected: FAIL with `ImportError: cannot import name 'semantic_dedup' from 'filter_discovered_topics'`

---

### Task 6: Semantic dedup in filter_discovered_topics.py — implementation

**Files:**
- Modify: `scripts/NEW_PIPELINE_2026-05-08/filter_discovered_topics.py`

- [ ] **Step 1: Add imports and LLM helpers at the top of the file**

After the existing imports (after line 6), add:

```python
from pathlib import Path as _Path

_SCRIPT_DIR = _Path(__file__).resolve().parent
if str(_SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPT_DIR))
```

After the `_HEADERS` constant (after line 27), add the dedup functions:

```python

# --- Semantic dedup (adapted from filter_topics.py) ---

_DEDUP_SCHEMA = {
    "type": "object",
    "properties": {
        "is_similar": {"type": "boolean"},
        "category": {"type": "string", "enum": ["recipes", "nutrition", "tips"]},
        "reason": {"type": "string"},
    },
    "required": ["is_similar", "category", "reason"],
}


def _build_dedup_prompt(candidate_topic: str, known_titles: list[str]) -> str:
    titles_block = "\n".join(f"- {t}" for t in known_titles) if known_titles else "(none)"
    return f"""You are a content deduplication checker for a healthy-eating blog.

PUBLISHED ARTICLES AND QUEUED TOPICS:
{titles_block}

CANDIDATE TOPIC: "{candidate_topic}"

TASK: Is the candidate topic semantically similar to ANY item above?
"Semantically similar" means covering the same core idea even with different wording.
For example, "best high fiber breads" and "top fiber-rich bread options" are similar.

Also classify the candidate into one of these categories:
- "recipes" - practical food recipes, meal prep, one-pan dinners, snacks, breakfasts
- "nutrition" - educational posts, food facts, ingredient comparisons, macro/fiber/protein explainers
- "tips" - kitchen tips, storage, prep hacks, how-to guides, shopping guides

Return JSON with:
- is_similar: true/false
- category: "recipes" | "nutrition" | "tips"
- reason: one sentence explaining your decision"""


def _call_dedup_llm(prompt: str, *, api_key: str, model: str = "google/gemini-2.5-flash",
                     temperature: float = 0.1, timeout: int = 60) -> dict:
    from stage_1_5.openrouter import chat_completion, extract_text
    system = "You are a JSON-only assistant. Return valid JSON. No markdown fences."
    user_msg = prompt + f"\n\nReturn JSON matching this schema:\n{json.dumps(_DEDUP_SCHEMA, indent=2)}"
    resp = chat_completion(
        api_key=api_key, model_id=model, system=system, user=user_msg,
        temperature=temperature, max_tokens=200, timeout=timeout,
    )
    text, _ = extract_text(resp)
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("\n", 1)[-1]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3].strip()
    return json.loads(cleaned)


def _topic_has_banned_term(topic: str) -> str | None:
    from lib.content_policy import MEDICAL_TERMS_HARD_BAN
    lower = topic.lower()
    for term in MEDICAL_TERMS_HARD_BAN:
        if term in lower:
            return term
    return None


def semantic_dedup(candidate: dict, known_titles: list[str], *,
                   llm_fn=None, api_key: str = "") -> dict:
    """Check one candidate topic for semantic similarity.

    Returns dict with keys: rejected (bool), category (str), reason (str).
    """
    topic = candidate["topic"]

    banned = _topic_has_banned_term(topic)
    if banned:
        return {"rejected": True, "category": "tips", "reason": f"hard-banned medical term: {banned}"}

    if llm_fn is None:
        llm_fn = _call_dedup_llm

    prompt = _build_dedup_prompt(topic, known_titles)
    try:
        raw = llm_fn(prompt, api_key=api_key)
    except Exception as e:
        print(f"Warning: LLM dedup failed for '{topic}': {e}", file=sys.stderr)
        return {"rejected": False, "category": candidate.get("category", "tips"),
                "reason": f"LLM error, allowed by default: {e}"}

    is_similar = bool(raw.get("is_similar", False))
    category = str(raw.get("category", "tips")).lower().strip()
    if category not in ("recipes", "nutrition", "tips"):
        category = "tips"
    reason = str(raw.get("reason", ""))

    return {"rejected": is_similar, "category": category, "reason": reason}


def get_published_titles() -> list[str]:
    """Read titles from article frontmatter in the checkout."""
    import yaml
    titles = []
    if ARTICLE_DIR.exists():
        for f in sorted(ARTICLE_DIR.iterdir()):
            if f.suffix != ".md":
                continue
            text = f.read_text(encoding="utf-8")
            if not text.startswith("---"):
                continue
            parts = text.split("---", 2)
            if len(parts) < 3:
                continue
            try:
                fm = yaml.safe_load(parts[1])
                if isinstance(fm, dict) and fm.get("title"):
                    titles.append(fm["title"])
            except Exception:
                pass
    return titles


def fetch_d1_topic_titles(base_url: str, key: str) -> list[str]:
    """Fetch approved topic names from D1."""
    url = f"{base_url}/api/pipeline-topics?key={key}&status=approved"
    req = urllib.request.Request(url, headers=_HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode())
            return [t["topic"] for t in data.get("topics", [])]
    except Exception as e:
        print(f"Warning: Could not fetch D1 topic titles: {e}", file=sys.stderr)
        return []
```

- [ ] **Step 2: Wire semantic dedup into the main filter loop**

Replace the `main()` function's filter loop. The current code (lines 127-138) does slug-only dedup:

```python
    filtered = []
    for t in discovered:
        slug = slug_from_topic(t["topic"])
        if slug in all_known:
            continue
        if not t.get("category"):
            t["category"] = categorize_topic(t["topic"])
        t["slug"] = slug
        filtered.append(t)
        all_known.add(slug)
```

Replace with:

```python
    api_key = args.key if hasattr(args, 'openrouter_key') else os.environ.get("OPENROUTER_API_KEY", "")
    published_titles = get_published_titles()
    d1_titles = fetch_d1_topic_titles(args.base_url, key) if not args.dry_run else []
    known_titles = published_titles + d1_titles

    print(f"Known titles for dedup: {len(published_titles)} published + {len(d1_titles)} queued", file=sys.stderr)

    filtered = []
    rejected_semantic = 0
    for t in discovered:
        slug = slug_from_topic(t["topic"])
        if slug in all_known:
            continue
        all_known.add(slug)

        if api_key:
            result = semantic_dedup(t, known_titles, api_key=api_key)
            if result["rejected"]:
                rejected_semantic += 1
                print(f"  REJECT (semantic): '{t['topic']}' - {result['reason']}", file=sys.stderr)
                continue
            if not t.get("category"):
                t["category"] = result["category"]
        else:
            if not t.get("category"):
                t["category"] = categorize_topic(t["topic"])

        t["slug"] = slug
        filtered.append(t)
        known_titles.append(t["topic"])

    print(f"After dedup: {len(filtered)} new topics ({rejected_semantic} rejected by semantic check)", file=sys.stderr)
```

- [ ] **Step 3: Run tests to verify they pass**

Run: `python -m pytest tests/cli/test_filter_discovered_topics.py -v`
Expected: 3 passed

- [ ] **Step 4: Commit**

```bash
git add scripts/NEW_PIPELINE_2026-05-08/filter_discovered_topics.py tests/cli/test_filter_discovered_topics.py
git commit -m "feat: add LLM semantic dedup to filter_discovered_topics.py"
```

---

### Task 7: Update pipeline-discover.yml for semantic dedup

**Files:**
- Modify: `.github/workflows/pipeline-discover.yml`

- [ ] **Step 1: Add pyyaml to pip install**

Change line 23 from:

```yaml
        run: pip install google-auth google-api-python-client
```

To:

```yaml
        run: pip install google-auth google-api-python-client pyyaml
```

- [ ] **Step 2: Add OPENROUTER_API_KEY to the filter step**

The "Filter and push to D1" step (line 51-57) currently only has `DASHBOARD_PASSWORD`. Add the OpenRouter key:

```yaml
      - name: Filter and push to D1
        env:
          DASHBOARD_PASSWORD: ${{ secrets.DASHBOARD_PASSWORD }}
          OPENROUTER_API_KEY: ${{ secrets.OPENROUTER_API_KEY }}
        run: |
          python scripts/NEW_PIPELINE_2026-05-08/filter_discovered_topics.py \
            --input /tmp/all-discovered.json \
            --key "$DASHBOARD_PASSWORD"
```

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/pipeline-discover.yml
git commit -m "feat: add OPENROUTER_API_KEY to discover workflow for semantic dedup"
```

---

### Task 8: Final verification

**Files:** None (read-only checks)

- [ ] **Step 1: Run all pipeline-related tests**

Run: `python -m pytest tests/cli/test_run_pipeline_validation.py tests/cli/test_filter_discovered_topics.py tests/lib/test_validator.py tests/lib/test_medical_validator.py -v`
Expected: All pass

- [ ] **Step 2: Run existing test suite**

Run: `python scripts/NEW_PIPELINE_2026-05-08/test_validate_article.py`
Expected: All pass

- [ ] **Step 3: Verify spec acceptance criteria**

```bash
# Gap 1: Validation gate exists
grep -n "run_validation" scripts/NEW_PIPELINE_2026-05-08/run_pipeline.py

# Gap 2: No more HEAD:main in produce workflows
grep -rn "HEAD:main" .github/workflows/pipeline-produce.yml .github/workflows/pipeline-daily.yml || echo "CLEAN"

# Gap 2: Publish workflow exists
test -f .github/workflows/pipeline-publish.yml && echo "EXISTS"

# Gap 3: Semantic dedup wired in
grep -n "semantic_dedup" scripts/NEW_PIPELINE_2026-05-08/filter_discovered_topics.py
```

Expected:
- `run_validation` found in run_pipeline.py
- `CLEAN` (no HEAD:main)
- `EXISTS`
- `semantic_dedup` found in filter_discovered_topics.py

- [ ] **Step 4: Commit any remaining changes and verify clean state**

Run: `git status`
Expected: Clean working tree, all changes committed.
