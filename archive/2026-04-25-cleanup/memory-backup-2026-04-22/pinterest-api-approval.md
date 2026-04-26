---
name: Pinterest API — Credentials & Status
description: Pinterest Standard Access approved. Auto-poster running. Credentials stored here.
type: project
originSessionId: c3c6399b-bc6c-4272-818f-5402203d2fb0
---
## Status: APPROVED + RUNNING ✓
- Standard Access approved 2026-04-03
- Auto-poster active via GitHub Actions (`post-pins.yml`) + `scripts/post-pins.py`
- Posts from D1 `pins_schedule` table, every 30 minutes

## App Credentials
- **App ID:** `1554902`
- **App Secret:** `f952dfd1d47d141bc6b170af57a54f212b5b524c`
- **Redirect URI:** `https://www.daily-life-hacks.com/api/pinterest-demo-callback`

## Demo App (still live, for token refresh if needed)
- URL: `https://www.daily-life-hacks.com/api/pinterest-demo`
- Password: `testkey123`
- Files: `functions/api/pinterest-demo*.js`

## ADS POWER
- API URL: `http://local.adspower.net:50325`
- Profile serial `77` = DLH Pinterest account (DavidMiller615), US proxy

**How to apply:** Auto-poster is running. If token expires, use demo app to refresh. All new pin work uses `https://api.pinterest.com/v5/` (production, not sandbox).
