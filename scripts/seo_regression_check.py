#!/usr/bin/env python3
"""
SEO / AEO regression harness for daily-life-hacks.com.

Why this exists
---------------
This site has twice shipped silent SEO regressions:

  1. A production sitemap that lost its ``<priority>`` and ``<image:loc>``
     elements. Nothing crashed, nothing was red, and nobody noticed for days.
  2. Scheduled (future-dated) articles that were linked and crawled while
     returning 404.

Both were invisible to the build. This harness makes them LOUD: it runs a fixed
set of checks against either a live origin or a freshly built ``dist/``, prints
a pass/fail table, and exits non-zero the moment anything regresses.

Design rules
------------
* Python 3 standard library only. No pip installs, no npm installs.
* The sitemap *exclusion* rules are NOT re-implemented here. They are read out
  of ``astro.config.mjs`` itself via ``scripts/seo_config_bridge.mjs``, so this
  harness cannot drift from the build. A guessed exclusion list would be the
  same class of bug it is meant to catch.
* Windows-path safe: pathlib everywhere, explicit utf-8, ASCII-only output.

Usage
-----
    python scripts/seo_regression_check.py --live
    python scripts/seo_regression_check.py --live --sample 40
    python scripts/seo_regression_check.py --dist          # CI, after a build

Exit codes
----------
    0  all checks passed (skipped checks do not fail the run)
    1  at least one check FAILED
    2  the harness itself could not run
"""

from __future__ import annotations

import argparse
import concurrent.futures
import json
import re
import subprocess
import sys
import time
import urllib.error
import urllib.request
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable, Iterable
from urllib.parse import urlsplit, urlunsplit

# --------------------------------------------------------------------------
# Constants
# --------------------------------------------------------------------------

DEFAULT_BASE_URL = "https://www.daily-life-hacks.com"
DEFAULT_SAMPLE = 30
DEFAULT_CONCURRENCY = 8
DEFAULT_TIMEOUT = 25
USER_AGENT = "dlh-seo-regression-check/1.0 (+https://www.daily-life-hacks.com)"

REPO_ROOT = Path(__file__).resolve().parent.parent
ARTICLES_DIR = REPO_ROOT / "src" / "data" / "articles"
CONFIG_BRIDGE = Path(__file__).resolve().parent / "seo_config_bridge.mjs"
ASTRO_CONFIG = REPO_ROOT / "astro.config.mjs"
ALIASES_JSON = REPO_ROOT / "pipeline-data" / "slug-aliases.json"

# Utility pages that are deliberately kept out of the sitemap. This list is the
# *assertion* (check 5), and it is independently cross-checked against what
# astro.config.mjs actually decides, so a silent divergence is reported.
UTILITY_PAGES = [
    "/dashboard/",
    "/gauntlet/",
    "/deploy-proof/",
    "/thank-you/",
    "/contact/",
    "/privacy/",
    "/terms/",
    "/disclaimer/",
]

SM_NS = "{http://www.sitemaps.org/schemas/sitemap/0.9}"

PASS, FAIL, SKIP, INFO = "PASS", "FAIL", "SKIP", "INFO"


# --------------------------------------------------------------------------
# Result plumbing
# --------------------------------------------------------------------------


@dataclass
class CheckResult:
    number: int
    name: str
    status: str = SKIP
    summary: str = ""
    details: list[str] = field(default_factory=list)

    def ok(self, summary: str, details: Iterable[str] = ()) -> "CheckResult":
        self.status, self.summary = PASS, summary
        self.details = list(details)
        return self

    def bad(self, summary: str, details: Iterable[str] = ()) -> "CheckResult":
        self.status, self.summary = FAIL, summary
        self.details = list(details)
        return self

    def skip(self, summary: str, details: Iterable[str] = ()) -> "CheckResult":
        self.status, self.summary = SKIP, summary
        self.details = list(details)
        return self


# --------------------------------------------------------------------------
# URL helpers
# --------------------------------------------------------------------------


def normalize_url(url: str) -> str:
    """Lowercase scheme/host, drop fragment, keep the path as-is."""
    parts = urlsplit(url.strip())
    return urlunsplit(
        (parts.scheme.lower(), parts.netloc.lower(), parts.path, parts.query, "")
    )


