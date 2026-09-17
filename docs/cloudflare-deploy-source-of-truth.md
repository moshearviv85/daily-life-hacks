# Cloudflare Pages deploy source of truth

## What deploys production

Production is deployed by GitHub Actions **Wrangler Direct Upload**:

- Workflow: `.github/workflows/deploy-cloudflare-pages.yml`
- Command: `wrangler pages deploy dist --project-name=daily-life-hacks`

The Pages project Git `source` must stay **absent**. Wrangler Direct Upload is the sole publisher. The Cloudflare GitHub App check run named **Cloudflare Pages** should not appear.

Staging uses the same workflow. A push to `staging` is a Direct Upload Pages preview (`--branch=staging`), not a Cloudflare Git auto-deploy.

## Why Git source stays unlinked

When the Pages project keeps a linked GitHub repo, the Cloudflare GitHub App posts a check run named **Cloudflare Pages**. That check is not the production deploy.

Disabling auto-deploy flags while keeping the repo linked is not enough. After #57 (`production_deployments_enabled=false`, `preview_deployment_setting=none`, `deployments_enabled=false`), tip `0ad7a63` still got an instant Cloudflare Pages "Deploy failed" check at 2026-09-17T07:10:18Z even though GHA `deploy` succeeded, IndexNow `submit` succeeded, and live `/deploy-proof/` showed that SHA.

Earlier example on `main` tip `e322346` (2026-09-17), before #57:

- GHA `Deploy Cloudflare Pages` succeeded (Direct Upload).
- Live site was healthy: homepage 200, research pages 200, WP leftovers 410 + `X-Robots-Tag: noindex,follow`, `/deploy-proof/` matched `e322346`.
- IndexNow submit succeeded (run `35189710945`).
- The Cloudflare Pages check still failed instantly (0s) at 2026-09-17T06:43:25Z for dashboard deployment `dc236682-1833-4e43-a754-176648373a73`.

That red check is a Git-integration false negative, not a site-breaking GHA build failure.

The deploy workflow GETs the Pages project on every main/staging (and scheduled) run. If `source` is already absent, it no-ops. If a Git source is still linked, it unlinks it entirely (does not re-enable auto-deploy, and does not change project name, account id, or custom domain):

1. PATCH `{"source": null}` on `/accounts/{account_id}/pages/projects/daily-life-hacks`. This follows the same documented delete convention on that endpoint (env vars: set the key to null).
2. If `source` remains, DELETE `/accounts/{account_id}/pages/projects/daily-life-hacks/source` (unlink subresource only; never delete the Pages project).

Wrangler Direct Upload is unchanged and remains the only publisher.

## How to judge live health

Trust, in this order:

1. The **deploy** job in `Deploy Cloudflare Pages` is green for the target branch (`main` for production).
2. `https://www.daily-life-hacks.com/deploy-proof/` reports the expected commit SHA.
3. Optional route spot-checks.

Do **not** treat a Cloudflare Pages GitHub check run (app `cloudflare-workers-and-pages`) as production health. After unlink, that check should not appear.

## Operator notes

- Do not reconnect Pages → Builds & deployments → Git repository.
- Do not re-enable automatic Git deployments.
- Do not replace Wrangler Direct Upload with the Git integration UI.
- `CLOUDFLARE_API_TOKEN` needs Cloudflare Pages Edit. The workflow no-ops if Git source is already absent.
