"""Tests for scripts/sync_legacy_pins.py.

Sends pre-existing pin metadata (pins-export.csv) to /api/pins-upload?append=1
so legacy pins queue up after whatever PENDING is already in D1, without
duplicating POSTED rows."""
from __future__ import annotations

import csv
import io

import pytest

try:
    from scripts.sync_legacy_pins import main
    _IMPORT_OK = True
except ImportError:
    _IMPORT_OK = False


def test_module_imports():
    assert _IMPORT_OK


# ── HTTP fake ────────────────────────────────────────────────────────────────

class FakePost:
    def __init__(self, responses=None):
        self.calls = []
        self._responses = list(responses) if responses else []

    def __call__(self, url, *, body, key):
        self.calls.append({"url": url, "body": body, "key": key})
        if self._responses:
            return self._responses.pop(0)
        return (200, '{"ok":true,"inserted":2}')


# ── fixtures ─────────────────────────────────────────────────────────────────

def _setup(tmp_path):
    csv_p = tmp_path / "pins-export.csv"
    cols = ["image_filename", "pin_title", "description", "destination_url", "board", "alt_text"]
    with csv_p.open("w", encoding="utf-8", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=cols); w.writeheader()
        for slug, var in [("live-recipe", 1), ("live-recipe", 2), ("live-tip", 1), ("orphan", 1)]:
            w.writerow({
                "image_filename": f"{slug}_v{var}.jpg",
                "pin_title":      f"{slug} title v{var}",
                "description":    f"{slug} description that has length over 80 characters to feel realistic. CTA.",
                "destination_url": f"https://example.com/{slug}",
                "board":          "Healthy Recipes",  # dirty value, ignored
                "alt_text":       f"{slug} alt v{var}",
            })

    articles = tmp_path / "articles"
    articles.mkdir()
    (articles / "live-recipe.md").write_text(
        '---\ntitle: R\ncategory: recipes\n---\nbody', encoding="utf-8")
    (articles / "live-tip.md").write_text(
        '---\ntitle: T\ncategory: tips\n---\nbody', encoding="utf-8")
    return csv_p, articles


def _common_args(csv_p, articles):
    return [
        "--csv", str(csv_p),
        "--articles-dir", str(articles),
        "--base-url", "https://test.example.com",
        "--key", "test-key",
    ]


# ── tests ────────────────────────────────────────────────────────────────────

def test_main_posts_to_pins_upload_with_append_flag(tmp_path):
    csv_p, articles = _setup(tmp_path)
    fake = FakePost()
    rc = main(_common_args(csv_p, articles), post=fake)
    assert rc == 0
    assert len(fake.calls) == 1
    assert "pins-upload" in fake.calls[0]["url"]
    assert "append=1" in fake.calls[0]["url"]


def test_main_csv_body_has_agent6_headers(tmp_path):
    csv_p, articles = _setup(tmp_path)
    fake = FakePost()
    main(_common_args(csv_p, articles), post=fake)
    body = fake.calls[0]["body"]
    rows = list(csv.DictReader(io.StringIO(body)))
    for col in ("slug", "variant", "pin_title", "description", "alt_text", "board"):
        assert col in rows[0]


def test_main_filters_orphans_from_csv_body(tmp_path):
    csv_p, articles = _setup(tmp_path)
    fake = FakePost()
    main(_common_args(csv_p, articles), post=fake)
    rows = list(csv.DictReader(io.StringIO(fake.calls[0]["body"])))
    slugs = {r["slug"] for r in rows}
    assert slugs == {"live-recipe", "live-tip"}
    assert "orphan" not in slugs


def test_main_maps_categories_to_boards(tmp_path):
    csv_p, articles = _setup(tmp_path)
    fake = FakePost()
    main(_common_args(csv_p, articles), post=fake)
    rows = list(csv.DictReader(io.StringIO(fake.calls[0]["body"])))
    by_slug = {(r["slug"], r["variant"]): r["board"] for r in rows}
    assert by_slug[("live-recipe", "1")] == "High Fiber Dinner and Gut Health Recipes"
    assert by_slug[("live-tip", "1")] == "Healthy Meal Prep & Kitchen Tips"


def test_main_dry_run_does_not_post(tmp_path, capsys):
    csv_p, articles = _setup(tmp_path)
    fake = FakePost()
    rc = main(_common_args(csv_p, articles) + ["--dry-run"], post=fake)
    assert rc == 0
    assert fake.calls == []
    out = capsys.readouterr().out
    assert "live-recipe" in out


def test_main_retries_on_500(tmp_path):
    csv_p, articles = _setup(tmp_path)
    fake = FakePost(responses=[(500, "boom"), (200, '{"ok":true}')])
    rc = main(_common_args(csv_p, articles), post=fake)
    assert rc == 0
    assert len(fake.calls) == 2


def test_main_does_not_retry_on_401(tmp_path):
    csv_p, articles = _setup(tmp_path)
    fake = FakePost(responses=[(401, '{"error":"unauth"}')])
    rc = main(_common_args(csv_p, articles), post=fake)
    assert rc != 0
    assert len(fake.calls) == 1


def test_main_returns_0_when_no_records(tmp_path):
    """Empty CSV (or all rows orphan) — script exits 0 without POST."""
    empty = tmp_path / "empty.csv"
    empty.write_text("image_filename,pin_title,description,destination_url,board,alt_text\n", encoding="utf-8")
    articles = tmp_path / "articles"; articles.mkdir()
    fake = FakePost()
    rc = main([
        "--csv", str(empty), "--articles-dir", str(articles),
        "--base-url", "https://test.example.com", "--key", "k",
    ], post=fake)
    assert rc == 0
    assert fake.calls == []
