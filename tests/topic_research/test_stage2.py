"""Tests for stage 2 orchestrator (stage2.py).

TDD: all network calls and Gemini are mocked.
At least one end-to-end test verifies DB rows are written correctly.
"""
from __future__ import annotations

import csv
import json
import tempfile
from pathlib import Path
from unittest.mock import patch, MagicMock

import pytest

try:
    from scripts.topic_research.stage2 import (
        run_stage2,
        _slugify,
        _build_stage2_prompt,
        _parse_balance,
        _enforce_balance,
        _STAGE2_SCHEMA,
    )
    from scripts.topic_research.db import (
        open_db,
        init_schema,
        create_run,
        insert_stage1_output,
        read_stage2_output,
    )
    _IMPORT_OK = True
except ImportError as e:
    _IMPORT_OK = False
    _IMPORT_ERR = str(e)


# ── fixtures ──────────────────────────────────────────────────────────────────

SAMPLE_PI_KEYWORDS = [
    {"keyword": "high fiber dinner recipes", "rank": 1, "word_count": 4,
     "character_count": 26, "seed": "fiber", "monthly_searches": 8000},
    {"keyword": "gut health meal prep", "rank": 2, "word_count": 4,
     "character_count": 20, "seed": "gut health", "monthly_searches": 5000},
    {"keyword": "low calorie soups", "rank": 3, "word_count": 3,
     "character_count": 17, "seed": "soups", "monthly_searches": 3000},
]

SAMPLE_PI_BOARDS = [
    {"board_id": "b1", "board_name": "Healthy Dinner Ideas", "board_followers": 15000,
     "pin_count": 600, "board_link": "https://pinterest.com/b1", "description": "",
     "is_group_board": False, "owner_name": "Jane", "owner_followers": 20000,
     "owner_username": "jane", "related_interests": ["healthy_eating"]},
    {"board_id": "b2", "board_name": "High Fiber Meals", "board_followers": 8000,
     "pin_count": 300, "board_link": "https://pinterest.com/b2", "description": "",
     "is_group_board": False, "owner_name": "Bob", "owner_followers": 12000,
     "owner_username": "bob", "related_interests": ["gut_health"]},
]

SAMPLE_TOPICS_50 = [
    {
        "rank": i,
        "topic": f"topic keyword number {i} for healthy eating",
        "category": "recipes" if i % 2 == 0 else "nutrition",
        "slug": f"topic-keyword-number-{i}-for-healthy-eating",
        "score": 95.0 - i,
        "rationale": f"Rationale for topic {i}",
    }
    for i in range(1, 51)
]

SAMPLE_GEMINI_RESPONSE = {"topics": SAMPLE_TOPICS_50}

SAMPLE_STAGE1_OUTPUT = [
    {"keyword": "high fiber recipes", "keyword_type": "content", "rank": 1,
     "score": 95.0, "rationale": "Top audience interest"},
    {"keyword": "gut health meal prep boards", "keyword_type": "board", "rank": 1,
     "score": 88.0, "rationale": "Good board signal"},
]


def _write_pi_keywords_csv(tmp_path: Path, rows: list[dict] | None = None) -> str:
    rows = rows or SAMPLE_PI_KEYWORDS
    path = tmp_path / "keywords.csv"
    fieldnames = ["Keyword", "Rank", "Word Count", "Character Count", "Seed", "Monthly Searches"]
    with path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for r in rows:
            writer.writerow({
                "Keyword": r["keyword"],
                "Rank": r["rank"],
                "Word Count": r["word_count"],
                "Character Count": r["character_count"],
                "Seed": r["seed"],
                "Monthly Searches": r["monthly_searches"],
            })
    return str(path)


