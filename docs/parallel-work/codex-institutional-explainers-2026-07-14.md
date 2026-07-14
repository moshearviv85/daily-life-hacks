# Codex Brief: Institutional Research Explainers (Lane B)

Copy everything below into Codex.

---

You are one workstream in a parallel Daily Life Hacks growth program. Claude Code
owns Lane A (original data studies), text-pin generation, and distribution. You own
Lane B: plain-English explainers of official food-economics data. Do not touch
Lane A files, layouts, components, scripts, workflows, pins, D1, or video projects.

## Isolation first

1. Read `AGENTS.md`, `docs/content-production-control.md`, and
   `docs/growth/content-pipeline-2026-07.md` (your topic queue is Lane B there).
2. Create a worktree at `C:\Users\offic\Desktop\dlh-codex-explainers`.
3. Branch `codex/institutional-explainers-batch-1`, based on current `origin/main`.
4. Never commit unrelated dirty files from the main checkout.

## The product

Batch 1 = explainers B1 and B2 from the pipeline file:

- **B1: "What the Government Says a Cheap, Healthy Week Costs"** — the USDA Thrifty
  Food Plan, translated. What it is, the current monthly cost figures for a family
  of four (verify the latest published numbers from the official USDA CNPP source
  at writing time), what a week looks like at that budget, and where our own
  audited per-dollar data agrees or disagrees.
- **B2: "Where the 28g of Fiber and 50g of Protein Targets Come From"** — the FDA
  Daily Values demystified (21 CFR 101.9). What a Daily Value is and isn't, how the
  28g/50g figures were set, what "good source" claims legally mean (link our
  existing label-meaning article), and how our four cost studies use these targets.

## Hard requirements per article

- Invoke the `david-miller-voice` skill and respect every hard ban (no em dashes,
  no emojis, contractions always, no medical claims — hedge with may/could/might,
  no supplements/detox, no banned AI phrases, no "Conclusion" heading).
- ECONOMICS ONLY. These are explainers about costs, targets, and price data. Zero
  health-outcome claims. If a source document makes a health claim, attribute it
  ("the FDA set this value based on...") rather than asserting it.
- Answer-first opener: the key number/answer in sentence one.
- One comparison or summary TABLE near the top, with a named-source line.
- Question-shaped H2s matching real search queries.
- 5 FAQ entries in frontmatter (question/answer), hedged and number-bearing.
- INTERNAL LINKS (validator-enforced intent): at least 3 contextual links to site
  RECIPES (`src/data/articles/` with `category: recipes`) woven into prose where a
  food is mentioned, 1 link to the relevant pillar, 1 link to a related data study
  or `/methodology/`. Verify every target file exists on disk. No "Related:" blocks.
- Every number traceable: quote the official source document by name AND verify the
  current published figure at writing time. Do not reuse numbers from memory or
  from other articles without re-checking. Record each number's source in an HTML
  comment at the bottom of the article body: `<!-- sources: ... -->`.
- Frontmatter per `src/content.config.ts`: title, excerpt (<=155 chars,
  answer-style), category `nutrition`, tags, image, imageAlt, date 2026-07-14,
  author "David Miller", faq.
- Hero images: reuse the house chart style (matplotlib, #F29B30 bars, white bg,
  slate labels, footer "Data: <source> | daily-life-hacks.com") at
  `public/images/{slug}-main.jpg`, 1200x675. One supporting chart each if the data
  warrants it.

## Validation before commit

- `py -3 scripts/validate_article.py src/data/articles/{slug}.md` -> PASS for each.
- Hard-ban scan (em dash U+2014, emojis, banned phrases, `your ... will thank you`).
- All internal link targets exist on disk.
- `npm ci` then `npm run build:checked` green in the worktree.
- `git diff --check` clean.

## Boundaries

- Commit only your scoped files (2 articles + their images) with a clear message.
- Do NOT push, deploy, merge to main, create pins, post anywhere, or mutate D1.
- Do not edit any existing article, layout, or script.

## Return

- Branch + commit SHA and exact file list.
- Per article: the key numbers used and their exact official sources.
- Validation output summary.
- Which recipes/pillars each article links to.
- Anything requiring live verification you could not confirm locally.
