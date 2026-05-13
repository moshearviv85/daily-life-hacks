# scripts/NEW_PIPELINE_2026-05-08/discover_gsc.py
"""Discover topic opportunities from Google Search Console.

Fetches queries where the site ranks (has impressions) but has low CTR,
suggesting content gaps. Outputs JSON to stdout.

Usage:
    python scripts/NEW_PIPELINE_2026-05-08/discover_gsc.py
    python scripts/NEW_PIPELINE_2026-05-08/discover_gsc.py --days 28
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]


def _load_env() -> None:
    env_path = REPO_ROOT / ".env"
    if env_path.exists():
        for line in env_path.read_text(encoding="utf-8").splitlines():
            if "=" in line and not line.startswith("#"):
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip().strip("'").strip('"'))


def fetch_gsc_queries(service_account_json: str, site_url: str, days: int = 28) -> list[dict]:
    from google.oauth2 import service_account
    from googleapiclient.discovery import build

    creds = service_account.Credentials.from_service_account_info(
        json.loads(service_account_json),
        scopes=["https://www.googleapis.com/auth/webmasters.readonly"],
    )
    service = build("searchconsole", "v1", credentials=creds)

    from datetime import datetime, timedelta
    end = datetime.utcnow().date()
    start = end - timedelta(days=days)

    response = service.searchanalytics().query(
        siteUrl=site_url,
        body={
            "startDate": start.isoformat(),
            "endDate": end.isoformat(),
            "dimensions": ["query"],
            "rowLimit": 500,
            "dimensionFilterGroups": [{
                "filters": [{
                    "dimension": "query",
                    "operator": "excludes",
                    "expression": "daily life hacks"
                }]
            }]
        }
    ).execute()

    results = []
    for row in response.get("rows", []):
        query = row["keys"][0]
        impressions = row.get("impressions", 0)
        clicks = row.get("clicks", 0)
        ctr = row.get("ctr", 0)
        position = row.get("position", 0)

        if impressions >= 5 and ctr < 0.05:
            results.append({
                "topic": query,
                "source": "gsc",
                "impressions": impressions,
                "ctr": round(ctr, 4),
                "avg_position": round(position, 1),
            })

    results.sort(key=lambda x: x["impressions"], reverse=True)
    return results


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Discover topics from GSC")
    parser.add_argument("--days", type=int, default=28)
    parser.add_argument("--site-url", default="https://www.daily-life-hacks.com/")
    args = parser.parse_args(argv)

    _load_env()
    sa_json = os.environ.get("GSC_SERVICE_ACCOUNT_JSON", "")
    if not sa_json:
        print("ERROR: GSC_SERVICE_ACCOUNT_JSON not set", file=sys.stderr)
        return 1

    topics = fetch_gsc_queries(sa_json, args.site_url, args.days)
    print(f"Found {len(topics)} GSC opportunity queries", file=sys.stderr)
    print(json.dumps(topics, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
