"""Tests for reading existing site articles + pending topics."""
from pathlib import Path

import pytest

try:
    from scripts.topic_research.sources.site_articles import (
        read_published_articles,
        read_pending_topics,
    )
except ImportError:
    read_published_articles = None
    read_pending_topics = None


FIXTURES = Path(__file__).parent / "fixtures"


def test_module_exists():
    assert read_published_articles is not None
    assert read_pending_topics is not None


def test_reads_all_articles_in_dir(tmp_path):
    # Copy fixture files to a tmp dir
    import shutil
    for f in FIXTURES.glob("article_sample_*.md"):
        shutil.copy(f, tmp_path / f.name)

    articles = read_published_articles(tmp_path)
    assert len(articles) == 2


def test_article_fields(tmp_path):
    import shutil
    shutil.copy(FIXTURES / "article_sample_01.md", tmp_path / "a.md")
    arts = read_published_articles(tmp_path)
    a = arts[0]
    assert a["title"] == "Easy High Fiber Soup Recipe"
    assert a["slug"] == "a"
    assert a["category"] == "recipes"
    assert "HighFiberSoup" in a["tags"]
    assert a["date"] == "2026-03-10"


def test_ignores_non_md_files(tmp_path):
    (tmp_path / "notes.txt").write_text("not an article")
    (tmp_path / "ok.md").write_text(FIXTURES.joinpath("article_sample_01.md").read_text(encoding="utf-8"))
    arts = read_published_articles(tmp_path)
    assert len(arts) == 1


def test_missing_dir_returns_empty_list(tmp_path):
    arts = read_published_articles(tmp_path / "nope")
    assert arts == []


def test_read_pending_topics_parses_md_list(tmp_path):
    """pipeline-data/topics-to-write.md has '- Topic Name' format."""
    (tmp_path / "topics.md").write_text(
        "# Topics\n\n"
        "- Homemade Salad Dressing Variety Pack\n"
        "- High Fiber Soup Recipes for Meal Prep\n"
        "- 15 Healthy Sandwich Ideas for Lunch\n"
        "\n"
        "Some prose that should be ignored.\n"
        "- Another topic with a colon: Including Special Chars\n",
        encoding="utf-8",
    )
    topics = read_pending_topics(tmp_path / "topics.md")
    assert "Homemade Salad Dressing Variety Pack" in topics
    assert "High Fiber Soup Recipes for Meal Prep" in topics
    assert "15 Healthy Sandwich Ideas for Lunch" in topics
    assert "Another topic with a colon: Including Special Chars" in topics
    assert len(topics) == 4


def test_read_pending_topics_missing_file_returns_empty(tmp_path):
    topics = read_pending_topics(tmp_path / "nope.md")
    assert topics == []
