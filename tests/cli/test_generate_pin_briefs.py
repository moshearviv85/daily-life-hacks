"""Tests for scripts/generate_pin_briefs.py.

TDD Task 5 — RED phase.
LLM call is mocked. Verifies the pin-briefs pipeline:
- markdown ingestion (frontmatter + body digest, shared with hero script)
- LLM JSON extraction → 4 raw pins → pin-slug derivation in Python
- schema validation integration (PinBriefSet, 4-unique constraint)
- JSONL append + idempotency + --force + --dry-run
"""
from __future__ import annotations

import json

import pytest

try:
    from scripts.generate_pin_briefs import (
        main,
        generate_pin_briefs,
        load_existing_slugs,
        append_record,
    )
    _IMPORT_OK = True
except ImportError:
    _IMPORT_OK = False


# ── helpers ──────────────────────────────────────────────────────────────────

def _good_llm(article):
    return {
        "pins": [
            {
                "title": "5 Pantry Swaps That Cut Your Grocery Bill in Half",
                "prompt": 'A cinematic overhead photo of a kitchen pantry. Render the text "5 Pantry Swaps That Cut Your Grocery Bill in Half" prominently across the top.',
                "alt": "An overhead photo of a kitchen pantry with neatly arranged glass jars on a wooden shelf.",
            },
            {
                "title": "The Ingredient Costing You $40 a Week",
                "prompt": 'A close-up of a grocery receipt next to one ingredient. Render the text "The Ingredient Costing You $40 a Week" boldly in the top half.',
                "alt": "A close-up photo of a grocery receipt next to a single ingredient highlighted in red.",
            },
            {
                "title": "Why Bulk Buying Backfires for Most Families",
                "prompt": 'A wide shot of a family cart at supermarket checkout. Render the text "Why Bulk Buying Backfires for Most Families" across the lower band.',
                "alt": "A wide photo of a family cart at the supermarket checkout filled with bulk packages.",
            },
            {
                "title": "Cheap Dinners My Kids Actually Eat",
                "prompt": 'A photo of a smiling child holding a plate of pasta. Render the text "Cheap Dinners My Kids Actually Eat" in a friendly typography on the side.',
                "alt": "A photo of a smiling child holding a plate of pasta with simple toppings on it.",
            },
        ]
    }


def _setup_article(tmp_path, monkeypatch, slug: str = "demo"):
    articles_dir = tmp_path / "articles"
    articles_dir.mkdir()
    (articles_dir / f"{slug}.md").write_text(
        '---\ntitle: "Demo Article"\n---\nBody paragraph one.\n',
        encoding="utf-8",
    )
    out_path = tmp_path / "out.jsonl"
    monkeypatch.setattr("scripts.generate_pin_briefs.ARTICLES_DIR", articles_dir)
    monkeypatch.setattr("scripts.generate_pin_briefs.OUTPUT_PATH", out_path)
    return articles_dir, out_path


# ── 1. module imports ────────────────────────────────────────────────────────

def test_module_imports():
    assert _IMPORT_OK, "Could not import scripts.generate_pin_briefs"


# ── 2. generate_pin_briefs with mock LLM ─────────────────────────────────────

def test_generate_pin_briefs_returns_pin_brief_set(tmp_path, monkeypatch):
    _setup_article(tmp_path, monkeypatch)
    pset = generate_pin_briefs("demo", llm_call=_good_llm)
    assert pset.article_slug == "demo"
    assert len(pset.pins) == 4


def test_generate_pin_briefs_derives_unique_slugs(tmp_path, monkeypatch):
    _setup_article(tmp_path, monkeypatch)
    pset = generate_pin_briefs("demo", llm_call=_good_llm)
    slugs = [p.slug for p in pset.pins]
    assert len(set(slugs)) == 4
    assert all(slugs)  # none empty


def test_generate_pin_briefs_invalid_em_dash_raises(tmp_path, monkeypatch):
    _setup_article(tmp_path, monkeypatch)
    bad = _good_llm(None)
    bad["pins"][0]["alt"] = "An overhead photo — with em-dash inserted into the alt text intentionally."
    with pytest.raises(ValueError):
        generate_pin_briefs("demo", llm_call=lambda a: bad)


def test_generate_pin_briefs_three_pins_raises(tmp_path, monkeypatch):
    _setup_article(tmp_path, monkeypatch)
    bad = _good_llm(None)
    bad["pins"] = bad["pins"][:3]
    with pytest.raises(ValueError):
        generate_pin_briefs("demo", llm_call=lambda a: bad)


