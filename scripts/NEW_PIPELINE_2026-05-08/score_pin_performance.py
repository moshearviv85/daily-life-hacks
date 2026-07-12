"""Score Pinterest pin performance from analytics cache export (CP5.1).

Input: wrangler d1 --json export OR flat {pins:[...]} / [...] JSON.
Output: ranked report with CTR, top/bottom cohorts, title-pattern hints.

CLI:
  python scripts/NEW_PIPELINE_2026-05-08/score_pin_performance.py \\
    --input pipeline-data/reports/pinterest-analytics-raw.json \\
    --out pipeline-data/reports/pin-performance.json
"""
from __future__ import annotations

import argparse
import json
import re
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
DEFAULT_MIN_IMPRESSIONS = 50
OWN_HOST = "daily-life-hacks.com"


def _load_pins(path: Path) -> list[dict[str, Any]]:
    raw = json.loads(path.read_text(encoding="utf-8-sig"))
    if isinstance(raw, list) and raw and isinstance(raw[0], dict) and "results" in raw[0]:
        # wrangler d1 execute --json shape
        return list(raw[0].get("results") or [])
    if isinstance(raw, dict) and "pins" in raw:
        return list(raw["pins"] or [])
    if isinstance(raw, list):
        return [row for row in raw if isinstance(row, dict)]
    raise SystemExit(f"Unrecognized analytics JSON shape: {path}")


def _ctr(impressions: int, clicks: int) -> float:
    if impressions <= 0:
        return 0.0
    return clicks / impressions


def _is_own_link(link: str | None) -> bool:
    return OWN_HOST in str(link or "").lower()


def _title_patterns(title: str) -> list[str]:
    t = (title or "").strip()
    patterns: list[str] = []
    low = t.lower()
    if re.match(r"^how to\b", low):
        patterns.append("how_to")
    if re.search(r"\b\d+\b", t):
        patterns.append("has_number")
    if "challenge" in low:
        patterns.append("challenge")
    if "meal prep" in low or "meal-prep" in low:
        patterns.append("meal_prep")
    if "fiber" in low:
        patterns.append("fiber")
    if "budget" in low or "$" in t or "cheap" in low:
        patterns.append("budget")
    if "protein" in low:
        patterns.append("protein")
    if len(t) > 70:
        patterns.append("long_title")
    if len(t) < 35:
        patterns.append("short_title")
    if not patterns:
        patterns.append("plain")
    return patterns


def score_pins(
    pins: list[dict[str, Any]],
    *,
    min_impressions: int = DEFAULT_MIN_IMPRESSIONS,
    own_domain_only: bool = True,
) -> dict[str, Any]:
    rows: list[dict[str, Any]] = []
    skipped_external = 0
    skipped_low = 0

    for p in pins:
        impressions = int(p.get("impressions") or 0)
        clicks = int(p.get("outbound_clicks") or 0)
        saves = int(p.get("saves") or 0)
        link = p.get("pin_link") or ""
        if own_domain_only and not _is_own_link(link):
            skipped_external += 1
            continue
        if impressions < min_impressions:
            skipped_low += 1
            continue
        ctr = _ctr(impressions, clicks)
        title = str(p.get("pin_title") or "")
        rows.append(
            {
                "pin_id": p.get("pin_id"),
                "title": title,
                "link": link,
                "pin_url": p.get("pin_url"),
                "impressions": impressions,
                "outbound_clicks": clicks,
                "saves": saves,
                "ctr": round(ctr, 6),
                "ctr_pct": round(ctr * 100, 3),
                "save_rate_pct": round(_ctr(impressions, saves) * 100, 3),
                "patterns": _title_patterns(title),
            }
        )

    by_ctr = sorted(rows, key=lambda r: (r["ctr"], r["outbound_clicks"], r["impressions"]), reverse=True)
    by_imp = sorted(rows, key=lambda r: r["impressions"], reverse=True)
    top10 = by_ctr[:10]
    bottom10 = list(reversed(by_ctr[-10:])) if len(by_ctr) >= 10 else list(reversed(by_ctr))

    pattern_hits: Counter[str] = Counter()
    pattern_ctr_sum: dict[str, float] = {}
    pattern_n: Counter[str] = Counter()
    for row in rows:
        for pat in row["patterns"]:
            pattern_hits[pat] += 1
            pattern_ctr_sum[pat] = pattern_ctr_sum.get(pat, 0.0) + row["ctr"]
            pattern_n[pat] += 1

    pattern_avg = [
        {
            "pattern": pat,
            "count": pattern_n[pat],
            "avg_ctr_pct": round(100 * pattern_ctr_sum[pat] / pattern_n[pat], 3),
        }
        for pat in sorted(pattern_n, key=lambda p: pattern_ctr_sum[p] / pattern_n[p], reverse=True)
    ]

    return {
        "version": 1,
        "scored_at": datetime.now(timezone.utc).isoformat(),
        "min_impressions": min_impressions,
        "own_domain_only": own_domain_only,
        "input_pins": len(pins),
        "scored_pins": len(rows),
        "skipped_external_or_empty_link": skipped_external,
        "skipped_low_impressions": skipped_low,
        "totals": {
            "impressions": sum(r["impressions"] for r in rows),
            "outbound_clicks": sum(r["outbound_clicks"] for r in rows),
            "saves": sum(r["saves"] for r in rows),
            "avg_ctr_pct": round(
                100 * (sum(r["outbound_clicks"] for r in rows) / max(1, sum(r["impressions"] for r in rows))),
                3,
            ),
        },
        "top10_by_ctr": top10,
        "bottom10_by_ctr": bottom10,
        "top5_by_impressions": by_imp[:5],
        "pattern_avg_ctr": pattern_avg,
        "all_scored": by_ctr,
    }


