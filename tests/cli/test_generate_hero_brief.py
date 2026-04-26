"""Tests for scripts/generate_hero_brief.py.

TDD Task 4 — RED phase.
LLM call is mocked. We verify:
- markdown ingestion (frontmatter + body digest)
- JSON extraction (plain / code fence / embedded)
- schema validation integration (bad LLM output → ValueError)
- JSONL append + idempotency + --force + --dry-run
"""
from __future__ import annotations

import json

import pytest

try:
    from scripts.generate_hero_brief import (
        main,
        generate_hero_brief,
        load_article,
        load_existing_slugs,
        append_record,
        extract_json_object,
        parse_frontmatter,
        first_paragraphs,
    )
    _IMPORT_OK = True
except ImportError:
    _IMPORT_OK = False


# ── helpers ──────────────────────────────────────────────────────────────────

def _good_llm(article):
    return {
        "prompt": "An overhead shot of a kitchen scene in soft natural daylight.",
        "alt": "An overhead photo of a kitchen counter with neatly arranged ingredients on a white surface.",
    }


def _setup_article(tmp_path, monkeypatch, slug: str = "demo"):
    articles_dir = tmp_path / "articles"
    articles_dir.mkdir()
    (articles_dir / f"{slug}.md").write_text(
        '---\ntitle: "Demo Article"\n---\nBody paragraph one.\n',
        encoding="utf-8",
    )
    out_path = tmp_path / "out.jsonl"
    monkeypatch.setattr("scripts.generate_hero_brief.ARTICLES_DIR", articles_dir)
    monkeypatch.setattr("scripts.generate_hero_brief.OUTPUT_PATH", out_path)
    return articles_dir, out_path


# ── 1. module imports ────────────────────────────────────────────────────────

def test_module_imports():
    assert _IMPORT_OK, "Could not import scripts.generate_hero_brief"


# ── 2. parse_frontmatter ─────────────────────────────────────────────────────

def test_parse_frontmatter_basic():
    md = '---\ntitle: "Cheap Dinners"\ncategory: "recipes"\n---\nBody text here.\n'
    front, body = parse_frontmatter(md)
    assert front["title"] == "Cheap Dinners"
    assert front["category"] == "recipes"
    assert body.strip() == "Body text here."


def test_parse_frontmatter_missing():
    front, body = parse_frontmatter("Just body, no frontmatter.\n")
    assert front == {}
    assert "Just body" in body


# ── 3. first_paragraphs ──────────────────────────────────────────────────────

def test_first_paragraphs_skips_headings():
    body = "# Heading\n\nFirst paragraph here.\n\n## Sub\n\nSecond paragraph."
    out = first_paragraphs(body)
    assert "First paragraph" in out
    assert "Second paragraph" in out
    assert "# Heading" not in out
    assert "## Sub" not in out


def test_first_paragraphs_truncates():
    body = " ".join(["word"] * 300)
    out = first_paragraphs(body, max_words=50)
    assert len(out.split()) <= 51


# ── 4. extract_json_object ───────────────────────────────────────────────────

def test_extract_json_plain():
    obj = extract_json_object('{"prompt": "p", "alt": "a"}')
    assert obj == {"prompt": "p", "alt": "a"}


def test_extract_json_code_fence():
    obj = extract_json_object('```json\n{"prompt": "p", "alt": "a"}\n```')
    assert obj["prompt"] == "p"


def test_extract_json_embedded():
    obj = extract_json_object('Here is the brief: {"prompt": "p", "alt": "a"} OK')
    assert obj["alt"] == "a"


# ── 5. load_article ──────────────────────────────────────────────────────────

def test_load_article_reads_md(tmp_path, monkeypatch):
    articles_dir = tmp_path / "articles"
    articles_dir.mkdir()
    (articles_dir / "test-slug.md").write_text(
        '---\ntitle: "Test Article"\n---\nThe quick brown fox jumps over the lazy dog.\n',
        encoding="utf-8",
    )
    monkeypatch.setattr("scripts.generate_hero_brief.ARTICLES_DIR", articles_dir)
    a = load_article("test-slug")
    assert a["slug"] == "test-slug"
    assert a["title"] == "Test Article"
    assert "quick brown fox" in a["body_digest"]


def test_load_article_missing_raises(tmp_path, monkeypatch):
    monkeypatch.setattr("scripts.generate_hero_brief.ARTICLES_DIR", tmp_path)
    with pytest.raises(FileNotFoundError):
        load_article("does-not-exist")


# ── 6. JSONL round-trip ──────────────────────────────────────────────────────

