# Codex Brief: Institutional Explainers Batch 2 (Lane B: B3 + B4)

Copy everything below into Codex.

---

You are the Lane B workstream in the Daily Life Hacks parallel growth program.
Batch 1 (Thrifty Food Plan + Daily Values) shipped clean — same rules, same
quality bar, two new explainers. Claude Code owns Lane A (original studies,
currently producing fast-food and DIAAS studies — do not touch those slugs),
pins, and distribution.

## Isolation

1. Read `AGENTS.md`, `docs/content-production-control.md`, and
   `docs/growth/content-pipeline-2026-07.md` (you are B3 and B4).
2. Worktree `C:\Users\offic\Desktop\dlh-codex-explainers` (reuse), branch
   `codex/institutional-explainers-batch-2` from current `origin/main`.

## The articles

- **B3: "Grocery Prices This Month: What Rose, What Fell"** — plain-English
  read of the latest BLS CPI food-at-home release (verify the current month's
  published figures at writing time; the repo's Price Watch workflow docs at
  `scripts/update-price-index.py` show which BLS series we already track).
  Design it as a RECURRING template:a structure that next month's update can
  refresh (what rose, what fell, what it means for the staples in our studies).
  Slug: `grocery-prices-this-month-what-changed`. IMPORTANT: never mix BLS
  national averages into our per-dollar rankings — report drift, don't rewrite
  rankings (house policy in the Price Watch workflow).
- **B4: "Why Egg Prices Swing So Hard"** — the BLS egg price series
  (APU0000708111), explained: the historical swings, why eggs spike and crash
  (flock cycles, disease events as reported by USDA — attribute, don't assert),
  and what the current price means for eggs' 34 g/$ rank in our study.
  Slug: `why-egg-prices-swing-explained`.

## Hard requirements (same as batch 1)

- `david-miller-voice` skill, every hard ban (no em dashes, no emojis,
  contractions, may/could hedges, no supplements, no "Conclusion" heading).
- ECONOMICS ONLY. Attribute institutional claims, never assert health outcomes.
- Answer-first opener with the key number in sentence one; one TABLE near the
  top with named-source line; question-shaped H2s; 5 FAQ entries.
- Human-hook titles (house rule: no repeated "X Ranked by Y" templates).
- Links per article: >=3 recipes from `pipeline-data/derived-studies/recipe-slugs.txt`
  woven into prose, 1 pillar, 1 related data study, all targets verified on disk.
- Every number verified against the official source AT WRITING TIME with a
  `<!-- sources: ... -->` comment at the body end.
- Heroes: appetizing FOOD photography via the fal pipeline (krea-2-large, 16:9,
  `public/images/{slug}-main.jpg`, prompt ends "Still life. No people, no hands,
  no fingers, no text, no labels, no charts."). Charts go INSIDE the body
  (matplotlib house style, `{slug}-chart.jpg`) — never as the hero (owner rule).
- Frontmatter per `src/content.config.ts`, excerpt <=155 with a number,
  date 2026-07-16, author "David Miller".

## Validation before commit

`validate_article.py` PASS x2, hard-ban scan, all links exist, `npm ci` +
`npm run build:checked` green in the worktree, `git diff --check` clean.

## Boundaries

Commit only your scoped files. Do NOT push/deploy/merge/pins/D1. Return: branch
+ SHA, files, key numbers with exact sources, validation output, links used.
