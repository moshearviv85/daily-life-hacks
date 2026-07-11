# דוח סקירת ארכיטקטורה — daily-life-hacks.com

**תאריך:** 11 ביולי 2026  
**סוג:** Full-stack · Technical SEO · DevOps (read-only)  
**אתר:** https://www.daily-life-hacks.com  
**סטאק:** Astro 5 + Tailwind CSS v4 · Cloudflare Pages · GitHub Actions · D1 + KV  

---

## 1. סקירה כללית של הארכיטקטורה

### 1.1 זהות המערכת

| רכיב | פירוט |
|------|--------|
| Frontend | Astro 5 SSG, Tailwind v4 |
| Hosting | Cloudflare Pages (`dist/`) |
| Serverless | Cloudflare Pages Functions (`functions/`) |
| DB | D1 — prod: `dlh-subscriptions` · staging: `dlh-subscriptions-staging` |
| KV | `ROUTES_KV` — Smart Router לפינים / legacy |
| תוכן | `src/data/articles/*.md` — **186 כתבות** |
| ענפים | `staging` = ביקורת AI · `main` = פרודקשן |

### 1.2 מבנה קבצים מרכזי

```
src/
  content.config.ts          # schema לכתבות
  content/release.ts         # isReleased / publishAt
  data/articles/*.md         # מקור האמת של תוכן
  pages/
    [slug].astro             # כתבות + aliases
    nutrition|recipes|tips/  # קטגוריות
    tag/[tag].astro          # תגיות (noindex)
    dashboard.astro          # דשבורד תפעולי
    tools/                   # כלים
  layouts/BaseLayout.astro   # meta, canonical, GA, Clarity
  components/                # UI משותף

functions/
  [[path]].js                # catch-all: redirects, KV proxy, logging
  api/*                      # ~47 endpoints (dashboard, pins, pipeline, kit…)

scripts/NEW_PIPELINE_2026-05-08/   # פייפליין תוכן AI
pipeline-data/                     # aliases, router-mapping, CSVs, reports
.github/workflows/                 # 15 workflows
```

### 1.3 זרימה לוגית (גבוה)

```
Discover topics (D1 staging)
  → Approve בדשבורד
  → Produce (OpenRouter + FAL) → Git staging + CF staging
  → ביקורת אנושית
  → promote-staging → main + CF production
  → Pins: CSV → D1 queue → post-pins (כל 30 דק')
```

**מקור האמת של תוכן חי:** Git על `main` (לא D1).  
**D1:** תורים, אנליטיקס, pipeline metadata, מנויים.

---

## 2. מצב ה-SEO הנוכחי

### 2.1 מה מוגדר נכון

| נושא | מצב |
|------|------|
| Canonical domain | `https://www.daily-life-hacks.com` |
| trailingSlash | `always` |
| Canonical לכתבה | תמיד ל-`/{article.id}/` |
| Alias / pin variants | `noindex, follow` + canonical לקנוני |
| Sitemap | מסנן aliases, tags, utility, כתבות עתידיות |
| robots.txt | Allow + Sitemap |
| Tag / legal / dashboard | noindex |
| Apex → www | 301 ב-`functions/[[path]].js` |
| Legacy URLs | 301 / 410 |
| Schema | Article / Recipe + Breadcrumb + FAQ |
| AggregateRating | רק מ-5 דירוגים ומעלה |

### 2.2 מודל Duplicate URLs (פינים)

כל כתבה יכולה להופיע במספר URLs. שלוש שכבות חופפות:

| שכבה | קובץ / מנגנון | תפקיד |
|------|----------------|--------|
| 1. Static aliases | `pipeline-data/slug-aliases.json` (~**525**) | דפי HTML סטטיים ב-`[slug].astro` |
| 2. Router mapping | `pipeline-data/router-mapping.json` (**85** כתבות × עד 4 = ~**340** variants) | metadata לקישורי Pinterest |
| 3. Runtime proxy | `ROUTES_KV` + fallback `-vN` | proxy לכתבה הקנונית + `X-Robots-Tag: noindex` |

**כיסוי נוכחי:** כל ה-variant slugs מ-router-mapping קיימים גם ב-aliases (0 חסרים בזמן הסקירה).  
**סיכון:** ה-produce **לא מעדכן אוטומטית** את השכבות — drift עתידי הוא הסיכון העיקרי.

### 2.3 מדיניות אינדוקס לפי סוג URL

| סוג URL | אינדוקס | Canonical |
|---------|---------|-----------|
| כתבה קנונית `/{slug}/` | index (אם released) | עצמי |
| Alias / pin keyword | noindex, follow | → כתבה קנונית |
| KV / `-vN` proxy | noindex (header + meta rewrite) | תוכן קנוני ב-proxy |
| `/tag/*` | noindex + מחוץ ל-sitemap | עצמי |
| contact / legal / dashboard | noindex / מחוץ ל-sitemap | עצמי |
| כתבה עם `publishAt` עתידי | noindex עד שחרור + rebuild | עצמי |

