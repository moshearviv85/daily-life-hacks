from __future__ import annotations

import re
from pathlib import Path

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

REFERENCE_SLUG = "easy-black-bean-tacos-weeknight-dinner"


def word_count_from_markdown(md: str) -> int:
    # Remove YAML frontmatter
    md = re.sub(r"^---\s*\n.*?\n---\s*\n", "", md, flags=re.S)
    # Remove fenced code blocks (just in case)
    md = re.sub(r"```.*?```", "", md, flags=re.S)
    # Strip HTML tags
    md = re.sub(r"<[^>]+>", " ", md)
    words = re.findall(r"[A-Za-z0-9']+", md)
    return len(words)


def main() -> None:
    ref_path = ARTICLES_DIR / f"{REFERENCE_SLUG}.md"
    ref_words = word_count_from_markdown(ref_path.read_text(encoding="utf-8"))
    print(f"REFERENCE\t{REFERENCE_SLUG}\twords={ref_words}")

    rows: list[tuple[str, int, int]] = []
    for slug in NEW_SLUGS:
        path = ARTICLES_DIR / f"{slug}.md"
        if not path.exists():
            continue
        md = path.read_text(encoding="utf-8")
        words = word_count_from_markdown(md)
        rows.append((slug, words, path.stat().st_size))

    rows.sort(key=lambda x: x[1], reverse=True)
    for slug, words, size in rows:
        rel = "shorter" if words < ref_words else "same_or_longer"
        print(f"{slug}\twords={words}\tbytes={size}\t{rel}")


if __name__ == "__main__":
    main()

