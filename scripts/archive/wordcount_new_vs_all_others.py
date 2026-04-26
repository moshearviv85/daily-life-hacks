from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ARTICLES_DIR = ROOT / "src" / "data" / "articles"

NEW_SLUGS = {
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
}


@dataclass
class Stats:
    slug: str
    words: int
    faq_count: int
    h2_count: int


def extract_frontmatter_and_body(text: str) -> tuple[str, str]:
    if not text.startswith("---"):
        return "", text
    parts = re.split(r"^---\s*$", text, maxsplit=2, flags=re.MULTILINE)
    if len(parts) < 3:
        return "", text
    return parts[1], parts[2]


def word_count(text: str) -> int:
    return len(re.findall(r"[A-Za-z0-9']+", text))


def main() -> None:
    new_stats: list[Stats] = []
    other_stats: list[Stats] = []
    for md_path in ARTICLES_DIR.glob("*.md"):
        slug = md_path.stem
        text = md_path.read_text(encoding="utf-8")
        front, body = extract_frontmatter_and_body(text)

        s = Stats(
            slug=slug,
            words=word_count(body),
            faq_count=len(re.findall(r"^\s*-\s*question\s*:", front, flags=re.MULTILINE)),
            h2_count=len(re.findall(r"^##\s+", body, flags=re.MULTILINE)),
        )
        if slug in NEW_SLUGS:
            new_stats.append(s)
        else:
            other_stats.append(s)

    def avg(xs: list[int]) -> float:
        return sum(xs) / len(xs) if xs else 0.0

    new_words = [s.words for s in new_stats]
    other_words = [s.words for s in other_stats]

    print("=== NEW ARTICLES vs ALL OTHER ARTICLES ===")
    print(f"new_count={len(new_stats)} avg_words={avg(new_words):.1f} median_words={sorted(new_words)[len(new_words)//2]}")
    print(
        f"other_count={len(other_stats)} avg_words={avg(other_words):.1f} median_words={sorted(other_words)[len(other_words)//2]}"
    )
    print(f"ratio_avg_new_to_other={avg(new_words)/avg(other_words):.2f}")


if __name__ == "__main__":
    main()

