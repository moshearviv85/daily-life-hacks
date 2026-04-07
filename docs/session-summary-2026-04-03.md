# Session Summary — 2026-04-03
# Pinterest API Approval + OAuth Demo App

---

## תוצאה סופית

**Pinterest Standard Access — אושר בסוף הסשן.**

---

## רקע

המטרה הייתה לקבל אישור Pinterest Standard Access API כדי להחליף את Publer באוטומציה עצמית. הגשה קודמת נדחתה כי לא הציגה OAuth consent screen בוידאו.

---

## מה ביקש המשתמש

1. לתכנן אפליקציה מינימלית שעומדת בקריטריונים של Pinterest לאישור API
2. שהאפליקציה תעבוד דרך AdsPower (profile 77, US proxy, חשבון DavidMiller615)
3. לצלם וידאו שמציג: OAuth consent → בחירת פין → העלאה דרך API
4. ללא n8n שכל הזמן נתקע

---

## מה נבנה

### אפליקציה — Cloudflare Pages Functions

6 קבצים ב-`functions/api/`:

| קובץ | תפקיד |
|------|--------|
| `pinterest-demo.js` | דף ראשי: access gate, OAuth status, dropdown, publish form |
| `pinterest-demo-connect.js` | redirect ל-Pinterest OAuth consent |
| `pinterest-demo-callback.js` | מקבל code מ-Pinterest, מחליף ל-token, שומר ב-cookie |
| `pinterest-demo-publish.js` | POST /v5/pins לסנדבוקס + auto-create board |
| `pinterest-demo-lib.js` | לוגיקה משותפת: OAuth URL, HMAC cookies, pin catalog |
| `pinterest-demo-test.js` | self-test checklist page |

### טסטים
- `tests/pinterest-demo.test.mjs` — 65 unit tests, 65/65 עוברים
- `node tests/pinterest-demo.test.mjs`

### תמונות שהועלו לgit
```
public/images/pins/
  no-bake-high-fiber-energy-balls-recipe_v1.jpg
  crispy-roasted-chickpeas-high-fiber-snack_v1.jpg
  high-fiber-avocado-toast-variations_v1.jpg
  gut-friendly-high-fiber-smoothies-for-daily-wellness_v1.jpg
  high-fiber-meal-prep-ideas-for-busy-weeks-2026_v1.jpg
```

---

## קטלוג הפינים הנוכחי (5 פינים)

| key | כותרת | URL |
|-----|-------|-----|
| `energy_balls_v1` | No-Bake High Fiber Energy Balls | /no-bake-high-fiber-energy-balls-recipe |
| `chickpeas_v1` | Crispy Roasted Chickpeas | /crispy-roasted-chickpeas-high-fiber-snack |
| `avocado_toast_v1` | High Fiber Avocado Toast Variations | /high-fiber-avocado-toast-variations |
| `smoothies_v1` | Gut-Friendly High Fiber Smoothies | /gut-friendly-high-fiber-smoothies-for-daily-wellness |
| `meal_prep_v1` | High Fiber Meal Prep Ideas | /high-fiber-meal-prep-ideas-for-busy-weeks-2026 |

---

## Environment Variables (Cloudflare Pages — כבר מוגדר)

| שם | ערך |
|----|-----|
| `PINTEREST_APP_ID` | `1554902` |
| `PINTEREST_APP_SECRET` | (secret) |
| `PINTEREST_DEMO_COOKIE_SECRET` | (secret) |
| `PINTEREST_DEMO_ACCESS_KEY` | `testkey123` |

---

## Pinterest App Settings

- **App ID:** `1554902`
- **Redirect URI:** `https://www.daily-life-hacks.com/api/pinterest-demo-callback`
- **Scopes:** `user_accounts:read boards:read boards:write pins:read pins:write`
- **Access level:** Standard ✓ (אושר 2026-04-03)

---

## AdsPower

- **API:** `http://local.adspower.net:50325`
- **API Key:** `9e8265a2a91e8b30658908cef8d51ce30079525b1c553f0b`
- **Profile 77:** DLH Pinterest (DavidMiller615), US proxy, fingerprint

---

