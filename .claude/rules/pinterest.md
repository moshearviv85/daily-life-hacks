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
- **Current state (2026-04-18):** 152 pins in D1, 59 POSTED, 93 PENDING.
- **Categories:** 57 recipes, 25 nutrition.
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

## Pinterest API — Credentials & Flow

- **App ID:** `1554902`
- **Standard Access:** approved 2026-04-03
- **Redirect URI:** `https://www.daily-life-hacks.com/api/pinterest-demo-callback`
- **Token refresh:** demo app at `https://www.daily-life-hacks.com/api/pinterest-demo`, password `testkey123`
- **ADS Power profile:** Profile 77 = DLH Pinterest (DavidMiller615), endpoint `http://local.adspower.net:50325`

## Known Issues (Do Not Re-Investigate Without Cause)

- **NULL scheduled_time** jumps to front of queue. If a pin is stuck, check `scheduled_time` in D1.
- **Error 2786 "Unable to reach URL"** is transient. Do not investigate the URL until 3 failures.
- **D1 `mark_posted` timeouts** caused duplicate posts. Fix shipped in commit `143951d` (retry 3x, 30s timeout).
- **Scheduling windows:** 2-hour windows from 06:00 UTC, random minutes, max 8 pins/day (ends 21:59 UTC).

## Content Rules Apply

All content rules in `.claude/rules/content.md` apply to pin titles, descriptions, and alt text. Em-dashes, medical claims, supplements, and AI words are banned in pin metadata too.

## Why Path-Scoped

Pinterest details are 95% irrelevant when editing article content or site code. Loading these rules only when you open pin files keeps the main context lean.