def _write_pi_boards_csv(tmp_path: Path, rows: list[dict] | None = None) -> str:
    rows = rows or SAMPLE_PI_BOARDS
    path = tmp_path / "boards.csv"
    fieldnames = [
        "Board ID", "Board Name", "Board Followers", "Pin Count",
        "Board Link", "Description", "Is Group Board",
        "Owner Name", "Owner Followers", "Owner Username", "Related Interests",
    ]
    with path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for r in rows:
            writer.writerow({
                "Board ID": r.get("board_id", ""),
                "Board Name": r["board_name"],
                "Board Followers": r.get("board_followers", 0),
                "Pin Count": r.get("pin_count", 0),
                "Board Link": r.get("board_link", ""),
                "Description": r.get("description", ""),
                "Is Group Board": "YES" if r.get("is_group_board") else "NO",
                "Owner Name": r.get("owner_name", ""),
                "Owner Followers": r.get("owner_followers", 0),
                "Owner Username": r.get("owner_username", ""),
                "Related Interests": ",".join(r.get("related_interests", [])),
            })
    return str(path)


def _write_articles(articles_dir: Path, count: int = 3) -> None:
    articles_dir.mkdir(parents=True, exist_ok=True)
    for i in range(1, count + 1):
        md = articles_dir / f"article-slug-{i}.md"
        md.write_text(
            f"---\ntitle: Article Title {i}\ncategory: recipes\ntags: [fiber]\n"
            f"date: 2026-01-0{i}\nexcerpt: Test excerpt.\nimage: /images/img-{i}.jpg\n---\n\nBody text.\n",
            encoding="utf-8",
        )


def _write_topics_md(tmp_path: Path, topics: list[str] | None = None) -> str:
    path = tmp_path / "topics-to-write.md"
    topics = topics or ["pending topic one", "pending topic two"]
    lines = ["| ID | Category | Keyword | Slug |", "|----|----------|---------|------|"]
    for i, t in enumerate(topics, 1):
        lines.append(f"| {i} | recipes | {t} | {t.replace(' ', '-')} |")
    path.write_text("\n".join(lines), encoding="utf-8")
    return str(path)


# ── 1. module imports ─────────────────────────────────────────────────────────

def test_module_imports():
    assert _IMPORT_OK, f"Could not import stage2 module: {_IMPORT_ERR if not _IMPORT_OK else ''}"


# ── 2. _slugify ───────────────────────────────────────────────────────────────

def test_slugify_basic():
    assert _slugify("High Fiber Dinner Recipes") == "high-fiber-dinner-recipes"


def test_slugify_strips_special_chars():
    assert _slugify("What's the best high-fiber meal?") == "whats-the-best-high-fiber-meal"


def test_slugify_collapses_multiple_hyphens():
    result = _slugify("gut   health  tips")
    assert "--" not in result
    assert result == "gut-health-tips"


def test_slugify_lowercase():
    assert _slugify("UPPER CASE") == "upper-case"


# ── 3. _build_stage2_prompt ───────────────────────────────────────────────────

def test_build_stage2_prompt_contains_stage1_keywords():
    prompt = _build_stage2_prompt(
        stage1_content_kws=["high fiber dinner recipes"],
        stage1_board_kws=["gut health boards"],
        pin_inspector_kws=[],
        pin_inspector_boards=[],
        published_titles=["Published Article Title"],
        published_slugs=["published-article-slug"],
        pending_topics=["pending topic one"],
    )
    assert "high fiber dinner recipes" in prompt
    assert "gut health boards" in prompt


def test_build_stage2_prompt_contains_published_articles():
    prompt = _build_stage2_prompt(
        stage1_content_kws=[],
        stage1_board_kws=[],
        pin_inspector_kws=[],
        pin_inspector_boards=[],
        published_titles=["Existing Article About Fiber"],
        published_slugs=["existing-article-about-fiber"],
        pending_topics=[],
    )
    assert "Existing Article About Fiber" in prompt


def test_build_stage2_prompt_contains_pending_topics():
    prompt = _build_stage2_prompt(
        stage1_content_kws=[],
        stage1_board_kws=[],
        pin_inspector_kws=[],
        pin_inspector_boards=[],
        published_titles=[],
        published_slugs=[],
        pending_topics=["pending meal prep topic"],
    )
    assert "pending meal prep topic" in prompt


