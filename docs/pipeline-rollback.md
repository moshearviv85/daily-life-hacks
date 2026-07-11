# Pipeline Rollback Runbook

**Updated:** 2026-07-11 (CP3.2 + tagged checkpoints)

Use this when a staging produce/assets batch is rejected or breaks build/deploy.

## Git rollback tags (pushed to origin)

These annotated tags mark known-good checkpoints on `main`:

| Tag | Commit | Meaning |
|-----|--------|---------|
| `cp2-canonical-routing` | `7dcd91a` | After CP2 Phase B (canonical-only routing) |
| `cp3.1-unify-workflows` | `e8d2b88` | After CP3.1 (workflow unification) |
| `cp3.2-produce-hardening` | `6ee175a` | After CP3.2 (dry-run + pin assert) |
| `cp3.3-dashboard-tabs` | `dfe0802` | After CP3.3 (dashboard tab shell) |
| `cp3.4-dashboard-auth` | `4e05849` | After CP3.4 (header auth + api/tabs modules) |

Restore code to a checkpoint (prefer revert over hard reset on shared `main`):

```bash
# Inspect
git fetch --tags
git log -1 cp3.1-unify-workflows

# Safe: reverse newer commits with a new commit
git revert --no-edit 6ee175a   # example: undo CP3.2 only

# Or create a recovery branch from a tag (does not rewrite main)
git checkout -b recover/from-cp3.1 cp3.1-unify-workflows
```

Also retained: `archive/github-workflows/pipeline-daily.yml` (inactive; restore with `git mv` if needed).

## Hard rules

- Prefer a **normal revert commit** on `staging` / `main`.
- Do **not** force-push unless the user explicitly approves.
- Do **not** mutate D1 topic state during cleanup without explicit approval.
- Do not run produce/promote/images/pins while cleanup is in progress.

## A. Identify the bad batch

```bash
git fetch origin staging
git log origin/staging --oneline -15
# Note the produce commit hash(es), e.g. "feat(pipeline): produce full staging artifacts..."
```

List files introduced by that commit:

```bash
git show --name-only --pretty=format: <commit>
```

Typical paths:
- `src/data/articles/{slug}.md`
- `public/images/{slug}-main.jpg`
- `public/images/{slug}-ingredients.jpg`
- `public/images/pins/*.jpg`
- `pipeline-data/pin-destinations.json` (+ derived aliases/mapping/flat)

## B. Revert on staging

```bash
git checkout staging
git pull origin staging
git revert --no-edit <commit>   # or multiple commits oldest→newest
npm run build:checked           # must pass after revert
git push origin staging
```

Wait for `deploy-cloudflare-pages` on `staging` to succeed.

## C. Pin destinations after revert

If the revert removed an article but left orphan destinations:

```bash
npm run sync:pin-destinations -- --derive-only
# or re-run migrate if registry is inconsistent, then:
npm run derive:pin-routing
npm run build:checked
```

Commit registry fixes on `staging` if needed.

## D. D1 topic state (only with approval)

After git is clean, optionally return topics to `approved` / `rejected` via dashboard or:

```bash
# Example only — requires DASHBOARD_PASSWORD and explicit user OK
curl -X POST "$STAGING_URL/api/pipeline-topics?action=approve" \
  -H "x-api-key: $DASHBOARD_PASSWORD" \
  -H "Content-Type: application/json" \
  -d '{"ids":[123],"reason":"reverted staging batch"}'
```

## E. Dry-run produce (no git push)

In GitHub Actions → **Pipeline Produce** → set:

- `dry_run=true`

This runs generation + `build:checked` + pin assert, then **skips** commit/push/deploy wait/mark-produced.

Note: early steps may still touch staging D1 topic queue (claim/queue). Prefer dry_run on a disposable approved topic or after confirming queue impact is acceptable.

## F. Success checks

- [ ] `origin/staging` no longer contains rejected article files
- [ ] `npm run build:checked` passes
- [ ] Staging site deploy green
- [ ] D1 topic state documented (changed or intentionally unchanged)
