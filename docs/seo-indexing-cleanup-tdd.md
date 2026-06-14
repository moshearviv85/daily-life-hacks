# SEO Indexing Cleanup TDD

## Goal

Stop indexing damage from thin, empty, duplicate, and non-canonical URLs without breaking the live site, Pinterest router variants, article routing, sitemap generation, or Cloudflare Pages deployment.

## Safety Rules

- Do not touch D1 during this task.
- Do not run produce, promote, images, or pins.
- Do not push to `main`.
- Do not delete articles or add redirects until the audit report classifies the URL and the user approves the action.
- Treat exported CSV files as inputs only. SQLite is the analysis layer.

## Desired Outcomes

### 80 Percent Success

- `npm run audit:content` builds a local SQLite audit DB.
- Every crawled URL from Bing/GSC receives a classification.
- Real articles are not deleted merely because Bing reports `Document size = 0`.
- Canonical convention is documented as `https://www.daily-life-hacks.com/slug/`.
- P0 triage list identifies canonical, noindex, 404, zero-byte, alias, router-variant, and off-topic risks.
- Build/routing checks still pass after any code-only audit changes.

### 90 Percent Success

- P0 canonical and routing fixes are implemented and verified with build plus curl checks.
- Sitemap contains only canonical, indexable URLs.
- Intentional noindex URLs are documented separately from mistaken noindex URLs.
- Redirect decisions exist for off-topic and unmatched live-200 URLs.
- The striking-distance page list has an approved content/GEO plan.

### Full Success

- No known internal or sitemap URL resolves to an unintended 404.
- No known canonical article is split between slash/no-slash or www/non-www indexable URLs.
- No thin or empty canonical page remains live without an explicit expand/merge/redirect decision.
- High-value striking-distance pages receive Answer Capsule, FAQ/schema, title/H1, and internal-link improvements.
- Cleaned sitemap is resubmitted and GSC validation is started.

## Test Gates

- Unit tests for audit parsing and URL classification.
- `npm run audit:content` completes without production side effects.
- SQLite counts reconcile with source exports.
- `npm run build` passes before any routing/canonical change is considered ready.
- `npm run verify:routing` passes after any build that changes routing, aliases, or sitemap behavior.

## Pareto Stop Rule

After 80-90 percent success, do not spend large effort on low-impression legacy URLs, stale GSC noise, cache artifacts, or unlinked 404s. Document them in backlog and move on unless fresh evidence shows they are hurting indexing.