def test_build_stage2_prompt_contains_pin_inspector_keywords():
    prompt = _build_stage2_prompt(
        stage1_content_kws=[],
        stage1_board_kws=[],
        pin_inspector_kws=["high fiber meals for gut health"],
        pin_inspector_boards=["Healthy Dinner Ideas"],
        published_titles=[],
        published_slugs=[],
        pending_topics=[],
    )
    assert "high fiber meals for gut health" in prompt
    assert "Healthy Dinner Ideas" in prompt


def test_build_stage2_prompt_mentions_50_topics():
    prompt = _build_stage2_prompt([], [], [], [], [], [], [])
    assert "50" in prompt


def test_build_stage2_prompt_mentions_de_dup():
    prompt = _build_stage2_prompt([], [], [], [], [], [], [])
    assert "NOT duplicate" in prompt or "not duplicate" in prompt.lower()


# ── 4. _STAGE2_SCHEMA structure ───────────────────────────────────────────────

def test_stage2_schema_has_topics_array():
    props = _STAGE2_SCHEMA["properties"]
    assert "topics" in props
    assert props["topics"]["type"] == "array"


def test_stage2_schema_topic_items_have_required_fields():
    items = _STAGE2_SCHEMA["properties"]["topics"]["items"]
    required = set(items.get("required", []))
    assert "rank" in required
    assert "topic" in required
    assert "category" in required
    assert "slug" in required
    assert "score" in required
    assert "rationale" in required


def test_stage2_schema_category_has_enum():
    items = _STAGE2_SCHEMA["properties"]["topics"]["items"]
    cat_schema = items["properties"]["category"]
    assert "enum" in cat_schema
    assert set(cat_schema["enum"]) == {"recipes", "nutrition", "tips"}


# ── 5. run_stage2 end-to-end with mocked Gemini ───────────────────────────────

def test_run_stage2_writes_50_rows_to_db(tmp_path):
    """End-to-end: CSVs → (mocked) Gemini → 50 rows in stage2_output table."""
    keywords_csv = _write_pi_keywords_csv(tmp_path)
    boards_csv = _write_pi_boards_csv(tmp_path)
    articles_dir = tmp_path / "articles"
    _write_articles(articles_dir, count=3)
    topics_file = _write_topics_md(tmp_path)
    db_path = str(tmp_path / "test.sqlite")

    with patch("scripts.topic_research.stage2.generate", return_value=SAMPLE_GEMINI_RESPONSE):
        result = run_stage2(
            keywords_csv_path=keywords_csv,
            boards_csv_path=boards_csv,
            db_path=db_path,
            articles_dir=str(articles_dir),
            topics_file=topics_file,
            gemini_api_key="fake-key",
        )

    assert "run_id" in result
    assert len(result["topics"]) == 50

    # Verify DB rows
    conn = open_db(db_path)
    init_schema(conn)
    db_rows = read_stage2_output(conn, result["run_id"])
    conn.close()

    assert len(db_rows) == 50
    assert db_rows[0]["rank"] == 1  # ordered by rank ASC


def test_run_stage2_run_marked_done(tmp_path):
    keywords_csv = _write_pi_keywords_csv(tmp_path)
    boards_csv = _write_pi_boards_csv(tmp_path)
    db_path = str(tmp_path / "test.sqlite")

    with patch("scripts.topic_research.stage2.generate", return_value=SAMPLE_GEMINI_RESPONSE):
        result = run_stage2(
            keywords_csv_path=keywords_csv,
            boards_csv_path=boards_csv,
            db_path=db_path,
            articles_dir=str(tmp_path / "no_articles"),
            topics_file=str(tmp_path / "no_topics.md"),
            gemini_api_key="fake-key",
        )

    conn = open_db(db_path)
    row = conn.execute(
        "SELECT status FROM runs WHERE id = ?", (result["run_id"],)
    ).fetchone()
    conn.close()
    assert row[0] == "done"


