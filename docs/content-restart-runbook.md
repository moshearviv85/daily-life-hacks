# Content Restart Runbook

Last updated: 2026-05-18
Task: T04

## Goal

Restart content creation after stabilization without accidentally publishing low-review content, overfeeding Pinterest, or mixing staging tests with production D1 state.

## Current Safe Path

Use the new pipeline only as a staged content generator until it has passed several clean batches.

- Generate through `.github/workflows/pipeline-produce.yml`.
- Keep `count` small.
- Let the workflow commit generated files to the `staging` branch.
- Review the Cloudflare Pages Preview deployment before promotion.
- Promote with `.github/workflows/promote-staging.yml` only after content, images, routing, and build checks pass.
- Keep pin scheduling behind article publication and manual approval.

Do not use `pipeline-daily.yml` as an automatic daily job yet. It is manual-only while the pipeline is being stabilized.

## Preconditions

Before starting any batch:

1. `main` deploy is green.
2. `staging` deploy is green or ready to be replaced by the new batch.
3. There is no unresolved production routing, canonical, image, or build failure.
4. The approved topic backlog in D1 is intentional.
5. The user explicitly approves state-changing actions for the turn: workflow dispatch, D1 mutation, Git promotion, or Pinterest posting.
6. No one else is actively editing `staging` for unrelated work.

## Batch Size

Use this ramp:

1. First restart batch: 1 article.
2. Next two clean batches: 2 articles each.
3. After three clean batches: 3 articles per manual run.
4. Do not enable unattended daily generation until staging, D1 status, and review handoff have been clean for at least one week.

Keep categories mixed over time, but do not force variety inside the first batch. A single good article is the test.

## First Safe Batch Recommendation

Run one manual `pipeline-produce.yml` batch:

- `count`: `1`
- `category`: empty unless the approved backlog has a clearly safer candidate
- target branch: `staging` through `PIPELINE_TARGET_BRANCH=staging`

For the first batch, review and promote the article only. Do not approve or post its new pins in the same pass. Let production indexing and article rendering settle first, then schedule pins separately after manual verification.

## Generation Steps

1. Confirm the selected approved D1 topic is still useful and not a duplicate of an existing article.
2. Dispatch `.github/workflows/pipeline-produce.yml` with the agreed count and optional category.
3. Confirm the workflow selected only the intended number of topics.
4. Confirm it completed without failed topics.
5. Confirm the generated commit landed on `staging`.
6. Confirm the `Deploy Cloudflare Pages` workflow for `staging` completed.

Expected generated files:

- `src/data/articles/{slug}.md`
- `public/images/{slug}-main.jpg`
- `public/images/pins/{slug}_v1.jpg` through `_v4.jpg` when pins are generated
- relevant `pipeline-data/` artifacts such as router mapping, aliases, or pin image logs

## Article Review Gate

Review every generated article before promotion:

1. Frontmatter has required fields from `src/content.config.ts`: `title`, `excerpt`, `category`, `tags`, `image`, `imageAlt`, `date`, `author`.
2. Category is one of `nutrition`, `recipes`, or `tips`.
3. Title, excerpt, and body are in English for a US audience.
4. Body matches the Daily Life Hacks voice: practical, specific, no generic filler.
5. No medical, nutrition, or safety claim overreaches.
6. No fake personal experience, invented credentials, or unverifiable claims.
7. Internal links are relevant if present.
8. The article does not duplicate an existing `src/data/articles/*.md` topic.
9. `npm run build:checked` passes on the staging diff before promotion.

## Image Review Gate

Review hero and pin images before promotion or scheduling:

1. Hero image exists at the frontmatter `image` path.
2. Image renders on the staging article page.
3. Image matches the article topic and does not look distorted, low-resolution, text-heavy, or off-brand.
4. Food images look plausible and appetizing.
5. Pin images render at their `/images/pins/...` paths.
6. Pin text is readable on mobile and does not make claims the article does not support.
7. No accidental reused image for unrelated topics.

## Staging Verification

Use the staging URL from `docs/staging-environment.md`.

Check:

1. Homepage loads.
2. New article page loads.
3. New hero image loads.
4. At least one generated pin or alias URL loads if routing files changed.
5. `/contact/`, `/privacy/`, and `/terms/` still load.
6. Source view or metadata confirms the canonical URL points to production `www.daily-life-hacks.com`.

Avoid dashboard/API buttons on staging until Preview D1 is isolated. Staging currently uses the shared `DB` binding.

## Promotion Gate

Promote only when:

1. Article review gate passes.
2. Image review gate passes.
3. Staging verification passes.
4. `npm run build:checked` passes locally or in `.github/workflows/promote-staging.yml`.
5. The user approves production promotion for that turn.

Promotion path:

1. Dispatch `.github/workflows/promote-staging.yml`.
2. Enter `PROMOTE`.
3. Confirm it fast-forwards `main` from `staging`.
4. Confirm production Cloudflare Pages deploy is green.
5. Open the production article URL and confirm it loads with the hero image.

## Pin Scheduling Gate

Because Pinterest reach is currently suppressed, do not increase posting volume aggressively.

Rules:

- Do not approve pins for a new article until its production article URL is live.
- Keep new pins in `REVIEW` until manual approval.
- Approve at most one article's pin set at a time.
- Start with one new pin from the first restarted article, then wait at least 48 hours before approving more from the same batch.
- Keep the existing catch-up protection in `scripts/post-pins.py`: scheduled runs publish up to 2 due pins, manual `immediate=true` publishes 1 pin.
- Do not use `immediate=true` for new pipeline pins during the first restart batch unless the user explicitly asks.

Before approving a pin:

1. The link opens the live article or intended routed URL.
2. The target article is `PUBLISHED` or otherwise live in Git.
3. The pin image URL returns the expected image.
4. The pin title and description are specific and not repetitive.
5. There is no duplicate pending pin for the same image/link/title.

## Rollback

If a staging batch fails review:

1. Leave `main` untouched.
2. Do not approve related D1 article or pin rows.
3. Fix the generated files on `staging` or discard the staging commit deliberately.
4. Document the failure in `docs/WORKLOG-CODEX.md`.

If a production promotion fails after deploy:

1. Pause pin approvals for the affected article.
2. Revert the promoted commit on `main` or fast-forward `main` to the last known good commit, with explicit user approval.
3. Confirm production deploy returns to green.
4. Mark affected D1 rows as blocked/review rather than approving additional distribution.

If a Pinterest post is wrong:

1. Stop approving additional pins.
2. Mark related rows `FAILED` or return unposted rows to `REVIEW` only with explicit approval.
3. Correct the image/link/title before resuming.

## Stop Conditions

Stop the batch and ask the user before continuing if:

- The generated article fails validation or looks low quality.
- The hero image is missing or off-topic.
- A generated route returns 404, unexpected canonical, or unexpected noindex.
- `staging` deploy fails.
- `promote-staging.yml` cannot fast-forward.
- A D1 or GitHub Action endpoint returns an unclear error.
- Pinterest API returns a failure.

## Handoff Notes For Future Automation

The next hardening step is not larger batches. It is isolating staging D1 and making dashboard state environment-aware. Until that exists, content QA can happen safely on staging, but dashboard actions should be treated as production state changes.
