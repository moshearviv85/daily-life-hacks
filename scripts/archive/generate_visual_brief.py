"""DEPRECATED — split into two scripts on 2026-04-25.

This combined hero+pins script is deprecated. The visual-brief stage is now
two separate scripts, one mandate per script:

  - scripts/generate_hero_brief.py
        produces { article_slug, prompt, alt } per article into
        pipeline-data/hero-briefs.jsonl

  - scripts/generate_pin_briefs.py
        produces { article_slug, pins: [4x{slug,title,prompt,alt}] } per
        article into pipeline-data/pin-briefs.jsonl

Original logic preserved at scripts/_archive/generate_visual_brief.py.deprecated.
SPEC: docs/specs/2026-04-25-visual-brief-split.md
"""
from __future__ import annotations

import sys

MESSAGE = (
    "scripts/generate_visual_brief.py is deprecated.\n"
    "Use:\n"
    "  python scripts/generate_hero_brief.py --slug <slug>\n"
    "  python scripts/generate_pin_briefs.py --slug <slug>\n"
)


def main() -> int:
    print(MESSAGE, file=sys.stderr)
    return 1


if __name__ == "__main__":
    sys.exit(main())
