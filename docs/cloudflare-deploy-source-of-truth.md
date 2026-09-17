# Cloudflare Pages deploy source of truth

## What deploys production

Production is deployed by GitHub Actions **Wrangler Direct Upload**:

- Workflow: `.github/workflows/deploy-cloudflare-pages.yml`
- Command: `wrangler pages deploy dist --project-name=daily-life-hacks`

The Pages GitHub repo connection may remain for project identity. Automatic Git deployments must stay **disabled**. That Git path is a second, conflicting builder; it is not how this site goes live.

Staging uses the same workflow. A push to `staging` is a Direct Upload Pages preview (`--branch=staging`), not a Cloudflare Git auto-deploy.

## Why Git auto-deploy stays off

When Pages Git auto-deploy is on, the Cloudflare GitHub App posts a check run named **Cloudflare Pages**. That check is not the production deploy.

Example on `main` tip `e322346` (2026-09-17):

- GHA `Deploy Cloudflare Pages` succeeded (Direct Upload).
- Live site was healthy: homepage 200, research pages 200, WP leftovers 410 + `X-Robots-Tag: noindex,follow`, `/deploy-proof/` matched `e322346`.
- IndexNow submit succeeded (run `35189710945`).
- The Cloudflare Pages check still failed instantly (0s) at 2026-09-17T06:43:25Z for dashboard deployment `dc236682-1833-4e43-a754-176648373a73`.

That red check is a Git-integration false negative, not a site-breaking GHA build failure.

The deploy workflow PATCHes the Pages project on every main/staging (and scheduled) run so `source.config.deployments_enabled` stays `false`. It also sets `production_deployments_enabled` to `false` when the API returns that field. Direct Upload is unchanged.

## How to judge live health

Trust, in this order:

1. The **deploy** job in `Deploy Cloudflare Pages` is green for the target branch (`main` for production).
2. `https://www.daily-life-hacks.com/deploy-proof/` reports the expected commit SHA.
3. Optional route spot-checks.

Do **not** treat the Cloudflare Pages GitHub check run (app `cloudflare-workers-and-pages`) as production health.

## Operator notes

- Do not re-enable Pages → Builds & deployments → automatic Git deployments.
- Do not replace Wrangler Direct Upload with the Git integration UI.
- `CLOUDFLARE_API_TOKEN` needs Cloudflare Pages Edit. The workflow no-ops if auto-deploy is already off.