def test_run_stage2_run_marked_failed_on_gemini_error(tmp_path):
    from scripts.topic_research.llm.gemini import GeminiError

    keywords_csv = _write_pi_keywords_csv(tmp_path)
    boards_csv = _write_pi_boards_csv(tmp_path)
    db_path = str(tmp_path / "test.sqlite")

    with (
        patch("scripts.topic_research.stage2.generate", side_effect=GeminiError("API fail")),
        pytest.raises(GeminiError),
    ):
        run_stage2(
            keywords_csv_path=keywords_csv,
            boards_csv_path=boards_csv,
            db_path=db_path,
            articles_dir=str(tmp_path / "no_articles"),
            topics_file=str(tmp_path / "no_topics.md"),
            gemini_api_key="fake-key",
        )

    conn = open_db(db_path)
    run_id = conn.execute(
        "SELECT id FROM runs WHERE stage = 2 ORDER BY id DESC LIMIT 1"
    ).fetchone()[0]
    status = conn.execute("SELECT status FROM runs WHERE id = ?", (run_id,)).fetchone()[0]
    conn.close()
    assert status == "failed"


def test_run_stage2_raises_without_api_key(tmp_path):
    import os
    keywords_csv = _write_pi_keywords_csv(tmp_path)
    boards_csv = _write_pi_boards_csv(tmp_path)
    db_path = str(tmp_path / "test.sqlite")

    saved = os.environ.pop("GEMINI_API_KEY", None)
    try:
        with pytest.raises(ValueError, match="GEMINI_API_KEY"):
            run_stage2(
                keywords_csv_path=keywords_csv,
                boards_csv_path=boards_csv,
                db_path=db_path,
                gemini_api_key="",
            )
    finally:
        if saved:
            os.environ["GEMINI_API_KEY"] = saved


def test_run_stage2_reads_stage1_output_from_db(tmp_path):
    """Stage2 must pick up stage1 output written to DB by a prior stage1 run."""
    keywords_csv = _write_pi_keywords_csv(tmp_path)
    boards_csv = _write_pi_boards_csv(tmp_path)
    db_path = str(tmp_path / "test.sqlite")

    # Pre-populate stage1 output in the DB
    conn = open_db(db_path)
    init_schema(conn)
    s1_run_id = create_run(conn, stage=1)
    insert_stage1_output(conn, s1_run_id, SAMPLE_STAGE1_OUTPUT)
    conn.close()

    captured_prompts: list[str] = []

    def _fake_generate(prompt, api_key, schema=None, temperature=0.2, timeout=60):
        captured_prompts.append(prompt)
        return SAMPLE_GEMINI_RESPONSE

    with patch("scripts.topic_research.stage2.generate", side_effect=_fake_generate):
        result = run_stage2(
            keywords_csv_path=keywords_csv,
            boards_csv_path=boards_csv,
            stage1_run_id=s1_run_id,
            db_path=db_path,
            articles_dir=str(tmp_path / "no_articles"),
            topics_file=str(tmp_path / "no_topics.md"),
            gemini_api_key="fake-key",
        )

    assert len(captured_prompts) == 1
    # Stage1 content keyword should appear in the prompt sent to Gemini
    assert "high fiber recipes" in captured_prompts[0]


