---
paths:
  - "src/data/articles/**/*.md"
  - "pipeline-data/articles/**"
---

# Article Writing Rules (Path-Scoped)

These rules load automatically when working with article files. They supplement `content.md` with article-specific guidance.

## Pipeline Context

Articles live in `src/data/articles/{slug}.md`. They follow the content schema defined in `src/content.config.ts`:
- Required: title, excerpt, category (`nutrition` or `recipes`), tags, image, imageAlt, date
- Optional flags: featured, editorsPick, whatsHot, mustRead
- Recipe-only: prepTime, cookTime, totalTime, servings, calories, difficulty (Easy/Medium/Hard), ingredients[], steps[]

## Writing Workflow

1. Check `pipeline-data/content-tracker.json` for article status (pending → written → validated → published).
2. Use the David Miller voice skill at `.claude/skills/david-miller-voice/SKILL.md` for tone.
3. Use the article-writing skill at `.claude/skills/write-article/SKILL.md` for structure.
4. Validate content rules before saving (em-dash check, medical claims check, supplement check).
5. Image pairing: `public/images/{slug}-main.jpg` (16:9 web) + `public/images/pins/{slug}_v{1-4}.jpg` (3:4 pin variants).

## Pre-Publish Checklist

- [ ] No em-dashes anywhere
- [ ] No medical claims (see `content.md` for banned words)
- [ ] No supplements mentioned
- [ ] Contractions used throughout
- [ ] No "Conclusion" heading
- [ ] No sign-off endings
- [ ] Long-tail keywords in H1/H2/H3
- [ ] For recipes: realistic quantities, calories, times
- [ ] Image files exist at expected paths

## Topics That Are OUT OF SCOPE

The following 18 topic categories have been removed from the site and must not be reintroduced:
- YMYL medical: IBS, diabetes, cholesterol, hormones
- Supplements of any kind
- Pseudo-science: detox, colon cleanse, ACV remedies
- Risky: 100g fiber challenge, kids-specific medical content
- Other YMYL: hormone-balance (replaced 2026-04)

If a user request implies one of these topics, flag it and propose a food-first alternative.

## Why Path-Scoped

Before `.claude/rules/` with `paths:` existed, these rules lived in the main CLAUDE.md and bloated every session's context. Now they only load when you actually open an article file.
