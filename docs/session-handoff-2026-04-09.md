# Session Handoff — 2026-04-09

## מה הושלם בסשן הזה

---

### 1. Pinterest Auto-Poster — מערכת מלאה

**ארכיטקטורה:**
- פינים מאוחסנים ב-D1 (טבלת `pins_schedule`) — לא ב-CSV בגיט
- GitHub Actions מפרסם פין אחד כל 3 שעות = 8 פינים ביום
- Refresh token מתעדכן אוטומטית בכל ריצה דרך `GH_PAT`

**קבצים שנוצרו:**
- `scripts/post-pins.py` — קורא מ-API, מפרסם ל-Pinterest v5, מסמן POSTED
- `.github/workflows/post-pins.yml` — cron `0 */3 * * *` + workflow_dispatch
- `functions/api/pins-next.js` — מחזיר פין PENDING הבא ל-GitHub Actions
- `functions/api/pins-mark-posted.js` — מסמן POSTED אחרי פרסום
- `functions/api/pins-upload.js` — מקבל CSV → D1, מפעיל workflow אוטומטית
- `functions/api/pins-status.js` — סטטיסטיקות לדשבורד
- `functions/api/pinterest-demo-token.js` — מציג refresh_token (גישה: `?key=testkey123`)

**GitHub Secrets (כבר מוגדרים):**
| Secret | ערך |
|--------|-----|
| `PINTEREST_APP_ID` | `1554902` |
| `PINTEREST_APP_SECRET` | מ-Pinterest developer portal |
| `PINTEREST_REFRESH_TOKEN` | מתעדכן אוטומטית |
| `PINS_API_KEY` | = ערך STATS_KEY |
| `GH_PAT` | Fine-grained PAT עם Secrets: read/write |
| `STATS_KEY` | סיסמת הדשבורד |

**Cloudflare Environment Variables (צריך לוודא):**
| Variable | ערך |
|----------|-----|
| `STATS_KEY` | סיסמת הדשבורד |
| `GH_PAT` | **עדיין חסר** — צריך להוסיף (אותו ערך כמו GitHub Secret) |

**D1 — טבלה שנוצרה ידנית:**
```sql
CREATE TABLE IF NOT EXISTS pins_schedule (
  row_id TEXT PRIMARY KEY,
  pin_title TEXT NOT NULL,
  pin_description TEXT,
  alt_text TEXT,
  image_url TEXT,
  board_id TEXT,
  link TEXT,
  scheduled_date TEXT,
  status TEXT DEFAULT 'PENDING',
  pin_id TEXT,
  published_date TEXT,
  pinterest_response TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
```

**זרימת עבודה:**
1. Agent 6 מייצר `pipeline-data/pinterest-api-queue.csv`
2. משתמש מעלה CSV דרך דשבורד → Pinterest Auto-Poster → Upload
3. Cloudflare שומר ב-D1 ומפעיל GitHub Actions מיידית
4. GitHub Actions מפרסם פין ראשון → חוזר כל 3 שעות

---

### 2. תיקוני OAuth — Production API

**הבעיה שתוקנה:**
- הדמו-אפליקציה שימשה sandbox API לחילוף טוקן (נשאר מתקופת Trial)
- `functions/api/pinterest-demo-lib.js` — שורות 218-227 שונו לפרודקשן בלבד
- Refresh function — שורה 251 שונתה לפרודקשן בלבד

---

### 3. דשבורד — כרטיס Pinterest Auto-Poster

**מה מציג:**
- Total / Posted / Pending (real-time מ-D1)
- Upload CSV (drag & drop + כפתור)
- Upcoming — 10 הפינים הבאים
- Recently Posted — 5 אחרונים
- כפתור "Get Token" → `/api/pinterest-demo-token?key=testkey123`

**הפעלה:** `loadPinsStatus()` נקראת בעת טעינת הדשבורד

---

### 4. פרסום כתבות — Pipeline