def test_run_stage2_uses_latest_stage1_run_when_no_run_id_given(tmp_path):
    """When stage1_run_id is None, stage2 picks up the most recent stage1 run."""
    keywords_csv = _write_pi_keywords_csv(tmp_path)
    boards_csv = _write_pi_boards_csv(tmp_path)
    db_path = str(tmp_path / "test.sqlite")

    conn = open_db(db_path)
    init_schema(conn)
    r1 = create_run(conn, stage=1)
    insert_stage1_output(conn, r1, [
        {"keyword": "old keyword", "keyword_type": "content", "rank": 1,
         "score": 50.0, "rationale": "old"},
    ])
    r2 = create_run(conn, stage=1)
    insert_stage1_output(conn, r2, [
        {"keyword": "fresh keyword from latest run", "keyword_type": "content",
         "rank": 1, "score": 95.0, "rationale": "latest"},
    ])
    conn.close()

    captured_prompts: list[str] = []

    def _fake_generate(prompt, api_key, schema=None, temperature=0.2, timeout=60):
        captured_prompts.append(prompt)
        return SAMPLE_GEMINI_RESPONSE

    with patch("scripts.topic_research.stage2.generate", side_effect=_fake_generate):
        run_stage2(
            keywords_csv_path=keywords_csv,
            boards_csv_path=boards_csv,
            db_path=db_path,
            articles_dir=str(tmp_path / "no_articles"),
            topics_file=str(tmp_path / "no_topics.md"),
            gemini_api_key="fake-key",
        )

    assert "fresh keyword from latest run" in captured_prompts[0]


def test_run_stage2_pin_inspector_keywords_persisted(tmp_path):
    keywords_csv = _write_pi_keywords_csv(tmp_path)
    boards_csv = _write_pi_boards_csv(tmp_path)
    db_path = str(tmp_path / "test.sqlite")

    with patch("scripts.topic_research.stage2.generate", return_value=SAMPLE_GEMINI_RESPONSE):
        result = run_stage2(
            keywords_csv_path=keywords_csv,
            boards_csv_path=boards_csv,
            db_path=db_path,
            articles_dir=str(tmp_path / "no_articles"),
            topics_file=str(tmp_path / "no_topics.md"),
            gemini_api_key="fake-key",
        )

    conn = open_db(db_path)
    count = conn.execute(
        "SELECT COUNT(*) FROM pin_inspector_keywords WHERE run_id = ?",
        (result["run_id"],),
    ).fetchone()[0]
    conn.close()
    assert count == len(SAMPLE_PI_KEYWORDS)


def test_run_stage2_pin_inspector_boards_persisted(tmp_path):
    keywords_csv = _write_pi_keywords_csv(tmp_path)
    boards_csv = _write_pi_boards_csv(tmp_path)
    db_path = str(tmp_path / "test.sqlite")

    with patch("scripts.topic_research.stage2.generate", return_value=SAMPLE_GEMINI_RESPONSE):
        result = run_stage2(
            keywords_csv_path=keywords_csv,
            boards_csv_path=boards_csv,
            db_path=db_path,
            articles_dir=str(tmp_path / "no_articles"),
            topics_file=str(tmp_path / "no_topics.md"),
            gemini_api_key="fake-key",
        )

    conn = open_db(db_path)
    count = conn.execute(
        "SELECT COUNT(*) FROM pin_inspector_boards WHERE run_id = ?",
        (result["run_id"],),
    ).fetchone()[0]
    conn.close()
    assert count == len(SAMPLE_PI_BOARDS)


def test_run_stage2_topics_ordered_by_rank(tmp_path):
    keywords_csv = _write_pi_keywords_csv(tmp_path)
    boards_csv = _write_pi_boards_csv(tmp_path)
    db_path = str(tmp_path / "test.sqlite")

    with patch("scripts.topic_research.stage2.generate", return_value=SAMPLE_GEMINI_RESPONSE):
        result = run_stage2(
            keywords_csv_path=keywords_csv,
            boards_csv_path=boards_csv,
            db_path=db_path,
            articles_dir=str(tmp_path / "no_articles"),
            topics_file=str(tmp_path / "no_topics.md"),
            gemini_api_key="fake-key",
        )

    conn = open_db(db_path)
    db_rows = read_stage2_output(conn, result["run_id"])
    conn.close()

    ranks = [r["rank"] for r in db_rows]
    assert ranks == sorted(ranks)


