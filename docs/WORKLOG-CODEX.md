# Codex Worklog

Last updated: 2026-05-18

This file is the shared memory for Codex sessions on `daily-life-hacks.com`.
Every new Codex chat should read this file and `AGENTS.md` before choosing work.

## Operating Rules

- User communication is in Hebrew.
- Site content is English for a US audience.
- Do not rely on chat memory alone. Verify against files, Git, D1, GitHub Actions, and the live site when relevant.
- Do not reopen completed stabilization work unless there is a new symptom or failing check.
- Do not post to Pinterest, mutate D1, deploy manually, commit, push, install packages, or run Wrangler state-changing commands unless the user explicitly approves that turn or the action is part of an approved plan.
- The worktree is dirty with many unrelated deletions and untracked files. Stage exact files only.
- Task coordination happens in `docs/CODEX-TASKBOARD.md`.

## Current System State

- Stack: Astro 5 + Tailwind CSS v4 on Cloudflare Pages.
- Domain: `https://www.daily-life-hacks.com`.
- Cloudflare Pages deploy is green after the Pages Functions bundle fix.
- D1 database binding: `DB`.
- Live content source: `src/data/articles/*.md`.
- Router alias source: `pipeline-data/slug-aliases.json`.
- Pinterest schedule source: D1 table `pins_schedule`.
- Pinterest publisher: GitHub Action `.github/workflows/post-pins.yml` running `scripts/post-pins.py`.
- Pipeline scripts are mainly under `scripts/NEW_PIPELINE_2026-05-08/`.
- Pipeline local DB: `pipeline-data/topic-research.sqlite`.

## Stabilization Work Already Done

- Router, slug alias, canonical, noindex, and redirect behavior were audited and fixed.
- Non-www HTTPS root now redirects to canonical www.
- Canonical article pages should not receive `X-Robots-Tag: noindex`.
- Routed proxy or pin variant pages should avoid competing with canonical pages.
- Live audit across known Pinterest and pending URLs reported:
  - 0 live 404 issues.
  - 0 canonical mismatch issues.
  - 0 redirect issues.
  - 0 wrong noindex issues.
- Google Search Console issues shown by the user were diagnosed:
  - `Alternative page with proper canonical tag`: largely expected for pin variants/aliases.
  - `Page with redirect`: includes expected HTTP/non-www/no-slash/tag redirects plus stale examples.
  - `Not found (404)`: stale garbage URLs such as `/cdn-cgi/l/email-protection` and `/*`.
- Cloudflare deployment failure was fixed by building Pages Functions to `worker-out` and copying `worker-out/index.js` to `dist/_worker.js`.
- Pinterest pending queue was checked:
  - D1 had 43 `PENDING` and 299 `POSTED` at last check.
  - Pending queue did not show exact duplicate links, images, or titles.
- GitHub scheduled workflow was found to run irregularly.
- Pinterest auto-poster now has catch-up protection:
  - Scheduled run can publish up to 2 due pins.
  - Manual `immediate=true` run is limited to 1 pin.
  - 90 second pause between catch-up posts.
  - Stops after a Pinterest API failure.

## Important Recent Commits

- `05ecd40` Add Pinterest cron catch-up limit
- `1576633` avoid noindex on canonical kv routes
- `ba85365` fix canonical handling for routed pin pages
- `591acaa` fix pages functions deployment bundle
- `bcc6a31` add pinterest posting safety checks
- `ce4d5d6` backfill router slug aliases

## Do Not Re-Do Without New Evidence

- Do not repeat the full router/canonical/pin URL mapping audit as a fresh project.
- Do not re-litigate whether 140 live articles and Pinterest slugs are connected unless a new mismatch appears.
- Do not assume SQLite article rows represent live site truth. Live site truth is the markdown article set and deployed router behavior.
- Do not change Pinterest posting volume aggressively while the account is suppressed.

## Known Concerns Still Open

- Need a real cloud/Git-based production pipeline so content generation does not depend on ad hoc local scripts.
- Need a manual approval checkpoint before publishing new generated content.
- Need a staging environment for live testing before production.
- Need a clear source-of-truth design for:
  - article generation
  - article review
  - image generation through Fal/Recraft/GPT image model
  - OpenRouter model calls
  - D1 sync
  - Pinterest scheduling
  - deployment and rollback
- Need to resume content generation carefully after stabilization.
- Need later organic traffic investigation for Google/Bing once core pipeline is stable.

## Next Recommended Work Area

Start with `T01` in `docs/CODEX-TASKBOARD.md`: pipeline migration map and source-of-truth design.

The first chat should mark `T01` as `in_progress`, perform only that task, then mark it `done` or `blocked` with notes.
The next chat should choose the first task that is not `done` and not `in_progress`.