## Flow הדמו (לתיעוד)

```
1. https://www.daily-life-hacks.com/api/pinterest-demo
2. סיסמה: testkey123
3. לחץ "Connect Pinterest OAuth"
4. Pinterest consent screen → לחץ "Allow access"
5. חזרה לדף: "OAuth OK. User: DavidMiller615"
6. בחר פין מ-dropdown
7. לחץ "Publish selected Pin"
8. מחזיר: Pin ID + Board ID מ-sandbox
```

---

## בעיות שנפתרו (לא לחזור עליהן)

| בעיה | פתרון |
|------|--------|
| דפדפן מציג HTML גולמי | הוספת `Content-Type: text/html` לכל response |
| `/api/*` לא מגיע לFunctions | `_routes.json`: שינוי מ-exclude ל-include לנתיב `/api/*` |
| Token exchange 404 | Pinterest v5: `/v5/oauth/token` לא `/oauth/token` |
| Pin creation 403 "Trial access" | Trial חייב sandbox API (`api-sandbox.pinterest.com`) |
| Sandbox ריק — אין boards | auto-create board בסנדבוקס לפני הפין |
| תמונות מחזירות text/html | תמונות לא היו ב-git — הועלו |
| `_routes.json` כפול | תוכן כפול בקובץ — נוקה |
| wrangler pages dev לא מעביר env vars | `context.env` לא עובד locally — נכתבו unit tests ישירים במקום |

---

## Git Commits (הסשן הזה)

```
bcf7446 Update pin catalog to 5 fresh pins for demo recording
0b2c875 Add autonomy instruction to CLAUDE.md + Pinterest demo handoff doc
c7c14c0 Show half-star average rating and numeric X.X / 5.
fed0c66 Add pin images for Pinterest demo catalog
edcee43 Auto-create sandbox board if none exists before publishing pin
1790fa3 Add disconnect link to clear OAuth token cookie and reconnect
cacc637 Fix: use sandbox API for Trial access
0d13123 Fix: Pinterest token endpoint must be /v5/oauth/token
dd36172 Debug: show actual Pinterest error on token exchange failure
b6ddfd5 Fix: add Content-Type text/html to all Pinterest demo responses
05514e0 Add Pinterest OAuth demo app with unit tests
```

---

## מה הבא (לסשן הבא)

### עדיפות ראשונה — אוטומציה
**לבנות `scripts/post-pins.py`** שמחליף את Publer לגמרי:
- קורא מ-`pipeline-data/pins.json`
- מעלה פינים דרך Pinterest API production (`api.pinterest.com/v5/pins`)
- OAuth token דרך AdsPower session או stored token
- מסמן uploaded ב-pins.json

### עדיפות שנייה — וידאו פינים
- העלאת קבצי וידאו מ-`kinetic-video-bundle/` כ-Pinterest video pins
- Media upload endpoint: `POST /v5/media` ואז `POST /v5/pins` עם `media_id`

### עדיפות שלישית — רב חשבונות
- הוספת profiles נוספים ב-AdsPower
- כל profile = חשבון Pinterest נפרד עם OAuth token נפרד

---

## פקודות שימושיות

```bash
# Unit tests
node tests/pinterest-demo.test.mjs

# Build
npm run build

# Self-test page
https://www.daily-life-hacks.com/api/pinterest-demo-test

# Demo page
https://www.daily-life-hacks.com/api/pinterest-demo
# סיסמה: testkey123

# Trigger Cloudflare redeploy (אחרי שינוי env var)
curl -X POST "https://api.cloudflare.com/client/v4/accounts/91c501fca325c556efd161e4f904d443/pages/projects/daily-life-hacks/deployments" \
  -H "Authorization: Bearer RKs5LtHcsxPFDPLqQNxUAfGSGFjbpiwdQsjA3Avh"
```

---

## CLAUDE.md — Autonomy Rule (הוסף בסשן זה)

```
## Autonomy
Run tasks end-to-end without stopping for confirmation. Only pause if:
- Destructive action (delete files, drop DB, force push to main)
- External action visible to others (send email, publish to social media)
- Genuinely blocked and need information only the user has
```
