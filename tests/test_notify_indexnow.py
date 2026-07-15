import importlib.util
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch


SCRIPT_PATH = Path(__file__).resolve().parents[1] / "scripts" / "notify-indexnow.py"
SPEC = importlib.util.spec_from_file_location("notify_indexnow", SCRIPT_PATH)
notify_indexnow = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(notify_indexnow)


class FakeResponse:
    status = 202

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False

    def read(self):
        return b"accepted"


class NotifyIndexNowTests(unittest.TestCase):
    def test_default_key_is_deployed_and_official_endpoint_is_used(self):
        key_file = SCRIPT_PATH.parents[1] / "public" / f"{notify_indexnow.DEFAULT_INDEXNOW_KEY}.txt"

        self.assertEqual(
            notify_indexnow.INDEXNOW_ENDPOINT,
            "https://api.indexnow.org/indexnow",
        )
        self.assertEqual(
            key_file.read_text(encoding="utf-8").strip(),
            notify_indexnow.DEFAULT_INDEXNOW_KEY,
        )

    def test_source_mapping_accepts_pages_and_rejects_assets_and_dynamic_routes(self):
        self.assertEqual(
            notify_indexnow.source_path_to_url("src/data/articles/demo.md"),
            "https://www.daily-life-hacks.com/demo/",
        )
        self.assertEqual(
            notify_indexnow.source_path_to_url("src/pages/methodology.astro"),
            "https://www.daily-life-hacks.com/methodology/",
        )
        self.assertEqual(
            notify_indexnow.source_path_to_url("src/pages/index.astro"),
            "https://www.daily-life-hacks.com/",
        )
        self.assertIsNone(notify_indexnow.source_path_to_url("public/images/demo.webp"))
        self.assertIsNone(notify_indexnow.source_path_to_url("src/pages/tag/[tag].astro"))
        self.assertIsNone(notify_indexnow.source_path_to_url("src/pages/404.astro"))

    def test_sitemap_is_the_fail_closed_canonical_allowlist(self):
        sitemap = {
            "https://www.daily-life-hacks.com/",
            "https://www.daily-life-hacks.com/demo/",
        }
        plan = notify_indexnow.build_plan(
            changed_paths=[
                "src/data/articles/demo.md",
                "src/data/articles/future.md",
                "public/images/demo.webp",
                "src/data/articles/demo.md",
            ],
            explicit_urls=[],
            sitemap_urls=sitemap,
        )

        self.assertEqual(plan["eligible_urls"], ["https://www.daily-life-hacks.com/demo/"])
        self.assertEqual(plan["ignored_source_paths"], ["public/images/demo.webp"])
        reasons = {item["reason"] for item in plan["skipped"]}
        self.assertIn("duplicate", reasons)
        self.assertIn(
            "not in built sitemap (unreleased, noindex, redirect, or missing)",
            reasons,
        )

    def test_external_query_and_fragment_urls_are_rejected(self):
        self.assertIsNone(notify_indexnow.canonicalize_url("https://example.com/demo/"))
        self.assertIsNone(
            notify_indexnow.canonicalize_url("https://www.daily-life-hacks.com/demo/?utm=x")
        )
        self.assertIsNone(notify_indexnow.canonicalize_url("/demo/#section"))
        self.assertEqual(
            notify_indexnow.canonicalize_url("/demo"),
            "https://www.daily-life-hacks.com/demo/",
        )

    def test_load_sitemap_reads_urlset_not_sitemap_index_locations(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            (root / "sitemap-index.xml").write_text(
                '<?xml version="1.0"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
                "<sitemap><loc>https://www.daily-life-hacks.com/sitemap-0.xml</loc></sitemap>"
                "</sitemapindex>",
                encoding="utf-8",
            )
            (root / "sitemap-0.xml").write_text(
                '<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
                "<url><loc>https://www.daily-life-hacks.com/demo/</loc></url>"
                "<url><loc>https://daily-life-hacks.com/wrong-host/</loc></url>"
                "</urlset>",
                encoding="utf-8",
            )

            self.assertEqual(
                notify_indexnow.load_sitemap_urls(root),
                {"https://www.daily-life-hacks.com/demo/"},
            )

    def test_dry_run_writes_audit_log_without_http(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            (root / "sitemap-0.xml").write_text(
                '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
                "<url><loc>https://www.daily-life-hacks.com/demo/</loc></url>"
                "</urlset>",
                encoding="utf-8",
            )
            log_path = root / "report.json"
            with patch.object(notify_indexnow, "submit_indexnow") as submit:
                status = notify_indexnow.main(
                    [
                        "--urls",
                        "/demo/",
                        "--sitemap-dir",
                        str(root),
                        "--log-file",
                        str(log_path),
                        "--dry-run",
                    ]
                )

            self.assertEqual(status, 0)
            submit.assert_not_called()
            report = json.loads(log_path.read_text(encoding="utf-8"))
            self.assertTrue(report["ok"])
            self.assertFalse(report["submission"]["attempted"])
            self.assertEqual(
                report["eligible_urls"],
                ["https://www.daily-life-hacks.com/demo/"],
            )

    def test_submit_logs_indexnow_http_status(self):
        with patch.object(notify_indexnow, "urlopen", return_value=FakeResponse()) as mocked:
            result = notify_indexnow.submit_indexnow(
                ["https://www.daily-life-hacks.com/demo/"], "public-key"
            )

        self.assertEqual(result, {"ok": True, "status": 202, "body": "accepted"})
        request = mocked.call_args.args[0]
        payload = json.loads(request.data.decode("utf-8"))
        self.assertEqual(payload["urlList"], ["https://www.daily-life-hacks.com/demo/"])
        self.assertEqual(payload["keyLocation"], f"{notify_indexnow.SITE}/public-key.txt")


if __name__ == "__main__":
    unittest.main()
