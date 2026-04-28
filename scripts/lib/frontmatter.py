"""Frontmatter cleaner — normalize an article's YAML frontmatter for site
deploy. Used by bulk_deploy_articles.py and publish-articles.py.

Behaviors:
- Remove publishAt entirely (any value). A future publishAt hides the
  article from Astro's getCollection output.
- Set date to today (article appears as newest on the homepage).
- Set author to "David Miller".
- Collapse runs of 3+ blank lines.
"""
from __future__ import annotations

import re
from datetime import date


_AUTHOR_LINE_RE = re.compile(r'^author:\s*.+$', re.MULTILINE)
_FRONTMATTER_RE = re.compile(r'^(---\s*\n)(.*?)(\n---\s*(?:\n|$))', re.DOTALL)


def clean_frontmatter(markdown: str) -> str:
    today = date.today().isoformat()
    fixed = markdown
    fixed = re.sub(r'^publishAt:\s*.*\n?', '', fixed, flags=re.MULTILINE)
    fixed = re.sub(r'^date:\s*.+$', f'date: {today}', fixed, flags=re.MULTILINE)
    if _AUTHOR_LINE_RE.search(fixed):
        fixed = _AUTHOR_LINE_RE.sub('author: "David Miller"', fixed)
    else:
        m = _FRONTMATTER_RE.match(fixed)
        if m:
            fm_block = m.group(2).rstrip()
            new_fm = fm_block + '\nauthor: "David Miller"'
            fixed = m.group(1) + new_fm + m.group(3) + fixed[m.end():]
    fixed = re.sub(r'\n{3,}', '\n\n', fixed)
    return fixed