def test_append_and_load_existing(tmp_path):
    p = tmp_path / "out.jsonl"
    append_record(p, {"article_slug": "a", "prompt": "p", "alt": "a"})
    append_record(p, {"article_slug": "b", "prompt": "p", "alt": "a"})
    slugs = load_existing_slugs(p)
    assert slugs == {"a", "b"}


def test_load_existing_returns_empty_when_no_file(tmp_path):
    assert load_existing_slugs(tmp_path / "missing.jsonl") == set()


# ── 7. generate_hero_brief with mock LLM ─────────────────────────────────────

def test_generate_hero_brief_with_mock_returns_valid(tmp_path, monkeypatch):
    _setup_article(tmp_path, monkeypatch)
    brief = generate_hero_brief("demo", llm_call=_good_llm)
    assert brief.article_slug == "demo"
    assert "kitchen" in brief.prompt


def test_generate_hero_brief_invalid_llm_output_raises(tmp_path, monkeypatch):
    _setup_article(tmp_path, monkeypatch)

    def bad_llm(article):
        return {
            "prompt": "ok prompt here that is long enough to look real",
            "alt": "alt — with em-dash inside the description text right here.",
        }

    with pytest.raises(ValueError):
        generate_hero_brief("demo", llm_call=bad_llm)


# ── 8. CLI ───────────────────────────────────────────────────────────────────

def test_cli_dry_run_does_not_write(tmp_path, monkeypatch, capsys):
    _, out_path = _setup_article(tmp_path, monkeypatch)
    rc = main(["--slug", "demo", "--dry-run"], llm_call=_good_llm)
    assert rc == 0
    assert not out_path.exists()
    captured = capsys.readouterr()
    assert "kitchen" in captured.out


def test_cli_writes_to_jsonl(tmp_path, monkeypatch):
    _, out_path = _setup_article(tmp_path, monkeypatch)
    rc = main(["--slug", "demo"], llm_call=_good_llm)
    assert rc == 0
    assert out_path.exists()
    obj = json.loads(out_path.read_text(encoding="utf-8").strip())
    assert obj["article_slug"] == "demo"


def test_cli_idempotent_skip(tmp_path, monkeypatch):
    _, out_path = _setup_article(tmp_path, monkeypatch)
    main(["--slug", "demo"], llm_call=_good_llm)

    def boom(article):
        raise AssertionError("LLM should not be called when slug already present")

    rc = main(["--slug", "demo"], llm_call=boom)
    assert rc == 0
    lines = out_path.read_text(encoding="utf-8").strip().splitlines()
    assert len(lines) == 1


def test_cli_force_overwrites(tmp_path, monkeypatch):
    _, out_path = _setup_article(tmp_path, monkeypatch)
    main(["--slug", "demo"], llm_call=_good_llm)

    def alt_llm(article):
        return {
            "prompt": "A different overhead kitchen scene at golden hour with warm tones.",
            "alt": "An overhead photo of a kitchen counter at golden hour with warm afternoon light streaming in.",
        }

    rc = main(["--slug", "demo", "--force"], llm_call=alt_llm)
    assert rc == 0
    lines = out_path.read_text(encoding="utf-8").strip().splitlines()
    assert len(lines) == 1
    obj = json.loads(lines[0])
    assert "golden hour" in obj["prompt"]


# ── retry on stochastic validation failure ───────────────────────────────────

def test_generate_hero_brief_retries_when_validation_fails(tmp_path, monkeypatch):
    """LLM is non-deterministic. When a sample's alt contains a banned word
    or em-dash, the next sample will likely pass. Script must retry."""
    _setup_article(tmp_path, monkeypatch)

    call_count = {"n": 0}

    def flaky_llm(article):
        call_count["n"] += 1
        out = _good_llm(article)
        if call_count["n"] == 1:
            out["alt"] = "An overhead photo with em-dash — inserted into the alt text intentionally to fail validation."
        return out

    brief = generate_hero_brief("demo", llm_call=flaky_llm)
    assert brief.article_slug == "demo"
    assert "—" not in brief.alt
    assert call_count["n"] == 2, f"expected 2 LLM calls, got {call_count['n']}"


def test_generate_hero_brief_gives_up_after_max_retries(tmp_path, monkeypatch):
    """When every sample fails, the retry loop must terminate with a clear error."""
    _setup_article(tmp_path, monkeypatch)

    call_count = {"n": 0}

    def always_bad_llm(article):
        call_count["n"] += 1
        out = _good_llm(article)
        out["alt"] = "An overhead photo with em-dash — inserted to always fail validation across attempts."
        return out

    with pytest.raises(ValueError):
        generate_hero_brief("demo", llm_call=always_bad_llm)
    assert call_count["n"] >= 3, f"expected >=3 attempts, got {call_count['n']}"
    assert call_count["n"] <= 10, f"too many attempts ({call_count['n']}), retry cap missing"