def path_of(url: str) -> str:
    """Path with a guaranteed trailing slash (the site uses trailingSlash: always)."""
    path = urlsplit(url.strip()).path or "/"
    if not path.endswith("/") and "." not in path.rsplit("/", 1)[-1]:
        path += "/"
    return path


def join_url(base: str, path: str) -> str:
    return base.rstrip("/") + "/" + path.lstrip("/")


# --------------------------------------------------------------------------
# Page sources: live origin vs local dist/
# --------------------------------------------------------------------------


@dataclass
class Fetched:
    url: str
    status: int
    final_url: str
    body: str = ""
    error: str = ""


class LiveSource:
    kind = "live"

    def __init__(self, base_url: str, timeout: int):
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout

    def _open(self, url: str, method: str) -> Fetched:
        req = urllib.request.Request(
            url, method=method, headers={"User-Agent": USER_AGENT, "Accept": "*/*"}
        )
        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                raw = resp.read() if method == "GET" else b""
                body = raw.decode("utf-8", errors="replace")
                return Fetched(url, resp.status, resp.geturl(), body)
        except urllib.error.HTTPError as exc:
            raw = b""
            try:
                raw = exc.read() if method == "GET" else b""
            except Exception:  # pragma: no cover - best effort
                pass
            return Fetched(
                url, exc.code, exc.url or url, raw.decode("utf-8", errors="replace")
            )
        except Exception as exc:  # network/DNS/TLS/timeout
            return Fetched(url, 0, url, "", f"{type(exc).__name__}: {exc}")

    def head(self, url: str) -> Fetched:
        result = self._open(url, "HEAD")
        # Some edges reject HEAD outright; fall back rather than cry wolf.
        if result.status in (0, 403, 405, 501):
            return self._open(url, "GET")
        return result

    def get(self, url: str) -> Fetched:
        return self._open(url, "GET")


class DistSource:
    kind = "dist"

    def __init__(self, dist_dir: Path, base_url: str):
        self.dist_dir = dist_dir
        self.base_url = base_url.rstrip("/")

    def _local_path(self, url: str) -> Path:
        path = path_of(url).lstrip("/")
        if path.endswith("/") or path == "":
            return self.dist_dir / path / "index.html"
        return self.dist_dir / path

    def head(self, url: str) -> Fetched:
        target = self._local_path(url)
        return Fetched(url, 200 if target.is_file() else 404, url)

    def get(self, url: str) -> Fetched:
        target = self._local_path(url)
        if not target.is_file():
            return Fetched(url, 404, url)
        return Fetched(
            url, 200, url, target.read_text(encoding="utf-8", errors="replace")
        )


# --------------------------------------------------------------------------
# HTML parsing (regex is adequate and dependency-free for these tags)
# --------------------------------------------------------------------------

TAG_RE = re.compile(r"<(link|meta)\b[^>]*>", re.IGNORECASE)
ATTR_RE = re.compile(r"""(\w[\w:-]*)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))""")
JSONLD_RE = re.compile(
    r"""<script[^>]*type\s*=\s*["']application/ld\+json["'][^>]*>(.*?)</script>""",
    re.IGNORECASE | re.DOTALL,
)


def _attrs(tag: str) -> dict[str, str]:
    out = {}
    for m in ATTR_RE.finditer(tag):
        out[m.group(1).lower()] = m.group(3) or m.group(4) or m.group(5) or ""
    return out


def extract_canonical(html: str) -> str | None:
    for m in TAG_RE.finditer(html):
        tag = m.group(0)
        if not tag.lower().startswith("<link"):
            continue
        attrs = _attrs(tag)
        if attrs.get("rel", "").strip().lower() == "canonical":
            return attrs.get("href", "").strip() or None
    return None


def extract_robots_meta(html: str) -> str | None:
    values = []
    for m in TAG_RE.finditer(html):
        tag = m.group(0)
        if not tag.lower().startswith("<meta"):
            continue
        attrs = _attrs(tag)
        name = attrs.get("name", "").strip().lower()
        if name in ("robots", "googlebot"):
            values.append(attrs.get("content", "").strip().lower())
    return ", ".join(values) if values else None


def extract_jsonld_blocks(html: str) -> list[str]:
    return [m.group(1).strip() for m in JSONLD_RE.finditer(html)]


# --------------------------------------------------------------------------
# Sitemap loading
# --------------------------------------------------------------------------