### 2.4 נקודות SEO חלשות

1. **525 דפי HTML זהים** (soft duplicates) — תלויים בכבוד ל-noindex.
2. **KV proxy מול static alias** לאותו slug — התנהגות שונה אפשרית.
3. **Breadcrumb schema** לקטגוריה בלי trailing slash (`/recipes` במקום `/recipes/`).
4. **`og:type: article`** גם בדפים שאינם כתבה.
5. **סיסמת preview ב-JS** — חשיפת תוכן מתוזמן (גם SEO leak).

---

## 3. GitHub Actions — רשימה מלאה

### 3.1 מלאי workflows (15)

| # | Workflow | טריגר | מה עושה |
|---|----------|--------|---------|
| 1 | `deploy-cloudflare-pages` | push `main`/`staging` + יומי 06:15 UTC | Build + deploy ל-CF Pages |
| 2 | `promote-staging` | ידני (`confirm=PROMOTE`) | Merge staging→main, deploy prod, sync D1 |
| 3 | `publish-articles` | יומי 07:00 UTC | פרסום כתבות due (נתיב legacy) |
| 4 | `pipeline-discover` | שני 06:00 UTC | GSC / Autocomplete / LLM → topics ב-D1 |
| 5 | `pipeline-produce` | ידני | ייצור מלא ל-staging (OpenRouter + FAL) |
| 6 | `pipeline-daily` | ידני בלבד (schedule כבוי) | כמעט כפילות של produce |
| 7 | `pipeline-article-assets` | ידני | השלמת hero / pins לכתבה מאושרת |
| 8 | `post-pins` | כל 30 דק' | פרסום פין אחד מהתור |
| 9 | `fetch-analytics` | כל 6 שעות | אנליטיקס Pinterest → D1 |
| 10 | `pins-upload-csv` | ידני | העלאת CSV לתור D1 |
| 11 | `pins-reschedule` | ידני | פיזור מחדש של PENDING |
| 12 | `queue-pipeline-pins` | ידני | אישור pins מהפייפליין לתור |
| 13 | `fetch-all-pins` | ידני | אודיט כל הפינים (artifact) |
| 14 | `pinterest-boards` | ידני | list / create boards |
| 15 | `update-price-index` | חודשי (20 לחודש) | BLS → דוח + PR |

### 3.2 ציר זמן יומי (SEO / Publishing)

```
06:00 UTC Mon  → pipeline-discover
06:15 UTC daily → deploy-cloudflare-pages (sitemap / publishAt)
07:00 UTC daily → publish-articles
*/30 min       → post-pins
*/6h           → fetch-analytics
```

### 3.3 Secrets עיקריים

| Secret / Var | שימוש |
|--------------|--------|
| `CLOUDFLARE_API_TOKEN` | Deploy |
| `DASHBOARD_PASSWORD` | Pipeline sync / dashboard APIs |
| `STATS_KEY` | Pins / publish APIs |
| `OPENROUTER_API_KEY` | כתיבת כתבות / briefs |
| `FAL_KEY` | תמונות |
| `PINTEREST_APP_ID/SECRET/REFRESH_TOKEN` | פוסטים ואנליטיקס |
| `GH_PAT` | Commits / workflow dispatch |
| `GSC_SERVICE_ACCOUNT_JSON` | Discover (אופציונלי) |
| `BLS_API_KEY` | Price index (אופציונלי) |

### 3.4 חפיפות וסתירות

- **Deploy כפול:** `promote-staging` מפרסם ל-prod וגם push ל-`main` מפעיל `deploy-cloudflare-pages` שוב (`cancel-in-progress` עלול לבטל deploy).
- **`pipeline-daily` ≈ `pipeline-produce`** — כפילות; ל-daily חסר `permissions: contents: write`.
- **שני נתיבי publish:** staging→promote מול `publish-articles.yml` / `articles_schedule`.
- **אין CI על PR** — רק deploy אחרי push.

---

## 4. Cloudflare Configuration

### 4.1 Pages / Wrangler

| הגדרה | ערך |
|--------|------|
| Project | `daily-life-hacks` |
| Output | `dist` |
| Compatibility | `2026-02-23` |
| Prod D1 | `dlh-subscriptions` |
| Staging D1 | `dlh-subscriptions-staging` |
| KV | `ROUTES_KV` (אותו namespace ב-prod ו-staging) |
| Binding כפול | `DB` + `D8` מצביעים לאותו D1 |

### 4.2 Catch-all (`functions/[[path]].js`)

