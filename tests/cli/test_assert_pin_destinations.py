"""Tests for assert_pin_destinations.py (CP3.2)."""
from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
SCRIPT_DIR = ROOT / "scripts" / "NEW_PIPELINE_2026-05-08"
sys.path.insert(0, str(SCRIPT_DIR))

import assert_pin_destinations as apd  # noqa: E402



def _write_registry(path: Path, articles: dict) -> None:
    path.write_text(
        json.dumps({"version": 1, "articles": articles}, indent=2),
        encoding="utf-8",
    )


def test_assert_pin_destinations_ok(tmp_path: Path):
    topics = tmp_path / "produced-topics.json"
    dest = tmp_path / "pin-destinations.json"
    flat = tmp_path / "flat.json"
    topics.write_text(
        json.dumps([{"slug": "demo-article", "id": 1}]),
        encoding="utf-8",
    )
    _write_registry(
        dest,
        {
            "demo-article": {
                "canonical": "demo-article",
                "destinations": [
                    {"id": "v1", "url_slug": "pin-one", "origin": "pin"},
                    {"id": "v2", "url_slug": "pin-two", "origin": "pin"},
                    {"id": "v3", "url_slug": "pin-three", "origin": "pin"},
                    {"id": "v4", "url_slug": "pin-four", "origin": "pin"},
                ],
            }
        },
    )
    flat.write_text(
        json.dumps(
            {
                "pin-one": "demo-article",
                "pin-two": "demo-article",
                "pin-three": "demo-article",
                "pin-four": "demo-article",
            }
        ),
        encoding="utf-8",
    )
    assert (
        apd.main(
            [
                "--topics",
                str(topics),
                "--destinations",
                str(dest),
                "--flat",
                str(flat),
            ]
        )
        == 0
    )


def test_assert_pin_destinations_fails_when_too_few_pins(tmp_path: Path):
    topics = tmp_path / "produced-topics.json"
    dest = tmp_path / "pin-destinations.json"
    flat = tmp_path / "flat.json"
    topics.write_text(json.dumps([{"slug": "thin-article"}]), encoding="utf-8")
    _write_registry(
        dest,
        {
            "thin-article": {
                "canonical": "thin-article",
                "destinations": [
                    {"id": "v1", "url_slug": "only-one", "origin": "pin"},
                ],
            }
        },
    )
    flat.write_text(json.dumps({"only-one": "thin-article"}), encoding="utf-8")
    assert (
        apd.main(
            [
                "--topics",
                str(topics),
                "--destinations",
                str(dest),
                "--flat",
                str(flat),
            ]
        )
        == 1
    )


def test_assert_pin_destinations_empty_topics_ok(tmp_path: Path):
    topics = tmp_path / "produced-topics.json"
    dest = tmp_path / "pin-destinations.json"
    flat = tmp_path / "flat.json"
    topics.write_text("[]", encoding="utf-8")
    _write_registry(dest, {})
    flat.write_text("{}", encoding="utf-8")
    assert (
        apd.main(
            [
                "--topics",
                str(topics),
                "--destinations",
                str(dest),
                "--flat",
                str(flat),
            ]
        )
        == 0
    )
