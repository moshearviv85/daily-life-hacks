"""Main orchestrator for stage 1.5: multi-model article writer."""
from __future__ import annotations

import os
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from . import db as _db
from . import openrouter as _or
from . import prompt as _prompt
from .select import SelectedModel, format_list, select


_LOG_LOCK = threading.Lock()
_DB_LOCK = threading.Lock()


def _now_utc_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


class LiveLogger:
    """Thread-safe logger: prints to stdout (flushed) and appends to a file."""

    def __init__(self, log_path: Path) -> None:
        self.log_path = log_path
        log_path.parent.mkdir(parents=True, exist_ok=True)
        self._fh = log_path.open("a", encoding="utf-8")

    def log(self, line: str) -> None:
        stamped = f"[{_now_utc_iso()}] {line}"
        with _LOG_LOCK:
            print(stamped, flush=True)
            self._fh.write(stamped + "\n")
            self._fh.flush()

    def close(self) -> None:
        self._fh.close()


def _run_one(
    *,
    api_key: str,
    model: SelectedModel,
    topic_row: Any,
    target_words: int,
    temperature: float,
    max_tokens: int,
    timeout: int,
) -> dict[str, Any]:
    system = _prompt.build_system(
        category=topic_row["category"],
        slug=topic_row["slug"],
        target_words=target_words,
    )
    user = _prompt.build_user(
        topic=topic_row["topic"],
        category=topic_row["category"],
        slug=topic_row["slug"],
        rationale=topic_row["rationale"] or "",
    )
    try:
        resp, latency_ms = _or.call_with_retry(
            api_key=api_key,
            model_id=model.id,
            system=system,
            user=user,
            temperature=temperature,
            max_tokens=max_tokens,
            timeout=timeout,
            retries=2,
        )
    except _or.OpenRouterError as exc:
        return {
            "ok": False,
            "model_id": model.id,
            "model_name": model.info.name,
            "provider": model.info.provider,
            "error": str(exc)[:500],
            "latency_ms": None,
            "markdown": None,
            "tokens_in": None,
            "tokens_out": None,
            "cost_usd": None,
            "finish_reason": None,
        }

    text, finish_reason = _or.extract_text(resp)
    tokens_in, tokens_out, cost = _or.usage_cost(resp)
    return {
        "ok": bool(text),
        "model_id": model.id,
        "model_name": model.info.name,
        "provider": model.info.provider,
        "error": "" if text else "empty response",
        "latency_ms": latency_ms,
        "markdown": text or None,
        "tokens_in": tokens_in,
        "tokens_out": tokens_out,
        "cost_usd": cost,
        "finish_reason": finish_reason,
    }


