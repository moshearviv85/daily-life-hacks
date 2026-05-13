"""CLI wrapper for lib.validator — validates a single article file.

Provides backward-compatible validate(markdown, slug) function
and maps CP-xx rule IDs back to legacy S-xx for existing consumers.

Usage:
    python scripts/NEW_PIPELINE_2026-05-08/validate_article.py src/data/articles/foo-bar.md
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

_SCRIPT_DIR = Path(__file__).resolve().parent
if str(_SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPT_DIR))

from lib.validator import validate as _validate, Violation  # noqa: E402

# Map new CP-xx IDs back to legacy S-xx for backward compatibility.
# CP-03, CP-04, CP-06 are mapped to S-23 (health-claims family) because
# the old validator had no separate rule for those — they all fell under
# the unhedged-health-claim bucket.
_CP_TO_LEGACY: dict[str, str] = {
    "CP-01": "S-11",  # em-dash
    "CP-02": "S-14",  # supplements
    "CP-03": "S-23",  # medical hard ban -> health claims family
    "CP-04": "S-23",  # medical hedge required -> health claims family
    "CP-05": "S-23",  # absolute health claims
    "CP-06": "S-23",  # detox -> health claims family
    "CP-07": "S-22",  # AI words
    "CP-08": "S-24",  # signoffs
}


def _map_to_legacy(v: Violation) -> Violation:
    """Map CP-xx violations to legacy S-xx IDs when a mapping exists."""
    legacy_id = _CP_TO_LEGACY.get(v.rule_id)
    if legacy_id is not None:
        return Violation(rule_id=legacy_id, tier=v.tier, detail=v.detail)
    return v


def validate(markdown: str, slug: str) -> list[Violation]:
    """Backward-compatible validate. Accepts positional args, maps CP IDs to S-xx IDs.

    Delegates to lib.validator.validate() and remaps all CP-xx rule IDs to their
    legacy S-xx equivalents. Deduplicates by (rule_id, tier) so that multiple
    CP rules mapping to the same S-xx don't produce duplicate entries.
    """
    raw = _validate(markdown, context="article", slug=slug)
    seen: set[tuple[str, int]] = set()
    result: list[Violation] = []
    for v in raw:
        mapped = _map_to_legacy(v)
        key = (mapped.rule_id, mapped.tier)
        if key not in seen:
            seen.add(key)
            result.append(mapped)
    return result


def summarize(violations: list[Violation]) -> str:
    if not violations:
        return "PASS"
    lines = []
    t1 = [v for v in violations if v.tier == 1]
    t2 = [v for v in violations if v.tier == 2]
    if t1:
        lines.append(f"Tier 1 failures ({len(t1)}):")
        for v in t1:
            lines.append(f"  {v.rule_id}: {v.detail}")
    if t2:
        lines.append(f"Tier 2 warnings ({len(t2)}):")
        for v in t2:
            lines.append(f"  {v.rule_id}: {v.detail}")
    return "\n".join(lines)


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(description="Validate a Daily Life Hacks article.")
    p.add_argument("path", type=Path, help="Path to the article .md file")
    p.add_argument("--slug", type=str, default=None,
                   help="Slug to check image path against (default: filename without .md)")
    args = p.parse_args(argv)

    text = args.path.read_text(encoding="utf-8")
    slug = args.slug or args.path.stem
    violations = validate(text, slug)
    print(summarize(violations))
    return 1 if any(v.tier == 1 for v in violations) else 0


if __name__ == "__main__":
    raise SystemExit(main())
