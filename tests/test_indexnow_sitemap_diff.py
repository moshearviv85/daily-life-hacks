import importlib.util
import json
import tempfile
import unittest
from pathlib import Path


SCRIPT_PATH = Path(__file__).resolve().parents[1] / "scripts" / "indexnow-sitemap-diff.py"
SPEC = importlib.util.spec_from_file_location("indexnow_sitemap_diff", SCRIPT_PATH)
diff = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(diff)

SITE = "https://www.daily-life-hacks.com"


def page_html(body: str, related: str = "Older card", nonce: str = "n1", asset: str = "aaa111bbb222") -> str:
    return f"""<!doctype html><html><head>
<link rel="stylesheet" href="/_astro/Base.{asset}.css">
</head><body><header>nav</header><main>
<h1>Title</h1>
<p>Published <time datetime="2026-11-23T00:00:00.000Z">November 23, 2026</time></p>
<div class="article-content"><p>{body}</p></div>
<script nonce="{nonce}" src="/_astro/hoisted.{asset}.js"></script>
<section aria-label="Related articles"><h2>Keep Reading</h2><p>{related}</p></section>
</main><footer>site</footer></body></html>"""


def write_sitemap(dist: Path, rows: list[tuple[str, str]]) -> None:
    urls = "".join(f"<url><loc>{loc}</loc><lastmod>{lastmod}</lastmod></url>" for loc, lastmod in rows)
    (dist / "sitemap-0.xml").write_text(
        '<?xml version="1.0"?>'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
        f"{urls}</urlset>",
        encoding="utf-8",
    )


def write_page(dist: Path, slug: str, html: str) -> None:
    folder = dist / slug
    folder.mkdir(parents=True, exist_ok=True)
    (folder / "index.html").write_text(html, encoding="utf-8")


def hashed_snapshot(dist: Path, rows: list[tuple[str, str, str]]) -> dict:
    """rows: (url, lastmod, html) recorded as the previously submitted state."""
    urls = {}
    for url, lastmod, html in rows:
        urls[url] = {"lastmod": lastmod, "sha256": diff.content_hash_html(html)}
    return {"schema_version": 2, "urls": urls, "redirects": []}


class ContentHashTests(unittest.TestCase):
    def test_keep_reading_nonce_build_hash_and_dates_do_not_change_the_hash(self):
        original = page_html("Same body")
        edited = page_html("Same body", related="A different card", nonce="other-nonce", asset="zzz999yyy888")
        edited = edited.replace("November 23, 2026", "July 15, 2026")
        edited = edited.replace("2026-11-23T00:00:00.000Z", "2026-07-15T00:00:00.000Z")
        edited = edited.replace("Published", "Updated")

        self.assertEqual(diff.content_hash_html(original), diff.content_hash_html(edited))

    def test_body_edit_and_hero_caption_change_the_hash(self):
        original = page_html("Same body")
        self.assertNotEqual(diff.content_hash_html(original), diff.content_hash_html(page_html("New body")))

        before = "<main><figcaption>Illustration generated with AI</figcaption><h1>Title</h1><p>Body</p></main>"
        after = "<main><figcaption>Owner photograph</figcaption><h1>Title</h1><p>Body</p></main>"
        self.assertNotEqual(diff.content_hash_html(before), diff.content_hash_html(after))

    def test_backward_date_is_not_forward_and_same_day_formats_match(self):
        self.assertFalse(
            diff.lastmod_moved_forward("2026-11-23T00:00:00.000Z", "2026-07-15T00:00:00.000Z")
        )
        self.assertTrue(
            diff.lastmod_moved_forward("2026-07-15T00:00:00.000Z", "2026-11-23T00:00:00.000Z")
        )
        self.assertFalse(diff.lastmod_moved_forward("2026-11-23", "2026-11-23T00:00:00.000Z"))
        self.assertEqual(diff.parse_lastmod_day("2026-11-23T00:00:00.000Z"), "2026-11-23")


