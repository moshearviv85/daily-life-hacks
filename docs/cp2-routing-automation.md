# Checkpoint 2 — Pipeline & Routing Automation

**Status:** In progress (Phase A dual-run)  
**Date:** 2026-07-11  
**Depends on:** CP1 done (`docs/pin-routing-policy.md`, routing-audit baseline)

---

## 1. ניתוח מצב נוכחי (baseline)

מתוך `pipeline-data/reports/routing-audit-2026-07-11.json`:

| מדד | ערך | משמעות |
|-----|------|--------|
| Articles | 186 | כתבות קנוניות |
| Aliases | 525 | דפי HTML סטטיים (noindex) |
| Router bases | 85 | כתבות עם pin mapping |
| Router variants | 340 | יעדי פין מ-router-mapping |
| Variants missing from aliases | 0 | כיסוי טוב כרגע |
| Orphan aliases | **185** | ב-aliases אבל לא ב-router-mapping |
| Articles without router | **101** | אין 4 pin destinations רשמיים |
| Collisions / missing targets | 0 | בריא |

### Drift root cause

שלושה מקורות אמת שלא מסונכרנים אוטומטית אחרי produce:

1. `slug-aliases.json` — Astro static pages  
2. `router-mapping.json` — CSV / metadata (sync ידני מ-SQLite)  
3. `ROUTES_KV` — proxy runtime (העלאה ידנית היסטורית)

Produce **לא** מריץ `sync_router_mapping.py` → drift עתידי מובטח.

### Orphans (185)

רובם דפוסי legacy:
- `best-{canonical}`
- `{canonical}-guide` / `{canonical}-tips`
- keyword leftovers מפינים ישנים

כולם מצביעים לכתבה קיימת (0 missing targets) → בטוח להמיר ל-**301** בלי מחיקה.

---

## 2. פתרון היעד

### מקור אמת יחיד

`pipeline-data/pin-destinations.json`

```json
{
  "version": 1,
  "updatedAt": "ISO-8601",
  "articles": {
    "canonical-slug": {
      "canonical": "canonical-slug",
      "destinations": [
        {
          "id": "v1",
          "url_slug": "unique-pin-slug",
          "title": "Pin title",
          "origin": "pin",
          "created_at": "..."
        }
      ]
    }
  }
}
```

`origin` values:
- `pin` — מפייפליין / router-mapping
- `legacy_seo_variant` — best-/guide-/tips-
- `legacy_orphan` — alias ישן אחר

### Artifacts נגזרים (generated — לא לערוך ידנית)

| קובץ | תפקיד ב-Phase A |
|------|------------------|
| `slug-aliases.json` | Derived lookup only (NOT Astro pages as of Phase B) |
| `router-mapping.json` | Pin-origin metadata for CSV / compat |
| `public/data/pin-destinations-flat.json` | `{ url_slug: canonical }` for runtime 301 |

### Runtime (Phase B)

`functions/[[path]].js`:
1. Lookup in flat map from ASSETS  
2. If hit and slug ≠ canonical → **D1 log + 301** to canonical  
3. No static alias HTML in `dist/`

### Produce automation

אחרי `verify_pipeline_artifacts.py`:

```text
sync_pin_destinations.py --from-db --merge
  → מעדכן pin-destinations.json
  → כותב derived aliases + router-mapping + flat JSON
```

---

## 3. מדיניות ROUTES_KV (החלטה)

| שימוש | מדיניות |
|--------|---------|
| יעדי פין חדשים | **לא דרך KV** — רק Git registry + flat JSON |
| יעדי פין קיימים ב-KV | מיותרים אחרי ש-301 מ-Git עובד; לא לסנכרן מחדש |
| `type: external` (affiliate) | **נשאר ב-KV** — זה עדיין שימוש לגיטימי |
| `-vN` fallback | נשאר בקוד כ-301 לקנוני (לא proxy) |

**מסקנה:** ROUTES_KV **לא נדרש** ל-pin routing אחרי CP2. נשמר רק ל-external redirects מיוחדים.

