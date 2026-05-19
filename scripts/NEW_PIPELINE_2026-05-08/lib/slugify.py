"""pin_slug_from_title — derive a deterministic kebab slug from a pin title.

The slug is always prefixed with the article_slug so every pin URL is
clearly tied to its parent article.  A few differentiating words from
the pin title are appended (words that don't already appear in the
article slug).
"""
from __future__ import annotations

import re

STOPWORDS = {
    "a", "an", "the", "of", "in", "on", "with", "and", "or", "but",
    "to", "for", "your", "my", "this", "that", "is", "are", "be",
    "at", "by", "from", "as",
    "why", "how", "what", "when", "where",
}

DIFF_WORDS = 3


def pin_slug_from_title(title: str, article_slug: str = "") -> str:
    if not title or not title.strip():
        raise ValueError("title must be non-empty")

    cleaned = re.sub(r"[^A-Za-z0-9]+", " ", title).lower().strip()
    if not cleaned:
        raise ValueError(f"title produces empty slug: {title!r}")

    words = cleaned.split()
    meaningful = [w for w in words if w not in STOPWORDS and not w.isdigit()]
    if not meaningful:
        raise ValueError(f"title contains only stopwords/digits: {title!r}")

    if not article_slug:
        return "-".join(meaningful[:5])

    article_words = set(article_slug.split("-"))
    diff = [w for w in meaningful if w not in article_words]
    if not diff:
        diff = meaningful
    suffix = "-".join(diff[:DIFF_WORDS])
    return f"{article_slug}-{suffix}"
