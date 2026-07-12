import importlib.util
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
MODULE_PATH = (
    ROOT / "scripts" / "NEW_PIPELINE_2026-05-08" / "seo_onpage_audit.py"
)
SPEC = importlib.util.spec_from_file_location("seo_onpage_audit", MODULE_PATH)
MODULE = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
sys.modules[SPEC.name] = MODULE
SPEC.loader.exec_module(MODULE)


def _write_article(tmp_path: Path, frontmatter: str) -> Path:
    body = "\n".join(
        [
            "## First useful section",
            "Words and context with an [internal link](/recipes/). " * 140,
            "## Second useful section",
            "More practical detail. " * 140,
            "## Third useful section",
            "A final useful section. " * 140,
        ]
    )
    path = tmp_path / "demo-article.md"
    path.write_text(f"---\n{frontmatter}\n---\n{body}\n", encoding="utf-8")
    return path


def test_parse_reads_unquoted_frontmatter(tmp_path):
    path = _write_article(
        tmp_path,
        """title: Demo Article
excerpt: This is a practical excerpt that is comfortably longer than eighty characters for the audit.
category: tips
imageAlt: A useful image description with enough detail
faq:
  - question: Does this parse?
    answer: Yes, without requiring quotes.""",
    )

    row = MODULE.parse(path)

    assert row["title"] == "Demo Article"
    assert row["category"] == "tips"
    assert row["has_image_alt"] is True
    assert row["has_faq"] is True
    assert "missing_image_alt" not in row["issues"]
    assert "short_excerpt" not in row["issues"]


def test_parse_reads_quoted_frontmatter(tmp_path):
    path = _write_article(
        tmp_path,
        '''title: "Demo Article"
excerpt: "This is a practical excerpt that is comfortably longer than eighty characters for the audit."
category: "nutrition"
imageAlt: "A useful image description with enough detail"
faq:
  - question: "Does this parse?"
    answer: "Yes, with quotes too."''',
    )

    row = MODULE.parse(path)

    assert row["title"] == "Demo Article"
    assert row["category"] == "nutrition"
    assert row["has_image_alt"] is True
    assert "short_excerpt" not in row["issues"]


def test_parse_reads_folded_multiline_frontmatter(tmp_path):
    path = _write_article(
        tmp_path,
        """title: >-
  Demo Article With a Folded Title
excerpt: >-
  This is a folded excerpt that stays readable and remains comfortably longer
  than eighty characters after YAML parsing.
category: recipes
imageAlt: >-
  A folded image description that the audit must recognize
faq:
  - question: Does folded YAML parse?
    answer: Yes, PyYAML handles it.""",
    )

    row = MODULE.parse(path)

    assert row["title"] == "Demo Article With a Folded Title"
    assert row["category"] == "recipes"
    assert row["has_image_alt"] is True
    assert "short_excerpt" not in row["issues"]


def test_parse_treats_empty_faq_and_alt_as_missing(tmp_path):
    path = _write_article(
        tmp_path,
        """title: Demo Article
excerpt: Short
category: tips
imageAlt: ""
faq: []""",
    )

    row = MODULE.parse(path)

    assert row["has_image_alt"] is False
    assert row["has_faq"] is False
    assert "missing_image_alt" in row["issues"]
    assert "missing_faq" in row["issues"]
    assert "short_excerpt" in row["issues"]
