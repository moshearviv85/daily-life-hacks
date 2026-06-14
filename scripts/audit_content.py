from __future__ import annotations

import argparse
import csv
import json
import re
import sqlite3
import zipfile
from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urlparse


REPO_ROOT = Path(__file__).resolve().parents[1]
ARTICLES_DIR = REPO_ROOT / "src" / "data" / "articles"
AUDIT_DIR = REPO_ROOT / "pipeline-data" / "audit"
DEFAULT_DB = AUDIT_DIR / "content-indexing-audit.sqlite"
DEFAULT_MARKDOWN_REPORT = AUDIT_DIR / "content-indexing-triage-report.md"
DEFAULT_CSV_REPORT = AUDIT_DIR / "content-indexing-triage-report.csv"
SLUG_ALIASES_PATH = REPO_ROOT / "pipeline-data" / "slug-aliases.json"
ROUTER_MAPPING_PATH = REPO_ROOT / "pipeline-data" / "router-mapping.json"

SITE_BASE = "https://www.daily-life-hacks.com"
CANONICAL_HOST = "www.daily-life-hacks.com"
REQUIRED_FIELDS = ["title", "excerpt", "category", "tags", "image", "imageAlt", "date", "author"]
RECIPE_FIELDS = [
    "prepTime",
    "cookTime",
    "totalTime",
    "servings",
    "calories",
    "difficulty",
    "ingredients",
    "steps",
]
INTENTIONAL_NOINDEX_KINDS = {"alias", "router_variant", "tag", "utility", "category_pagination"}
UTILITY_SLUGS = {"dashboard", "thank-you", "contact", "privacy", "terms", "disclaimer", "404"}
CATEGORY_SLUGS = {"nutrition", "recipes", "tips"}
OFF_TOPIC_PATTERNS = [
    "high-conflict-parents",
    "guidance-skill-set",
]


@dataclass(frozen=True)
class ParsedMarkdown:
    frontmatter: dict[str, Any]
    frontmatter_raw: str
    body: str


def split_frontmatter(markdown: str) -> ParsedMarkdown:
    if not markdown.startswith("---"):
        return ParsedMarkdown({}, "", markdown)

    match = re.match(r"^---\r?\n([\s\S]*?)\r?\n---\r?\n?", markdown)
    if not match:
        return ParsedMarkdown({}, "", markdown)

    raw = match.group(1)
    body = markdown[match.end() :]
    return ParsedMarkdown(parse_frontmatter(raw), raw, body)


def parse_scalar(value: str) -> Any:
    value = value.strip()
    if not value:
        return ""
    if value[0:1] in {"'", '"'} and value[-1:] == value[0]:
        return value[1:-1]
    if value in {"true", "false"}:
        return value == "true"
    if re.fullmatch(r"-?\d+", value):
        try:
            return int(value)
        except ValueError:
            return value
    if re.fullmatch(r"-?\d+\.\d+", value):
        try:
            return float(value)
        except ValueError:
            return value
    if value.startswith("[") and value.endswith("]"):
        inner = value[1:-1].strip()
        if not inner:
            return []
        return [parse_scalar(part.strip()) for part in inner.split(",")]
    return value


def parse_frontmatter(raw: str) -> dict[str, Any]:
    data: dict[str, Any] = {}
    lines = raw.splitlines()
    i = 0

    while i < len(lines):
        line = lines[i]
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or line.startswith((" ", "\t", "- ")):
            i += 1
            continue

        match = re.match(r"^([A-Za-z0-9_]+):\s*(.*)$", line)
        if not match:
            i += 1
            continue

        key, value = match.group(1), match.group(2)
        if value.strip():
            data[key] = parse_scalar(value)
            i += 1
            continue

        block_lines: list[str] = []
        i += 1
        while i < len(lines):
            child = lines[i]
            if child.strip() and not child.startswith((" ", "\t", "- ")):
                break
            block_lines.append(child)
            i += 1
        data[key] = parse_block_value(block_lines)

    return data


def parse_block_value(lines: list[str]) -> Any:
    values: list[str] = []
    for line in lines:
        stripped = line.strip()
        if stripped.startswith("- "):
            values.append(stripped[2:].strip().strip("'\""))
    if values:
        return values
    return "\n".join(lines).strip()


def count_faq_items(frontmatter_raw: str) -> int:
    faq_match = re.search(r"(?ms)^faq:\s*\n(.*?)(?:\n[A-Za-z0-9_]+:\s*|\Z)", frontmatter_raw)
    if not faq_match:
        return 0
    return len(re.findall(r"(?m)^\s*-\s*question:\s*.+$", faq_match.group(1)))


