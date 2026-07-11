# CP3 — Pipeline Reliability & Dashboard Simplification

**Date:** 2026-07-11  
**Depends on:** CP2 Phase A+B (pushed to `main`)  
**Status:** CP3.1 pushed (`e8d2b88`). CP3.2 in progress (dry_run + pin assert + rollback doc).  

---

## 1. סטטוס workflows נוכחי (15)

| Workflow | Trigger | תפקיד | המלצה CP3 |
|----------|---------|--------|-----------|
| `deploy-cloudflare-pages` | push main/staging + daily 06:15 + manual | Build `build:checked` + deploy | **Keep** — single deploy path |
| `promote-staging` | manual `PROMOTE` | Merge staging→main + **own** wrangler deploy + D1 sync | **Keep logic, remove duplicate deploy** |
| `pipeline-produce` | manual | AI produce → staging | **Keep** — harden gates |
| `pipeline-article-assets` | manual | Continue images/pins | **Keep** |
| `pipeline-discover` | Mon 06:00 + manual | Topic discovery → D1 | **Keep** |
| `pipeline-daily` | manual only | Near-duplicate of produce | **Delete / archive** |
| `publish-articles` | daily 07:00 + dead test crons | Legacy D1 `articles_schedule` → main | **Disable schedule**; archive after confirm |
| `post-pins` | every 30m | Post 1 pin | **Keep** |
| `fetch-analytics` | every 6h | Pinterest analytics | **Keep** |
| `pins-upload-csv` | manual | CSV → D1 queue | **Keep** (fix `?key=` → header) |
| `pins-reschedule` | manual | Reschedule PENDING | **Keep** (fix key in URL) |
| `queue-pipeline-pins` | manual | Approve pipeline pins | **Keep** |
| `fetch-all-pins` | manual | Audit artifact | **Keep** |
| `pinterest-boards` | manual | List/create boards | **Keep** |
| `update-price-index` | monthly 20th | BLS report PR | **Keep** |
| *(missing)* `ci.yml` | PR | build:checked | **Add** |

### חפיפות קריטיות

```
promote-staging:
  merge → push main  → triggers deploy-cloudflare-pages
  AND also wrangler pages deploy     → DOUBLE DEPLOY
  concurrency cancel-in-progress on deploy may race promote

pipeline-daily ≡ pipeline-produce (same concurrency group)
publish-articles vs staging→promote = two publish philosophies
```

### Dashboard triggers (`pipeline-trigger.js`)

| Action | Workflow |
|--------|----------|
| discover | `pipeline-discover.yml` |
| produce | `pipeline-produce.yml` |
| publish (Legacy) | `publish-articles.yml` |
| promote | `promote-staging.yml` |
| approve assets | `pipeline-article-assets.yml` |

`pipeline-daily` **לא** נגיש מהדשבורד — רק ידני ב-Actions.

---

## 2. תוכנית איחוד מוצעת

### Target architecture

```
Discover (weekly)     → D1 topics
Produce (manual)      → staging git + CF staging (via push deploy)
Review (dashboard)    → human
Promote (manual)      → merge staging→main ONLY
Deploy (automatic)    → deploy-cloudflare-pages on push + daily rebuild
Pins (scheduled)      → post-pins / analytics
CI (new)              → build:checked on every PR
```

### Keep (core)

1. `deploy-cloudflare-pages.yml` — **only** Cloudflare publisher  
2. `promote-staging.yml` — merge + D1 sync + live verify; **no** wrangler deploy  
3. `pipeline-produce.yml` — hardened  
4. `pipeline-article-assets.yml`  
5. `pipeline-discover.yml`  
6. Pinterest set: `post-pins`, `fetch-analytics`, `pins-upload-csv`, `pins-reschedule`, `queue-pipeline-pins`, `fetch-all-pins`, `pinterest-boards`  
7. `update-price-index.yml`

### Remove / disable

| Workflow | Action |
|----------|--------|
| `pipeline-daily.yml` | Delete file; document in CHANGELOG |
| `publish-articles.yml` schedule | Remove cron (incl. dead April test crons); keep `workflow_dispatch` behind Legacy tab until D1 queue empty, then archive |
| Promote's wrangler deploy step | Remove; rely on push→`deploy-cloudflare-pages` |
| Produce's direct wrangler deploy | Optional remove; push to staging already triggers deploy |

### Add

| Workflow | Purpose |
|----------|---------|
| `ci.yml` | On PR to main/staging: `npm ci && npm run build:checked` |
| (optional) `workflow_dispatch` dry-run on produce | `inputs.dry_run` — sync+verify without commit/push |

---

## 3. שינויים ספציפיים ל-pipeline

### 3.1 Already done (CP2)

- `sync_pin_destinations.py --only-complete` in `pipeline-produce.yml`
- Same for `pipeline-article-assets.yml` (full mode)
- Artifacts committed: `pin-destinations.json`, flat map, derived aliases/mapping

### 3.2 Hardening (CP3 execution)

| Change | File | Detail |
|--------|------|--------|
| `build` → `build:checked` | `pipeline-produce.yml` | Fail closed on routing/pin verify |
| `build` → `build:checked` | `pipeline-article-assets.yml` | Same |
| Fail if sync writes 0 new pins for produced slugs | produce step | Assert flat map contains new pin slugs |
| `inputs.dry_run` | `pipeline-produce.yml` | Skip commit/push/deploy when true |
| Remove wrangler deploy from produce | `pipeline-produce.yml` | Let push→deploy handle it (or keep until staging deploy latency verified) |
| Remove wrangler from promote | `promote-staging.yml` | After push main, wait/poll deploy or document “deploy follows automatically” |
| Sync after promote | already have `sync_staging_pipeline_to_production.py` | Keep |
| Rollback doc | `docs/content-production-control.md` | Link revert procedure on staging |