1. דילוג על assets / API  
2. Legacy permanent redirects (301)  
3. Legacy gone paths (410)  
4. Apex `daily-life-hacks.com` → `www` (301)  
5. כפיית trailing slash (301)  
6. Lookup ב-`ROUTES_KV` → external 302 או internal proxy + noindex  
7. Fallback לתבנית `-v{n}`  
8. Logging ל-D1 (`pinterest_hits` / `funnel_events`)

### 4.3 Redirects סטטיים

`public/_redirects` — מינימלי בלבד:

- `/free-meal-plan` → `/` (301)
- `/meal-plan/*` → `/` (301)

### 4.4 Functions API (קבוצות)

| קבוצה | דוגמאות |
|--------|---------|
| Auth / Dashboard | `_dashboard-auth`, `dashboard`, `workflow-health` |
| Pipeline | `pipeline-status`, `pipeline-trigger`, `pipeline-topics`, `pipeline-sync`, `pipeline-pin-approve` |
| Articles (legacy) | `articles-list`, `articles-upload`, `articles-publish`, `articles-trigger` |
| Pins | `pins-status`, `pins-upload`, `pins-trigger`, `pins-reschedule`, `pins-clear` |
| Site | `subscribe`, `rating`, `event`, `stats`, `analytics` |
| Pinterest | analytics, trends, demo OAuth |

### 4.5 מה חסר / חלש ב-CF

- אין Cache-Control מותאם ל-HTML ב-router  
- אין Redirect Rules מרכזיות לפינים (מסתמכים על aliases / KV)  
- מפת env vars לא מתועדת במקום אחד בפרויקט

---

## 5. Content Creation & Pinterest Flow

### 5.1 פייפליין ייצור (May 2026)

| שלב | סקריפט | פלט |
|-----|--------|------|
| Write | `write.py` (OpenRouter) | מאמר ב-SQLite |
| Hero brief | `generate_hero_brief.py` | prompt + alt |
| Pin briefs ×4 | `generate_pin_briefs.py` | 4 pin rows |
| Hero image | `generate_images.py` (FAL) | `{slug}-main.jpg` |
| Pin images ×4 | `generate_pin_images.py` (FAL) | `public/images/pins/{pin_slug}.jpg` |
| Deploy to Git | `bulk_deploy_articles.py` | `src/data/articles/{slug}.md` |
| Support image | `generate_support_image.py` | `{slug}-ingredients.jpg` |
| Verify | `verify_pipeline_artifacts.py` | gate לפני commit |
| Sync D1 | `sync_pipeline_to_d1.py` | staging metadata |

### 5.2 מודלים (ברירת מחדל)

| תפקיד | ספק / מודל |
|--------|-------------|
| Writer / briefs | OpenRouter — `minimax/minimax-m2.5` |
| Hero image | FAL — `krea-2-large` (16:9) |
| Support image | FAL — `nano-banana-2` |
| Pins 1–4 | FAL — gpt-image / nano-banana / krea / seedream (2:3) |

### 5.3 Pinterest — מ-4 וריאנטים עד פוסט

```
generate_pin_briefs → generate_pin_images
  → (ידני) sync_router_mapping / slug-aliases
  → generate_pinterest_csv
  → pins-upload-csv → D1 pins_schedule
  → post-pins.yml (1 pin / 30 דק')
```

**פורמט חדש:** pin slug סמנטי (`{article}-{diff-words}`).  
**תיעוד ישן:** עדיין מדבר על `{slug}_v{1-4}` — drift בתיעוד.

### 5.4 פערים בזרימה

1. `sync_router_mapping.py` **לא רץ אוטומטית** ב-produce.  
2. `slug-aliases.json` / `ROUTES_KV` **לא מתעדכנים אוטומטית** אחרי produce.  
3. SQLite (`topic-research.sqlite`) אפhemeral ב-CI — חייב sync ל-D1 באותו job.  
4. Review LLM ב-produce **כבוי** (רק Layer A validator).  
5. העלאת pins ל-Pinterest עדיין ידנית אחרי generate.

---

## 6. Dashboard — מצב ומורכבות

### 6.1 עובדות

| מדד | ערך |
|-----|------|
| קובץ | `src/pages/dashboard.astro` |
| גודל | ~**4,850** שורות |
| מבנה | דף גלילה אחד — **בלי טאבים** |
| Client JS | ~3,400 שורות בקובץ |
| Auth | סיסמה ב-`sessionStorage` + `?key=` / `x-api-key` |

### 6.2 סקשנים עיקריים בדף

