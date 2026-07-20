# SEO On-Page Pass (CP5.3)

**Date:** 2026-07-20
**Method:** Local frontmatter/body checklist (FAQ, imageAlt, excerpt, H2s, internal links, word count).
**GSC:** Confirm pin destinations remain 301-only and “Duplicate without user-selected canonical” stays flat after deploy — manual in Search Console.

## Summary

| Metric | Count |
|--------|------:|
| Articles scanned | 210 |
| With ≥1 issue | 0 |
| Missing FAQ | 0 |
| No body internal links | 0 |
| Thin body (&lt;800 words) | 0 |

Full list: `pipeline-data/reports/seo-onpage-2026-07-20.*`

## Structural fixes shipped with this pass

1. `/guides/` hub for four pillars + spoke lists.
2. RelatedArticles boosts pillar URLs for cluster relevance.
3. Header nav includes Guides and Tools.
4. `/tools/` links four calculators with visible formulas and source context.

## Follow-ups (manual / later batches)

- Fix FAQ on priority articles from the top-50 list (do not mass-rewrite in one PR).
- Keep every article connected with at least one useful contextual body link.
- Re-check GSC indexing after deploy of CP5.
