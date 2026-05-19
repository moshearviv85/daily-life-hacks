"""Orchestrator for stage 1.75: judge all stage 1.5 articles."""
from __future__ import annotations

import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from . import compliance as _comp
from . import db as _db
from . import rubric as _rubric
from topic_research.llm.gemini import GeminiError


_LOG_LOCK = threading.Lock()
_DB_LOCK = threading.Lock()


def _now_utc_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


class LiveLogger:
    def __init__(self, log_path: Path) -> None:
        log_path.parent.mkdir(parents=True, exist_ok=True)
        self._fh = log_path.open("a", encoding="utf-8")
        self.log_path = log_path

    def log(self, line: str) -> None:
        stamped = f"[{_now_utc_iso()}] {line}"
        with _LOG_LOCK:
            print(stamped, flush=True)
            self._fh.write(stamped + "\n")
            self._fh.flush()

    def close(self) -> None:
        self._fh.close()


def run(
    *,
    api_key: str,
    stage_1_5_run_id: int | None = None,
    judge_model: str = _rubric.DEFAULT_JUDGE_MODEL,
    concurrency: int = 4,
    timeout: int = 90,
    db_path: Path = _db.DEFAULT_DB_PATH,
    skip_llm: bool = False,
) -> int:
    """Entry point. Returns stage_1_75_runs.id."""
    log_ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    log_path = Path(__file__).resolve().parents[2] / "pipeline-data" / "logs" / f"stage_1_75_{log_ts}.log"
    logger = LiveLogger(log_path)

    try:
        conn = _db.connect(db_path)

        if stage_1_5_run_id is None:
            stage_1_5_run_id = _db.latest_stage_1_5_run_id(conn)
            if stage_1_5_run_id is None:
                raise RuntimeError("no completed stage_1_5 run found; pass --stage-1-5-run-id")

        logger.log(f"stage 1.75 starting. stage_1_5_run_id={stage_1_5_run_id} judge={judge_model} concurrency={concurrency} skip_llm={skip_llm}")
        logger.log(f"log file: {log_path}")

        articles = _db.fetch_articles(conn, stage_1_5_run_id)
        logger.log(f"articles to score: {len(articles)}")

        run_id = _db.start_run(
            conn,
            started_at=_now_utc_iso(),
            stage_1_5_run_id=stage_1_5_run_id,
            judge_model=judge_model if not skip_llm else "skipped",
            article_count=len(articles),
        )
        logger.log(f"stage_1_75_runs.id = {run_id}")

        total = len(articles)
        completed = 0
        disqualified = 0
        llm_ok = 0
        llm_err = 0
        start_all = time.monotonic()

        def _score_one(art) -> dict[str, Any]:
            markdown = art["markdown"] or ""
            comp_score, dq, dq_reason, details = _comp.check(markdown)

            llm_fields: dict[str, Any] = {
                "voice_score": None, "flow_score": None, "seo_score": None,
                "hook_score": None, "quality_score": None,
                "judge_reasoning": None, "judge_status": "skipped",
                "judge_error": None, "judge_latency_ms": None,
                "judge_tokens_in": None, "judge_tokens_out": None,
            }

            if art["gen_status"] != "ok" or not markdown:
                # Generation itself failed in stage 1.5. No LLM pass.
                llm_fields["judge_status"] = "skipped_gen_error"
                total_score = comp_score  # 0 since empty disqualifies
            elif dq:
                # Hard-banned by Layer A — skip the LLM pass to save cost.
                llm_fields["judge_status"] = "skipped_disqualified"
                total_score = 0.0
            elif skip_llm:
                llm_fields["judge_status"] = "skipped_flag"
                total_score = comp_score
            else:
                try:
                    r = _rubric.judge_one(
                        article_markdown=markdown,
                        api_key=api_key,
                        model=judge_model,
                        timeout=timeout,
                    )
                    llm_fields.update({
                        "voice_score": r["voice_score"],
                        "flow_score": r["flow_score"],
                        "seo_score": r["seo_score"],
                        "hook_score": r["hook_score"],
                        "quality_score": r["quality_score"],
                        "judge_reasoning": r["reasoning"],
                        "judge_status": "ok",
                        "judge_latency_ms": r["latency_ms"],
                    })
                    total_score = comp_score + r["quality_score"]
                except GeminiError as exc:
                    llm_fields.update({
                        "judge_status": "error",
                        "judge_error": str(exc)[:500],
                    })
                    total_score = comp_score  # partial credit on judge failure

            return {
                "article_id": art["id"],
                "model_id": art["model_id"],
                "topic_rank": art["topic_rank"],
                "category": art["category"],
                "slug": art["slug"],
                "comp_score": comp_score,
                "comp_details": _comp.details_to_json(details),
                "disqualified": int(dq),
                "dq_reason": dq_reason,
                "total_score": round(total_score, 2),
                "llm_fields": llm_fields,
            }

        def _persist_and_log(result: dict[str, Any]) -> None:
            row = {
                "run_id": run_id,
                "stage_1_5_output_id": result["article_id"],
                "model_id": result["model_id"],
                "topic_rank": result["topic_rank"],
                "category": result["category"],
                "slug": result["slug"],
                "compliance_score": result["comp_score"],
                "compliance_details": result["comp_details"],
                "disqualified": result["disqualified"],
                "disqualify_reason": result["dq_reason"],
                "total_score": result["total_score"],
                "created_at": _now_utc_iso(),
                **result["llm_fields"],
            }
            with _DB_LOCK:
                _db.insert_score(conn, row)

        def _task_fn(art) -> dict[str, Any]:
            return _score_one(art)

        with ThreadPoolExecutor(max_workers=concurrency) as pool:
            futures = [pool.submit(_task_fn, art) for art in articles]
            for fut in as_completed(futures):
                try:
                    result = fut.result()
                except Exception as exc:
                    completed += 1
                    logger.log(f"[{completed}/{total}] UNHANDLED worker error: {exc}")
                    continue

                _persist_and_log(result)

                completed += 1
                if result["disqualified"]:
                    disqualified += 1
                    logger.log(
                        f"[{completed}/{total}] DQ  "
                        f"{result['model_id']:<50} t=#{result['topic_rank']}[{result['category'][:3]}] "
                        f"compliance={result['comp_score']:.1f} total={result['total_score']:.1f} "
                        f"reason={result['dq_reason'][:100]}"
                    )
                elif result["llm_fields"]["judge_status"] == "ok":
                    llm_ok += 1
                    lf = result["llm_fields"]
                    logger.log(
                        f"[{completed}/{total}] OK  "
                        f"{result['model_id']:<50} t=#{result['topic_rank']}[{result['category'][:3]}] "
                        f"comp={result['comp_score']:.1f} v={lf['voice_score']} f={lf['flow_score']} "
                        f"s={lf['seo_score']} h={lf['hook_score']} q={lf['quality_score']} "
                        f"TOTAL={result['total_score']:.1f} "
                        f"lat={lf['judge_latency_ms']}ms"
                    )
                else:
                    lf = result["llm_fields"]
                    llm_err += 1
                    logger.log(
                        f"[{completed}/{total}] JERR "
                        f"{result['model_id']:<50} t=#{result['topic_rank']}[{result['category'][:3]}] "
                        f"comp={result['comp_score']:.1f} total={result['total_score']:.1f} "
                        f"judge_status={lf['judge_status']} err={(lf.get('judge_error') or '')[:100]}"
                    )

        elapsed = time.monotonic() - start_all
        _db.finish_run(conn, run_id, finished_at=_now_utc_iso(), status="done")

        logger.log("")
        logger.log("=" * 60)
        logger.log(f"DONE. stage_1_75_runs.id = {run_id}")
        logger.log(f"scored: {completed} | disqualified (Layer A hard ban): {disqualified} "
                   f"| LLM ok: {llm_ok} | LLM err: {llm_err}")
        logger.log(f"elapsed: {elapsed:.1f}s ({elapsed/60:.1f} min)")
        logger.log("=" * 60)
        return run_id

    finally:
        logger.close()