def markdown_word_count(body: str) -> int:
    body = re.sub(r"```[\s\S]*?```", " ", body)
    body = re.sub(r"`[^`]+`", " ", body)
    body = re.sub(r"!\[[^\]]*]\([^)]*\)", " ", body)
    body = re.sub(r"\[[^\]]+]\([^)]*\)", " ", body)
    body = re.sub(r"<[^>]+>", " ", body)
    body = re.sub(r"(?m)^#+\s*", " ", body)
    body = re.sub(r"(?m)^[>\-*+\d.)\s]+", " ", body)
    return len(re.findall(r"\b[A-Za-z0-9][A-Za-z0-9'-]*\b", body))


def value_present(value: Any) -> bool:
    if value is None:
        return False
    if isinstance(value, str):
        return bool(value.strip())
    if isinstance(value, list):
        return bool(value)
    return True


def normalize_slug(value: str | None) -> str:
    if not value:
        return ""
    return str(value).strip().strip("/")


def parse_date(value: Any) -> str | None:
    if not value_present(value):
        return None
    text = str(value).strip().strip('"').strip("'")
    for fmt in ("%Y-%m-%d", "%Y-%m-%dT%H:%M:%S%z", "%Y-%m-%dT%H:%M:%S.%f%z"):
        try:
            return datetime.strptime(text.replace("Z", "+0000"), fmt).date().isoformat()
        except ValueError:
            continue
    try:
        return datetime.fromisoformat(text.replace("Z", "+00:00")).date().isoformat()
    except ValueError:
        return text


def is_released(frontmatter: dict[str, Any], now: datetime) -> bool:
    raw = frontmatter.get("publishAt") or frontmatter.get("date")
    parsed = parse_date(raw)
    if not parsed:
        return True
    try:
        release_day = datetime.fromisoformat(parsed).replace(tzinfo=timezone.utc)
    except ValueError:
        return True
    return release_day <= now


def image_exists(image: str) -> bool:
    if not image or image.startswith(("http://", "https://")):
        return bool(image)
    return (REPO_ROOT / image.lstrip("/")).exists()


