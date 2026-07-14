# Article Reading Experience — Cursor workstream

**Date:** 2026-07-13
**Branch:** `cursor/article-reading-experience-2026-07-13`
**Worktree:** `C:\Users\offic\Desktop\dlh-cursor-article-ux`
**Scope:** presentation layer only (article Markdown body styles + focused tests)

## Audit

| Item | Finding |
|------|---------|
| Markdown body path | `src/pages/[slug].astro` renders `<div class="article-content order-[20]"><Content /></div>` |
| Style ownership | `src/styles/global.css` → `.article-content *` (already introduced on `main` via prior visual upgrade; this work deepens reading rhythm) |
| Layout shell | `main.max-w-3xl` keeps readable line length; hero / FAQ / related / newsletter unchanged |
| Baseline risk | Tables used `white-space: nowrap` on mobile (hard to read); images lacked CLS-friendly placeholder bg / border rhythm; link focus not explicit |

## Decisions

1. Improve CSS only — no Markdown rewrites, no new UI frameworks, no sticky TOC/carousel.
2. Keep brand orange `#F29B30` for links, blockquotes, focus rings.
3. Mobile tables: horizontal scroll on the table box; allow cell text wrap; `min-width` on cells so wide data tables remain usable at 360px.
4. Images: full-width within content, `height: auto`, border + muted background (reduces flash), consistent vertical margins. No forced aspect-ratio (would distort charts).
5. **Captions proposal (not implemented):** Markdown currently has no `figure`/`figcaption` convention. Prefer a future remark/rehype pass or explicit HTML in articles over inventing captions from `alt`.

## Changes

- `src/styles/global.css` — expanded `.article-content` reading styles
- `tests/article-content-ux.test.mjs` — regression guards for wrapper + essentials
- Screenshots under `reports/growth/screenshots/article-ux-2026-07-13/{before,after}/`

## Screenshot evidence

Captured at 1440×900 and 360×740 for:

- `/how-to-eat-more-fiber-on-a-budget-complete-guide/`
- `/high-protein-on-a-budget-complete-guide/`
- `/best-low-cost-protein-sources-large-families/`

Overflow checks (Playwright evaluate): **no document horizontal overflow** at 360 / 1440 for all three pages (before and after).

## Verification

| Check | Result |
|-------|--------|
| `node --test tests/article-content-ux.test.mjs` | pass |
| `npm run build` | pass |
| `npm run verify:routing` | pass |
| `npm run verify:pin-destinations` | pass |
| `git diff --check` | pass |
| Push / merge / deploy | **not done** (per brief) |

## Notes for merge

- Do not merge dirty files from `dlh-fresh` main checkout.
- Playwright was used only as an extraneous local tool to capture the committed evidence. No helper or undeclared dependency is shipped with this change.
