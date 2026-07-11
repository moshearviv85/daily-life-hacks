# CP4 — Workflows Unification Closure

**Date:** 2026-07-11  
**Status:** DONE  
**Tag:** `cp4-workflows-closed` (after push)

## Verdict

CP4 is closed. Publish path, CI, single deploy, and secrets hygiene are enforced. Remaining work is Growth (CP5), not workflow plumbing.

## Active workflows (14)

| Workflow | Trigger | Role |
|----------|---------|------|
| `ci.yml` | PR → main/staging | `build:checked` + routing + pipeline contract tests |
| `deploy-cloudflare-pages.yml` | push main/staging + daily 06:15 + manual | **Only** Cloudflare Pages publisher |
| `pipeline-discover.yml` | Mon 06:00 + manual | Topics → staging D1 |
| `pipeline-produce.yml` | manual (+ dry_run) | Full staging package + pin registry assert |
| `pipeline-article-assets.yml` | manual | Images/pins continue |
| `promote-staging.yml` | manual `PROMOTE` | Merge staging→main; waits for deploy |
| `post-pins.yml` | every 30m + manual | Post ≤1 production pin |
| `fetch-analytics.yml` | every 6h + manual | Pinterest analytics → D1 |
| `queue-pipeline-pins.yml` | manual | Approve pipeline pins → queue |
| `pins-upload-csv.yml` | manual | CSV → queue (`x-api-key` header) |
| `pins-reschedule.yml` | manual | Reschedule PENDING (`x-api-key` header) |
| `fetch-all-pins.yml` | manual | Audit artifact |
| `pinterest-boards.yml` | manual | List/create boards |
| `update-price-index.yml` | monthly 20th + manual | BLS price watch PR |

## Archived (not executed)

| File | Why |
|------|-----|
| `archive/github-workflows/pipeline-daily.yml` | Duplicate of produce (CP3.1) |
| `archive/github-workflows/publish-articles.yml` | Legacy `articles_schedule` retired (CP3.5) |

## CP4 checklist (from plan)

| Item | Status |
|------|--------|
| Single publish path: produce → review → promote | ✅ |
| Archive `publish-articles.yml` | ✅ (CP3.5) |
| Archive/unify `pipeline-daily.yml` | ✅ (CP3.1) |
| Single deploy (no promote/produce wrangler) | ✅ |
| Produce: sync pins + assert + `build:checked` + dry_run | ✅ |
| CI on PR | ✅ `ci.yml` |
| Pins upload/reschedule header auth | ✅ (CP3.4) |
| Concurrency: promote not cancelled by deploy | ✅ promote `cancel-in-progress: false`; deploy **branch-scoped** (CP4 final) |
| `publishAt` via daily rebuild 06:15 | ✅ documented |
| Retired workflow health does not 404 GH API | ✅ (CP4 final) |

## Publish path (canonical)

```text
Discover → approve topics (staging D1)
  → Produce (staging git + CF staging via push deploy)
  → Human review on dashboard
  → Promote (merge → main → deploy-cloudflare-pages)
  → Optional: queue pins → post-pins schedule
```

## Safeguards summary

- Fail-closed: `npm run build:checked` in CI, produce, assets, promote-precheck, deploy
- Pin destinations: `assert_pin_destinations.py` after sync on produce
- Auth: dashboard client uses `x-api-key` (DashApi); query `?key=` still accepted server-side for legacy scripts
- Rollback: annotated tags `cp2-*` … `cp4-*` + `docs/pipeline-rollback.md`

## Out of scope for CP4 (→ CP5)

- Pinterest quality / video / Idea Pins
- Content clusters, pillars, lead magnets
- Analytics experimentation loops
- Further dashboard JS domain splits (`pipeline.js` / `pins.js`)
