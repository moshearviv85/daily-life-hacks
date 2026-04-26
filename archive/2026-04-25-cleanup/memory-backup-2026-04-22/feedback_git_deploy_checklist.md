---
name: Git Deploy Checklist — Missing Files Pattern
description: New function files must be explicitly git-added or they won't deploy to Cloudflare
type: feedback
originSessionId: b40e9bee-3480-477c-9bbe-70e4dbf3cc08
---
When creating new Cloudflare Pages Function files (`functions/api/*.js`), they MUST be committed to git or Cloudflare never sees them. Untracked files cause the endpoint to return HTML 404, which the frontend can't parse as JSON → "Unexpected end of JSON input".

Same applies to GitHub Actions workflows (`.github/workflows/*.yml`) — if not in git, workflow dispatch returns 404.

**Why:** Happened twice in one session: 4 function files untracked for days, publish-articles.yml untracked. Both caused cryptic errors that looked like logic bugs but were just missing deploys.

**How to apply:** After creating any new `functions/api/` or `.github/workflows/` file, immediately verify with `git ls-files functions/api/` and `git ls-files .github/workflows/` before marking the task done. Don't assume `git add .` was run.