def render_markdown(report: dict[str, Any]) -> str:
    lines = [
        "# Pin performance score",
        "",
        f"**Scored at:** {report['scored_at']}",
        f"**Eligible pins:** {report['scored_pins']} (min impressions ≥ {report['min_impressions']}, own-domain links only={report['own_domain_only']})",
        f"**Skipped:** external/empty={report['skipped_external_or_empty_link']}, low impressions={report['skipped_low_impressions']}",
        f"**Avg CTR:** {report['totals']['avg_ctr_pct']}%",
        "",
        "## Top 10 by CTR",
        "",
        "| # | CTR% | Clicks | Impr | Saves | Title |",
        "|---|------|--------|------|-------|-------|",
    ]
    for i, row in enumerate(report["top10_by_ctr"], 1):
        title = (row["title"] or "")[:70].replace("|", "/")
        lines.append(
            f"| {i} | {row['ctr_pct']} | {row['outbound_clicks']} | {row['impressions']} | {row['saves']} | {title} |"
        )
    lines += [
        "",
        "## Bottom 10 by CTR (among eligible)",
        "",
        "| # | CTR% | Clicks | Impr | Saves | Title |",
        "|---|------|--------|------|-------|-------|",
    ]
    for i, row in enumerate(report["bottom10_by_ctr"], 1):
        title = (row["title"] or "")[:70].replace("|", "/")
        lines.append(
            f"| {i} | {row['ctr_pct']} | {row['outbound_clicks']} | {row['impressions']} | {row['saves']} | {title} |"
        )
    lines += ["", "## Title pattern avg CTR", ""]
    for row in report["pattern_avg_ctr"]:
        lines.append(f"- `{row['pattern']}`: {row['avg_ctr_pct']}% CTR (n={row['count']})")
    lines.append("")
    return "\n".join(lines)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Score Pinterest pin CTR performance")
    parser.add_argument("--input", required=True, help="Analytics JSON export path")
    parser.add_argument("--out", required=True, help="Output scored JSON path")
    parser.add_argument("--md", default="", help="Optional markdown summary path")
    parser.add_argument("--min-impressions", type=int, default=DEFAULT_MIN_IMPRESSIONS)
    parser.add_argument("--include-external", action="store_true")
    args = parser.parse_args(argv)

    pins = _load_pins(Path(args.input))
    report = score_pins(
        pins,
        min_impressions=args.min_impressions,
        own_domain_only=not args.include_external,
    )
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    # Keep all_scored out of default file size for git — store cohorts only unless --full
    slim = {k: v for k, v in report.items() if k != "all_scored"}
    out.write_text(json.dumps(slim, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    md_path = Path(args.md) if args.md else out.with_suffix(".md")
    md_path.write_text(render_markdown(report), encoding="utf-8")
    print(f"[score_pin_performance] wrote {out} and {md_path} ({report['scored_pins']} scored)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
