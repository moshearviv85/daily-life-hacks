"""
Fetch Google Search Console data for daily-life-hacks.com.

Usage:
    python seo/fetch_gsc.py

First run opens a browser for OAuth consent. Subsequent runs use cached token.
Outputs CSV files to seo/data/ for analysis.
"""

import json
import os
from datetime import datetime, timedelta
from pathlib import Path

from dotenv import load_dotenv
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

SCRIPT_DIR = Path(__file__).parent
load_dotenv(SCRIPT_DIR / ".env")

SCOPES = ["https://www.googleapis.com/auth/webmasters.readonly"]
SITE_URL = "sc-domain:daily-life-hacks.com"
TOKEN_PATH = SCRIPT_DIR / "credentials" / "token.json"
DATA_DIR = SCRIPT_DIR / "data"

TODAY = datetime.now().strftime("%Y-%m-%d")
START_DATE = (datetime.now() - timedelta(days=90)).strftime("%Y-%m-%d")
END_DATE = (datetime.now() - timedelta(days=3)).strftime("%Y-%m-%d")


def get_credentials():
    TOKEN_PATH.parent.mkdir(parents=True, exist_ok=True)
    creds = None

    if TOKEN_PATH.exists():
        creds = Credentials.from_authorized_user_file(str(TOKEN_PATH), SCOPES)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            client_config = {
                "installed": {
                    "client_id": os.environ["GOOGLE_CLIENT_ID"],
                    "client_secret": os.environ["GOOGLE_CLIENT_SECRET"],
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": ["http://localhost"],
                }
            }
            flow = InstalledAppFlow.from_client_config(client_config, SCOPES)
            creds = flow.run_local_server(port=0)

        TOKEN_PATH.write_text(creds.to_json())

    return creds


def fetch_query_data(service, site_url=SITE_URL):
    """Fetch top queries with impressions, clicks, CTR, position."""
    print(f"Fetching queries ({START_DATE} to {END_DATE})...")
    rows = []
    start_row = 0

    while True:
        response = service.searchanalytics().query(
            siteUrl=site_url,
            body={
                "startDate": START_DATE,
                "endDate": END_DATE,
                "dimensions": ["query"],
                "rowLimit": 5000,
                "startRow": start_row,
            },
        ).execute()

        batch = response.get("rows", [])
        if not batch:
            break
        rows.extend(batch)
        start_row += len(batch)
        print(f"  ...{len(rows)} queries so far")

        if len(batch) < 5000:
            break

    return rows


def fetch_page_data(service, site_url=SITE_URL):
    """Fetch per-page performance data."""
    print(f"Fetching pages ({START_DATE} to {END_DATE})...")
    rows = []
    start_row = 0

    while True:
        response = service.searchanalytics().query(
            siteUrl=site_url,
            body={
                "startDate": START_DATE,
                "endDate": END_DATE,
                "dimensions": ["page"],
                "rowLimit": 5000,
                "startRow": start_row,
            },
        ).execute()

        batch = response.get("rows", [])
        if not batch:
            break
        rows.extend(batch)
        start_row += len(batch)
        print(f"  ...{len(rows)} pages so far")

        if len(batch) < 5000:
            break

    return rows


def fetch_query_page_data(service, site_url=SITE_URL):
    """Fetch query+page combinations for cannibalization analysis."""
    print(f"Fetching query+page combos ({START_DATE} to {END_DATE})...")
    rows = []
    start_row = 0

    while True:
        response = service.searchanalytics().query(
            siteUrl=site_url,
            body={
                "startDate": START_DATE,
                "endDate": END_DATE,
                "dimensions": ["query", "page"],
                "rowLimit": 5000,
                "startRow": start_row,
            },
        ).execute()

        batch = response.get("rows", [])
        if not batch:
            break
        rows.extend(batch)
        start_row += len(batch)
        print(f"  ...{len(rows)} combos so far")

        if len(batch) < 5000:
            break

    return rows