def load_json(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


def discover_latest(exports_dir: Path, pattern: str) -> Path | None:
    matches = sorted(exports_dir.glob(pattern), key=lambda p: p.stat().st_mtime, reverse=True)
    return matches[0] if matches else None


def read_csv(path: Path | None) -> list[dict[str, str]]:
    if not path or not path.exists():
        return []
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        return clean_rows(list(csv.DictReader(handle)))


def read_zip_csv(zip_path: Path | None, entry_name: str) -> list[dict[str, str]]:
    if not zip_path or not zip_path.exists():
        return []
    with zipfile.ZipFile(zip_path) as archive:
        try:
            with archive.open(entry_name) as handle:
                text = handle.read().decode("utf-8-sig")
        except KeyError:
            return []
    return clean_rows(list(csv.DictReader(text.splitlines())))


def clean_rows(rows: list[dict[str, str]]) -> list[dict[str, str]]:
    return [{key: normalize_text(value) for key, value in row.items()} for row in rows]


def normalize_text(value: Any) -> str:
    text = "" if value is None else str(value)
    if "\u00c3" in text or "\u00e2" in text:
        try:
            text = text.encode("cp1252").decode("utf-8")
        except UnicodeError:
            pass
    return (
        text.replace("\u2018", "'")
        .replace("\u2019", "'")
        .replace("\u201c", '"')
        .replace("\u201d", '"')
        .replace("\u2013", "-")
        .replace("\u2014", "-")
    )


def to_int(value: Any) -> int:
    text = str(value or "").replace(",", "").strip()
    if not text:
        return 0
    try:
        return int(float(text))
    except ValueError:
        return 0


def to_float(value: Any) -> float:
    text = str(value or "").replace("%", "").replace(",", "").strip()
    if not text:
        return 0.0
    try:
        return float(text)
    except ValueError:
        return 0.0


def url_parts(url: str) -> dict[str, Any]:
    parsed = urlparse(url)
    path = parsed.path or "/"
    normalized = path.strip("/")
    parts = [p for p in normalized.split("/") if p]
    slug = parts[0] if parts else ""
    return {
        "host": parsed.netloc.lower(),
        "path": path,
        "slug": slug,
        "has_trailing_slash": path == "/" or path.endswith("/"),
    }


def init_schema(conn: sqlite3.Connection) -> None:
    conn.executescript(
        """
        DROP TABLE IF EXISTS audit_runs;
        DROP TABLE IF EXISTS articles;
        DROP TABLE IF EXISTS slug_aliases;
        DROP TABLE IF EXISTS router_variants;
        DROP TABLE IF EXISTS bing_urls;
        DROP TABLE IF EXISTS gsc_coverage_issues;
        DROP TABLE IF EXISTS gsc_coverage_chart;
        DROP TABLE IF EXISTS gsc_pages;
        DROP TABLE IF EXISTS gsc_queries;
        DROP TABLE IF EXISTS ai_overview;
        DROP TABLE IF EXISTS triage_candidates;

        CREATE TABLE audit_runs (
          id INTEGER PRIMARY KEY,
          created_at TEXT NOT NULL,
          repo_root TEXT NOT NULL,
          exports_dir TEXT NOT NULL
        );

        CREATE TABLE articles (
          slug TEXT PRIMARY KEY,
          file_path TEXT NOT NULL,
          title TEXT,
          excerpt TEXT,
          category TEXT,
          tags_json TEXT NOT NULL,
          image TEXT,
          image_alt TEXT,
          date TEXT,
          publish_at TEXT,
          author TEXT,
          body_word_count INTEGER NOT NULL,
          frontmatter_complete INTEGER NOT NULL,
          missing_fields_json TEXT NOT NULL,
          is_recipe INTEGER NOT NULL,
          recipe_schema_complete INTEGER NOT NULL,
          missing_recipe_fields_json TEXT NOT NULL,
          faq_count INTEGER NOT NULL,
          image_exists INTEGER NOT NULL,
          is_released INTEGER NOT NULL,
          canonical_url TEXT NOT NULL,
          expected_robots TEXT NOT NULL,
          expected_sitemap_indexable INTEGER NOT NULL
        );

        CREATE TABLE slug_aliases (
          alias_slug TEXT PRIMARY KEY,
          target_slug TEXT NOT NULL,
          target_exists INTEGER NOT NULL
        );

        CREATE TABLE router_variants (
          base_slug TEXT NOT NULL,
          variant_key TEXT NOT NULL,
          variant_slug TEXT NOT NULL,
          title TEXT,
          base_exists INTEGER NOT NULL,
          alias_exists INTEGER NOT NULL,
          PRIMARY KEY (base_slug, variant_key)
        );

        CREATE TABLE bing_urls (
          url TEXT PRIMARY KEY,
          host TEXT NOT NULL,
          path TEXT NOT NULL,
          slug TEXT NOT NULL,
          impressions INTEGER NOT NULL,
          clicks INTEGER NOT NULL,
          last_crawled TEXT,
          discovered_on TEXT,
          http_code INTEGER NOT NULL,
          document_size INTEGER NOT NULL,
          backlinks INTEGER NOT NULL
        );

        CREATE TABLE gsc_coverage_issues (
          reason TEXT PRIMARY KEY,
          source TEXT,
          validation TEXT,
          pages INTEGER NOT NULL
        );

        CREATE TABLE gsc_coverage_chart (
          date TEXT PRIMARY KEY,
          not_indexed INTEGER NOT NULL,
          indexed INTEGER NOT NULL,
          impressions INTEGER NOT NULL
        );

        CREATE TABLE gsc_pages (
          url TEXT PRIMARY KEY,
          host TEXT NOT NULL,
          path TEXT NOT NULL,
          slug TEXT NOT NULL,
          has_trailing_slash INTEGER NOT NULL,
          clicks INTEGER NOT NULL,
          impressions INTEGER NOT NULL,
          ctr TEXT,
          position REAL NOT NULL
        );

        CREATE TABLE gsc_queries (
          query TEXT PRIMARY KEY,
          clicks INTEGER NOT NULL,
          impressions INTEGER NOT NULL,
          ctr TEXT,
          position REAL NOT NULL
        );

        CREATE TABLE ai_overview (
          date TEXT PRIMARY KEY,
          citations INTEGER NOT NULL,
          cited_pages INTEGER NOT NULL
        );

        CREATE TABLE triage_candidates (
          url TEXT PRIMARY KEY,
          source_flags TEXT NOT NULL,
          host TEXT NOT NULL,
          path TEXT NOT NULL,
          slug TEXT NOT NULL,
          url_kind TEXT NOT NULL,
          canonical_slug TEXT,
          article_word_count INTEGER,
          article_released INTEGER,
          bing_http_code INTEGER,
          bing_document_size INTEGER,
          bing_impressions INTEGER,
          gsc_impressions INTEGER,
          gsc_position REAL,
          recommended_action TEXT NOT NULL,
          priority TEXT NOT NULL,
          rationale TEXT NOT NULL
        );

        CREATE INDEX idx_articles_word_count ON articles(body_word_count);
        CREATE INDEX idx_bing_slug ON bing_urls(slug);
        CREATE INDEX idx_gsc_pages_slug ON gsc_pages(slug);
        CREATE INDEX idx_triage_priority ON triage_candidates(priority, url_kind);
        """
    )


def collect_articles(now: datetime) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for path in sorted(ARTICLES_DIR.glob("*.md")):
        slug = path.stem
        parsed = split_frontmatter(path.read_text(encoding="utf-8"))
        fm = parsed.frontmatter
        missing = [field for field in REQUIRED_FIELDS if not value_present(fm.get(field))]
        is_recipe = fm.get("category") == "recipes"
        missing_recipe = [field for field in RECIPE_FIELDS if is_recipe and not value_present(fm.get(field))]
        released = is_released(fm, now)
        tags = fm.get("tags") if isinstance(fm.get("tags"), list) else []
        image = str(fm.get("image") or "")
        rows.append(
            {
                "slug": slug,
                "file_path": str(path.relative_to(REPO_ROOT)).replace("\\", "/"),
                "title": str(fm.get("title") or ""),
                "excerpt": str(fm.get("excerpt") or ""),
                "category": str(fm.get("category") or ""),
                "tags_json": json.dumps(tags, ensure_ascii=False),
                "image": image,
                "image_alt": str(fm.get("imageAlt") or ""),
                "date": parse_date(fm.get("date")),
                "publish_at": parse_date(fm.get("publishAt")),
                "author": str(fm.get("author") or ""),
                "body_word_count": markdown_word_count(parsed.body),
                "frontmatter_complete": int(not missing),
                "missing_fields_json": json.dumps(missing),
                "is_recipe": int(is_recipe),
                "recipe_schema_complete": int(not missing_recipe),
                "missing_recipe_fields_json": json.dumps(missing_recipe),
                "faq_count": count_faq_items(parsed.frontmatter_raw),
                "image_exists": int(image_exists(image)),
                "is_released": int(released),
                "canonical_url": f"{SITE_BASE}/{slug}/",
                "expected_robots": "index" if released else "noindex",
                "expected_sitemap_indexable": int(released),
            }
        )
    return rows


def insert_rows(conn: sqlite3.Connection, table: str, rows: list[dict[str, Any]]) -> None:
    if not rows:
        return
    columns = list(rows[0].keys())
    placeholders = ", ".join(["?"] * len(columns))
    column_sql = ", ".join(columns)
    values = [[row.get(column) for column in columns] for row in rows]
    conn.executemany(f"INSERT INTO {table} ({column_sql}) VALUES ({placeholders})", values)


def load_sources(conn: sqlite3.Connection, exports_dir: Path, now: datetime) -> None:
    articles = collect_articles(now)
    insert_rows(conn, "articles", articles)
    article_slugs = {row["slug"] for row in articles}

    aliases = load_json(SLUG_ALIASES_PATH)
    alias_rows = [
        {
            "alias_slug": normalize_slug(alias),
            "target_slug": normalize_slug(target),
            "target_exists": int(normalize_slug(target) in article_slugs),
        }
        for alias, target in sorted(aliases.items())
    ]
    insert_rows(conn, "slug_aliases", alias_rows)
    alias_slugs = {row["alias_slug"] for row in alias_rows}

    router = load_json(ROUTER_MAPPING_PATH)
    router_rows: list[dict[str, Any]] = []
    for base_slug, variants in sorted(router.items()):
        for variant_key, variant in sorted((variants or {}).items()):
            variant_slug = normalize_slug(variant.get("url_slug"))
            if not variant_slug:
                continue
            router_rows.append(
                {
                    "base_slug": normalize_slug(base_slug),
                    "variant_key": str(variant_key),
                    "variant_slug": variant_slug,
                    "title": variant.get("title") or "",
                    "base_exists": int(normalize_slug(base_slug) in article_slugs),
                    "alias_exists": int(variant_slug in alias_slugs),
                }
            )
    insert_rows(conn, "router_variants", router_rows)

    bing_path = discover_latest(exports_dir, "daily-life-hacks.com_SiteExplorerUrls_*.csv")
    bing_rows = []
    for row in read_csv(bing_path):
        parts = url_parts(row.get("URL", ""))
        bing_rows.append(
            {
                "url": row.get("URL", ""),
                "host": parts["host"],
                "path": parts["path"],
                "slug": parts["slug"],
                "impressions": to_int(row.get("Impressions")),
                "clicks": to_int(row.get("Clicks")),
                "last_crawled": row.get("Last crawled") or None,
                "discovered_on": row.get("Discovered on") or None,
                "http_code": to_int(row.get("HTTP code")),
                "document_size": to_int(row.get("Document size")),
                "backlinks": to_int(row.get("Backlinks")),
            }
        )
    insert_rows(conn, "bing_urls", bing_rows)

    coverage_zip = discover_latest(exports_dir, "daily-life-hacks.com-Coverage-*.zip")
    coverage_rows = [
        {
            "reason": row.get("Reason", ""),
            "source": row.get("Source", ""),
            "validation": row.get("Validation", ""),
            "pages": to_int(row.get("Pages")),
        }
        for row in read_zip_csv(coverage_zip, "Critical issues.csv")
    ]
    insert_rows(conn, "gsc_coverage_issues", coverage_rows)

    coverage_chart_rows = [
        {
            "date": row.get("Date", ""),
            "not_indexed": to_int(row.get("Not indexed")),
            "indexed": to_int(row.get("Indexed")),
            "impressions": to_int(row.get("Impressions")),
        }
        for row in read_zip_csv(coverage_zip, "Chart.csv")
    ]
    insert_rows(conn, "gsc_coverage_chart", coverage_chart_rows)

    performance_zip = discover_latest(exports_dir, "daily-life-hacks.com-Performance-on-Search-*.zip")
    pages_rows = []
    for row in read_zip_csv(performance_zip, "Pages.csv"):
        url = row.get("Top pages", "")
        parts = url_parts(url)
        pages_rows.append(
            {
                "url": url,
                "host": parts["host"],
                "path": parts["path"],
                "slug": parts["slug"],
                "has_trailing_slash": int(parts["has_trailing_slash"]),
                "clicks": to_int(row.get("Clicks")),
                "impressions": to_int(row.get("Impressions")),
                "ctr": row.get("CTR", ""),
                "position": to_float(row.get("Position")),
            }
        )
    insert_rows(conn, "gsc_pages", pages_rows)

    query_rows = [
        {
            "query": row.get("Top queries", ""),
            "clicks": to_int(row.get("Clicks")),
            "impressions": to_int(row.get("Impressions")),
            "ctr": row.get("CTR", ""),
            "position": to_float(row.get("Position")),
        }
        for row in read_zip_csv(performance_zip, "Queries.csv")
    ]
    insert_rows(conn, "gsc_queries", query_rows)

    ai_path = discover_latest(exports_dir, "daily-life-hacks.com_AIPerformanceOverviewStats_*.csv")
    ai_rows = [
        {
            "date": row.get("Date", ""),
            "citations": to_int(row.get("Citations")),
            "cited_pages": to_int(row.get("Cited Pages")),
        }
        for row in read_csv(ai_path)
    ]
    insert_rows(conn, "ai_overview", ai_rows)


def classify_url(
    slug: str,
    path: str,
    article_slugs: set[str],
    alias_targets: dict[str, str],
    variant_targets: dict[str, str],
) -> tuple[str, str | None]:
    normalized_path = path.strip("/")
    if not slug:
        return "home", ""
    if slug in UTILITY_SLUGS:
        return "utility", slug
    if slug == "tag":
        return "tag", slug
    if slug in CATEGORY_SLUGS:
        if re.fullmatch(r"(nutrition|recipes|tips)(/\d+)?/?", normalized_path):
            return "category_pagination" if "/" in normalized_path else "category", slug
    if any(pattern in slug for pattern in OFF_TOPIC_PATTERNS):
        return "off_topic_candidate", None
    if slug in article_slugs:
        return "article", slug
    if slug in alias_targets:
        return "alias", alias_targets[slug]
    if slug in variant_targets:
        return "router_variant", variant_targets[slug]
    return "unmatched", None


def build_triage(conn: sqlite3.Connection) -> None:
    article_rows = conn.execute("SELECT * FROM articles").fetchall()
    article_by_slug = {row["slug"]: row for row in article_rows}
    article_slugs = set(article_by_slug)
    alias_targets = {
        row["alias_slug"]: row["target_slug"]
        for row in conn.execute("SELECT alias_slug, target_slug FROM slug_aliases")
    }
    variant_targets = {
        row["variant_slug"]: row["base_slug"]
        for row in conn.execute("SELECT variant_slug, base_slug FROM router_variants")
    }

    urls: dict[str, dict[str, Any]] = {}
    for row in conn.execute("SELECT * FROM bing_urls"):
        urls.setdefault(row["url"], {"sources": set(), "bing": None, "gsc": None})
        urls[row["url"]]["sources"].add("bing")
        urls[row["url"]]["bing"] = row
    for row in conn.execute("SELECT * FROM gsc_pages"):
        urls.setdefault(row["url"], {"sources": set(), "bing": None, "gsc": None})
        urls[row["url"]]["sources"].add("gsc_pages")
        urls[row["url"]]["gsc"] = row

    rows = []
    for url, bundle in sorted(urls.items()):
        source_row = bundle["bing"] or bundle["gsc"]
        parts = url_parts(url)
        kind, canonical_slug = classify_url(
            parts["slug"],
            parts["path"],
            article_slugs,
            alias_targets,
            variant_targets,
        )
        article = article_by_slug.get(canonical_slug or parts["slug"])
        bing = bundle["bing"]
        gsc = bundle["gsc"]
        action, priority, rationale = recommend_action(kind, parts, article, bing, gsc)
        rows.append(
            {
                "url": url,
                "source_flags": ",".join(sorted(bundle["sources"])),
                "host": source_row["host"] if source_row else parts["host"],
                "path": source_row["path"] if source_row else parts["path"],
                "slug": source_row["slug"] if source_row else parts["slug"],
                "url_kind": kind,
                "canonical_slug": canonical_slug,
                "article_word_count": article["body_word_count"] if article else None,
                "article_released": article["is_released"] if article else None,
                "bing_http_code": bing["http_code"] if bing else None,
                "bing_document_size": bing["document_size"] if bing else None,
                "bing_impressions": bing["impressions"] if bing else None,
                "gsc_impressions": gsc["impressions"] if gsc else None,
                "gsc_position": gsc["position"] if gsc else None,
                "recommended_action": action,
                "priority": priority,
                "rationale": rationale,
            }
        )
    insert_rows(conn, "triage_candidates", rows)


def recommend_action(
    kind: str,
    parts: dict[str, Any],
    article: sqlite3.Row | None,
    bing: sqlite3.Row | None,
    gsc: sqlite3.Row | None,
) -> tuple[str, str, str]:
    doc_size = bing["document_size"] if bing else None
    impressions = max(bing["impressions"] if bing else 0, gsc["impressions"] if gsc else 0)
    no_slash_on_www = parts["host"] == CANONICAL_HOST and not parts["has_trailing_slash"]
    non_www = parts["host"] == "daily-life-hacks.com"

    if kind == "article" and article:
        if article["is_released"] == 0:
            return (
                "keep_noindex_until_release",
                "P1",
                "Canonical article is future-dated; verify it is excluded from sitemap until released.",
            )
        if no_slash_on_www or non_www:
            return (
                "enforce_301_to_canonical_url",
                "P0",
                "Article exists, but the crawled URL is not the canonical www/trailing-slash shape.",
            )
        if doc_size == 0:
            return (
                "verify_live_render_before_content_action",
                "P0" if impressions else "P1",
                "Bing reported zero-byte, but the slug maps to a real article; do not delete from export alone.",
            )
        if article["body_word_count"] < 300:
            return (
                "expand_merge_or_301",
                "P0",
                "Canonical article body is below the thin-content threshold.",
            )
        return (
            "keep_review_for_content_depth",
            "P1" if impressions else "P2",
            "Canonical article exists with non-thin body; review only if search opportunity justifies it.",
        )

    if kind in INTENTIONAL_NOINDEX_KINDS:
        return (
            "confirm_noindex_and_canonical_target",
            "P0" if impressions > 10 else "P1",
            "URL is an alias, router variant, tag, or utility-style page; it should not compete as a separate indexable page.",
        )

    if kind == "category":
        return (
            "review_category_indexability_policy",
            "P1",
            "Category root may be indexable by design; verify sitemap and canonical policy.",
        )

    if kind == "off_topic_candidate":
        return (
            "delete_or_301_after_manual_approval",
            "P0",
            "Slug appears off-topic for the food/nutrition site and should not remain as a live SEO page without approval.",
        )

    if kind == "unmatched":
        if bing and bing["http_code"] == 200:
            return (
                "investigate_unmatched_live_200",
                "P0" if impressions else "P1",
                "Bing saw a 200 for a slug not present as article, alias, or router variant.",
            )
        return (
            "redirect_or_ignore_if_not_reachable",
            "P1",
            "URL is not mapped in the repo; decide whether it needs a 301 based on internal links and impressions.",
        )

    return (
        "document_no_action",
        "P2",
        "Low-risk URL class; keep in report unless evidence changes.",
    )


def write_csv_report(conn: sqlite3.Connection, path: Path) -> None:
    rows = conn.execute(
        """
        SELECT priority, url_kind, recommended_action, url, canonical_slug,
               article_word_count, bing_document_size, bing_impressions,
               gsc_impressions, gsc_position, rationale
        FROM triage_candidates
        ORDER BY
          CASE priority WHEN 'P0' THEN 0 WHEN 'P1' THEN 1 ELSE 2 END,
          COALESCE(gsc_impressions, 0) + COALESCE(bing_impressions, 0) DESC,
          url
        """
    ).fetchall()
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.writer(handle)
        writer.writerow(rows[0].keys() if rows else ["priority", "url_kind", "recommended_action", "url"])
        for row in rows:
            writer.writerow([row[key] for key in row.keys()])


def scalar(conn: sqlite3.Connection, sql: str, params: tuple[Any, ...] = ()) -> Any:
    row = conn.execute(sql, params).fetchone()
    return row[0] if row else None


def table_lines(rows: list[sqlite3.Row], columns: list[str]) -> list[str]:
    lines = [
        "| " + " | ".join(columns) + " |",
        "| " + " | ".join(["---"] * len(columns)) + " |",
    ]
    for row in rows:
        lines.append("| " + " | ".join(str(row[column] if row[column] is not None else "") for column in columns) + " |")
    return lines


def write_markdown_report(conn: sqlite3.Connection, path: Path) -> None:
    priority_rows = conn.execute(
        """
        SELECT priority, url_kind, recommended_action, COUNT(*) AS count
        FROM triage_candidates
        GROUP BY priority, url_kind, recommended_action
        ORDER BY CASE priority WHEN 'P0' THEN 0 WHEN 'P1' THEN 1 ELSE 2 END, count DESC
        """
    ).fetchall()
    p0_rows = conn.execute(
        """
        SELECT priority, url_kind, recommended_action, url, canonical_slug,
               article_word_count, bing_document_size, bing_impressions,
               gsc_impressions, ROUND(gsc_position, 2) AS gsc_position
        FROM triage_candidates
        WHERE priority = 'P0'
        ORDER BY COALESCE(gsc_impressions, 0) + COALESCE(bing_impressions, 0) DESC, url
        LIMIT 50
        """
    ).fetchall()
    coverage_rows = conn.execute(
        """
        SELECT reason, source, validation, pages
        FROM gsc_coverage_issues
        ORDER BY pages DESC
        """
    ).fetchall()
    thin_rows = conn.execute(
        """
        SELECT slug, body_word_count, category, frontmatter_complete, image_exists, missing_fields_json
        FROM articles
        WHERE body_word_count < 300 OR frontmatter_complete = 0 OR image_exists = 0
        ORDER BY body_word_count ASC, slug
        LIMIT 50
        """
    ).fetchall()
    duplicate_rows = conn.execute(
        """
        SELECT slug, COUNT(*) AS variants, SUM(impressions) AS impressions
        FROM gsc_pages
        GROUP BY slug
        HAVING COUNT(*) > 1
        ORDER BY impressions DESC
        LIMIT 30
        """
    ).fetchall()

    created_at = datetime.now(timezone.utc).isoformat(timespec="seconds")
    lines = [
        "# Content Indexing Audit Triage Report",
        "",
        f"Generated: {created_at}",
        "",
        "## Summary",
        "",
        f"- Articles scanned: {scalar(conn, 'SELECT COUNT(*) FROM articles')}",
        f"- Released canonical articles: {scalar(conn, 'SELECT COUNT(*) FROM articles WHERE is_released = 1')}",
        f"- Alias slugs: {scalar(conn, 'SELECT COUNT(*) FROM slug_aliases')}",
        f"- Router variants: {scalar(conn, 'SELECT COUNT(*) FROM router_variants')}",
        f"- Bing URLs loaded: {scalar(conn, 'SELECT COUNT(*) FROM bing_urls')}",
        f"- Bing zero-byte URLs: {scalar(conn, 'SELECT COUNT(*) FROM bing_urls WHERE document_size = 0')}",
        f"- GSC pages loaded: {scalar(conn, 'SELECT COUNT(*) FROM gsc_pages')}",
        f"- AI citations loaded: {scalar(conn, 'SELECT COALESCE(SUM(citations), 0) FROM ai_overview')}",
        "",
        "## Priority Counts",
        "",
        *table_lines(priority_rows, ["priority", "url_kind", "recommended_action", "count"]),
        "",
        "## GSC Coverage Issues",
        "",
        *table_lines(coverage_rows, ["reason", "source", "validation", "pages"]),
        "",
        "## P0 Candidates",
        "",
        *table_lines(
            p0_rows,
            [
                "priority",
                "url_kind",
                "recommended_action",
                "url",
                "canonical_slug",
                "article_word_count",
                "bing_document_size",
                "bing_impressions",
                "gsc_impressions",
                "gsc_position",
            ],
        ),
        "",
        "## Canonical Articles With Thin Body Or Missing Fields/Images",
        "",
        *table_lines(
            thin_rows,
            ["slug", "body_word_count", "category", "frontmatter_complete", "image_exists", "missing_fields_json"],
        ),
        "",
        "## GSC Duplicate URL Shapes",
        "",
        *table_lines(duplicate_rows, ["slug", "variants", "impressions"]),
        "",
        "## Safety Note",
        "",
        "This report is a triage input, not an approval to delete content. Any delete, redirect, noindex change, D1 mutation, production deploy, or promotion still needs explicit approval.",
        "",
    ]
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(lines), encoding="utf-8")


