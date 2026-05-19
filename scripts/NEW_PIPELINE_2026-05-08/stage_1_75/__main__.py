"""CLI entry point for stage 1.75 (article judging).

Usage
-----
Judge the latest stage 1.5 run (default model: gemini-2.5-flash):
  python -m scripts.stage_1_75

Judge a specific stage 1.5 run with a different judge model:
  python -m scripts.stage_1_75 --stage-1-5-run-id 4 --judge-model gemini-3.1-pro-preview

Only run Layer A (deterministic compliance, no LLM calls, no cost):
  python -m scripts.stage_1_75 --skip-llm

Options:
  --stage-1-5-run-id  stage_1_5_runs.id (defaults to latest 'done' run)
  --judge-model       Gemini model name (default: gemini-2.5-flash)
  --concurrency       parallel judge calls (default: 4)
  --timeout           per-call timeout seconds (default: 90)
  --db                SQLite path (default pipeline-data/topic-research.sqlite)
  --skip-llm          only run Layer A, skip Gemini (free, fast)

Environment:
  GEMINI_API_KEY  required (auto-loaded from repo-root .env) unless --skip-llm
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

from stage_1_75 import judge as _judge
from stage_1_75.db import DEFAULT_DB_PATH
from stage_1_75.rubric import DEFAULT_JUDGE_MODEL


def _load_env(env_path: Path) -> None:
    if not env_path.exists():
        return
    for raw in env_path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip().strip("'").strip('"'))


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="python -m scripts.stage_1_75",
        description="Stage 1.75: deterministic + LLM rubric judging of stage 1.5 articles.",
    )
    parser.add_argument("--stage-1-5-run-id", type=int, default=None,
                        help="stage_1_5_runs.id to judge (default: latest 'done')")
    parser.add_argument("--judge-model", default=DEFAULT_JUDGE_MODEL,
                        help=f"Gemini model for Layer B (default: {DEFAULT_JUDGE_MODEL})")
    parser.add_argument("--concurrency", type=int, default=4)
    parser.add_argument("--timeout", type=int, default=90)
    parser.add_argument("--db", default=str(DEFAULT_DB_PATH))
    parser.add_argument("--skip-llm", action="store_true",
                        help="only run Layer A (regex compliance), skip Gemini judge")
    args = parser.parse_args(argv)

    _load_env(_REPO_ROOT / ".env")
    api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not api_key and not args.skip_llm:
        raise SystemExit("GEMINI_API_KEY is not set (check .env)")

    _judge.run(
        api_key=api_key or "dummy-for-skip-llm",
        stage_1_5_run_id=args.stage_1_5_run_id,
        judge_model=args.judge_model,
        concurrency=args.concurrency,
        timeout=args.timeout,
        db_path=Path(args.db),
        skip_llm=args.skip_llm,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
