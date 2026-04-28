"""Tests for scripts/lib/frontmatter.py — clean_frontmatter for site deploys."""
from __future__ import annotations

import re
from datetime import date

import pytest

try:
    from scripts.lib.frontmatter import clean_frontmatter
    _IMPORT_OK = True
except ImportError:
    _IMPORT_OK = False


def test_module_imports():
    assert _IMPORT_OK


def test_clean_frontmatter_sets_date_to_today():
    md = '---\ntitle: "Demo"\ndate: 2025-01-01\n---\nBody.\n'
    out = clean_frontmatter(md)
    today = date.today().isoformat()
    assert f"date: {today}" in out
    assert "2025-01-01" not in out


def test_clean_frontmatter_removes_publishAt():
    md = '---\ntitle: "Demo"\ndate: 2026-04-28\npublishAt: "2030-01-01"\n---\nBody.\n'
    out = clean_frontmatter(md)
    assert "publishAt" not in out
    assert "2030-01-01" not in out


def test_clean_frontmatter_normalizes_author():
    md = '---\ntitle: "Demo"\ndate: 2026-04-28\nauthor: "Some Other Author"\n---\nBody.\n'
    out = clean_frontmatter(md)
    assert 'author: "David Miller"' in out
    assert "Some Other Author" not in out


def test_clean_frontmatter_collapses_blank_lines():
    md = '---\ntitle: "Demo"\ndate: 2026-04-28\n---\n\n\n\nBody starts here.\n'
    out = clean_frontmatter(md)
    assert "\n\n\n" not in out


def test_clean_frontmatter_preserves_body_content():
    md = '---\ntitle: "Demo"\ndate: 2026-04-28\n---\n# Heading\nFirst paragraph.\n## Subhead\nSecond paragraph.\n'
    out = clean_frontmatter(md)
    assert "# Heading" in out
    assert "First paragraph" in out
    assert "## Subhead" in out
    assert "Second paragraph" in out


def test_clean_frontmatter_preserves_other_frontmatter_fields():
    md = (
        "---\n"
        'title: "Demo Article"\n'
        'category: "recipes"\n'
        'image: "/images/demo-main.jpg"\n'
        'imageAlt: "An alt text."\n'
        "tags:\n"
        "  - tag1\n"
        "  - tag2\n"
        "date: 2025-01-01\n"
        "---\n"
        "Body.\n"
    )
    out = clean_frontmatter(md)
    assert 'title: "Demo Article"' in out
    assert 'category: "recipes"' in out
    assert 'image: "/images/demo-main.jpg"' in out
    assert 'imageAlt: "An alt text."' in out
    assert "- tag1" in out


def test_clean_frontmatter_idempotent():
    md = '---\ntitle: "Demo"\ndate: 2025-01-01\nauthor: "Old"\npublishAt: "2030"\n---\nBody.\n'
    once = clean_frontmatter(md)
    twice = clean_frontmatter(once)
    assert once == twice
