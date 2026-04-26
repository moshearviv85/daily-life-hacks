---
name: Topic Research Script — current state
description: 2-stage deterministic TDD script for topic research; where we stopped and what's next
type: project
originSessionId: 9d078ee8-8cfa-4c17-a921-382c7c744b4f
---
# Topic Research Pipeline — Current State

**Stage 1 + Stage 2 fully built and running.**

## What's done
- `scripts/topic_research/stage1.py` — audience CSVs (multiple) → Reddit/Autocomplete/Pinterest Trends → Gemini → 20 content keywords saved to DB
- `scripts/topic_research/stage2.py` — Pin Inspector keywords CSV → Gemini → 50 ranked topics saved to DB
- `scripts/topic_research/db.py` — SQLite schema, 9 tables
- `scripts/topic_research/llm/gemini.py` — Gemini 3.1 Pro REST client
- `scripts/topic_research/__main__.py` — CLI
- 161 tests passing
- Real run completed: run_id=7 (stage1), run_id=10 (stage2), 50 topics in `stage2_output` table

## Last run output (50 topics in DB)
Top 5: Easy Sourdough Discard Pizza Dough Recipe, Cheap Crockpot Meals for Large Families, Cold Easy Summer Pasta Salad Recipes, High Protein Breakfast Sandwich Ideas, Costco Rotisserie Chicken Meal Ideas

## DB location
`pipeline-data/topic-research.sqlite`

## What's next — article writing pipeline

**Architecture decided:**
- All data stays in SQL — no file reading by models
- Each model gets only the relevant row, clean context
- Enables validation script to check for rule violations later

**New table needed: `articles`**
Columns: id, stage2_id (FK), slug, category, topic, markdown (full article text), status (pending→written→validated→published), validation_notes, created_at

**Scripts to build (in order):**
1. `write.py` — reads next topic from stage2_output, calls Gemini with article-writing SKILL prompt, saves markdown to articles table
2. `validate.py` — reads markdown from articles, checks violations (supplements, em dashes, absolute health claims, etc.), updates status + validation_notes
3. `export.py` — exports validated articles to `src/data/articles/{slug}.md` for Astro to build

**Why:** SQL-only approach means models get clean context. No file searching. Validation is just a SELECT + Gemini call on one row.

## Key files
- `.cursor/skills/article-writing/SKILL.md` — article writing rules (references david-miller-voice SKILL)
- `.cursor/skills/david-miller-voice/SKILL.md` — voice rules
- `CLAUDE.md` — content rules including supplement ban
