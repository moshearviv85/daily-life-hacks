# Changelog — Daily Life Hacks

Project history. Completed tasks in chronological order.

## 2026-04-22 — V4 Enforcement Architecture

Major restructure of Claude Code instruction system:
- Shortened CLAUDE.md from 223 lines to ~80 lines (facts + always-on only)
- Moved content rules to `.claude/rules/content.md`
- Added path-scoped rules for articles, pinterest, video
- Truth protocol consolidated (was repeated 9x in MEMORY.md)
- Added 4 enforcement hooks: content-checker, post-tool-state, completion-evidence-gate, instructions-logger
- State layer: `.claude/state.json` auto-maintained by hooks
- Migrated skills from `.cursor/skills/` to `.claude/skills/` with proper frontmatter
- See `SPEC-ENFORCEMENT-ARCHITECTURE.md` for full architecture

## 2026-04-21 — Topic Research Pipeline

- Stage 1 + Stage 2 deterministic keyword research pipeline shipped (commit `12187b6`)
- DB: `pipeline-data/topic-research.sqlite` with 50 topics in `stage2_output`

## 2026-04-20 — Post-Pin Reliability

- Fixed Cloudflare 5xx + non-JSON handling as transient (commit `7ad5e54`)
- Treat DUPLICATE articles as live so their pins post (commit `9b93552`)

## 2026-04-18 — Pipeline Publishing

- Publish 2 articles/run, surface blocked-pin reasons (commit `dba6f44`)
- Publish 2 articles dated 2026-04-21 (commit `83dd065`)

## 2026-04-16 — Meal Plan Revert (Lesson)

- All meal plan work reverted (commit `3a32e3e`) because content rules were violated
- Lesson logged in `.claude/rules/truth.md` as the originating incident for hard enforcement

## Earlier: Site Foundation (chronological)

1. Grid card ratio — 70% image, 30% text
2. Font bold on grid card titles
3. Newsletter text updates
4. SEO basics — robots.txt, Organization Schema, H1, title/description
5. Pinterest save button with SDK
6. Recipe pages — conditional Recipe vs Article JSON-LD
7. Example recipes — lemon-herb-chicken, overnight-oats
8. Category pages — `/nutrition`, `/recipes`
9. Legal pages — `/privacy`, `/disclaimer`, `/contact`
10. Bug fixes — Header/Footer, ArticleCard props, dark mode, Footer placement
11. Custom favicon (orange leaf)
12. OG image fallback to logo.png
13. Apple touch icon
14. Footer redesign by Gemini
15. Terms of Use page
16. NewsletterPopup modal with dynamic images
17. Recipe data backfill
18. Model comparison test (Gemini selected as content writer)
19. Pin database (Excel → JSON+CSV)
20. Image scene randomizer (100 scenes in JSON)
21. Image generation script with random scenes, temperature 2.0
22. 25 articles published with generated images
23. SEO optimization — BreadcrumbList schema, image width/height, fetchpriority, robots meta
24. Newsletter popup text fix (removed false meal plan promise)
25. Beehiiv integration — custom forms + Cloudflare Pages Function proxy
26. D1 subscription tracking — source/page analytics
27. Stats endpoint — `/api/stats` with key protection
28. Site deployed to Cloudflare Pages
29. Medical claims audit — softened 34 health claims across 17 articles
30. Removed hormone-balance article (YMYL) — replaced with high-protein-high-fiber-meals-for-weight-loss
31. Tabbouleh article — removed "Detox"/"cleanses" from title/excerpt/tags
32. Gemini article instructions prepared (`pipeline-data/gemini-article-instructions.md`)
33. Topics list prepared for Gemini (`pipeline-data/topics-to-write.md`)

## Model & Decision Record

- **Content writer: Gemini Pro 3.** Selected via comparison test against Claude Chat and GPT-4o.
  - Reasons: most human tone, best long-tail keyword integration, most detailed recipes with realistic quantities/calories, longest articles (good for SEO), rich H2/H3 structure.
- **Image generator: Nano Banana Pro** (`nano-banana-pro-preview`) via `generateContent` API, $0.134/image.
- **Image variety:** 100 pre-defined scenes randomly picked per image (solved "everything on wooden table" problem).

## Removed Topics (18 total)

YMYL/medical: IBS, diabetes, cholesterol, hormones, supplements
Pseudo-science: detox, colon cleanse, ACV remedies
Risky: 100g fiber challenge, kids-specific medical content
Replaced: hormone-balance article

## Pinterest Milestones

- 2026-04-03: Pinterest Standard Access approved
- 2026-04-22: 152 pins in D1, 59 POSTED, 93 PENDING (3 boards active)

## Content Status Snapshot (as of 2026-04-22)

- ~77 articles live on site
- ~134 web images in GitHub
- ~87 pin images in GitHub
- Kit: 2 test subscribers (no real subs yet, no welcome automation)
- 0 affiliate links live
