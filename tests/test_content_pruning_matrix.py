from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from build_content_pruning_matrix import (  # noqa: E402
    Article,
    build_rows,
    normalize_url,
    similarity,
)


def article(
    slug: str,
    *,
    words: int = 900,
    h2s: int = 5,
    citations: int = 1,
    tokens: set[str] | None = None,
) -> Article:
    return Article(
        slug=slug,
        path=Path(f"{slug}.md"),
        title=slug,
        category="nutrition",
        published="2026-01-01",
        body="",
        word_count=words,
        h2_count=h2s,
        faq_count=5,
        external_source_count=citations,
        intent_tokens=tokens or set(slug.split("-")),
        outbound_slugs=set(),
    )


def test_normalize_url_collapses_host_and_slash_variants():
    expected = "https://www.daily-life-hacks.com/example/"
    assert normalize_url("https://daily-life-hacks.com/example") == expected
    assert normalize_url("https://www.daily-life-hacks.com/example/") == expected


def test_similarity_requires_three_meaningful_tokens():
    assert similarity({"fiber", "foods"}, {"fiber", "foods"}) == 0
    assert similarity({"fiber", "foods", "cheap"}, {"fiber", "foods", "cheap", "ranked"}) == 0.75


def test_merge_requires_all_four_gates():
    thin = article(
        "cheap-fiber-foods-list",
        words=300,
        h2s=2,
        citations=0,
        tokens={"cheap", "fiber", "foods", "list"},
    )
    target = article(
        "cheap-fiber-foods-ranked",
        words=1000,
        h2s=7,
        citations=2,
        tokens={"cheap", "fiber", "foods", "list"},
    )
    thin.outbound_slugs = {"cheap-fiber-foods-ranked"}
    sitemap = {normalize_url(thin.slug), normalize_url(target.slug)}
    gsc = {normalize_url(target.slug): {"clicks": 0, "impressions": 10, "position": 8}}
    rows = build_rows([thin, target], sitemap, gsc, {}, set())
    by_slug = {row["slug"]: row for row in rows}
    assert by_slug[thin.slug]["decision"] == "MERGE"
    assert by_slug[thin.slug]["closest_intent_slug"] == target.slug


def test_search_evidence_blocks_merge():
    thin = article(
        "cheap-fiber-foods-list",
        words=300,
        h2s=2,
        citations=0,
        tokens={"cheap", "fiber", "foods", "list"},
    )
    target = article(
        "cheap-fiber-foods-ranked",
        words=1000,
        tokens={"cheap", "fiber", "foods", "list"},
    )
    sitemap = {normalize_url(thin.slug), normalize_url(target.slug)}
    gsc = {
        normalize_url(thin.slug): {"clicks": 0, "impressions": 1, "position": 60},
        normalize_url(target.slug): {"clicks": 0, "impressions": 10, "position": 8},
    }
    rows = build_rows([thin, target], sitemap, gsc, {}, set())
    by_slug = {row["slug"]: row for row in rows}
    assert by_slug[thin.slug]["decision"] == "KEEP"
    assert by_slug[thin.slug]["zero_search_evidence"] == "NO"


def test_recovery_cohort_is_frozen_even_when_merge_gates_pass():
    thin = article(
        "cheap-fiber-foods-list",
        words=300,
        h2s=2,
        citations=0,
        tokens={"cheap", "fiber", "foods", "list"},
    )
    target = article(
        "cheap-fiber-foods-ranked",
        words=1000,
        tokens={"cheap", "fiber", "foods", "list"},
    )
    thin.outbound_slugs = {"cheap-fiber-foods-ranked"}
    sitemap = {normalize_url(thin.slug), normalize_url(target.slug)}
    gsc = {normalize_url(target.slug): {"clicks": 0, "impressions": 10, "position": 8}}
    rows = build_rows([thin, target], sitemap, gsc, {}, {thin.slug})
    by_slug = {row["slug"]: row for row in rows}
    assert by_slug[thin.slug]["decision"] == "KEEP"
    assert "Protected fixed recovery cohort" in by_slug[thin.slug]["decision_reason"]


def test_noindex_and_remove_are_never_inferred_from_traffic_absence():
    lonely = article("unique-topic-with-no-data", words=200, h2s=1, citations=0)
    rows = build_rows([lonely], {normalize_url(lonely.slug)}, {}, {}, set())
    assert rows[0]["decision"] == "KEEP"