def test_run_stage2_slug_fallback_when_gemini_omits_slug(tmp_path):
    """If Gemini returns a topic without a slug, _slugify is applied as fallback."""
    keywords_csv = _write_pi_keywords_csv(tmp_path)
    boards_csv = _write_pi_boards_csv(tmp_path)
    db_path = str(tmp_path / "test.sqlite")

    # Build a 50-topic response with no slug field
    no_slug_topics = [
        {
            "rank": i,
            "topic": f"Topic Without Slug Number {i}",
            "category": "recipes",
            # intentionally omit "slug"
            "score": 80.0,
            "rationale": "test",
        }
        for i in range(1, 51)
    ]

    with patch(
        "scripts.topic_research.stage2.generate",
        return_value={"topics": no_slug_topics},
    ):
        result = run_stage2(
            keywords_csv_path=keywords_csv,
            boards_csv_path=boards_csv,
            db_path=db_path,
            articles_dir=str(tmp_path / "no_articles"),
            topics_file=str(tmp_path / "no_topics.md"),
            gemini_api_key="fake-key",
        )

    for topic in result["topics"]:
        assert topic.get("slug"), f"Missing slug for topic: {topic.get('topic')}"
        assert " " not in topic["slug"]


def test_run_stage2_result_has_topics_key(tmp_path):
    keywords_csv = _write_pi_keywords_csv(tmp_path)
    boards_csv = _write_pi_boards_csv(tmp_path)
    db_path = str(tmp_path / "test.sqlite")

    with patch("scripts.topic_research.stage2.generate", return_value=SAMPLE_GEMINI_RESPONSE):
        result = run_stage2(
            keywords_csv_path=keywords_csv,
            boards_csv_path=boards_csv,
            db_path=db_path,
            articles_dir=str(tmp_path / "no_articles"),
            topics_file=str(tmp_path / "no_topics.md"),
            gemini_api_key="fake-key",
        )

    assert isinstance(result, dict)
    assert "run_id" in result
    assert "topics" in result
    assert isinstance(result["topics"], list)


# ── 6. balance / per-category quota ───────────────────────────────────────────


def test_parse_balance_basic():
    assert _parse_balance("20:15:15") == {"recipes": 20, "nutrition": 15, "tips": 15}


def test_parse_balance_rejects_bad_format():
    with pytest.raises(ValueError):
        _parse_balance("20:15")
    with pytest.raises(ValueError):
        _parse_balance("a:b:c")
    with pytest.raises(ValueError):
        _parse_balance("-1:15:15")


def test_build_stage2_prompt_includes_quota_block_when_balance_set():
    prompt = _build_stage2_prompt(
        stage1_content_kws=[],
        stage1_board_kws=[],
        pin_inspector_kws=[],
        pin_inspector_boards=[],
        published_titles=[],
        published_slugs=[],
        pending_topics=[],
        balance={"recipes": 20, "nutrition": 15, "tips": 15},
    )
    assert "recipes: 20" in prompt
    assert "nutrition: 15" in prompt
    assert "tips: 15" in prompt
    assert "CATEGORY QUOTA" in prompt


def test_build_stage2_prompt_legacy_when_balance_none():
    prompt = _build_stage2_prompt([], [], [], [], [], [], [])
    assert "CATEGORY QUOTA" not in prompt
    assert "50" in prompt


