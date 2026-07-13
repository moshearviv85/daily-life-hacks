# Claude Code Brief: Content Authority Batch

Copy everything below into Claude Code.

---

You are one workstream in a parallel Daily Life Hacks growth program. Work independently and do not edit the main checkout.

## Isolation first

1. Read `AGENTS.md` and `docs/content-production-control.md` completely.
2. Create a separate worktree at `C:\Users\offic\Desktop\dlh-claude-authority`.
3. Use branch `claude/content-authority-batch-2026-07-13`, based on current `origin/main`.
4. Never commit or copy the user's unrelated dirty files from `dlh-fresh`.

## Your ownership

You own content authority, search-intent fit, and the first bounded rewrite batch. Do not edit layouts, components, global CSS, scripts, workflows, D1, Pinterest queues, video projects, or deployment configuration.

## Phase 1: evidence-backed inventory

Audit all Markdown files under `src/data/articles/` using the newest local evidence available in `reports/`, Search Console/Bing exports, cluster reports, sitemap/build output, and internal-link data. Do not treat stale exports as confirmed-current.

Create:

- `reports/growth/claude-content-authority-audit-2026-07-13.md`
- `reports/growth/claude-content-priority-2026-07-13.csv`

The CSV must rank at least the top 30 opportunities and include:

- slug
- cluster/search intent
- evidence source
- current weakness
- cannibalization risk
- inbound internal links if available
- visual state
- recommended action
- impact score
- confidence score
- effort score

Separate proven defects from hypotheses that require live GSC URL Inspection.

## Phase 2: implement one bounded batch

Select 5 articles maximum with the strongest evidence and a shared topical purpose. Avoid the seven budget-fiber/protein core pages modified on July 12-13 unless the evidence shows a specific unresolved defect.

For the selected articles:

- improve the opening answer and search-intent match;
- remove generic filler and duplicated sections;
- strengthen concrete examples and useful takeaways;
- add contextual internal links to the correct pillar and sibling pages;
- preserve cautious nutrition language and existing primary sources;
- update `dateModified` only when the body materially changes;
- use the David Miller voice skill and respect every hard ban;
- never use the phrase pattern `your ... will thank you`;
- do not add image paths unless the files actually exist.

Document exact before/after reasons in the audit report.

## Validation

Run the article validator for every changed article, hard-ban checks, `git diff --check`, and `npm run build:checked`. If the full build exposes a pre-existing failure, prove that with an unchanged-main comparison.

Commit only your scoped files with a clear message. Do not push, deploy, post Pins, mutate D1, or merge to main. Return:

- branch and commit SHA;
- exact changed files;
- validation results;
- top opportunities not included in the five-page batch;
- any claims that still require live GSC verification.