1. Top Stats  
2. Automation Health (GitHub workflows)  
3. Pipeline Control Center (discover / produce / promote)  
4. Content Tracker (legacy — ריק)  
5. Images Status  
6. Pinterest Boards / Analytics / Trends  
7. Pinterest Auto-Poster  
8. Article Publishing Pipeline (legacy CSV)  
9. Scheduled Articles  
10. Newsletter / Subscribers  
11. Agent Scan / Top Pages  

### 6.3 למה זה מסורבל

| בעיה | הסבר |
|------|------|
| God file | Page + CSS + state + rendering בקובץ אחד |
| 3 פייפליינים | AI staging · legacy articles · pins — על אותו דף |
| Incomplete migration | UI legacy נשאר; נתונים ריקים |
| Dead code | Clarity / traffic chart בלי DOM |
| Auth חלש | Password ב-query string בכל קריאה |
| God endpoint | `/api/dashboard` עושה D1 + Kit + CF GraphQL + Clarity |
| Staging↔Prod proxy | מבלבל לאיזו סביבה כותבים |

---

## 7. בעיות קריטיות שזיהיתי

| עדיפות | בעיה | השפעה |
|--------|------|--------|
| **P0** | שלוש שכבות routing לפינים בלי sync אוטומטי | 404 / מדיניות robots שגויה / duplicate |
| **P0** | סיסמת preview hardcoded ב-`[slug].astro` | חשיפת תוכן מתוזמן + SEO leak |
| **P1** | דשבורד מונוליתי + 3 flows | שגיאות תפעול, תחזוקה כבדה |
| **P1** | Deploy / publish כפולים | Race, cancel-in-progress, בלבול מקור אמת |
| **P1** | 525 soft-duplicate HTML pages | Crawl budget / סיכון אם noindex נשבר |
| **P2** | `STATS_KEY` ב-query string | Leak בלוגים |
| **P2** | אין CI על PR | באגים מגיעים ישר ל-deploy |
| **P2** | תיעוד לא מסונכרן (`_vN` vs semantic) | טעויות אנוש בפייפליין |

---

## 8. המלצות ראשוניות לשיפור (High Priority)

### H1 — מקור אמת יחיד ל-URLs של פינים
אחרי produce: עדכון אוטומטי של `slug-aliases.json` (+ אופציונלי `ROUTES_KV`) מתוך `router-mapping`.  
כשל ב-`verify-routing` אם יש drift.

### H2 — החלטה אסטרטגית על aliases
לבחור אחד:
- **A:** 301 מהיר לקנוני (פחות HTML כפול), או  
- **B:** להשאיר דפים סטטיים + defense-in-depth ב-CF Redirect/Rules + noindex.

### H3 — איחוד נתיב פרסום
רק `staging → promote`. לסמן/להסיר legacy `articles_schedule` + `pipeline-daily`.

### H4 — פירוק הדשבורד
טאבים: Overview · Pipeline · Pins · Analytics · Legacy.  
הסרת dead UI; auth ב-header/session במקום `?key=`.

### H5 — אבטחה מהירה
הסרת preview password מהקוד; סיבוב אם נחשף; איסור keys ב-URL; תיעוד env inventory.

### H6 — SEO טכני קטן
Trailing slash ב-breadcrumb; `og:type` לפי סוג עמוד.

### H7 — CI על PR
`npm run build:checked` בלי deploy.

---

## 9. מדדים מספריים (Snapshot)

| מדד | ערך |
|-----|------|
| כתבות קנוניות | 186 |
| Slug aliases | 525 |
| כתבות עם router-mapping | 85 |
| Pin variants ב-mapping | ~340 |
| Variants חסרים מ-aliases | 0 (בזמן הסקירה) |
| GitHub workflows | 15 |
| CF API functions | ~47 |
| שורות dashboard.astro | ~4,850 |

---

## 10. שאלות להחלטה לפני תכנון שיפורים

1. **נתיב פרסום רשמי:** רק `staging → promote`, או ש-`publish-articles.yml` עדיין פעיל?  
2. **ROUTES_KV:** נדרש לפינים חדשים, או מעבר ל-static aliases (+ 301)?  
3. **עדיפות לשלב הבא:** routing/SEO · פירוק דשבורד · איחוד workflows?

---

## נספח — קבצי מפתח

| נושא | נתיב |
|------|------|
| Config | `astro.config.mjs`, `wrangler.toml`, `package.json` |
| Routing / SEO | `src/pages/[slug].astro`, `src/layouts/BaseLayout.astro`, `functions/[[path]].js` |
| Aliases | `pipeline-data/slug-aliases.json`, `pipeline-data/router-mapping.json` |
| Pipeline | `scripts/NEW_PIPELINE_2026-05-08/run_pipeline.py` |
| Policy | `docs/content-production-control.md` |
| Schema D1 | `schema.sql` |
| Workflows | `.github/workflows/*.yml` |

---

*סוף הדוח · סקירה read-only · 2026-07-11*