def test_enforce_balance_trims_over_quota():
    """Over-quota categories should be trimmed to top-N by score."""
    topics = [
        {"rank": i, "topic": f"rec {i}", "category": "recipes",
         "slug": f"rec-{i}", "score": 100 - i, "rationale": ""}
        for i in range(30)
    ] + [
        {"rank": i, "topic": f"nut {i}", "category": "nutrition",
         "slug": f"nut-{i}", "score": 80 - i, "rationale": ""}
        for i in range(20)
    ] + [
        {"rank": i, "topic": f"tip {i}", "category": "tips",
         "slug": f"tip-{i}", "score": 60 - i, "rationale": ""}
        for i in range(20)
    ]

    # No topup needed since all categories are over quota — gen_fn must not be called
    def _fail_gen(**_kwargs):
        raise AssertionError("gen_fn must not be called when all categories are over quota")

    balanced = _enforce_balance(
        topics=topics,
        balance={"recipes": 20, "nutrition": 15, "tips": 15},
        stage1_content_kws=[], stage1_board_kws=[],
        pin_inspector_kws=[], pin_inspector_boards=[],
        published_titles=[], pending_topics=[],
        api_key="fake", gen_fn=_fail_gen,
    )
    counts: dict[str, int] = {}
    for t in balanced:
        counts[t["category"]] = counts.get(t["category"], 0) + 1
    assert counts == {"recipes": 20, "nutrition": 15, "tips": 15}
    assert len(balanced) == 50
    # Re-ranked globally 1..50
    assert [t["rank"] for t in balanced] == list(range(1, 51))


def test_enforce_balance_tops_up_under_quota_via_gen_fn():
    """Under-quota categories should trigger a topup call and merge the result."""
    topics = [
        {"rank": i, "topic": f"rec {i}", "category": "recipes",
         "slug": f"rec-{i}", "score": 100 - i, "rationale": ""}
        for i in range(20)
    ] + [
        {"rank": i, "topic": f"nut {i}", "category": "nutrition",
         "slug": f"nut-{i}", "score": 80 - i, "rationale": ""}
        for i in range(15)
    ]
    # tips: 0 → need 15 via topup

    calls: list[dict] = []

    def _gen(**kwargs):
        calls.append(kwargs)
        schema_cat = kwargs["schema"]["properties"]["topics"]["items"]["properties"]["category"]["enum"][0]
        assert schema_cat == "tips"
        return {
            "topics": [
                {"rank": i, "topic": f"new tip {i}", "category": "tips",
                 "slug": f"new-tip-{i}", "score": 50 - i, "rationale": "topup"}
                for i in range(1, 16)
            ]
        }

    balanced = _enforce_balance(
        topics=topics,
        balance={"recipes": 20, "nutrition": 15, "tips": 15},
        stage1_content_kws=[], stage1_board_kws=[],
        pin_inspector_kws=[], pin_inspector_boards=[],
        published_titles=[], pending_topics=[],
        api_key="fake", gen_fn=_gen,
    )
    counts: dict[str, int] = {}
    for t in balanced:
        counts[t["category"]] = counts.get(t["category"], 0) + 1
    assert counts == {"recipes": 20, "nutrition": 15, "tips": 15}
    assert len(calls) == 1  # exactly one topup call for tips


def test_enforce_balance_dedups_topup_against_existing():
    """If topup returns a slug that already exists, it should be skipped."""
    topics = [
        {"rank": 1, "topic": "rec 1", "category": "recipes",
         "slug": "dup-slug", "score": 100, "rationale": ""},
    ]

    def _gen(**_kwargs):
        # First topup topic collides with an existing slug
        return {
            "topics": [
                {"rank": 1, "topic": "dup", "category": "recipes",
                 "slug": "dup-slug", "score": 90, "rationale": ""},
                {"rank": 2, "topic": "fresh", "category": "recipes",
                 "slug": "fresh-slug", "score": 80, "rationale": ""},
            ]
        }

    balanced = _enforce_balance(
        topics=topics,
        balance={"recipes": 2, "nutrition": 0, "tips": 0},
        stage1_content_kws=[], stage1_board_kws=[],
        pin_inspector_kws=[], pin_inspector_boards=[],
        published_titles=[], pending_topics=[],
        api_key="fake", gen_fn=_gen,
    )
    slugs = [t["slug"] for t in balanced]
    assert "dup-slug" in slugs
    assert "fresh-slug" in slugs
    assert len(balanced) == 2