@dataclass
class Sitemap:
    files: list[str]
    raw_by_file: dict[str, str]
    urls: list[str]

    @property
    def paths(self) -> set[str]:
        return {path_of(u) for u in self.urls}


def _parse_urlset(raw: str) -> list[str]:
    import xml.etree.ElementTree as ET

    root = ET.fromstring(raw)
    return [
        (loc.text or "").strip()
        for loc in root.iter(f"{SM_NS}loc")
        if (loc.text or "").strip()
    ]


def load_sitemap(source, base_url: str) -> tuple[Sitemap | None, str]:
    """Return (sitemap, error). Follows a sitemap index one level deep."""
    index_url = join_url(base_url, "/sitemap-index.xml")
    res = source.get(index_url)
    if res.status != 200 or not res.body.strip():
        return None, f"{index_url} -> HTTP {res.status} {res.error}".strip()

    import xml.etree.ElementTree as ET

    raw_by_file: dict[str, str] = {index_url: res.body}
    try:
        root = ET.fromstring(res.body)
    except ET.ParseError as exc:
        return None, f"{index_url} is not valid XML: {exc}"

    child_files: list[str] = []
    if root.tag == f"{SM_NS}sitemapindex":
        child_files = [
            (loc.text or "").strip()
            for loc in root.iter(f"{SM_NS}loc")
            if (loc.text or "").strip()
        ]
    else:
        child_files = [index_url]

    urls: list[str] = []
    files: list[str] = []
    for child in child_files:
        if child == index_url:
            raw = res.body
        else:
            # Keep the configured origin so --base-url overrides really apply.
            fetch_url = join_url(base_url, path_of(child).rstrip("/") or "/")
            fetch_url = join_url(base_url, urlsplit(child).path)
            sub = source.get(fetch_url)
            if sub.status != 200:
                return None, f"child sitemap {fetch_url} -> HTTP {sub.status} {sub.error}".strip()
            raw = sub.body
            child = fetch_url
        files.append(child)
        raw_by_file[child] = raw
        try:
            urls.extend(_parse_urlset(raw))
        except ET.ParseError as exc:
            return None, f"{child} is not valid XML: {exc}"

    # De-duplicate while keeping order stable for reproducible sampling.
    seen, ordered = set(), []
    for u in urls:
        n = normalize_url(u)
        if n not in seen:
            seen.add(n)
            ordered.append(n)
    return Sitemap(files=files, raw_by_file=raw_by_file, urls=ordered), ""


# --------------------------------------------------------------------------
# astro.config.mjs bridge (the real exclusion logic)
# --------------------------------------------------------------------------


def query_config_rules(urls: list[str], node_bin: str) -> tuple[dict, str]:
    if not CONFIG_BRIDGE.is_file():
        return {}, f"missing bridge script: {CONFIG_BRIDGE}"
    if not ASTRO_CONFIG.is_file():
        return {}, f"missing {ASTRO_CONFIG}"
    payload = json.dumps({"urls": urls})
    try:
        proc = subprocess.run(
            [node_bin, str(CONFIG_BRIDGE), str(ASTRO_CONFIG)],
            input=payload,
            capture_output=True,
            text=True,
            encoding="utf-8",
            cwd=str(REPO_ROOT),
            timeout=180,
        )
    except FileNotFoundError:
        return {}, (
            f"'{node_bin}' not found. The harness reads sitemap exclusions from "
            "astro.config.mjs itself and refuses to guess them; install Node or "
            "pass --node-bin."
        )
    except subprocess.TimeoutExpired:
        return {}, "astro.config.mjs bridge timed out after 180s"
    if not proc.stdout.strip():
        return {}, f"bridge produced no output (stderr: {proc.stderr.strip()[:400]})"
    try:
        data = json.loads(proc.stdout.strip().splitlines()[-1])
    except json.JSONDecodeError as exc:
        return {}, f"bridge output was not JSON: {exc}; stderr: {proc.stderr.strip()[:400]}"
    if not data.get("ok"):
        return {}, f"bridge error: {data.get('error')}"
    return data, ""


# --------------------------------------------------------------------------
# robots.txt
# --------------------------------------------------------------------------