אין למחוק את ה-namespace עכשיו — רק להפסיק bulk put של פינים.

---

## 4. Migration plan — 185 orphans

### שלב M1 — Import, אל תמחק ✅
- כל orphan נכנס ל-`pin-destinations` תחת ה-canonical שלו
- `origin: legacy_seo_variant` או `legacy_orphan`
- מקבלים 301 מ-runtime

### שלב M2 — Monitor אחרי Phase B ב-prod (7–14 יום)
1. Deploy עם Phase B (canonical HTML only + 301).
2. מדגם ידני: 20 destinations → `301` + `Location` לקנוני + canonical `200`.
3. D1: `SELECT versioned_slug, COUNT(*) FROM pinterest_hits WHERE route_type='pin_destination_301' GROUP BY 1 ORDER BY 2 DESC LIMIT 50`.
4. GSC: מעקב 404 / “Excluded by ‘noindex’” על aliases ישנים (צפוי לרדת).
5. Pinterest Analytics: לוודא שקליקים לפינים ישנים עדיין נספרים (pin id), לא נשברים.

### שלב M3 — Cleanup אופציונלי (רק אחרי M2 ירוק)
- אפשר להשאיר orphans ב-registry ל-301 לנצח (מומלץ כברירת מחדל).
- מחיקה מ-registry **רק** אם: 0 hits ב-D1 ל-90 יום **ואין** pin חי עם אותו link ב-Pinterest export.
- לעולם לא למחוק destination שעדיין מופיע ב-`pins_schedule` / CSV פעיל.

### לא עושים
- לא מוחקים orphans בלי 301 חי ב-prod  
- לא ממזגים 101 כתבות בלי 4 pins ב-CP2 (זה CP5)

---

## Phase B checklist (2026-07-11)

```text
✅ getStaticPaths = canonical only
✅ verify-routing forbids alias HTML in dist/
✅ flat map must ship in dist/data/
✅ docs/pin-routing-policy.md updated
⬜ staging deploy + smoke 301
⬜ prod deploy + M2 monitor window
```

---

## 5. סדר ביצוע מדויק (Phase A)

```text
1. migrate-pin-destinations.mjs  → pin-destinations.json ראשוני
2. derive-pin-routing.mjs         → aliases + mapping + flat (idempotent)
3. עדכון [[path]].js             → 301 מ-flat map לפני KV/ASSETS
4. sync_pin_destinations.py      → produce path
5. חיבור ל-pipeline-produce.yml
6. עדכון verify-routing / verify-pin-destinations / audit-routing
7. npm run audit:routing && npm run build:checked
8. בדיקת מדגם מקומי / staging אחרי deploy
```

### Phase B (אחרי אימות prod — צ'קפוינט המשך)

```text
9.  הסרת aliases מ-getStaticPaths
10. verify-routing בלי לדרוש dist/{alias}/
11. עדכון docs + סימון CP2 DONE
```

---

## 6. Validation

| בדיקה | קריטריון |
|--------|----------|
| `node scripts/migrate-pin-destinations.mjs --dry-run` | counts תואמים baseline |
| Flat map size | ≥ aliases (525+) destinations |
| Destination GET | `301` + `Location: /{canonical}/` |
| Canonical GET | `200` + indexable |
| Produce sync | כתבה חדשה מוסיפה 4 destinations אוטומטית |
| `build:checked` | עובר |
| External KV | עדיין עובד אם קיים |

---

## 7. סיכונים

| סיכון | פתרון |
|--------|--------|
| Flat JSON חסר ב-deploy | sync/migrate חייבים לכתוב ל-`public/data/` לפני build |
| Cold start fetch לכל request | cache ב-`globalThis` אחרי טעינה ראשונה |
| KV ו-Git חולקים | 301 מ-Git קודם ל-KV |
| שבירת pin analytics | לוג ל-`pinterest_hits` **לפני** 301 |
| Build עדיין כבד | מקובל ב-Phase A; Phase B מוריד aliases מ-Astro |
