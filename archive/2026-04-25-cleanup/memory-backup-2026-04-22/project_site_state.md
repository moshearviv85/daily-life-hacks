---
name: DLH Site State
description: Verified current state of daily-life-hacks.com — updated 2026-04-16
type: project
originSessionId: c3c6399b-bc6c-4272-818f-5402203d2fb0
---
## Content (verified 2026-04-16)
- **77 articles live** | ~28 nutrition | ~30 recipes | ~19 tips
- **134 web images committed** to GitHub (77 old + 46 new batch + extras)
- **Pin images committed** to GitHub (87 new batch pin images pushed 2026-04-16)
- **ingredients/** images exist locally only — disabled until further notice

## The 50-Article Batch (production-sheet.csv)
- `pipeline-data/production-sheet.csv` = single source of truth for next 50 articles
- All 50 have full article markdown + pin copy v1–v5 + image filenames
- All 50 web images pushed to GitHub ✓
- All 87 new pin images pushed to GitHub ✓
- **CSV not yet uploaded to D1** — user was attempting this on 2026-04-16

## Article Publishing System (FULLY BUILT, ready to activate)
- GitHub Actions: `publish-articles.yml` — committed to git ✓, runs daily 07:00 UTC
- Endpoint: `articles-upload.js` — POST CSV → inserts to D1, then auto-publishes first article immediately
- Endpoint: `articles-publish.js` — auto-picks first PENDING, loops skipping duplicates, commits .md to GitHub
- Endpoint: `articles-list.js` — sorted: PENDING first, PUBLISHED by published_at DESC, DUPLICATE last
- Endpoint: `articles-export.js` — GET downloads articles_schedule as CSV with published_at dates
- D1 table: `articles_schedule` exists, empty, has `duplicate_of` column (migration applied 2026-04-15)
- Dashboard: upload CSV → auto-publish first article → green rows with "↗ View article" link + published_at date

## Duplicate Detection
- Before publishing: checks GitHub for existing `src/data/articles/{slug}.md`
- If exists → marks DUPLICATE in D1, stores `duplicate_of` URL, skips to next
- Dashboard shows DUPLICATE rows in red with links to both attempted and live article

## Pinterest Auto-Poster (active)
- `pins-next.js` now checks articles_schedule before returning a pin:
  - If article is PENDING/DUPLICATE → skips pin silently (no fail_count increment), retries next run
  - If article is PUBLISHED or not in pipeline (original 77) → posts normally
- This prevents posting pins for articles not yet live on site

## Cloudflare Env Vars — Fixes applied 2026-04-16
- `STATS_KEY ` (with trailing space) → deleted and replaced with `STATS_KEY` = correct value
- All 6 articles pipeline endpoints now committed to git: articles-upload, articles-due,
  articles-set-status, articles-trigger, articles-list, articles-publish, articles-export

## Pinterest Auto-Poster stats (last known: 2026-04-15)
- 152 total pins in D1: 59 POSTED, 93 PENDING
- Scheduling: 6–8 pins/day, 2h windows 06:00–21:59 UTC

## Email
- Kit: 2 subscribers (both test). 0 real subscribers. No welcome automation.

## Monetization
- 0 affiliate links live. `docs/monetization-framework.md` = planning only.

**Why:** Publishing system fully built 2026-04-15/16. Images pushed. Only step left = user uploads production-sheet.csv via dashboard.

**How to apply:** Articles pipeline is ready. When user uploads CSV, first article auto-publishes. Check articles_schedule in D1 for status. Pinterest poster skips pins for unpublished articles automatically.