def parse_robots(text: str) -> tuple[list[tuple[set[str], list[tuple[bool, str]]]], list[str]]:
    groups: list[tuple[set[str], list[tuple[bool, str]]]] = []
    sitemaps: list[str] = []
    agents: set[str] = set()
    rules: list[tuple[bool, str]] = []
    expecting_agents = True

    def flush():
        if agents:
            groups.append((set(agents), list(rules)))

    for line in text.splitlines():
        line = line.split("#", 1)[0].strip()
        if not line or ":" not in line:
            continue
        field, _, value = line.partition(":")
        field, value = field.strip().lower(), value.strip()
        if field == "user-agent":
            if not expecting_agents:
                flush()
                agents, rules = set(), []
                expecting_agents = True
            agents.add(value.lower())
        elif field in ("allow", "disallow"):
            expecting_agents = False
            rules.append((field == "allow", value))
        elif field == "sitemap":
            sitemaps.append(value)
    flush()
    return groups, sitemaps


def _robots_match_len(pattern: str, path: str) -> int:
    """Longest-prefix match with * and $ support. Returns -1 for no match."""
    if pattern == "":
        return -1
    regex = ""
    anchored_end = pattern.endswith("$")
    body = pattern[:-1] if anchored_end else pattern
    for ch in body:
        regex += ".*" if ch == "*" else re.escape(ch)
    regex = "^" + regex + ("$" if anchored_end else "")
    m = re.match(regex, path)
    return len(body) if m else -1


def robots_allows(groups, sitemaps, agent: str, path: str) -> tuple[bool, str]:
    agent = agent.lower()
    chosen = None
    for agents, rules in groups:
        if agent in agents:
            chosen = rules
            break
    if chosen is None:
        for agents, rules in groups:
            if "*" in agents:
                chosen = rules
                break
    if chosen is None:
        return True, "no matching group"
    best_len, best_allow, best_rule = -1, True, ""
    for allow, pattern in chosen:
        length = _robots_match_len(pattern, path)
        if length > best_len or (length == best_len and length >= 0 and allow):
            if length >= 0:
                best_len, best_allow, best_rule = length, allow, pattern
    if best_len < 0:
        return True, "no rule matched"
    return best_allow, f"{'Allow' if best_allow else 'Disallow'}: {best_rule}"


# --------------------------------------------------------------------------
# Sampling
# --------------------------------------------------------------------------


