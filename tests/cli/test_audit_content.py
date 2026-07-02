from __future__ import annotations

import sqlite3
from datetime import datetime, timezone
from pathlib import Path

from scripts.audit_content import (
    build_triage,
    classify_url,
    collect_articles,
    init_schema,
    markdown_word_count,
    parse_frontmatter,
    split_frontmatter,
)


def test_parse_frontmatter_reads_scalars_and_lists():
    raw = """
title: "Demo"
category: recipes
tags:
  - fiber
  - dinner
servings: 4
"""
    data = parse_frontmatter(raw)

    assert data["title"] == "Demo"
    assert data["category"] == "recipes"
    assert data["tags"] == ["fiber", "dinner"]
    assert data["servings"] == 4


def test_split_frontmatter_preserves_body_for_word_count():
    markdown = "---\ntitle: Demo\n---\n# Heading\nReal body words live here."
    parsed = split_frontmatter(markdown)

    assert parsed.frontmatter["title"] == "Demo"
    assert markdown_word_count(parsed.body) == 6


def test_classify_article_alias_variant_and_off_topic():
    article_slugs = {"good-source-of-fiber-label-meaning"}
    aliases = {"what-is-good-fiber": "good-source-of-fiber-label-meaning"}
    variants = {"fiber-label-tips": "good-source-of-fiber-label-meaning"}

    assert classify_url(
        "good-source-of-fiber-label-meaning",
        "/good-source-of-fiber-label-meaning/",
        article_slugs,
        aliases,
        variants,
    ) == ("article", "good-source-of-fiber-label-meaning")
    assert classify_url("what-is-good-fiber", "/what-is-good-fiber/", article_slugs, aliases, variants) == (
        "alias",
        "good-source-of-fiber-label-meaning",
    )
    assert classify_url("fiber-label-tips", "/fiber-label-tips/", article_slugs, aliases, variants) == (
        "router_variant",
        "good-source-of-fiber-label-meaning",
    )
    assert classify_url(
        "good-source-of-fiber-label-meaning-v2",
        "/good-source-of-fiber-label-meaning-v2/",
        article_slugs,
        aliases,
        variants,
    ) == ("router_variant", "good-source-of-fiber-label-meaning")
    assert classify_url(
        "usual-excuses-made-by-high-conflict-parents",
        "/usual-excuses-made-by-high-conflict-parents/",
        article_slugs,
        aliases,
        variants,
    ) == ("legacy_gone", None)
    assert classify_url(
        "simple-snack-portioning-guide",
        "/simple-snack-portioning-guide/",
        article_slugs,
        aliases,
        variants,
    ) == ("legacy_redirect", "grab-and-go-fridge-snack-drawer")
    assert classify_url("about", "/about/", article_slugs, aliases, variants) == ("static_page", "about")


def test_zero_byte_real_article_is_not_delete_recommendation():
    conn = sqlite3.connect(":memory:")
    conn.row_factory = sqlite3.Row
    init_schema(conn)
    conn.execute(
        """
        INSERT INTO articles (
          slug, file_path, title, excerpt, category, tags_json, image, image_alt,
          date, publish_at, author, body_word_count, frontmatter_complete,
          missing_fields_json, is_recipe, recipe_schema_complete,
          missing_recipe_fields_json, faq_count, image_exists, is_released,
          canonical_url, expected_robots, expected_sitemap_indexable
        ) VALUES (
          'oatmeal-vs-grits-fiber-content', 'src/data/articles/oatmeal-vs-grits-fiber-content.md',
          'Title', 'Excerpt', 'nutrition', '[]', '/images/demo.jpg', 'alt',
          '2026-02-03', NULL, 'David Miller', 792, 1, '[]', 0, 1, '[]',
          5, 1, 1, 'https://www.daily-life-hacks.com/oatmeal-vs-grits-fiber-content/',
          'index', 1
        )
        """
    )
    conn.execute(
        """
        INSERT INTO bing_urls (
          url, host, path, slug, impressions, clicks, last_crawled,
          discovered_on, http_code, document_size, backlinks
        ) VALUES (
          'https://www.daily-life-hacks.com/oatmeal-vs-grits-fiber-content/',
          'www.daily-life-hacks.com', '/oatmeal-vs-grits-fiber-content/',
          'oatmeal-vs-grits-fiber-content', 7, 1, NULL, NULL, 200, 0, 0
        )
        """
    )

    build_triage(conn)

    row = conn.execute("SELECT recommended_action, rationale FROM triage_candidates").fetchone()
    assert row["recommended_action"] == "verify_live_render_before_content_action"
    assert "do not delete" in row["rationale"].lower()


def test_collect_articles_has_current_repo_articles():
    rows = collect_articles(datetime.now(timezone.utc))

    assert rows
    assert any(row["slug"] == "high-fiber-fast-food-options-guide" for row in rows)
    assert all("body_word_count" in row for row in rows)
