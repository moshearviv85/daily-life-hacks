# Cursor Brief: Article Reading Experience

Copy everything below into Cursor.

---

You are one workstream in a parallel Daily Life Hacks growth program. Work independently and do not edit the main checkout.

## Isolation first

1. Read `AGENTS.md` and `docs/content-production-control.md` completely.
2. Create a separate worktree at `C:\Users\offic\Desktop\dlh-cursor-article-ux`.
3. Use branch `cursor/article-reading-experience-2026-07-13`, based on current `origin/main`.
4. Never commit or copy unrelated dirty files from `dlh-fresh`.

## Your ownership

You own the article presentation layer only: article layouts/components, scoped article typography/styles, and focused tests. Do not rewrite article Markdown, change SEO copy, edit content datasets, touch D1, workflows, Pinterest/video files, or deploy.

## Objective

Make long articles feel designed rather than like a wall of text, while preserving speed, accessibility, SEO HTML, and the existing orange Daily Life Hacks brand.

## Required workflow

1. Audit the current article template and identify the exact component/CSS path that renders Markdown body content.
2. Capture baseline desktop and mobile screenshots of these three local pages after a build/preview:
   - `/how-to-eat-more-fiber-on-a-budget-complete-guide/`
   - `/high-protein-on-a-budget-complete-guide/`
   - `/best-low-cost-protein-sources-large-families/`
3. Implement only changes supported by the audit. Priorities:
   - strong, consistent presentation for in-body images and charts;
   - responsive tables with usable horizontal overflow on small screens;
   - improved spacing rhythm around H2/H3, lists, tables, images, and callouts;
   - preserve readable line length and visible keyboard focus;
   - prevent horizontal page overflow and layout shift;
   - reuse the existing design system instead of introducing a second style language.
4. Do not add a sticky sidebar, carousel, animation framework, or third-party dependency unless the current architecture already supports it and the benefit is proven.
5. If captions require HTML restructuring or a Markdown convention, document the proposal rather than inventing captions from alt text.

## Acceptance criteria

- Semantic heading and table structure remains intact.
- In-body images have stable dimensions or an equivalent CLS-safe treatment where possible.
- Tables remain readable at 360px viewport width.
- No horizontal document overflow at 360px, 768px, or 1440px.
- Lighthouse/performance risk does not materially increase.
- Existing article hero, newsletter, related-content, and ad placements still render.
- Before/after screenshots prove the visual change on desktop and mobile.

Create `reports/growth/cursor-article-ux-2026-07-13.md` containing the audit, decisions, screenshot paths, and verification evidence. Run focused tests plus `npm run build:checked` and `git diff --check`.

Commit only your scoped files. Do not push, deploy, or merge to main. Return branch, commit SHA, exact changed files, screenshots, and test/build results.

