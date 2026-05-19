"""Regression tests for the GitHub Actions pipeline hero brief generator."""
from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

import pytest


SCRIPT_DIR = Path(__file__).resolve().parents[2] / "scripts" / "NEW_PIPELINE_2026-05-08"
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

SPEC = importlib.util.spec_from_file_location(
    "new_pipeline_generate_hero_brief",
    SCRIPT_DIR / "generate_hero_brief.py",
)
assert SPEC and SPEC.loader
new_hero = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(new_hero)


def _setup_article(tmp_path, monkeypatch, slug: str = "demo"):
    articles_dir = tmp_path / "articles"
    articles_dir.mkdir()
    (articles_dir / f"{slug}.md").write_text(
        '---\ntitle: "Demo Article"\n---\nBody paragraph one.\n',
        encoding="utf-8",
    )
    monkeypatch.setattr(new_hero, "ARTICLES_DIR", articles_dir)
    monkeypatch.setattr(new_hero, "markdown_for_slug", lambda s: None)


def test_new_pipeline_hero_brief_uses_llm_alt_not_prompt(tmp_path, monkeypatch):
    _setup_article(tmp_path, monkeypatch)

    def llm(article):
        return {
            "prompt": "A long photography prompt that should never become screen-reader alt text.",
            "alt": "A plate of cooked chicken on a wooden board with fresh herbs.",
        }

    brief = new_hero.generate_hero_brief("demo", llm_call=llm)
    assert brief.prompt == llm(None)["prompt"]
    assert brief.alt == llm(None)["alt"]


def test_new_pipeline_hero_brief_rejects_alt_over_200_chars(tmp_path, monkeypatch):
    _setup_article(tmp_path, monkeypatch)

    def llm(article):
        return {
            "prompt": "A clean overhead kitchen photograph with natural light and a simple plate.",
            "alt": "A " + "very detailed " * 25 + "photo of food on a plate.",
        }

    with pytest.raises(ValueError):
        new_hero.generate_hero_brief("demo", llm_call=llm)