def choose_sample(urls: list[str], size: int, seed: int | None) -> list[str]:
    if size <= 0 or size >= len(urls):
        return list(urls)
    ordered = sorted(urls)
    if seed is not None:
        import random

        return sorted(random.Random(seed).sample(ordered, size))

    # Deterministic and reproducible: always cover the structural pages, then
    # stride evenly across everything else.
    must_have = [
        u
        for u in ordered
        if path_of(u) in ("/", "/nutrition/", "/recipes/", "/tips/", "/guides/", "/research/")
    ]
    picked = list(dict.fromkeys(must_have))[:size]
    rest = [u for u in ordered if u not in set(picked)]
    remaining = size - len(picked)
    if remaining > 0 and rest:
        step = max(1, len(rest) // remaining)
        for i in range(0, len(rest), step):
            if len(picked) >= size:
                break
            picked.append(rest[i])
    return sorted(dict.fromkeys(picked))


# --------------------------------------------------------------------------
# dist/ staleness guard
# --------------------------------------------------------------------------


def newest_mtime(paths: Iterable[Path], patterns: Iterable[str]) -> float:
    newest = 0.0
    for root in paths:
        if not root.exists():
            continue
        if root.is_file():
            newest = max(newest, root.stat().st_mtime)
            continue
        for pattern in patterns:
            for p in root.glob(pattern):
                if p.is_file():
                    newest = max(newest, p.stat().st_mtime)
    return newest


def dist_guard(dist_dir: Path) -> str:
    """Return '' if dist/ is usable, otherwise a human-readable reason to skip."""
    if not dist_dir.is_dir():
        return f"dist/ does not exist at {dist_dir} -- run `npm run build` first"
    if not (dist_dir / "sitemap-index.xml").is_file():
        return (
            f"{dist_dir / 'sitemap-index.xml'} is missing -- dist/ is not a complete "
            "build; run `npm run build` first"
        )
    dist_built = newest_mtime([dist_dir / "sitemap-index.xml", dist_dir / "index.html"], [])
    src_newest = newest_mtime(
        [REPO_ROOT / "src", ASTRO_CONFIG, REPO_ROOT / "package.json"],
        ["**/*"],
    )
    if src_newest > dist_built + 1:
        import datetime as _dt

        fmt = lambda t: _dt.datetime.fromtimestamp(t).strftime("%Y-%m-%d %H:%M:%S")
        return (
            f"dist/ is STALE (built {fmt(dist_built)}, sources changed {fmt(src_newest)}) "
            "-- run `npm run build` before trusting dist-mode results"
        )
    return ""


# --------------------------------------------------------------------------
# The checks
# --------------------------------------------------------------------------


def check_1_released_articles(sitemap: Sitemap, base_url: str, node_bin: str) -> CheckResult:
    r = CheckResult(1, "released articles are in the sitemap")
    if not ARTICLES_DIR.is_dir():
        return r.bad(f"missing {ARTICLES_DIR}")

    slugs = sorted(p.stem for p in ARTICLES_DIR.glob("*.md"))
    urls = [join_url(base_url, f"/{slug}/") for slug in slugs]
    data, err = query_config_rules(urls, node_bin)
    if err:
        return r.bad(f"could not read exclusion rules from astro.config.mjs: {err}")

    results = data.get("results", {})
    aliases: dict[str, str] = {}
    if ALIASES_JSON.is_file():
        try:
            aliases = json.loads(ALIASES_JSON.read_text(encoding="utf-8"))
        except Exception:
            aliases = {}

    live_paths = sitemap.paths
    expected, missing, unexpected = [], [], []
    for slug, url in zip(slugs, urls):
        info = results.get(url, {})
        if info.get("excluded") is None:
            return r.bad(f"astro.config.mjs serialize() threw for {url}: {info.get('error')}")
        p = path_of(url)
        if info["excluded"]:
            if p in live_paths:
                reason = "alias slug" if slug in aliases else "unreleased/excluded by config"
                unexpected.append(f"{p}  (config excludes it: {reason}) but it IS in the sitemap")
        else:
            expected.append(p)
            if p not in live_paths:
                missing.append(f"{p}  released per astro.config.mjs but MISSING from the sitemap")

    details = missing + unexpected
    summary = (
        f"{len(expected) - len(missing)}/{len(expected)} released article URLs present "
        f"(of {len(slugs)} article files; exclusion rules read from astro.config.mjs)"
    )
    if details:
        return r.bad(summary + f"; {len(missing)} missing, {len(unexpected)} should not be there", details)
    return r.ok(summary)


def check_2_no_404(sitemap: Sitemap, source, concurrency: int) -> CheckResult:
    r = CheckResult(2, "no sitemap URL returns 404")
    bad: list[str] = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=concurrency) as pool:
        for res in pool.map(source.head, sitemap.urls):
            if res.status == 0:
                bad.append(f"{path_of(res.url)}  network error: {res.error}")
            elif res.status >= 400:
                bad.append(f"{path_of(res.url)}  HTTP {res.status}")
    if bad:
        return r.bad(f"{len(bad)}/{len(sitemap.urls)} sitemap URLs are broken", bad)
    return r.ok(f"all {len(sitemap.urls)} sitemap URLs return < 400")


def check_3_self_canonical(pages: dict[str, Fetched], base_url: str) -> CheckResult:
    r = CheckResult(3, "sampled sitemap URLs are self-canonical")
    bad: list[str] = []
    checked = 0
    for url, res in sorted(pages.items()):
        if res.status != 200 or not res.body:
            bad.append(f"{path_of(url)}  could not fetch (HTTP {res.status} {res.error})".rstrip())
            continue
        checked += 1
        canonical = extract_canonical(res.body)
        if not canonical:
            bad.append(f"{path_of(url)}  no <link rel=canonical> at all")
            continue
        if normalize_url(canonical) != normalize_url(url):
            bad.append(f"{path_of(url)}  canonical points to {canonical}")
    if bad:
        return r.bad(f"{len(bad)}/{len(pages)} sampled pages are not self-canonical", bad)
    return r.ok(f"all {checked} sampled pages are self-canonical")


