from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

ROOT = Path(__file__).resolve().parent.parent
ARTICLES_DIR = ROOT / "src" / "data" / "articles"

NEW_SLUGS = [
    "quick-20-minute-high-fiber-meals-for-busy-days",
    "high-fiber-meal-prep-ideas-for-busy-weeks-2026",
    "no-bake-high-fiber-energy-balls-recipe",
    "high-fiber-avocado-toast-variations",
    "high-fiber-quinoa-salad-for-lunch-prep",
    "crispy-roasted-chickpeas-high-fiber-snack",
    "gut-friendly-high-fiber-smoothies-for-daily-wellness",
    "how-to-increase-fiber-intake-without-gas",
    "best-high-fiber-fruits-for-weight-loss-list",
    "high-fiber-pasta-alternatives",
]

# “Early” = everything that should have been visible before the new drip started.
DRIP_START = datetime(2026, 4, 2, tzinfo=timezone.utc)


@dataclass
class ArticleStats:
    slug: str
    words: int
    faq_count: int
    h2_count: int
    publish_at: Optional[datetime]
    date: Optional[datetime]


def extract_frontmatter_and_body(text: str) -> tuple[str, str]:
    # Assumes frontmatter starts at beginning with '---' on its own line.
    if not text.startswith("---"):
        return "", text
    # Find the second '---' delimiter.
    parts = re.split(r"^---\s*$", text, maxsplit=2, flags=re.MULTILINE)
    # parts: ["", <frontmatter>, <body>]
    if len(parts) < 3:
        return "", text
    return parts[1], parts[2]


def parse_datetime_maybe(value: str) -> Optional[datetime]:
    value = value.strip().strip('"').strip("'")
    if not value:
        return None
    # publishAt is ISO UTC like 2026-04-02T06:25:21.000Z
    iso_match = re.match(r"^\d{4}-\d{2}-\d{2}T.*Z$", value)
    if iso_match:
        try:
            # Python can parse this with %Y-%m-%dT%H:%M:%S.%fZ sometimes; do a manual replace.
            # Ensure microseconds optional.
            v = value.replace("Z", "+00:00")
            return datetime.fromisoformat(v)
        except Exception:
            return None
    # date is YYYY-MM-DD
    if re.match(r"^\d{4}-\d{2}-\d{2}$", value):
        try:
            d = datetime.strptime(value, "%Y-%m-%d").replace(tzinfo=timezone.utc)
            return d
        except Exception:
            return None
    return None


def word_count(text: str) -> int:
    # Keep it simple: count “word-ish” tokens.
    tokens = re.findall(r"[A-Za-z0-9']+", text)
    return len(tokens)


def main() -> None:
    stats: list[ArticleStats] = []
    for md_path in ARTICLES_DIR.glob("*.md"):
        slug = md_path.stem
        text = md_path.read_text(encoding="utf-8")
        front, body = extract_frontmatter_and_body(text)

        words = word_count(body)
        faq_count = len(re.findall(r"^\s*-\s*question\s*:", front, flags=re.MULTILINE))
        h2_count = len(re.findall(r"^##\s+", body, flags=re.MULTILINE))

        publish_at = None
        date_dt = None
        m_pub = re.search(r"^\s*publishAt\s*:\s*(.+)\s*$", front, flags=re.MULTILINE)
        if m_pub:
            publish_at = parse_datetime_maybe(m_pub.group(1))
        m_date = re.search(r"^\s*date\s*:\s*(.+)\s*$", front, flags=re.MULTILINE)
        if m_date:
            date_dt = parse_datetime_maybe(m_date.group(1))

        stats.append(
            ArticleStats(
                slug=slug,
                words=words,
                faq_count=faq_count,
                h2_count=h2_count,
                publish_at=publish_at,
                date=date_dt,
            )
        )

    new_stats = [s for s in stats if s.slug in NEW_SLUGS]
    baseline_candidates: list[ArticleStats] = []
    for s in stats:
        if s.slug in NEW_SLUGS:
            continue
        # Determine “visibility time” for sorting.
        dt = s.publish_at or s.date
        if dt is None:
            continue
        if dt < DRIP_START:
            baseline_candidates.append(s)

    baseline_sorted = sorted(
        baseline_candidates,
        key=lambda s: (s.publish_at or s.date or datetime(1970, 1, 1, tzinfo=timezone.utc)),
        reverse=True,
    )
    baseline_top = baseline_sorted[:10]

    def avg(xs: list[int]) -> float:
        return sum(xs) / len(xs) if xs else 0.0

    new_words = [s.words for s in new_stats]
    base_words = [s.words for s in baseline_top]

    print("=== NEW ARTICLES (our 10) ===")
    for s in sorted(new_stats, key=lambda x: x.slug):
        print(f"{s.slug}\twords={s.words}\tfaq={s.faq_count}\th2={s.h2_count}")

    print("\n=== BASELINE (last 10 visible before 2026-04-02) ===")
    for s in baseline_top:
        dt = s.publish_at or s.date
        dt_str = dt.isoformat() if dt else "n/a"
        print(f"{s.slug}\twords={s.words}\tfq={s.faq_count}\th2={s.h2_count}\t(dt={dt_str})")

    print("\n=== COMPARISON ===")
    print(f"baseline_avg_words={avg(base_words):.1f} (n={len(base_words)})")
    print(f"new_avg_words={avg(new_words):.1f} (n={len(new_words)})")
    ratio = (avg(new_words) / avg(base_words)) if base_words else 0
    print(f"new_to_baseline_ratio={ratio:.2f}")


if __name__ == "__main__":
    main()