def test_run_stage2_applies_balance_end_to_end(tmp_path):
    """When balance='20:15:15' is passed, the final DB rows match the quota."""
    keywords_csv = _write_pi_keywords_csv(tmp_path)
    boards_csv = _write_pi_boards_csv(tmp_path)
    db_path = str(tmp_path / "test.sqlite")

    # Skewed response: 42 recipes, 3 nutrition, 5 tips (like run_id=11)
    skewed = (
        [
            {"rank": i, "topic": f"rec {i}", "category": "recipes",
             "slug": f"rec-{i}", "score": 100 - i, "rationale": ""}
            for i in range(1, 43)
        ]
        + [
            {"rank": i, "topic": f"nut {i}", "category": "nutrition",
             "slug": f"nut-{i}", "score": 80 - i, "rationale": ""}
            for i in range(1, 4)
        ]
        + [
            {"rank": i, "topic": f"tip {i}", "category": "tips",
             "slug": f"tip-{i}", "score": 60 - i, "rationale": ""}
            for i in range(1, 6)
        ]
    )

    def _fake_generate(prompt, api_key, schema=None, temperature=0.2, timeout=60):
        # First call = full skewed list. Topups = enough of the requested category.
        cat_enum = schema["properties"]["topics"]["items"]["properties"]["category"]["enum"]
        if set(cat_enum) == {"recipes", "nutrition", "tips"}:
            return {"topics": skewed}
        # single-category topup
        only = cat_enum[0]
        return {
            "topics": [
                {"rank": i, "topic": f"new {only} {i}", "category": only,
                 "slug": f"new-{only}-{i}", "score": 40 - i, "rationale": "topup"}
                for i in range(1, 20)
            ]
        }

    with patch("scripts.topic_research.stage2.generate", side_effect=_fake_generate):
        result = run_stage2(
            keywords_csv_path=keywords_csv,
            boards_csv_path=boards_csv,
            db_path=db_path,
            articles_dir=str(tmp_path / "no_articles"),
            topics_file=str(tmp_path / "no_topics.md"),
            gemini_api_key="fake-key",
            balance="20:15:15",
        )

    conn = open_db(db_path)
    db_rows = read_stage2_output(conn, result["run_id"])
    conn.close()

    counts: dict[str, int] = {}
    for r in db_rows:
        counts[r["category"]] = counts.get(r["category"], 0) + 1
    assert counts == {"recipes": 20, "nutrition": 15, "tips": 15}
    assert len(db_rows) == 50
    # Re-ranked globally
    assert [r["rank"] for r in db_rows] == list(range(1, 51))


def test_run_stage2_no_balance_preserves_legacy_behavior(tmp_path):
    """Default balance=None must not touch the topics returned by Gemini."""
    keywords_csv = _write_pi_keywords_csv(tmp_path)
    boards_csv = _write_pi_boards_csv(tmp_path)
    db_path = str(tmp_path / "test.sqlite")

    with patch("scripts.topic_research.stage2.generate", return_value=SAMPLE_GEMINI_RESPONSE):
        result = run_stage2(
            keywords_csv_path=keywords_csv,
            boards_csv_path=boards_csv,
            db_path=db_path,
            articles_dir=str(tmp_path / "no_articles"),
            topics_file=str(tmp_path / "no_topics.md"),
            gemini_api_key="fake-key",
        )

    assert len(result["topics"]) == 50


def test_run_stage2_works_without_prior_stage1_run(tmp_path):
    """Stage 2 should not crash when there are no stage1 runs in DB."""
    keywords_csv = _write_pi_keywords_csv(tmp_path)
    boards_csv = _write_pi_boards_csv(tmp_path)
    db_path = str(tmp_path / "test.sqlite")

    with patch("scripts.topic_research.stage2.generate", return_value=SAMPLE_GEMINI_RESPONSE):
        result = run_stage2(
            keywords_csv_path=keywords_csv,
            boards_csv_path=boards_csv,
            db_path=db_path,
            articles_dir=str(tmp_path / "no_articles"),
            topics_file=str(tmp_path / "no_topics.md"),
            gemini_api_key="fake-key",
        )

    assert result["run_id"] is not None
    assert len(result["topics"]) == 50