def check_4_noindex_in_sitemap(pages: dict[str, Fetched]) -> CheckResult:
    r = CheckResult(4, "no page is both noindex and in the sitemap")
    bad: list[str] = []
    for url, res in sorted(pages.items()):
        if res.status != 200 or not res.body:
            continue
        robots = extract_robots_meta(res.body)
        if robots and "noindex" in robots:
            bad.append(f"{path_of(url)}  meta robots = '{robots}' but the URL is in the sitemap")
    if bad:
        return r.bad(f"{len(bad)} sampled sitemap URLs are noindex", bad)
    return r.ok(f"none of the {len(pages)} sampled sitemap URLs are noindex")


def check_5_utility_pages(sitemap: Sitemap, base_url: str, node_bin: str) -> CheckResult:
    r = CheckResult(5, "utility pages are excluded from the sitemap")
    live_paths = sitemap.paths
    leaked = [p for p in UTILITY_PAGES if p in live_paths]

    # Independently confirm astro.config.mjs still agrees, so the published
    # sitemap and the build rules cannot silently diverge.
    details: list[str] = [f"{p}  IS in the sitemap but must not be" for p in leaked]
    data, err = query_config_rules(
        [join_url(base_url, p) for p in UTILITY_PAGES], node_bin
    )
    if err:
        details.append(f"config cross-check unavailable: {err}")
    else:
        for p in UTILITY_PAGES:
            info = data["results"].get(join_url(base_url, p), {})
            if not info.get("excluded"):
                details.append(
                    f"{p}  astro.config.mjs no longer excludes this page (rule drift)"
                )
    if details:
        return r.bad(f"{len(details)} problem(s) with excluded utility pages", details)
    return r.ok(f"all {len(UTILITY_PAGES)} utility pages absent from the sitemap and excluded by config")


def check_6_priority_and_images(sitemap: Sitemap) -> CheckResult:
    r = CheckResult(6, "sitemap has <priority> and <image:loc>")
    url_count = priority_count = image_count = 0
    ns_ok = False
    for name in sitemap.files:
        raw = sitemap.raw_by_file[name]
        if "<urlset" not in raw:
            continue
        url_count += raw.count("<url>")
        priority_count += raw.count("<priority>")
        image_count += raw.count("<image:loc>")
        if "http://www.google.com/schemas/sitemap-image/1.1" in raw:
            ns_ok = True
    details = []
    if url_count == 0:
        return r.bad("sitemap contains no <url> entries at all")
    if priority_count == 0:
        details.append("REGRESSION: <priority> is completely absent from the sitemap")
    elif priority_count < url_count:
        details.append(
            f"only {priority_count}/{url_count} <url> entries carry <priority>"
        )
    if image_count == 0:
        details.append("REGRESSION: <image:loc> is completely absent from the sitemap")
    if not ns_ok and image_count:
        details.append("image entries present but the sitemap-image namespace is not declared")
    if details:
        return r.bad(f"{url_count} urls / {priority_count} priority / {image_count} image:loc", details)
    return r.ok(f"{url_count} urls, {priority_count} <priority>, {image_count} <image:loc>")


def check_7_robots(source, base_url: str, sample_paths: list[str]) -> CheckResult:
    r = CheckResult(7, "robots.txt reachable and does not block articles")
    url = join_url(base_url, "/robots.txt")
    res = source.get(url)
    if res.status != 200 or not res.body.strip():
        return r.bad(f"{url} -> HTTP {res.status} {res.error}".rstrip())
    groups, sitemaps = parse_robots(res.body)
    blocked: list[str] = []
    blocked_paths: set[str] = set()
    agents = ("*", "Googlebot", "bingbot", "GPTBot")
    for agent in agents:
        for path in sample_paths:
            allowed, rule = robots_allows(groups, sitemaps, agent, path)
            if not allowed:
                blocked.append(f"agent '{agent}' is blocked from {path} by '{rule}'")
                blocked_paths.add(path)
    if blocked:
        return r.bad(
            f"{len(blocked_paths)} path(s) disallowed by robots.txt "
            f"({len(blocked)} agent/path combinations across {len(agents)} agents)",
            blocked,
        )
    note = [] if sitemaps else ["note: robots.txt declares no Sitemap: line"]
    return r.ok(
        f"robots.txt OK ({len(groups)} groups, {len(sitemaps)} Sitemap lines); "
        f"{len(sample_paths)} article paths crawlable for 4 agents",
        note,
    )