### 3.3 Suggested produce order (final)

```text
1. select topics
2. run_pipeline.py
3. verify_pipeline_artifacts.py          # fail closed
4. sync_pin_destinations.py           # fail closed if DB missing when pins expected
5. npm ci && npm run build:checked    # includes verify-routing + pin-destinations
6. git commit + push staging
7. (optional) wait for CF staging deploy URL check
8. sync D1 pipeline metadata
```

### 3.4 publish-articles decision gate

Before deleting:

1. Check D1 `articles_schedule` for PENDING/due rows.  
2. If empty → disable cron immediately; remove dashboard “Legacy Publish”.  
3. If non-empty → drain via one manual run, then disable.  
4. `publishAt` release continues via **daily deploy** at 06:15 (no need for publish-articles for sitemap/index).

---

## 4. תכנית ראשונית — פירוק הדשבורד

### Current pain

- `dashboard.astro` ~4,850 LOC, no real tabs
- 3 pipelines visible: AI Pipeline · Legacy Articles · Pins
- Dead Clarity/traffic code
- Password in `?key=`
- God endpoint `/api/dashboard`

### Target IA (tabs)

| Tab | Contents | APIs |
|-----|----------|------|
| **Overview** | Stats, workflow health, top pages | `/api/dashboard` (slim) + `workflow-health` |
| **Pipeline** | Discover / Produce / Promote only | `pipeline-*` |
| **Pins** | Queue, upload, post-now, analytics | `pins-*`, pinterest analytics |
| **Content** | Scheduled publishAt list (read-only) | from build bundle / light API |
| **Legacy** | Article CSV publisher — hidden or deleted after drain | `articles-*` |

### Execution order (do not big-bang)

1. **CP3.D1** — Add tab shell in HTML; move existing sections into panes (no API change)  
2. **CP3.D2** — Hide Legacy Publish button from Pipeline; move to Legacy tab  
3. **CP3.D3** — Delete dead Clarity/traffic JS  
4. **CP3.D4** — Extract JS modules (`public/js/dashboard/*.js` or `src/scripts/dashboard/`)  
5. **CP3.D5** — Auth headers only (stop `?key=` in new client)  
6. **CP3.D6** — Split `/api/dashboard` (later)

### Files for dashboard phase

| Action | Path |
|--------|------|
| Edit | `src/pages/dashboard.astro` |
| Create | `src/components/dashboard/TabBar.astro` (or plain HTML tabs) |
| Create | `public/js/dashboard/pipeline.js`, `pins.js`, `overview.js` |
| Edit | `functions/api/pipeline-trigger.js` — remove/disable `publish` action when ready |
| Edit | `functions/api/_dashboard-auth.js` — document header-only |

---

## 5. צ'קפוינטים לביצוע CP3

### CP3.1 — Workflow unification (safe deletes + deploy dedupe)
- Delete `pipeline-daily.yml`
- Strip dead crons from `publish-articles.yml`; disable daily schedule pending D1 check
- Promote: remove wrangler deploy; keep merge + D1 sync + live verify
- Add `ci.yml`
- Update `pipeline-trigger` / dashboard copy

### CP3.2 — Produce hardening ✅
- `build:checked` in produce + article-assets (done in CP3.1)
- `inputs.dry_run` on produce — skip commit/push/deploy/mark-produced
- `assert_pin_destinations.py` after sync (registry + flat, ≥4 pin origins)
- Rollback runbook: `docs/pipeline-rollback.md`

### CP3.3 — Dashboard tabs (structure only)
- Tab shell + hide Legacy from primary Pipeline
- Remove dead code

### CP3.4 — Dashboard modules + auth headers
- Split JS; header auth

### CP3.5 — API slim + Legacy retirement
- Confirm `articles_schedule` empty; remove Legacy UI + archive `publish-articles.yml`

---

## 6. רשימת קבצים לשינוי (מלאה)

### Workflows
- `.github/workflows/pipeline-daily.yml` — delete
- `.github/workflows/publish-articles.yml` — strip crons / later archive
- `.github/workflows/promote-staging.yml` — remove duplicate deploy
- `.github/workflows/pipeline-produce.yml` — build:checked, dry_run, maybe drop wrangler
- `.github/workflows/pipeline-article-assets.yml` — build:checked
- `.github/workflows/ci.yml` — **create**
- `.github/workflows/pins-upload-csv.yml` / `pins-reschedule.yml` — header auth

### Pipeline scripts / API
- `scripts/NEW_PIPELINE_2026-05-08/sync_pin_destinations.py` — optional assert mode
- `functions/api/pipeline-trigger.js` — drop/gate legacy publish
- `docs/content-production-control.md` — rollback + dry_run

### Dashboard
- `src/pages/dashboard.astro`
- new `src/components/dashboard/*` or `public/js/dashboard/*`
- `functions/api/dashboard.js` (later split)

### Docs
- this file
- `docs/improvement-plan-continuous.md` status

---

## 7. Safeguards summary

| Safeguard | Where |
|-----------|--------|
| `verify-routing` + pin destinations | `build:checked` (required in produce/CI/deploy) |
| Sync pin registry before build | produce / article-assets |
| Explicit `PROMOTE` confirm | promote-staging |
| Dry-run produce | new input (CP3.2) |
| Rollback | revert commit on staging; do not force-push |
| CI on PR | new `ci.yml` |
| No dual deploy | promote/produce stop calling wrangler |

---

## 8. Immediate next step

Start **CP3.1** after user greenlight:
1. Confirm D1 `articles_schedule` usage (or assume Legacy idle)
2. Delete `pipeline-daily.yml`
3. Fix promote double-deploy
4. Add `ci.yml`
5. Switch produce to `build:checked`
