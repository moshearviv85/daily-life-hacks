---
paths:
  - "scripts/*pin*"
  - "scripts/post-*"
  - "pipeline-data/pins*"
  - "functions/api/pinterest*"
  - "public/images/pins/**"
---

# Pinterest Rules (Path-Scoped)

These rules load when working with pin-related files.

## Database & Pipeline

- **Master database:** `pipeline-data/pipeline.db` (SQLite). Pin data is in D1 and in local SQLite.
- **Boards (3):**
  - "High Fiber Dinner and Gut Health Recipes"
  - "Healthy Breakfast, Smoothies and Snacks"
  - "Gut Health Tips and Nutrition Charts"

## Naming Conventions

- Pin image: `public/images/pins/{slug}_v{variant}.jpg` (variant 1-5)
- Pin URL: `https://www.daily-life-hacks.com/{slug}?utm_content=v{variant}`
- Pin IDs: tracked in `pipeline-data/pins.json` / `pins.csv`
- 14 columns in pin schema: pin_id, pin_title, description, hashtags, alt_text, board, affiliate_link, date, category, slug, variant, image_filename, site_url, status

## Pin Statuses

`draft` → `image_ready` → `article_written` → `published` → `posted` (after Pinterest API confirms)

## Pinterest API

- **App ID:** `1554902`
- **Standard Access:** approved 2026-04-03
- **Redirect URI:** `https://www.daily-life-hacks.com/api/pinterest-demo-callback`
- **Token refresh:** demo app at `https://www.daily-life-hacks.com/api/pinterest-demo`

## Content Rules

All content rules from the david-miller-voice skill apply to pin titles, descriptions, and alt text. Em-dashes, medical claims, supplements, and AI words are banned in pin metadata too.