def check_8_jsonld(pages: dict[str, Fetched]) -> CheckResult:
    r = CheckResult(8, "JSON-LD parses and declares @context/@type")
    bad: list[str] = []
    blocks_total = 0
    pages_with_ld = 0
    for url, res in sorted(pages.items()):
        if res.status != 200 or not res.body:
            continue
        blocks = extract_jsonld_blocks(res.body)
        if not blocks:
            bad.append(f"{path_of(url)}  no JSON-LD block found")
            continue
        pages_with_ld += 1
        for i, block in enumerate(blocks, 1):
            blocks_total += 1
            try:
                data = json.loads(block)
            except json.JSONDecodeError as exc:
                bad.append(f"{path_of(url)}  JSON-LD block {i} is invalid JSON: {exc}")
                continue
            nodes = data if isinstance(data, list) else [data]
            for node in nodes:
                if not isinstance(node, dict):
                    bad.append(f"{path_of(url)}  JSON-LD block {i} is not an object")
                    continue
                if "@context" not in node:
                    bad.append(f"{path_of(url)}  JSON-LD block {i} has no @context")
                graph = node.get("@graph")
                targets = graph if isinstance(graph, list) else [node]
                for t in targets:
                    if isinstance(t, dict) and "@type" not in t:
                        bad.append(f"{path_of(url)}  JSON-LD block {i} has an entry with no @type")
    if bad:
        return r.bad(f"{len(bad)} JSON-LD problem(s) across {len(pages)} sampled pages", bad)
    return r.ok(f"{blocks_total} JSON-LD blocks on {pages_with_ld} sampled pages all valid")


def check_9_llms_txt(source, base_url: str) -> CheckResult:
    r = CheckResult(9, "llms.txt is reachable")
    url = join_url(base_url, "/llms.txt")
    res = source.get(url)
    if res.status != 200:
        return r.bad(f"{url} -> HTTP {res.status} {res.error}".rstrip())
    if len(res.body.strip()) < 50:
        return r.bad(f"{url} is reachable but suspiciously short ({len(res.body)} bytes)")
    return r.ok(f"{url} -> HTTP 200 ({len(res.body)} bytes)")


# --------------------------------------------------------------------------
# Reporting
# --------------------------------------------------------------------------


def print_table(results: list[CheckResult], stream=sys.stdout) -> None:
    rows = [(str(r.number), r.status, r.name, r.summary) for r in results]
    headers = ("#", "STATUS", "CHECK", "RESULT")
    widths = [
        max(len(headers[i]), max((len(row[i]) for row in rows), default=0))
        for i in range(3)
    ]
    line = "  ".join(
        [headers[0].ljust(widths[0]), headers[1].ljust(widths[1]), headers[2].ljust(widths[2]), headers[3]]
    )
    print(line, file=stream)
    print("-" * min(len(line) + 40, 120), file=stream)
    for row in rows:
        print(
            "  ".join([row[0].ljust(widths[0]), row[1].ljust(widths[1]), row[2].ljust(widths[2]), row[3]]),
            file=stream,
        )


def print_failures(results: list[CheckResult], max_details: int, stream=sys.stdout) -> None:
    failed = [r for r in results if r.status == FAIL]
    if not failed:
        return
    print("", file=stream)
    print("=" * 78, file=stream)
    print("FAILURE DETAIL", file=stream)
    print("=" * 78, file=stream)
    for r in failed:
        print(f"\n[{r.number}] {r.name} -- {r.summary}", file=stream)
        for d in r.details[:max_details]:
            print(f"    - {d}", file=stream)
        if len(r.details) > max_details:
            print(f"    ... and {len(r.details) - max_details} more", file=stream)


