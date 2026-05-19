"""CLI entry point for stage 1.5.

Usage
-----
List the models that would be selected (no API calls, no cost):
  python -m scripts.stage_1_5 --topic-ids 11:1 --list-models

Run discovery for three topics:
  python -m scripts.stage_1_5 \
      --topic-ids 11:1,11:25,11:41 \
      --target-words 3500

Options:
  --topic-ids    CSV of "stage2_run_id:rank" pairs (e.g., "11:1,11:25,11:41")
  --target-words target article body length (default 3500)
  --concurrency  parallel API calls (default 10)
  --temperature  model temperature (default 0.7)
  --max-tokens   max output tokens per call (default 8000)
  --timeout      per-call timeout in seconds (default 180)
  --db           SQLite path (default pipeline-data/topic-research.sqlite)
  --list-models  print the selected model list and exit
  --models       explicit comma-separated model ids (overrides auto-selection)

Environment:
  OPENROUTER_API_KEY  required (auto-loaded from repo-root .env)
"""
from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

_SCRIPT_DIR = Path(__file__).resolve().parents[1]
if str(_SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPT_DIR))
_REPO_ROOT = _SCRIPT_DIR.parent.parent

from stage_1_5 import writer as _writer
from stage_1_5.db import DEFAULT_DB_PATH


def _parse_topic_ids(raw: str) -> list[tuple[int, int]]:
    out: list[tuple[int, int]] = []
    for pair in raw.split(","):
        pair = pair.strip()
        if not pair:
            continue
        if ":" not in pair:
            raise SystemExit(f"bad --topic-ids entry: {pair!r} (expected run:rank)")
        a, b = pair.split(":", 1)
        out.append((int(a), int(b)))
    if not out:
        raise SystemExit("no topic ids provided")
    return out


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="python -m scripts.stage_1_5",
        description="Stage 1.5: send one topic to many models via OpenRouter.",
    )
    parser.add_argument("--topic-ids", required=True,
                        help='CSV of "stage2_run_id:rank" (e.g., "11:1,11:25,11:41")')
    parser.add_argument("--target-words", type=int, default=3500)
    parser.add_argument("--concurrency", type=int, default=10)
    parser.add_argument("--temperature", type=float, default=0.7)
    parser.add_argument("--max-tokens", type=int, default=8000)
    parser.add_argument("--timeout", type=int, default=180)
    parser.add_argument("--db", default=str(DEFAULT_DB_PATH))
    parser.add_argument("--list-models", action="store_true",
                        help="print selected model list and exit (no API calls)")
    parser.add_argument("--models", default="",
                        help="comma-separated explicit model ids (overrides auto-selection)")
    args = parser.parse_args(argv)

    topic_ids = _parse_topic_ids(args.topic_ids)

    # Load .env so OPENROUTER_API_KEY is available even without shell export.
    _writer._load_env(_REPO_ROOT / ".env")
    api_key = os.environ.get("OPENROUTER_API_KEY", "").strip()
    if not api_key and not args.list_models:
        raise SystemExit("OPENROUTER_API_KEY is not set (check .env)")

    models_override = [m.strip() for m in args.models.split(",") if m.strip()] or None

    _writer.run(
        api_key=api_key or "dummy-for-list-only",
        topic_ids=topic_ids,
        target_words=args.target_words,
        concurrency=args.concurrency,
        temperature=args.temperature,
        max_tokens=args.max_tokens,
        timeout=args.timeout,
        db_path=Path(args.db),
        list_only=args.list_models,
        models_override=models_override,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