class SitemapDiffTests(unittest.TestCase):
    def test_same_day_body_edit_with_unchanged_lastmod_is_a_candidate(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            dist = root / "dist"
            dist.mkdir()
            slug = "beans"
            url = f"{SITE}/{slug}/"
            lastmod = "2026-11-23T00:00:00.000Z"
            write_page(dist, slug, page_html("New conversion table"))
            write_sitemap(dist, [(url, lastmod)])
            snapshot = root / "snapshot.json"
            snapshot.write_text(
                json.dumps(hashed_snapshot(dist, [(url, lastmod, page_html("Old paragraph"))])),
                encoding="utf-8",
            )
            report = root / "report.json"
            output = root / "urls.txt"
            status = diff.main(
                [
                    "--sitemap-dir",
                    str(dist),
                    "--snapshot",
                    str(snapshot),
                    "--baseline",
                    str(root / "missing-baseline.json"),
                    "--queue",
                    str(root / "queue.json"),
                    "--output",
                    str(output),
                    "--log-file",
                    str(report),
                ]
            )

            self.assertEqual(status, 0)
            logged = json.loads(report.read_text(encoding="utf-8"))
            self.assertEqual(logged["submitted"], [{"url": url, "reason": "hash-changed"}])
            self.assertEqual(output.read_text(encoding="utf-8").splitlines(), [url])

    def test_keep_reading_only_change_is_not_a_candidate(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            dist = root / "dist"
            dist.mkdir()
            slug = "beans"
            url = f"{SITE}/{slug}/"
            lastmod = "2026-11-23T00:00:00.000Z"
            write_page(dist, slug, page_html("Same body", related="New card"))
            write_sitemap(dist, [(url, lastmod)])
            snapshot = root / "snapshot.json"
            snapshot.write_text(
                json.dumps(
                    hashed_snapshot(dist, [(url, lastmod, page_html("Same body", related="Old card"))])
                ),
                encoding="utf-8",
            )
            report = root / "report.json"
            status = diff.main(
                [
                    "--sitemap-dir",
                    str(dist),
                    "--snapshot",
                    str(snapshot),
                    "--baseline",
                    str(root / "missing-baseline.json"),
                    "--queue",
                    str(root / "queue.json"),
                    "--log-file",
                    str(report),
                ]
            )

            self.assertEqual(status, 0)
            logged = json.loads(report.read_text(encoding="utf-8"))
            self.assertEqual(logged["submitted"], [])
            self.assertEqual(logged["hash_changed"], [])

    def test_removed_url_and_new_redirect_source_are_candidates(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            dist = root / "dist"
            dist.mkdir()
            stay = f"{SITE}/stay/"
            gone = f"{SITE}/gone/"
            redirected = f"{SITE}/old-path/"
            lastmod = "2026-11-23T00:00:00.000Z"
            html = page_html("Stay")
            write_page(dist, "stay", html)
            write_sitemap(dist, [(stay, lastmod)])
            (dist / "_redirects").write_text("/old-path /stay/ 301\n/old-path/ /stay/ 301\n", encoding="utf-8")
            snapshot_payload = hashed_snapshot(
                dist,
                [(stay, lastmod, html), (gone, "2026-07-01T00:00:00.000Z", page_html("Gone"))],
            )
            snapshot_payload["redirects"] = []
            snapshot = root / "snapshot.json"
            snapshot.write_text(json.dumps(snapshot_payload), encoding="utf-8")
            report = root / "report.json"
            status = diff.main(
                [
                    "--sitemap-dir",
                    str(dist),
                    "--snapshot",
                    str(snapshot),
                    "--baseline",
                    str(root / "missing-baseline.json"),
                    "--queue",
                    str(root / "queue.json"),
                    "--log-file",
                    str(report),
                ]
            )

            self.assertEqual(status, 0)
            logged = json.loads(report.read_text(encoding="utf-8"))
            reasons = {item["url"]: item["reason"] for item in logged["submitted"]}
            self.assertEqual(reasons[gone], "removed")
            self.assertEqual(reasons[redirected], "redirected")
            self.assertNotIn(stay, reasons)

    def test_backward_datemodified_alone_is_not_a_change(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            dist = root / "dist"
            dist.mkdir()
            url = f"{SITE}/restored/"
            html = page_html("Unchanged body")
            write_page(dist, "restored", html)
            write_sitemap(dist, [(url, "2026-07-15T00:00:00.000Z")])
            snapshot = root / "snapshot.json"
            snapshot.write_text(
                json.dumps(hashed_snapshot(dist, [(url, "2026-11-23T00:00:00.000Z", html)])),
                encoding="utf-8",
            )
            report = root / "report.json"
            status = diff.main(
                [
                    "--sitemap-dir",
                    str(dist),
                    "--snapshot",
                    str(snapshot),
                    "--baseline",
                    str(root / "missing-baseline.json"),
                    "--queue",
                    str(root / "queue.json"),
                    "--log-file",
                    str(report),
                ]
            )

            self.assertEqual(status, 0)
            logged = json.loads(report.read_text(encoding="utf-8"))
            self.assertEqual(logged["submitted"], [])
            self.assertEqual(logged["lastmod"], [])

    def test_backward_date_still_submits_when_the_content_hash_changed(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            dist = root / "dist"
            dist.mkdir()
            url = f"{SITE}/restored/"
            write_page(dist, "restored", page_html("Real edit"))
            write_sitemap(dist, [(url, "2026-07-15T00:00:00.000Z")])
            snapshot = root / "snapshot.json"
            snapshot.write_text(
                json.dumps(
                    hashed_snapshot(dist, [(url, "2026-11-23T00:00:00.000Z", page_html("Before"))])
                ),
                encoding="utf-8",
            )
            report = root / "report.json"
            diff.main(
                [
                    "--sitemap-dir",
                    str(dist),
                    "--snapshot",
                    str(snapshot),
                    "--baseline",
                    str(root / "missing-baseline.json"),
                    "--queue",
                    str(root / "queue.json"),
                    "--log-file",
                    str(report),
                ]
            )

            logged = json.loads(report.read_text(encoding="utf-8"))
            self.assertEqual(logged["submitted"], [{"url": url, "reason": "hash-changed"}])

    def test_forward_lastmod_without_a_hash_change_is_still_a_candidate(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            dist = root / "dist"
            dist.mkdir()
            url = f"{SITE}/bumped/"
            html = page_html("Same")
            write_page(dist, "bumped", html)
            write_sitemap(dist, [(url, "2026-11-23T00:00:00.000Z")])
            snapshot = root / "snapshot.json"
            snapshot.write_text(
                json.dumps(hashed_snapshot(dist, [(url, "2026-07-15T00:00:00.000Z", html)])),
                encoding="utf-8",
            )
            report = root / "report.json"
            diff.main(
                [
                    "--sitemap-dir",
                    str(dist),
                    "--snapshot",
                    str(snapshot),
                    "--baseline",
                    str(root / "missing-baseline.json"),
                    "--queue",
                    str(root / "queue.json"),
                    "--log-file",
                    str(report),
                ]
            )

            logged = json.loads(report.read_text(encoding="utf-8"))
            self.assertEqual(logged["submitted"], [{"url": url, "reason": "lastmod"}])

    def test_legacy_snapshot_uses_baseline_hash_and_ignores_a_restored_date(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            dist = root / "dist"
            dist.mkdir()
            url = f"{SITE}/restored/"
            html = page_html("Unchanged since baseline")
            write_page(dist, "restored", html)
            write_sitemap(dist, [(url, "2026-07-15T00:00:00.000Z")])
            # Cache snapshot still has the bulk-bumped day and no content hash.
            (root / "snapshot.json").write_text(
                json.dumps({"urls": {url: "2026-11-23T00:00:00.000Z"}}),
                encoding="utf-8",
            )
            baseline = {
                "urls": {
                    url: {
                        "lastmod": "2026-07-01T00:00:00.000Z",
                        "sha256": diff.content_hash_html(html),
                    }
                },
                "redirects": [],
            }
            (root / "baseline.json").write_text(json.dumps(baseline), encoding="utf-8")
            report = root / "report.json"
            status = diff.main(
                [
                    "--sitemap-dir",
                    str(dist),
                    "--snapshot",
                    str(root / "snapshot.json"),
                    "--baseline",
                    str(root / "baseline.json"),
                    "--queue",
                    str(root / "queue.json"),
                    "--log-file",
                    str(report),
                ]
            )

            self.assertEqual(status, 0)
            logged = json.loads(report.read_text(encoding="utf-8"))
            self.assertTrue(logged["legacy_upgrade"])
            self.assertEqual(logged["submitted"], [])

    def test_cap_submits_60_queues_90_and_the_next_run_submits_the_next_60(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            dist = root / "dist"
            dist.mkdir()
            rows = []
            previous = []
            for index in range(150):
                slug = f"p{index:03d}"
                url = f"{SITE}/{slug}/"
                lastmod = "2026-11-23T00:00:00.000Z"
                write_page(dist, slug, page_html(f"new {index}"))
                rows.append((url, lastmod))
                previous.append((url, lastmod, page_html(f"old {index}")))
            write_sitemap(dist, rows)
            snapshot = root / "snapshot.json"
            queue = root / "queue.json"
            snapshot.write_text(json.dumps(hashed_snapshot(dist, previous)), encoding="utf-8")
            first_report = root / "first.json"
            first_out = root / "first.txt"
            first_status = diff.main(
                [
                    "--sitemap-dir",
                    str(dist),
                    "--snapshot",
                    str(snapshot),
                    "--baseline",
                    str(root / "missing-baseline.json"),
                    "--queue",
                    str(queue),
                    "--output",
                    str(first_out),
                    "--log-file",
                    str(first_report),
                    "--max-urls",
                    "60",
                    "--write-snapshot",
                ]
            )
            second_report = root / "second.json"
            second_out = root / "second.txt"
            second_status = diff.main(
                [
                    "--sitemap-dir",
                    str(dist),
                    "--snapshot",
                    str(snapshot),
                    "--baseline",
                    str(root / "missing-baseline.json"),
                    "--queue",
                    str(queue),
                    "--output",
                    str(second_out),
                    "--log-file",
                    str(second_report),
                    "--max-urls",
                    "60",
                    "--write-snapshot",
                ]
            )

            self.assertEqual(first_status, 0)
            self.assertEqual(second_status, 0)
            first = json.loads(first_report.read_text(encoding="utf-8"))
            second = json.loads(second_report.read_text(encoding="utf-8"))
            first_urls = [item["url"] for item in first["submitted"]]
            second_urls = [item["url"] for item in second["submitted"]]
            expected_first = [f"{SITE}/p{index:03d}/" for index in range(60)]
            expected_second = [f"{SITE}/p{index:03d}/" for index in range(60, 120)]
            self.assertEqual(first_urls, expected_first)
            self.assertEqual(first["queued_count"], 90)
            self.assertEqual(second_urls, expected_second)
            self.assertEqual(second["queued_count"], 30)
            self.assertTrue(all(item["reason"] == "hash-changed" for item in first["submitted"]))
            self.assertEqual(first_out.read_text(encoding="utf-8").splitlines(), expected_first)
            saved_queue = json.loads(queue.read_text(encoding="utf-8"))
            self.assertEqual(
                [item["url"] for item in saved_queue["urls"]],
                [f"{SITE}/p{index:03d}/" for index in range(120, 150)],
            )

    def test_cold_start_submits_nothing(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            dist = root / "dist"
            dist.mkdir()
            url = f"{SITE}/new/"
            write_page(dist, "new", page_html("Hello"))
            write_sitemap(dist, [(url, "2026-11-23T00:00:00.000Z")])
            output = root / "urls.txt"
            status = diff.main(
                [
                    "--sitemap-dir",
                    str(dist),
                    "--snapshot",
                    str(root / "snapshot.json"),
                    "--baseline",
                    str(root / "baseline.json"),
                    "--queue",
                    str(root / "queue.json"),
                    "--output",
                    str(output),
                    "--write-snapshot",
                ]
            )
            saved = json.loads((root / "snapshot.json").read_text(encoding="utf-8"))
            self.assertEqual(status, 0)
            self.assertEqual(output.read_text(encoding="utf-8"), "")
            self.assertEqual(saved["schema_version"], 2)
            self.assertIn("sha256", saved["urls"][url])


if __name__ == "__main__":
    unittest.main()