# --------------------------------------------------------------------------
# Main
# --------------------------------------------------------------------------


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="SEO/AEO regression harness for daily-life-hacks.com",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--live", action="store_true", help="check the live production origin")
    mode.add_argument("--dist", action="store_true", help="check a locally built dist/ (CI)")
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL)
    parser.add_argument("--dist-dir", default=str(REPO_ROOT / "dist"))
    parser.add_argument("--sample", type=int, default=DEFAULT_SAMPLE,
                        help="how many sitemap URLs to fully download for the HTML checks")
    parser.add_argument("--seed", type=int, default=None,
                        help="randomize the sample with this seed (default: deterministic stride)")
    parser.add_argument("--concurrency", type=int, default=DEFAULT_CONCURRENCY)
    parser.add_argument("--timeout", type=int, default=DEFAULT_TIMEOUT)
    parser.add_argument("--node-bin", default="node",
                        help="node binary used to read the real rules out of astro.config.mjs")
    parser.add_argument("--max-details", type=int, default=25,
                        help="max detail lines printed per failing check")
    parser.add_argument("--strict-dist", action="store_true",
                        help="in --dist mode, treat a missing/stale dist/ as a failure instead of a skip")
    parser.add_argument("--json", dest="json_out", default=None,
                        help="also write machine-readable results to this file")
    args = parser.parse_args(argv)

    if hasattr(sys.stdout, "reconfigure"):
        try:
            sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass

    if not args.live and not args.dist:
        args.live = True

    started = time.time()
    base_url = args.base_url.rstrip("/")

    print("=" * 78)
    print("SEO / AEO REGRESSION CHECK -- daily-life-hacks.com")
    print("=" * 78)

    if args.dist:
        dist_dir = Path(args.dist_dir).resolve()
        reason = dist_guard(dist_dir)
        if reason:
            print(f"mode          : dist ({dist_dir})")
            print("")
            print(f"[SKIP] {reason}")
            print("")
            if args.strict_dist:
                print("--strict-dist was passed, so this counts as a FAILURE.")
                return 1
            print("All dist-mode checks skipped. Re-run with --live to check production.")
            return 0
        source = DistSource(dist_dir, base_url)
        origin_label = f"dist ({dist_dir})"
    else:
        source = LiveSource(base_url, args.timeout)
        origin_label = f"live ({base_url})"

    print(f"mode          : {origin_label}")
    print(f"sample size   : {args.sample} URLs (HTML checks 3, 4, 8)")
    print(f"exclusion src : astro.config.mjs via scripts/seo_config_bridge.mjs")
    print("")

    sitemap, err = load_sitemap(source, base_url)
    if sitemap is None:
        print(f"[FATAL] could not load the sitemap: {err}")
        return 2
    print(f"sitemap       : {len(sitemap.files)} file(s), {len(sitemap.urls)} URLs")

    sample = choose_sample(sitemap.urls, args.sample, args.seed)
    print(f"sampled       : {len(sample)} URLs downloaded in full")
    print("")
    print("running checks ...")

    pages: dict[str, Fetched] = {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=args.concurrency) as pool:
        for res in pool.map(source.get, sample):
            pages[res.url] = res

    article_slugs = sorted(p.stem for p in ARTICLES_DIR.glob("*.md")) if ARTICLES_DIR.is_dir() else []
    robots_probe_paths = [f"/{s}/" for s in article_slugs[:20]] + ["/", "/sitemap-index.xml"]

    results = [
        check_1_released_articles(sitemap, base_url, args.node_bin),
        check_2_no_404(sitemap, source, args.concurrency),
        check_3_self_canonical(pages, base_url),
        check_4_noindex_in_sitemap(pages),
        check_5_utility_pages(sitemap, base_url, args.node_bin),
        check_6_priority_and_images(sitemap),
        check_7_robots(source, base_url, robots_probe_paths),
        check_8_jsonld(pages),
        check_9_llms_txt(source, base_url),
    ]

    print("")
    print_table(results)
    print_failures(results, args.max_details)

    failed = [r for r in results if r.status == FAIL]
    skipped = [r for r in results if r.status == SKIP]
    elapsed = time.time() - started

    print("")
    print("=" * 78)
    print(
        f"{len(results) - len(failed) - len(skipped)} passed, {len(failed)} FAILED, "
        f"{len(skipped)} skipped   ({elapsed:.1f}s)"
    )
    print("=" * 78)

    if args.json_out:
        Path(args.json_out).write_text(
            json.dumps(
                {
                    "mode": "dist" if args.dist else "live",
                    "base_url": base_url,
                    "sitemap_urls": len(sitemap.urls),
                    "sample": len(sample),
                    "elapsed_seconds": round(elapsed, 2),
                    "checks": [
                        {
                            "number": r.number,
                            "name": r.name,
                            "status": r.status,
                            "summary": r.summary,
                            "details": r.details,
                        }
                        for r in results
                    ],
                },
                indent=2,
            ),
            encoding="utf-8",
        )
        print(f"json written  : {args.json_out}")

    return 1 if failed else 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        sys.exit(130)
