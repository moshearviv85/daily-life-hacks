# Staging Environment Runbook

Date: 2026-05-18

## Decision

Use a Git branch based Cloudflare Pages preview as the staging environment.

- Staging branch: `staging`
- Production branch: `main`
- Cloudflare Pages project: `daily-life-hacks`
- Staging environment: Cloudflare Pages Preview
- Current known staging URL: `https://77f0167e.daily-life-hacks.pages.dev`

This is the right first staging path because it reuses the exact production build, Pages Functions bundle step, and Cloudflare Pages deploy command while keeping generated files off `main` until manual promotion.

## Current Deploy Flow

Production and staging are both deployed by `.github/workflows/deploy-cloudflare-pages.yml`.

- Push to `main` deploys production.
- Push to `staging` deploys a Cloudflare Pages preview deployment.
- The deploy command is `pages deploy dist --project-name=daily-life-hacks --branch=${{ github.ref_name }}`.
- The workflow builds Astro, builds Pages Functions into `dist/_worker.js`, then deploys `dist/`.
- Deploy concurrency is branch-specific so a staging deploy does not cancel a production deploy.

The local production deploy scripts in `package.json` are still production-only:

- `npm run deploy:prod`
- `npm run release:prod`

Do not use those scripts for staging.

## Promotion Flow

Promotion is manual through `.github/workflows/promote-staging.yml`.

The workflow:

1. Requires manual `workflow_dispatch`.
2. Requires the confirmation input `PROMOTE`.
3. Checks out `origin/staging`.
4. Runs `npm ci`.
5. Runs `npm run build:checked`.
6. Fast-forwards `main` to `origin/staging`.
7. Pushes `main`, which triggers the production Cloudflare Pages deploy.

If `main` cannot fast-forward to `staging`, promotion fails. That is intentional; resolve branch divergence deliberately instead of force-merging generated content into production.

## Testing Checklist

Before promotion, test staging in this order:

1. Confirm the latest `Deploy Cloudflare Pages` workflow for `staging` completed successfully.
2. Open the staging URL and verify the homepage loads.
3. Open at least one newly changed article URL.
4. Open at least one routed Pinterest/alias URL if routing files changed.
5. Confirm images render from `/images/...`.
6. Check that obvious utility pages still work: `/contact/`, `/privacy/`, `/terms/`.
7. For routing-sensitive work, run or confirm `npm run build:checked`.

For generated article batches, also review:

- Article frontmatter and category.
- Hero image and article image path.
- Pin image paths if pins were generated.
- No accidental edits to unrelated articles or router mapping.

## Boundaries

Staging is safe for static site, build, image, routing, and content review.

Staging is not yet isolated for runtime data:

- The Pages Functions binding name is still `DB`.
- There is no separate staging D1 database documented or wired.
- Dashboard and API actions can still affect production D1 state.
- `pipeline-trigger.js` dispatches workflows from `main` so GitHub can find workflow files.
- `pipeline-produce.yml` and `pipeline-daily.yml` push generated files to `staging`, but they can still update production D1 pipeline status.

Do not use staging dashboard buttons for real pipeline tests until the dashboard/API layer is made staging-aware.

## Future Upgrade

The next hardening step is D1 isolation:

1. Create a separate Cloudflare D1 database for staging.
2. Bind it to the Cloudflare Pages Preview environment as `DB`.
3. Add an explicit environment marker to protected APIs.
4. Make dashboard actions show whether they are affecting staging or production.
5. Keep generated file promotion separate from D1 mutations.

Until then, staging should be treated as a preview environment for files and routing, not as a fully isolated application environment.