def test_generate_pin_briefs_duplicate_titles_raises(tmp_path, monkeypatch):
    _setup_article(tmp_path, monkeypatch)
    bad = _good_llm(None)
    bad["pins"][1]["title"] = bad["pins"][0]["title"]
    bad["pins"][1]["prompt"] = bad["pins"][0]["prompt"]
    with pytest.raises(ValueError):
        generate_pin_briefs("demo", llm_call=lambda a: bad)


def test_generate_pin_briefs_prompt_missing_title_raises(tmp_path, monkeypatch):
    _setup_article(tmp_path, monkeypatch)
    bad = _good_llm(None)
    bad["pins"][0]["prompt"] = "A photo with bold text overlay but no exact title rendered."
    with pytest.raises(ValueError):
        generate_pin_briefs("demo", llm_call=lambda a: bad)


# ── 3. JSONL persistence ─────────────────────────────────────────────────────

def test_append_and_load_existing(tmp_path):
    p = tmp_path / "pin-briefs.jsonl"
    append_record(p, {"article_slug": "a", "pins": []})
    append_record(p, {"article_slug": "b", "pins": []})
    assert load_existing_slugs(p) == {"a", "b"}


# ── 4. CLI ───────────────────────────────────────────────────────────────────

def test_cli_dry_run_does_not_write(tmp_path, monkeypatch, capsys):
    _, out_path = _setup_article(tmp_path, monkeypatch)
    rc = main(["--slug", "demo", "--dry-run"], llm_call=_good_llm)
    assert rc == 0
    assert not out_path.exists()
    captured = capsys.readouterr()
    assert "Pantry Swaps" in captured.out


def test_cli_writes_to_jsonl(tmp_path, monkeypatch):
    _, out_path = _setup_article(tmp_path, monkeypatch)
    rc = main(["--slug", "demo"], llm_call=_good_llm)
    assert rc == 0
    obj = json.loads(out_path.read_text(encoding="utf-8").strip())
    assert obj["article_slug"] == "demo"
    assert len(obj["pins"]) == 4
    assert all("slug" in p and "title" in p for p in obj["pins"])


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
        out = _good_llm(article)
        for p in out["pins"]:
            p["title"] = p["title"] + " (V2)"
            p["prompt"] = p["prompt"].replace(p["title"][:-5], p["title"])
            # rewrite prompt to embed the new title
            new_title = p["title"]
            p["prompt"] = f'An updated photo. Render the text "{new_title}" in the top band.'
        return out

    rc = main(["--slug", "demo", "--force"], llm_call=alt_llm)
    assert rc == 0
    lines = out_path.read_text(encoding="utf-8").strip().splitlines()
    assert len(lines) == 1
    obj = json.loads(lines[0])
    assert all("(V2)" in p["title"] for p in obj["pins"])


# ── retry on stochastic validation failure ───────────────────────────────────

def test_generate_pin_briefs_retries_when_validation_fails(tmp_path, monkeypatch):
    """LLM is non-deterministic (temperature 0.95). When a sample contains a
    banned AI word ('Unlock'), the next sample will likely pass. The script
    must retry internally instead of failing the user."""
    _setup_article(tmp_path, monkeypatch)

    call_count = {"n": 0}

    def flaky_llm(article):
        call_count["n"] += 1
        out = _good_llm(article)
        if call_count["n"] == 1:
            out["pins"][0]["title"] = "Unlock the Secret Pantry"
            out["pins"][0]["prompt"] = 'A photo. Render the text "Unlock the Secret Pantry" in the top band.'
        return out

    pset = generate_pin_briefs("demo", llm_call=flaky_llm)
    assert pset.article_slug == "demo"
    assert len(pset.pins) == 4
    assert call_count["n"] == 2, f"expected 2 LLM calls (1 fail + 1 retry), got {call_count['n']}"


def test_generate_pin_briefs_gives_up_after_max_retries(tmp_path, monkeypatch):
    """When every sample fails validation, the retry loop must terminate with
    a clear error after a bounded number of attempts."""
    _setup_article(tmp_path, monkeypatch)

    call_count = {"n": 0}

    def always_bad_llm(article):
        call_count["n"] += 1
        out = _good_llm(article)
        out["pins"][0]["title"] = "Unlock the Best Recipe"
        out["pins"][0]["prompt"] = 'A photo. Render the text "Unlock the Best Recipe" in the top band.'
        return out

    with pytest.raises(ValueError):
        generate_pin_briefs("demo", llm_call=always_bad_llm)
    assert call_count["n"] >= 3, f"expected >=3 attempts before giving up, got {call_count['n']}"
    assert call_count["n"] <= 10, f"too many attempts ({call_count['n']}), retry cap missing"
