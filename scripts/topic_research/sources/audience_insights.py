"""Pinterest Audience Insights API — fetch total-audience interest + demographic data.

API docs: https://developers.pinterest.com/docs/api/v5/audience_insights-get

Endpoint shape: GET /v5/audience_insights?audience_insight_type=YOUR_TOTAL_AUDIENCE
Returns interest affinity/percent breakdown plus demographic distributions
(age, gender, device, country).

The returned dict mirrors what parse_audience_csv returns so stage1 can swap
sources without changing any downstream logic.
"""
from __future__ import annotations

import json
import sys
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

_API_BASE = "https://api.pinterest.com/v5"


def fetch_audience_insights(
    access_token: str,
    audience_type: str = "YOUR_TOTAL_AUDIENCE",
    timeout: int = 20,
) -> dict[str, Any]:
    """Fetch audience insights from Pinterest. Returns {} on failure (graceful).

    Args:
        access_token: Pinterest OAuth Bearer token.
        audience_type: Audience insight type. Default is "YOUR_TOTAL_AUDIENCE".
        timeout: HTTP request timeout in seconds.

    Returns:
        dict with keys:
            audience_size (int | None),
            interests (list of dicts: interest, affinity, percent,
                       category, category_affinity, category_percent),
            age     (list of dicts: value, percent),
            gender  (list of dicts: value, percent),
            device  (list of dicts: value, percent),
            countries (list of dicts: value, percent),
        or {} if the API call fails.
    """
    params = {"audience_insight_type": audience_type}
    qs = urllib.parse.urlencode(params)
    url = f"{_API_BASE}/audience_insights?{qs}"
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {access_token}"})

    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            data = json.loads(resp.read())
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")[:300] if e.fp else ""
        print(f"  [audience_insights] HTTP {e.code}: {body}", file=sys.stderr)
        return {}
    except Exception as e:
        print(f"  [audience_insights] fetch failed: {e}", file=sys.stderr)
        return {}

    if not isinstance(data, dict):
        return {}

    result: dict[str, Any] = {
        "audience_size": None,
        "interests": [],
        "age": [],
        "gender": [],
        "device": [],
        "countries": [],
    }

    # audience_size — top-level or nested under "audience"
    if "audience_size" in data:
        try:
            result["audience_size"] = int(data["audience_size"])
        except (TypeError, ValueError):
            pass

    # interests — list under "interests" key; each item has at least
    # "name" / "key" / "affinity" / "percent" (exact field names vary by API version)
    raw_interests = data.get("interests") or []
    if isinstance(raw_interests, list):
        for item in raw_interests:
            if not isinstance(item, dict):
                continue
            interest = (
                (item.get("name") or item.get("key") or item.get("interest") or "")
                .strip()
            )
            if not interest:
                continue
            result["interests"].append({
                "interest": interest,
                "affinity": _to_float(item.get("affinity")),
                "percent": _to_float(item.get("percent")),
                "category": (item.get("category") or "").strip(),
                "category_affinity": _to_float(item.get("category_affinity")),
                "category_percent": _to_float(item.get("category_percent")),
            })

    # demographics — Pinterest returns these under "age", "gender", "device", "countries"
    # Each is a list of {name/key, percent} dicts.
    for field in ("age", "gender", "device", "countries"):
        raw = data.get(field) or []
        if not isinstance(raw, list):
            continue
        for item in raw:
            if not isinstance(item, dict):
                continue
            value = (item.get("name") or item.get("key") or item.get("value") or "").strip()
            if not value:
                continue
            result[field].append({
                "value": value,
                "percent": _to_float(item.get("percent")),
            })

    return result


def _to_float(value: Any) -> float | None:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


if __name__ == "__main__":
    import os
    from pathlib import Path
    for line in Path(".env").read_text(encoding="utf-8").splitlines():
        if "=" in line and not line.startswith("#"):
            k, v = line.split("=", 1)
            os.environ[k.strip()] = v.strip().strip("'").strip('"')
    tok = os.environ["PINTEREST_ACCESS_TOKEN"]
    result = fetch_audience_insights(tok)
    print(json.dumps(result, indent=2, ensure_ascii=False))
