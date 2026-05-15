---
paths:
  - "scripts/*pin*"
  - "scripts/post-*"
  - "pipeline-data/pins*"
  - "pipeline-data/slug-aliases*"
  - "functions/api/pinterest*"
  - "public/images/pins/**"
---

# Pinterest Rules (Path-Scoped)

These rules load when working with pin-related files.

## Architecture

```
pin_briefs (SQLite)
  → generate_pinterest_csv.py → CSV
    → /api/pins-upload → D1 pins_schedule
      → GitHub Action post-pins.py (every 30 min)
        → Pinterest API v5
```

## D1 Database — `pins_schedule`

- **Binding:** `dlh-subscriptions` (Cloudflare D1)
- **Primary key:** `row_id` — format `{base-slug}_v{N}` (e.g. `easy-sandwich-bread-recipe-beginners_v3`)
- **Statuses:** `PENDING` → `POSTED` (or `FAILED` after 3 retries)
- **Key fields:** `row_id`, `pin_title`, `pin_description`, `alt_text`, `image_url`, `board_id`, `link`, `status`, `fail_count`

Query example:
```
npx wrangler d1 execute dlh-subscriptions --remote --command "SELECT COUNT(*), status FROM pins_schedule GROUP BY status"
```

## Critical: Pin URL = Variant Slug + Alias

Every pin gets a **unique variant slug** as its URL, NOT the article slug. This is so Pinterest sees different URLs for pins pointing to the same article (avoids spam detection).

Example for article `easy-sandwich-bread-recipe-beginners`:
- Pin v1 link: `/soft-sandwich-bread-recipe-no` (alias → article)
- Pin v2 link: `/easy-sandwich-bread-recipe-beginners` (direct article)
- Pin v3 link: `/beginner-bread-recipe-perfect-loaf` (alias → article)
- Pin v4 link: `/homemade-bread-hours-no-fancy` (alias → article)

### The 3-Step Rule — NEVER skip any step

When adding a new pin to D1, ALL THREE must be true before upload:

1. **Image exists** at `public/images/pins/{base-slug}_v{N}.jpg`
2. **Variant slug registered** in `pipeline-data/slug-aliases.json` (maps variant → article)
3. **Link field** in D1 uses the variant slug URL: `https://www.daily-life-hacks.com/{variant-slug}`

If any step is missing:
- Missing image → Pinterest API rejects with "image is broken"
- Missing alias → visitor gets 404 → Pinterest penalizes the account
- Wrong link (article slug instead of variant) → duplicate URLs → Pinterest flags as spam

## slug-aliases.json

- **Path:** `pipeline-data/slug-aliases.json`
- **Format:** `{ "variant-slug": "article-slug" }`
- **Used by:** `src/pages/[slug].astro` getStaticPaths — generates a redirect page for each alias
- **After editing:** must `git commit` + `git push` to deploy (Cloudflare Pages auto-deploys on push)
- **Current count:** 188 aliases

## Pin Images

- **Path:** `public/images/pins/{base-slug}_v{N}.jpg`
- **Naming:** base-slug is the article slug or existing alias slug from `row_id`, N is 1-4
- **Must be committed and pushed** before auto-poster runs — the `image_url` points to the live site

## Boards (3)

| Board | ID |
|-------|------|
| High Fiber Dinner and Gut Health Recipes | `1124140825679184034` |
| Healthy Breakfast, Smoothies and Snacks | `1124140825679184032` |
| Gut Health Tips and Nutrition Charts | `1124140825679184036` |

## Auto-Poster — `post-pins.py`

- **Workflow:** `.github/workflows/post-pins.yml`
- **Schedule:** every 30 minutes (cron)
- **Manual trigger:** `gh workflow run post-pins.yml -f immediate=true`
- **Behavior:** picks the first PENDING pin with `scheduled_date <= now`, posts to Pinterest, marks as POSTED
- **Failure:** increments `fail_count`, marks FAILED after 3 attempts
- **Token refresh:** auto-rotates `PINTEREST_REFRESH_TOKEN` in GitHub Secrets

## Pinterest API

- **App ID:** stored in GitHub Secrets (`PINTEREST_APP_ID`)
- **Standard Access:** approved 2026-04-03
- **Redirect URI:** `https://www.daily-life-hacks.com/api/pinterest-demo-callback`
- **Token refresh page:** `https://www.daily-life-hacks.com/api/pinterest-demo`

## Local SQLite — `pipeline-data/topic-research.sqlite`

- **`pin_briefs`** — 144 rows (36 articles × 4 variants). Contains `pin_slug`, `article_slug`, `title`, `description`, `prompt`, `alt`. These are briefs for future pins not yet uploaded to D1.
- **`pinterest_pins`** — live pins fetched from Pinterest API. Used for auditing.

## Content Rules

All content rules from the david-miller-voice skill apply to pin titles, descriptions, and alt text. Em-dashes, medical claims, supplements, and AI words are banned in pin metadata too.

## Coverage (as of 2026-05-14)

- 140 articles on site
- 76 articles have pins (342 total: 68 PENDING, 274 POSTED)
- 64 articles have zero pins
