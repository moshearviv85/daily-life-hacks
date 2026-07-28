"""Pure helpers for parsing Pinterest pin objects into our row_id format.

The pin_id from Pinterest is unrelated to our row_id ({slug}_v{variant}).
We have to derive row_id from the pin's `link` field, which our pipeline
sets to `https://www.daily-life-hacks.com/{slug}` or `.../{slug}-v{N}` or
`.../{slug}?utm_content=v{N}`. Older pins (uploaded via Publer) may use
slightly different formats — we try several patterns and fall back to
slug-only when variant cannot be determined.
"""
from __future__ import annotations

import re
from urllib.parse import urlparse, parse_qs


SITE_HOSTS = ("daily-life-hacks.com", "www.daily-life-hacks.com")


def extract_slug_variant_from_link(link: str) -> tuple[str | None, int | None]:
    """Return (slug, variant). variant is None if not encoded in the link.
    slug is None if the link doesn't point at our site."""
    if not link:
        return None, None
    try:
        u = urlparse(link)
    except Exception:
        return None, None
    if u.hostname not in SITE_HOSTS:
        return None, None
    path = u.path.lstrip("/")
    if not path:
        return None, None
    first_segment = path.split("/")[0]

    # Pattern 1: slug-vN at the end of pathname segment
    m = re.match(r"^(.+)-v(\d+)$", first_segment)
    if m:
        return m.group(1), int(m.group(2))

    # Pattern 2: utm_content=vN in query string
    qs = parse_qs(u.query)
    utm = qs.get("utm_content", [""])[0]
    m = re.match(r"^v(\d+)$", utm)
    if m:
        return first_segment, int(m.group(1))

    # Pattern 3: variant unknown
    return first_segment, None
