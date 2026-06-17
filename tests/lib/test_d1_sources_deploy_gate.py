"""Test that d1_sources reads reviewed markdown, not original."""
import sys
import sqlite3
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "scripts" / "NEW_PIPELINE_2026-05-08"))

import pytest


def _create_test_db(db_path: str):
    con = sqlite3.connect(db_path)
    con.executescript("""
        CREATE TABLE write_outputs (
            slug TEXT, category TEXT, markdown TEXT, status TEXT,
            disqualified INTEGER DEFAULT 0, topic_rank INTEGER DEFAULT 1
        );
        CREATE TABLE review_outputs (
            slug TEXT, reviewed_markdown TEXT
        );
    """)
    return con


class TestFetchArticlesReadsReviewedMarkdown:

    def test_prefers_reviewed_markdown(self, tmp_path):
        db_path = str(tmp_path / "test.sqlite")
        con = _create_test_db(db_path)
        con.execute(
            "INSERT INTO write_outputs VALUES (?, ?, ?, ?, 0, 1)",
            ("test-slug", "recipes",
             "---\ntitle: Original\n---\nOriginal body", "reviewed"),
        )
        con.execute(
            "INSERT INTO review_outputs VALUES (?, ?)",
            ("test-slug",
             "---\ntitle: Reviewed\n---\nReviewed body"),
        )
        con.commit()
        con.close()

        from lib.d1_sources import fetch_articles_from_sql
        articles = fetch_articles_from_sql(db_path)
        assert len(articles) == 1
        assert "Reviewed body" in articles[0]["markdown"]
        assert articles[0]["title"] == "Reviewed"

    def test_falls_back_to_write_outputs_when_no_review(self, tmp_path):
        db_path = str(tmp_path / "test.sqlite")
        con = _create_test_db(db_path)
        con.execute(
            "INSERT INTO write_outputs VALUES (?, ?, ?, ?, 0, 1)",
            ("test-slug", "recipes",
             "---\ntitle: Original\n---\nOriginal body", "reviewed"),
        )
        con.commit()
        con.close()

        from lib.d1_sources import fetch_articles_from_sql
        articles = fetch_articles_from_sql(db_path)
        assert len(articles) == 1
        assert "Original body" in articles[0]["markdown"]

    def test_written_only_included_when_review_is_not_enabled(self, tmp_path):
        db_path = str(tmp_path / "test.sqlite")
        con = _create_test_db(db_path)
        con.execute(
            "INSERT INTO write_outputs VALUES (?, ?, ?, ?, 0, 1)",
            ("test-slug", "recipes",
             "---\ntitle: Written Only\n---\nBody", "written"),
        )
        con.commit()
        con.close()

        from lib.d1_sources import fetch_articles_from_sql
        articles = fetch_articles_from_sql(db_path)
        assert len(articles) == 1
        assert articles[0]["title"] == "Written Only"

    def test_disqualified_excluded(self, tmp_path):
        db_path = str(tmp_path / "test.sqlite")
        con = _create_test_db(db_path)
        con.execute(
            "INSERT INTO write_outputs VALUES (?, ?, ?, ?, 1, 1)",
            ("test-slug", "recipes",
             "---\ntitle: DQ Article\n---\nBody", "reviewed"),
        )
        con.commit()
        con.close()

        from lib.d1_sources import fetch_articles_from_sql
        articles = fetch_articles_from_sql(db_path)
        assert len(articles) == 0

    def test_uses_latest_write_and_latest_review_for_duplicate_slug(self, tmp_path):
        db_path = str(tmp_path / "test.sqlite")
        con = _create_test_db(db_path)
        con.execute(
            "INSERT INTO write_outputs VALUES (?, ?, ?, ?, 0, 1)",
            ("test-slug", "recipes",
             "---\ntitle: Old Write\n---\nOld write body", "reviewed"),
        )
        con.execute(
            "INSERT INTO review_outputs VALUES (?, ?)",
            ("test-slug",
             "---\ntitle: Old Review\n---\nOld review body"),
        )
        con.execute(
            "INSERT INTO write_outputs VALUES (?, ?, ?, ?, 0, 1)",
            ("test-slug", "recipes",
             "---\ntitle: New Write\n---\nNew write body", "reviewed"),
        )
        con.execute(
            "INSERT INTO review_outputs VALUES (?, ?)",
            ("test-slug",
             "---\ntitle: New Review\n---\nNew review body"),
        )
        con.commit()
        con.close()

        from lib.d1_sources import fetch_articles_from_sql
        articles = fetch_articles_from_sql(db_path)
        assert len(articles) == 1
        assert articles[0]["title"] == "New Review"
        assert "New review body" in articles[0]["markdown"]
