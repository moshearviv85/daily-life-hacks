# SEO On-Page Pass (CP5.3)

**Date:** 2026-07-12  
**Method:** Local frontmatter/body checklist (FAQ, imageAlt, excerpt, H2s, internal links, word count).  
**GSC:** Confirm pin destinations remain 301-only and “Duplicate without user-selected canonical” stays flat after deploy — manual in Search Console.

## Summary

| Metric | Count |
|--------|------:|
| Articles scanned | 186 |
| With ≥1 issue | 89 |
| Missing FAQ | 0 |
| No body internal links | 29 |
| Thin body (&lt;800 words) | 56 |

Full list: `pipeline-data/reports/seo-onpage-2026-07-12.*`

## Structural fixes shipped with this pass

1. `/guides/` hub for three pillars + spoke lists.
2. RelatedArticles boosts pillar URLs for cluster relevance.
3. Header nav includes Guides.
4. Thank-you soft-fails to live guides (no broken PDF 404s).

## Follow-ups (manual / later batches)

- Fix FAQ on priority articles from the top-50 list (do not mass-rewrite in one PR).
- Add contextual spoke→pillar links inside body copy where RelatedArticles is not enough.
- Re-check GSC indexing after deploy of CP5.