def write_summary_json(conn: sqlite3.Connection, path: Path) -> None:
    summary = {
        "articles": scalar(conn, "SELECT COUNT(*) FROM articles"),
        "released_articles": scalar(conn, "SELECT COUNT(*) FROM articles WHERE is_released = 1"),
        "bing_urls": scalar(conn, "SELECT COUNT(*) FROM bing_urls"),
        "bing_zero_byte_urls": scalar(conn, "SELECT COUNT(*) FROM bing_urls WHERE document_size = 0"),
        "gsc_pages": scalar(conn, "SELECT COUNT(*) FROM gsc_pages"),
        "p0_candidates": scalar(conn, "SELECT COUNT(*) FROM triage_candidates WHERE priority = 'P0'"),
        "triage_by_action": [
            dict(row)
            for row in conn.execute(
                """
                SELECT priority, recommended_action, COUNT(*) AS count
                FROM triage_candidates
                GROUP BY priority, recommended_action
                ORDER BY CASE priority WHEN 'P0' THEN 0 WHEN 'P1' THEN 1 ELSE 2 END, count DESC
                """
            )
        ],
    }
    path.write_text(json.dumps(summary, indent=2), encoding="utf-8")


def run_audit(exports_dir: Path, db_path: Path, markdown_report: Path, csv_report: Path) -> dict[str, Any]:
    AUDIT_DIR.mkdir(parents=True, exist_ok=True)
    if db_path.exists():
        db_path.unlink()
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    try:
        init_schema(conn)
        created_at = datetime.now(timezone.utc).isoformat(timespec="seconds")
        conn.execute(
            "INSERT INTO audit_runs (created_at, repo_root, exports_dir) VALUES (?, ?, ?)",
            (created_at, str(REPO_ROOT), str(exports_dir)),
        )
        load_sources(conn, exports_dir, datetime.now(timezone.utc))
        build_triage(conn)
        conn.commit()
        write_markdown_report(conn, markdown_report)
        write_csv_report(conn, csv_report)
        summary_path = markdown_report.with_suffix(".summary.json")
        write_summary_json(conn, summary_path)
        return {
            "db": str(db_path),
            "markdown_report": str(markdown_report),
            "csv_report": str(csv_report),
            "summary_json": str(summary_path),
            "articles": scalar(conn, "SELECT COUNT(*) FROM articles"),
            "triage_candidates": scalar(conn, "SELECT COUNT(*) FROM triage_candidates"),
            "p0_candidates": scalar(conn, "SELECT COUNT(*) FROM triage_candidates WHERE priority = 'P0'"),
        }
    finally:
        conn.close()


def build_arg_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Build a SQLite-backed content indexing audit.")
    parser.add_argument(
        "--exports-dir",
        type=Path,
        default=Path.home() / "Downloads",
        help="Directory containing GSC/Bing CSV and ZIP exports.",
    )
    parser.add_argument("--db", type=Path, default=DEFAULT_DB, help="SQLite output path.")
    parser.add_argument(
        "--markdown-report",
        type=Path,
        default=DEFAULT_MARKDOWN_REPORT,
        help="Markdown triage report output path.",
    )
    parser.add_argument(
        "--csv-report",
        type=Path,
        default=DEFAULT_CSV_REPORT,
        help="CSV triage report output path.",
    )
    return parser


def main() -> None:
    args = build_arg_parser().parse_args()
    summary = run_audit(
        exports_dir=args.exports_dir,
        db_path=args.db,
        markdown_report=args.markdown_report,
        csv_report=args.csv_report,
    )
    print("[audit:content] OK")
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