def run(
    *,
    api_key: str,
    topic_ids: list[tuple[int, int]],  # list of (stage2_run_id, rank)
    target_words: int = 3500,
    concurrency: int = 10,
    temperature: float = 0.7,
    max_tokens: int = 8000,
    timeout: int = 180,
    db_path: Path = _db.DEFAULT_DB_PATH,
    list_only: bool = False,
    models_override: list[str] | None = None,
) -> int:
    """Entry point. Returns the stage_1_5_runs.id on success, or 0 if list_only."""
    log_ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    log_path = Path(__file__).resolve().parents[2] / "pipeline-data" / "logs" / f"stage_1_5_{log_ts}.log"
    logger = LiveLogger(log_path)

    try:
        logger.log(f"stage 1.5 starting. target_words={target_words} concurrency={concurrency}")
        logger.log(f"log file: {log_path}")

        logger.log("fetching OpenRouter model catalog...")
        catalog = _or.fetch_catalog()
        logger.log(f"catalog size: {len(catalog)} models")

        if models_override:
            override_set = set(models_override)
            selected = [
                SelectedModel(info=m, tier=1) for m in catalog if m.id in override_set
            ]
            missing = override_set - {s.id for s in selected}
            if missing:
                logger.log(f"warning: override IDs not found in catalog: {sorted(missing)}")
        else:
            selected = select(catalog)

        logger.log(f"selected {len(selected)} models")
        logger.log("model list:\n" + format_list(selected))

        if list_only:
            logger.log("list-only mode, exiting before any API calls")
            return 0

        conn = _db.connect(db_path)
        topic_rows = []
        for (trun, rank) in topic_ids:
            row = _db.fetch_topic(conn, trun, rank)
            if not row:
                raise RuntimeError(f"topic not found: run_id={trun} rank={rank}")
            topic_rows.append(row)
            logger.log(f"topic {trun}:{rank} -> [{row['category']}] {row['topic']}")

        run_id = _db.start_run(
            conn,
            started_at=_now_utc_iso(),
            topic_ids=",".join(f"{a}:{b}" for (a, b) in topic_ids),
            model_count=len(selected),
            target_words=target_words,
            notes="",
        )
        logger.log(f"stage_1_5_runs.id = {run_id}")

        total_tasks = len(topic_rows) * len(selected)
        logger.log(f"dispatching {total_tasks} tasks ({len(topic_rows)} topics x {len(selected)} models)")

        completed = 0
        ok_count = 0
        err_count = 0
        total_cost = 0.0
        total_tokens_in = 0
        total_tokens_out = 0
        start_all = time.monotonic()

        def _task_fn(topic_row, model: SelectedModel):
            result = _run_one(
                api_key=api_key,
                model=model,
                topic_row=topic_row,
                target_words=target_words,
                temperature=temperature,
                max_tokens=max_tokens,
                timeout=timeout,
            )
            # Persist immediately to not lose work on a crash.
            row = {
                "run_id": run_id,
                "topic_id": topic_row["id"],
                "topic_run_id": topic_row["run_id"],
                "topic_rank": topic_row["rank"],
                "topic": topic_row["topic"],
                "category": topic_row["category"],
                "slug": topic_row["slug"],
                "model_id": result["model_id"],
                "model_name": result["model_name"],
                "provider": result["provider"],
                "markdown": result["markdown"],
                "tokens_in": result["tokens_in"],
                "tokens_out": result["tokens_out"],
                "cost_usd": result["cost_usd"],
                "latency_ms": result["latency_ms"],
                "status": "ok" if result["ok"] else "error",
                "error": result["error"],
                "finish_reason": result["finish_reason"],
                "created_at": _now_utc_iso(),
            }
            with _DB_LOCK:
                _db.insert_output(conn, row)
            return result, topic_row

        with ThreadPoolExecutor(max_workers=concurrency) as pool:
            futures = []
            for topic_row in topic_rows:
                for m in selected:
                    futures.append(pool.submit(_task_fn, topic_row, m))

            for fut in as_completed(futures):
                try:
                    result, topic_row = fut.result()
                except Exception as exc:
                    err_count += 1
                    completed += 1
                    logger.log(f"[{completed}/{total_tasks}] UNHANDLED: {exc}")
                    continue

                completed += 1
                mark = "OK" if result["ok"] else "ERR"
                if result["ok"]:
                    ok_count += 1
                    tin = result["tokens_in"] or 0
                    tout = result["tokens_out"] or 0
                    cost = result["cost_usd"] or 0.0
                    total_tokens_in += tin
                    total_tokens_out += tout
                    total_cost += cost
                    logger.log(
                        f"[{completed}/{total_tasks}] {mark:3} "
                        f"{result['model_id']:<55} "
                        f"topic=#{topic_row['rank']}[{topic_row['category'][:3]}] "
                        f"in={tin:>5} out={tout:>5} "
                        f"lat={result['latency_ms']}ms cost=${cost:.4f} "
                        f"finish={result['finish_reason']}"
                    )
                else:
                    err_count += 1
                    logger.log(
                        f"[{completed}/{total_tasks}] {mark:3} "
                        f"{result['model_id']:<55} "
                        f"topic=#{topic_row['rank']}[{topic_row['category'][:3]}] "
                        f"FAILED: {result['error'][:200]}"
                    )

        elapsed = time.monotonic() - start_all
        _db.finish_run(conn, run_id, finished_at=_now_utc_iso(), status="done")

        logger.log("")
        logger.log("=" * 60)
        logger.log(f"DONE. run_id={run_id}")
        logger.log(f"tasks: {completed} | ok: {ok_count} | errors: {err_count}")
        logger.log(f"tokens: in={total_tokens_in:,} out={total_tokens_out:,}")
        logger.log(f"cost: ${total_cost:.4f}")
        logger.log(f"elapsed: {elapsed:.1f}s ({elapsed/60:.1f} min)")
        logger.log("=" * 60)

        return run_id
    finally:
        logger.close()


def _load_env(env_path: Path) -> None:
    if not env_path.exists():
        return
    for raw in env_path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip().strip("'").strip('"'))
