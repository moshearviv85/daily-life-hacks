"""Tiny deterministic punctuation normalizer for generated text."""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

EM_DASH_VARIANTS = ("\u2014", "â€”")


def normalize_punctuation(text: str) -> str:
    """Replace em-dash variants with a plain short hyphen."""
    for dash in EM_DASH_VARIANTS:
        text = text.replace(dash, "-")
    return text


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Replace em dashes with short hyphens.")
    parser.add_argument("path", nargs="?", help="File to normalize. Reads stdin when omitted.")
    parser.add_argument("--write", action="store_true", help="Write changes back to the file.")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    if args.path:
        path = Path(args.path)
        original = path.read_text(encoding="utf-8")
    else:
        path = None
        original = sys.stdin.read()

    normalized = normalize_punctuation(original)
    if path and args.write:
        path.write_text(normalized, encoding="utf-8")
    else:
        sys.stdout.write(normalized)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
