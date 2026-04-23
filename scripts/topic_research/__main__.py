"""CLI entry point for the topic-research pipeline.

Usage
-----
python -m scripts.topic_research stage1 --audience-csv PATH [PATH ...] [--db PATH]
python -m scripts.topic_research stage2 --keywords-csv PATH --boards-csv PATH [--stage1-run-id N] [--db PATH]

Environment variables (also read from .env in repo root):
  GEMINI_API_KEY            — required for both stages
  PINTEREST_ACCESS_TOKEN    — required for stage 1 Pinterest Trends fetch
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parents[2]

# Load .env before importing orchestrators (they may read env at module level)
_env_path = _REPO_ROOT / ".env"
if _env_path.exists():
    for _line in _env_path.read_text(encoding="utf-8").splitlines():
        if "=" in _line and not _line.startswith("#"):
            _k, _v = _line.split("=", 1)
            os.environ.setdefault(_k.strip(), _v.strip().strip("'").strip('"'))

if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

from scripts.topic_research.stage1 import run_stage1, _DB_PATH as _DEFAULT_DB
from scripts.topic_research.stage2 import run_stage2


def _cmd_stage1(args: argparse.Namespace) -> None:
    result = run_stage1(
        audience_csv_paths=args.audience_csv,
        db_path=args.db,
    )
    print(json.dumps(result, indent=2, ensure_ascii=False))


def _cmd_stage2(args: argparse.Namespace) -> None:
    result = run_stage2(
        keywords_csv_path=args.keywords_csv,
        boards_csv_path=args.boards_csv,
        stage1_run_id=args.stage1_run_id,
        db_path=args.db,
        balance=args.balance or None,
    )
    print(json.dumps(result, indent=2, ensure_ascii=False))


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(
        prog="python -m scripts.topic_research",
        description="Daily Life Hacks - 2-stage Pinterest topic research pipeline",
    )
    sub = parser.add_subparsers(dest="command", required=True)

    # stage1 subcommand
    p1 = sub.add_parser("stage1", help="Audience CSV -> fetch signals -> 20+20 keywords")
    p1.add_argument(
        "--audience-csv",
        nargs="+",
        required=True,
        metavar="PATH",
        help="Pinterest Audience Insights CSV export(s). Pass multiple paths to merge audiences.",
    )
    p1.add_argument(
        "--db",
        default=_DEFAULT_DB,
        metavar="PATH",
        help=f"SQLite DB path (default: {_DEFAULT_DB})",
    )

    # stage2 subcommand
    p2 = sub.add_parser("stage2", help="Pin Inspector CSVs + DB -> 50 ranked topics")
    p2.add_argument(
        "--keywords-csv",
        required=True,
        metavar="PATH",
        help="Pin Inspector keywords CSV export",
    )
    p2.add_argument(
        "--boards-csv",
        required=False,
        default=None,
        metavar="PATH",
        help="Pin Inspector boards CSV export (optional)",
    )
    p2.add_argument(
        "--stage1-run-id",
        type=int,
        default=None,
        metavar="N",
        help="Stage 1 run_id to read keywords from (default: latest)",
    )
    p2.add_argument(
        "--db",
        default=_DEFAULT_DB,
        metavar="PATH",
        help=f"SQLite DB path (default: {_DEFAULT_DB})",
    )
    p2.add_argument(
        "--balance",
        default="20:15:15",
        metavar="R:N:T",
        help="Per-category quota recipes:nutrition:tips (default: 20:15:15). Pass empty string to disable.",
    )

    args = parser.parse_args(argv)

    if args.command == "stage1":
        _cmd_stage1(args)
    elif args.command == "stage2":
        _cmd_stage2(args)
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