**סדר הסוכנים:**
1. Agent 1 — Topics
2. Agent 2 — Writer
3. Agent 3 — Punisher (QA)
4. Agent 4 — Metadata + Pinterest copy
5. Agent 5 — Images
6. **Agent 6 — Publisher** (מעביר drafts → `src/data/articles/`, מייצר CSV)
7. **Agent 7 — Finisher** (KV upload, git sweep, push → Cloudflare deploy)

**Agent 6 — שינויים חשובים:**
- מזהה אוטומטית כתבות מוכנות (main image + 4 פינים + Pinterest copy)
- CSV format נכון: `row_id, pin_title, pin_description, alt_text, image_url, board_id, link, scheduled_date, status`
- `board_id` = מספר (לא שם)
- `pins-upload.js` מנרמל גם פורמט ישן של Agent 6

**Agent 7 — שינויים חשובים:**
- KV Upload protocol: `npx wrangler kv bulk put pipeline-data/kv-upload.json --namespace-id 4f1df6fadd5a459e8ffcd52dc64ecf2d`
- Git sweep: `git add .cursor/skills/ pipeline-data/ src/data/articles/ public/images/ scripts/ docs/`

**Cloudflare KV (PINTEREST_ROUTES):**
- Namespace ID: `4f1df6fadd5a459e8ffcd52dc64ecf2d`
- 215 entries כרגע
- כל כתבה חדשה: v1-v5 → `{slug}-v{n}` → `{"type":"internal","base_slug":"{slug}"}`

---

### 5. Layout כתבות — שינויים

**סדר נוכחי:**
1. תמונה ראשית (למעלה, לפני הכותרת)
2. כותרת + excerpt + תאריך
3. Rating widget
4. Recipe card (אם מתכון — עם רכיבים + שלבים)
5. תוכן הכתבה
6. תמונת ingredients אחרי 1/3 התוכן (JavaScript injection, רק אם `public/images/{slug}-ingredients.jpg` קיים)
7. Tags + FAQ + Disclaimer

**הערה:** תמונות ingredients מ-`public/images/draft/` אינן לשימוש — draft בלבד.

---

### 6. Pinterest Boards — IDs

| Board | ID |
|-------|----|
| High Fiber Dinner and Gut Health Recipes | `1124140825679184032` |
| Healthy Breakfast, Smoothies and Snacks | `1124140825679184036` |
| Gut Health Tips and Nutrition Charts | `1124140825679184034` |

---

### 7. משימות פתוחות

1. **GH_PAT ב-Cloudflare** — צריך להוסיף כ-Environment Variable (ליצור PAT חדש ב-`https://github.com/settings/tokens?type=beta`)
2. **Agent 4** — Pinterest copy חסר ל-4 כתבות: `beans-and-rice-complete-protein-meal`, `high-fiber-burrito-bowl-meal-prep`, `high-fiber-gluten-free-bread-recipe`, `lentil-curry-high-fiber-vegan-dinner`
3. **Agent 2** — 2 drafts חסרים: `creamy-mushroom-barley-risotto-hands-off`, `selenium-containing-foods-easy-ways`
4. **pins-schedule.csv** — ישן (גיט-based), הוחלף ב-D1. ניתן למחוק מהריפו
5. **העלאת CSV לדשבורד** — `pipeline-data/pinterest-publish-queue.csv` מוכן להעלאה

---

### 8. URLs חשובים

| URL | תיאור |
|-----|--------|
| `https://www.daily-life-hacks.com/dashboard` | דשבורד (סיסמת STATS_KEY) |
| `https://www.daily-life-hacks.com/api/pinterest-demo-token?key=testkey123` | Token extractor |
| `https://www.daily-life-hacks.com/api/pinterest-demo` | OAuth demo app |
| `https://github.com/moshearviv85/daily-life-hacks/actions/workflows/post-pins.yml` | GitHub Actions — הפעלה ידנית |

---

### 9. Last Commit

`cbb1c62` — feat: 8 pins/day (cron every 3h) + auto-trigger workflow on CSV upload
