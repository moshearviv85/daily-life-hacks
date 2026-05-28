import sqlite3
import importlib.util
import sys
import tempfile
import unittest
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
MODULE_PATH = REPO_ROOT / "scripts" / "NEW_PIPELINE_2026-05-08" / "verify_pipeline_artifacts.py"
spec = importlib.util.spec_from_file_location("verify_pipeline_artifacts", MODULE_PATH)
module = importlib.util.module_from_spec(spec)
assert spec.loader is not None
sys.modules[spec.name] = module
spec.loader.exec_module(module)
verify_slug = module.verify_slug


def _make_db(path: Path) -> None:
    con = sqlite3.connect(path)
    con.executescript(
        """
        CREATE TABLE write_outputs (
          slug TEXT,
          status TEXT,
          disqualified INTEGER DEFAULT 0
        );
        CREATE TABLE review_outputs (
          slug TEXT,
          status TEXT
        );
        CREATE TABLE hero_briefs (
          article_slug TEXT,
          status TEXT
        );
        CREATE TABLE pin_briefs (
          article_slug TEXT,
          pin_slug TEXT,
          pin_index INTEGER,
          status TEXT
        );
        """
    )
    con.execute(
        "INSERT INTO write_outputs (slug, status, disqualified) VALUES (?, 'reviewed', 0)",
        ("sample-article",),
    )
    con.execute(
        "INSERT INTO review_outputs (slug, status) VALUES (?, 'ok')",
        ("sample-article",),
    )
    con.execute(
        "INSERT INTO hero_briefs (article_slug, status) VALUES (?, 'ok')",
        ("sample-article",),
    )
    for idx in range(4):
        con.execute(
            "INSERT INTO pin_briefs (article_slug, pin_slug, pin_index, status) VALUES (?, ?, ?, 'ok')",
            ("sample-article", f"sample-pin-{idx + 1}", idx),
        )
    con.commit()
    con.close()


class PipelineArtifactsTest(unittest.TestCase):
    def test_verify_slug_passes_with_complete_artifacts(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            db = root / "topic-research.sqlite"
            articles = root / "articles"
            heroes = root / "images"
            pins = heroes / "pins"
            articles.mkdir()
            pins.mkdir(parents=True)
            _make_db(db)

            (articles / "sample-article.md").write_text("---\ntitle: Sample\n---\nBody\n")
            (heroes / "sample-article-main.jpg").write_bytes(b"jpg")
            for idx in range(4):
                (pins / f"sample-pin-{idx + 1}.jpg").write_bytes(b"jpg")

            result = verify_slug(
                "sample-article",
                db_path=db,
                articles_dir=articles,
                hero_dir=heroes,
                pin_dir=pins,
            )

            self.assertTrue(result.ok)
            self.assertEqual(result.errors, [])

    def test_verify_slug_fails_when_pin_images_are_missing(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            db = root / "topic-research.sqlite"
            articles = root / "articles"
            heroes = root / "images"
            pins = heroes / "pins"
            articles.mkdir()
            pins.mkdir(parents=True)
            _make_db(db)

            (articles / "sample-article.md").write_text("---\ntitle: Sample\n---\nBody\n")
            (heroes / "sample-article-main.jpg").write_bytes(b"jpg")

            result = verify_slug(
                "sample-article",
                db_path=db,
                articles_dir=articles,
                hero_dir=heroes,
                pin_dir=pins,
            )

            self.assertFalse(result.ok)
            self.assertTrue(any("missing pin image" in err for err in result.errors))

    def test_article_only_verification_does_not_require_images_or_pin_briefs(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            db = root / "topic-research.sqlite"
            articles = root / "articles"
            heroes = root / "images"
            pins = heroes / "pins"
            articles.mkdir()
            pins.mkdir(parents=True)
            _make_db(db)

            (articles / "sample-article.md").write_text("---\ntitle: Sample\n---\nBody\n")

            result = verify_slug(
                "sample-article",
                db_path=db,
                articles_dir=articles,
                hero_dir=heroes,
                pin_dir=pins,
                article_only=True,
            )

            self.assertTrue(result.ok)
            self.assertEqual(result.errors, [])

    def test_full_asset_verification_accepts_staging_article_without_review_table(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            db = root / "topic-research.sqlite"
            articles = root / "articles"
            heroes = root / "images"
            pins = heroes / "pins"
            articles.mkdir()
            pins.mkdir(parents=True)
            con = sqlite3.connect(db)
            con.executescript(
                """
                CREATE TABLE hero_briefs (
                  article_slug TEXT,
                  status TEXT
                );
                CREATE TABLE pin_briefs (
                  article_slug TEXT,
                  pin_slug TEXT,
                  pin_index INTEGER,
                  status TEXT
                );
                """
            )
            con.execute(
                "INSERT INTO hero_briefs (article_slug, status) VALUES (?, 'ok')",
                ("sample-article",),
            )
            for idx in range(4):
                con.execute(
                    "INSERT INTO pin_briefs (article_slug, pin_slug, pin_index, status) VALUES (?, ?, ?, 'ok')",
                    ("sample-article", f"sample-pin-{idx + 1}", idx),
                )
            con.commit()
            con.close()

            (articles / "sample-article.md").write_text("---\ntitle: Sample\n---\nBody\n")
            (heroes / "sample-article-main.jpg").write_bytes(b"jpg")
            for idx in range(4):
                (pins / f"sample-pin-{idx + 1}.jpg").write_bytes(b"jpg")

            result = verify_slug(
                "sample-article",
                db_path=db,
                articles_dir=articles,
                hero_dir=heroes,
                pin_dir=pins,
            )

            self.assertTrue(result.ok)
            self.assertEqual(result.errors, [])


if __name__ == "__main__":
    unittest.main()
