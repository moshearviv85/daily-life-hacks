# Pinterest Auto-Poster — Architecture & Decisions

## Background

Pinterest Standard Access API was approved on 2026-04-03.
The OAuth demo app (built by this Claude instance) already handles OAuth consent, token exchange, and sandbox pin creation.

Now we want to replace Publer with a fully automated posting system using the real Pinterest API.

---

## Goal

A fully automated system that:
1. Reads a CSV schedule file
2. Posts one pin at a time based on `scheduled_date`
3. Marks each pin as `POSTED` after success
4. Runs on GitHub Actions — no server required

---

## CSV File

**Path:** `pipeline-data/pins-schedule.csv`

This is the master schedule file. It follows the same structure as `pinterest_queue_fixed.csv` (already in repo) with one added column: `scheduled_date`.

### Column definitions

| Column | Description | Example |
|--------|-------------|---------|
| `row_id` | Unique ID | `DLH-0001` |
| `pin_title` | Pin title shown on Pinterest | `High Fiber Avocado Toast` |
| `pin_description` | Full description + hashtags | `A filling toast recipe...` |
| `alt_text` | Image alt text — critical for accessibility and SEO | `Avocado toast on a white plate with seeds` |
| `image_url` | Full public URL to pin image | `https://www.daily-life-hacks.com/images/pins/{slug}_v1.jpg` |
| `board_id` | Pinterest board numeric ID | `1124140825679184032` |
| `link` | URL to article on site | `https://www.daily-life-hacks.com/{slug}` |
| `scheduled_date` | Date to post (YYYY-MM-DD) | `2026-04-10` |
| `status` | `PENDING` or `POSTED` | `PENDING` |
| `pin_id` | Filled after posting | (empty until posted) |
| `published_date` | Filled after posting | (empty until posted) |
| `pinterest_response` | Raw response or error from API | (empty until posted) |

### Naming convention for image URLs
```
https://www.daily-life-hacks.com/images/pins/{slug}_v{n}.jpg
```

### Scheduling logic (set by Cursor agent when generating new content)
- Article published on Day 0
- v1 pin → `article_date + 1 day`
- v2 pin → `article_date + 2 days`
- v3 pin → `article_date + 3 days`
- v4 pin → `article_date + 4 days`

This spreads variants across days — prevents spam signals on Pinterest.

---

## Known Board IDs

| Board | ID |
|-------|----|
| High Fiber Dinner and Gut Health Recipes | `1124140825679184032` |
| Healthy Breakfast, Smoothies and Snacks | `1124140825679184036` |
| Gut Health Tips and Nutrition Charts | `1124140825679184034` |

---

## Python Script

**Path:** `scripts/post-pins.py`

### What it does
1. Reads `pipeline-data/pins-schedule.csv`
2. Finds all rows where `status == PENDING` and `scheduled_date <= today`
3. Posts each pin to Pinterest API v5 production (`api.pinterest.com`)
4. Updates the row: sets `status = POSTED`, fills `pin_id`, `published_date`, `pinterest_response`
5. Writes CSV back to file
6. Commits and pushes the updated CSV (so GitHub has the latest state)

### Pinterest API call
```
POST https://api.pinterest.com/v5/pins
Authorization: Bearer {ACCESS_TOKEN}

{
  "board_id": "{board_id}",
  "title": "{pin_title}",
  "description": "{pin_description}",
  "alt_text": "{alt_text}",
  "media_source": {
    "source_type": "image_url",
    "url": "{image_url}"
  },
  "link": "{link}"
}
```

### Token refresh
- On startup, use `PINTEREST_REFRESH_TOKEN` (GitHub Secret) to get a fresh access token
- Endpoint: `POST https://api.pinterest.com/v5/oauth/token` with `grant_type=refresh_token`
- App credentials: `PINTEREST_APP_ID` + `PINTEREST_APP_SECRET` (GitHub Secrets)

### Rate limit handling
- Print `X-RateLimit-Remaining` from response headers
- If 429 received: stop script, log error, exit 0 (so GitHub Action doesn't fail)

### Safety rule
- Post a maximum of 1 pin per run
- This prevents accidental bulk posting if something goes wrong

---

## GitHub Actions Workflow

**Path:** `.github/workflows/post-pins.yml`

### Schedule
Runs every 2 hours:
```yaml
on:
  schedule:
    - cron: '0 */2 * * *'
  workflow_dispatch:  # allow manual trigger
```

### Required GitHub Secrets
| Secret name | Value |
|-------------|-------|
| `PINTEREST_APP_ID` | `1554902` |
| `PINTEREST_APP_SECRET` | (from Pinterest developer portal) |
| `PINTEREST_REFRESH_TOKEN` | (obtained once via OAuth flow — see below) |

### Workflow steps
1. Checkout repo
2. Set up Python
3. Install dependencies (`requests`)
4. Run `python scripts/post-pins.py`
5. Commit + push updated CSV (if any pin was posted)

---

## One-Time Setup: Getting the Refresh Token

The refresh token must be obtained once manually via the OAuth demo app already deployed at:
```
https://www.daily-life-hacks.com/api/pinterest-demo
Password: testkey123
```

**Steps:**
1. Open the demo app in AdsPower (Profile 77 — DavidMiller615, US proxy)
2. Complete OAuth flow → "Connect Pinterest OAuth"
3. Add a `/api/pinterest-demo-token` endpoint to the demo app that displays the current `refresh_token` from the cookie
4. Copy the refresh token → save as GitHub Secret `PINTEREST_REFRESH_TOKEN`
5. Done — script handles all future token refreshes automatically

---

## Existing App Files (already in repo)

The OAuth demo app lives in `functions/api/`:
| File | Role |
|------|------|
| `pinterest-demo.js` | Main page: access gate, OAuth status, pin form |
| `pinterest-demo-connect.js` | Redirect to Pinterest OAuth |
| `pinterest-demo-callback.js` | Receives code, exchanges for token, saves to cookie |
| `pinterest-demo-publish.js` | POST /v5/pins to sandbox |
| `pinterest-demo-lib.js` | Shared logic: OAuth URL, HMAC cookies, pin catalog |
| `pinterest-demo-test.js` | Self-test checklist page |

---

## Environment Variables (already set in Cloudflare)

| Name | Value |
|------|-------|
| `PINTEREST_APP_ID` | `1554902` |
| `PINTEREST_APP_SECRET` | (secret) |
| `PINTEREST_DEMO_COOKIE_SECRET` | (secret) |
| `PINTEREST_DEMO_ACCESS_KEY` | `testkey123` |

---

## What to Build (task list)

1. **Add `/api/pinterest-demo-token` endpoint** to the existing demo app
   - Protected by `PINTEREST_DEMO_ACCESS_KEY`
   - Reads the OAuth cookie and displays `access_token` + `refresh_token`
   - Purpose: one-time extraction of refresh token for GitHub Secrets

2. **Create `pipeline-data/pins-schedule.csv`**
   - Copy structure from `pinterest_queue_fixed.csv` (already in repo)
   - Add `scheduled_date` column
   - Populate with a few test rows (use existing pin images already on site)

3. **Create `scripts/post-pins.py`**
   - As described above

4. **Create `.github/workflows/post-pins.yml`**
   - As described above

---

## Test Plan

1. Add 2-3 rows to `pins-schedule.csv` with `scheduled_date = today`
2. Set GitHub Secrets
3. Trigger workflow manually (`workflow_dispatch`)
4. Verify pins appear on Pinterest board (DavidMiller615 account)
5. Verify CSV updated with `POSTED` status + pin_id
