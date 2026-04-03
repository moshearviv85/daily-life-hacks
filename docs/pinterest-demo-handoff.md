# Pinterest OAuth Demo App — העברת שרביט מלאה

**תאריך:** 2026-04-03
**סטטוס:** כמעט מוכן — התמונות חיות, הפין עדיין לא אושר סופית

---

## מה בנינו

אפליקציה ב-Cloudflare Pages Functions שמדגימה ל-Pinterest:
1. OAuth consent flow מלא (המשתמש רואה ולוחץ Allow)
2. יצירת פין ידנית דרך `POST /v5/pins` — המשתמש בוחר פין מרשימה ולוחץ Publish

**ללא n8n, ללא localhost, ללא automation** — הכל דרך האתר האמיתי daily-life-hacks.com

---

## קבצים שנוצרו

```
functions/api/
  pinterest-demo.js          — דף ראשי: מחובר/לא מחובר, dropdown, publish
  pinterest-demo-connect.js  — redirect ל-Pinterest OAuth consent
  pinterest-demo-callback.js — מקבל code, מחליף ל-token, שומר ב-cookie
  pinterest-demo-publish.js  — POST /v5/pins לסנדבוקס
  pinterest-demo-lib.js      — פונקציות משותפות: OAuth, HMAC cookies, pin catalog
  pinterest-demo-test.js     — דף בדיקה עצמי (self-test checklist)

tests/
  pinterest-demo.test.mjs    — 47 unit tests (node tests/pinterest-demo.test.mjs)

public/
  _routes.json               — מוגדר: include /api/* (חובה לFunctions לעבוד)
  images/pins/
    best-high-fiber-fruits-for-weight-loss-list_v1.jpg
    high-fiber-quinoa-salad-for-lunch-prep_v1.jpg
```

---

## Environment Variables ב-Cloudflare Pages

כולם מוגדרים כבר (secret_text):

| שם | תפקיד |
|----|--------|
| `PINTEREST_APP_ID` | `1554902` |
| `PINTEREST_APP_SECRET` | הסוד של האפליקציה |
| `PINTEREST_DEMO_COOKIE_SECRET` | HMAC signing לcookies |
| `PINTEREST_DEMO_ACCESS_KEY` | `testkey123` — נועל את הדמו |

---

## Pinterest App Settings (Developer Portal)

- **App ID:** `1554902`
- **Redirect URI שנוסף:** `https://www.daily-life-hacks.com/api/pinterest-demo-callback`
- **Access level:** Trial (לא Standard עדיין — זאת מטרת הדמו)

---

## Flow מלא של הדמו

```
1. כנס ל: https://www.daily-life-hacks.com/api/pinterest-demo
2. הכנס סיסמה: testkey123
3. לחץ "Connect Pinterest OAuth"
   → redirect ל-www.pinterest.com/oauth/
   → Pinterest מציג consent screen
4. לחץ "Allow access"
   → Pinterest שולח code ל-/api/pinterest-demo-callback
   → callback מחליף code ל-token (דרך sandbox)
   → token נשמר ב-cookie מוצפן HMAC
   → redirect חזרה ל-/api/pinterest-demo
5. רואים: "OAuth OK (Production). User: DavidMiller615"
6. בוחרים פין מה-dropdown
7. לוחצים "Publish selected Pin"
   → POST /v5/pins לסנדבוקס (sandbox board נוצר אוטומטית אם אין)
   → מחזיר Pin ID
8. מסך הצלחה עם Pin ID ו-Board ID
```

---

## בעיות שנפתרו בדרך (לא לחזור עליהן)

| בעיה | פתרון |
|------|--------|
| דפדפן מציג HTML גולמי | הוספת `Content-Type: text/html` לכל response |
| `_routes.json` הוציא /api/* מהworker | שינוי מ-exclude ל-include |
| Token exchange 404 | Pinterest v5 דורש `/v5/oauth/token` לא `/oauth/token` |
| Pin creation 403 "Trial access" | Trial חייב להשתמש ב-sandbox API |
| Sandbox ריק — אין boards | יצירה אוטומטית של board בסנדבוקס |
| "Broken image" 403 | התמונות לא היו ב-git — הועלו |
| `_routes.json` כפול | תוכן כפול בקובץ — נוקה |

---

## מה עדיין צריך לעשות

### מיידי — לפני הקלטת הוידאו
- [ ] לחץ **Publish selected Pin** ווודא שמחזיר Pin ID (אמור לעבוד עכשיו)
- [ ] הרץ: `node tests/pinterest-demo.test.mjs` — חייב 47/47

### לוידאו — AdsPower Profile 77
1. פתח AdsPower → הפעל profile 77 (US proxy + DLH Pinterest cookies)
2. בדוק IP ב-ip2location.com — fraud score 0
3. הקלט את ה-flow המלא (steps 1-8 למעלה)
4. הוידאו: ~90 שניות, נרטיב אנגלית

### אחרי שמקבלים Standard Access
- להחליף sandbox ל-production ב-`pinterest-demo-publish.js`
- לבנות `scripts/post-pins.py` שמחליף את Publer

---

## פקודות שימושיות

```bash
# הרצת unit tests
node tests/pinterest-demo.test.mjs

# בדיקת self-test באתר
# https://www.daily-life-hacks.com/api/pinterest-demo-test

# Trigger redeploy ב-Cloudflare (אחרי שינוי env var)
npx wrangler pages deployment create --project-name=daily-life-hacks

# Build מקומי
npm run build
```

---

## Git — commits האחרונים

```
fed0c66 Add pin images for Pinterest demo catalog
edcee43 Auto-create sandbox board if none exists before publishing pin
1790fa3 Add disconnect link to clear OAuth token cookie and reconnect
cacc637 Fix: use sandbox API for Trial access — token exchange + pin creation via sandbox
0d13123 Fix: Pinterest token endpoint must be /v5/oauth/token not /oauth/token
b6ddfd5 Fix: add Content-Type text/html to all Pinterest demo responses
05514e0 Add Pinterest OAuth demo app with unit tests
```
