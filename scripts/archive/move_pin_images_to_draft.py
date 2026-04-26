from __future__ import annotations

import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PINS_DIR = ROOT / "public" / "images" / "pins"
DRAFT_DIR = PINS_DIR / "draft"

SLUGS = [
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


def main() -> None:
    DRAFT_DIR.mkdir(parents=True, exist_ok=True)

    moved = 0
    for slug in SLUGS:
        for v in range(1, 5):
            src = PINS_DIR / f"{slug}_v{v}.jpg"
            if not src.exists():
                continue
            dest = DRAFT_DIR / src.name
            # If the destination already exists, keep the newest by overwriting.
            shutil.move(str(src), str(dest))
            moved += 1

    print(f"Moved {moved} pin images to {DRAFT_DIR}")


if __name__ == "__main__":
    main()