def save_csv(rows, dimensions, filename):
    """Save API rows to CSV."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    filepath = DATA_DIR / filename

    import csv

    with open(filepath, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(dimensions + ["clicks", "impressions", "ctr", "position"])
        for row in rows:
            keys = row["keys"]
            writer.writerow(
                keys
                + [
                    row["clicks"],
                    row["impressions"],
                    round(row["ctr"], 4),
                    round(row["position"], 1),
                ]
            )

    print(f"Saved {len(rows)} rows to {filepath}")


def print_summary(query_rows, page_rows):
    """Print key findings."""
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)

    total_clicks = sum(r["clicks"] for r in query_rows)
    total_impressions = sum(r["impressions"] for r in query_rows)
    print(f"\nTotal clicks (90d): {total_clicks:,}")
    print(f"Total impressions (90d): {total_impressions:,}")
    if total_impressions > 0:
        print(f"Average CTR: {total_clicks / total_impressions:.2%}")

    high_imp_no_click = [
        r for r in query_rows if r["impressions"] >= 50 and r["clicks"] == 0
    ]
    print(f"\nKeyword gaps (50+ impressions, 0 clicks): {len(high_imp_no_click)}")
    for r in sorted(high_imp_no_click, key=lambda x: -x["impressions"])[:10]:
        print(f"  {r['keys'][0]}: {r['impressions']} impressions, pos {r['position']:.1f}")

    low_ctr = [
        r
        for r in query_rows
        if r["impressions"] >= 100 and r["ctr"] < 0.02 and r["clicks"] > 0
    ]
    print(f"\nLow CTR (100+ imp, <2% CTR): {len(low_ctr)}")
    for r in sorted(low_ctr, key=lambda x: -x["impressions"])[:10]:
        print(
            f"  {r['keys'][0]}: {r['impressions']} imp, {r['clicks']} clicks, "
            f"CTR {r['ctr']:.2%}, pos {r['position']:.1f}"
        )

    striking_distance = [
        r for r in query_rows if 5 <= r["position"] <= 15 and r["impressions"] >= 50
    ]
    print(f"\nStriking distance (pos 5-15, 50+ imp): {len(striking_distance)}")
    for r in sorted(striking_distance, key=lambda x: -x["impressions"])[:10]:
        print(
            f"  {r['keys'][0]}: pos {r['position']:.1f}, {r['impressions']} imp, "
            f"{r['clicks']} clicks"
        )

    zero_imp_pages = [r for r in page_rows if r["impressions"] == 0]
    print(f"\nPages with zero impressions: {len(zero_imp_pages)}")
    for r in zero_imp_pages[:10]:
        print(f"  {r['keys'][0]}")


def main():
    print("Connecting to Google Search Console...")
    creds = get_credentials()
    service = build("searchconsole", "v1", credentials=creds)

    sites = service.sites().list().execute()
    site_urls = [s["siteUrl"] for s in sites.get("siteEntry", [])]
    print(f"Available sites: {site_urls}")

    site_url = SITE_URL
    if site_url not in site_urls:
        alt = "https://www.daily-life-hacks.com/"
        if alt in site_urls:
            print(f"Using {alt} instead of {site_url}")
            site_url = alt
        else:
            print(f"WARNING: {site_url} not found. Available: {site_urls}")
            print("Trying anyway...")

    query_rows = fetch_query_data(service, site_url)
    page_rows = fetch_page_data(service, site_url)
    query_page_rows = fetch_query_page_data(service, site_url)

    save_csv(query_rows, ["query"], f"gsc_queries_{TODAY}.csv")
    save_csv(page_rows, ["page"], f"gsc_pages_{TODAY}.csv")
    save_csv(query_page_rows, ["query", "page"], f"gsc_query_page_{TODAY}.csv")

    print_summary(query_rows, page_rows)

    print(f"\nData saved to {DATA_DIR}/")
    print("Next step: run analysis or open a new Claude session with this data.")


if __name__ == "__main__":
    main()
