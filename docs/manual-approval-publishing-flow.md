# Manual Approval Publishing Flow

Last updated: 2026-05-18

## Goal

Prevent newly generated articles or pins from going live until a human reviewer approves them in the dashboard.

## Status Model

### Articles: `articles_schedule`

- `REVIEW`: uploaded/generated and waiting for manual review.
- `APPROVED`: allowed to be picked up by the article publisher.
- `PUBLISHED`: committed to `src/data/articles/*.md` on `main`.
- `DUPLICATE`: skipped because the slug already exists in GitHub.
- `INVALID`: skipped because frontmatter validation failed.
- `PENDING`: legacy approved queue status. Existing rows may still have it, and publishers continue to accept it, but new uploads use `REVIEW`.

### Pins: `pins_schedule`

- `REVIEW`: uploaded/generated and waiting for manual review.
- `PENDING`: approved and eligible for scheduled posting by `post-pins.py`.
- `POSTED`: posted to Pinterest and recorded in D1.
- `FAILED`: permanently failed after retry limits.

## Flow

1. Upload article CSV via `/api/articles-upload`.
2. New article rows are inserted as `REVIEW`.
3. Reviewer clicks `Approve` in the dashboard, which calls `/api/articles-set-status` with `APPROVED`.
4. The publisher (`/api/articles-publish` or `scripts/publish-articles.py`) reads `APPROVED` plus legacy `PENDING` rows.
5. Successful publish commits the markdown to GitHub and marks the row `PUBLISHED`.

For pins:

1. Upload pins CSV via `/api/pins-upload`.
2. New pin rows are inserted as `REVIEW`.
3. Reviewer clicks `Approve` in the dashboard, which calls `/api/pins-set-status` with `PENDING`.
4. `/api/pins-next` and `scripts/post-pins.py` only read `PENDING` rows.
5. Successful post marks the row `POSTED`.

## Safety Notes

- Uploading pins no longer dispatches `post-pins.yml`.
- Uploading articles no longer auto-publishes the first article.
- Existing `PENDING` rows are preserved so the already-approved queue is not unexpectedly paused.
- No D1 schema migration is required for the new statuses because both status columns are plain `TEXT`.
