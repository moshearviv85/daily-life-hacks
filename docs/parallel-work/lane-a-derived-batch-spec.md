# Derived-Study Batch Spec (Lane A, 2026-07-13)

Shared instructions for every writer/agent producing a derived study. Read fully
before writing. Deviation from the NUMBERS rule is a hard failure.

## The one unbreakable rule

Every number in your article MUST appear in your topic's JSON at
`pipeline-data/derived-studies/{slug}.json` (or be trivial arithmetic on those
numbers, e.g. rounding 97.9 to 98, or "about 4x" from 97.9/24.5). The JSONs were
machine-computed from the audited CSVs. If a number you want isn't there, you
don't write it. External reference values allowed ONLY: FDA Daily Values (28g
fiber, 50g protein used by our studies) and nothing else.

## Article shape (house GEO standard)

- Frontmatter: title (search intent, not the JSON's suggested_title verbatim if
  you can beat it), excerpt <=155 chars answer-style with a number, category
  "nutrition", tags (4-5), image "/images/{slug}-main.jpg" (ALREADY RENDERED, do
  not create), imageAlt describing the chart, date 2026-07-13, author "David
  Miller", faq (5 entries, question/answer, hedged, number-bearing).
- Opener: the answer with the winner number in sentence one. No throat-clearing.
- One markdown TABLE near the top: top 8-12 rows from the JSON (food, value,
  package/price where useful). Provenance line under it: "Source: USDA FoodData
  Central + single-store prices, July 2026. Full methodology at /methodology/."
- Question-shaped H2s (3-5) matching real queries.
- 700-1000 words. Voice: david-miller-voice skill (invoke it), all hard bans
  apply (no em dashes, no emojis, contractions, no medical claims — hedge with
  may/could/might, no supplements, no "Conclusion" heading, no banned AI phrases).
- Body end: HTML comment `<!-- numbers-source: pipeline-data/derived-studies/{slug}.json -->`

## Required links (all verified to exist)

1. >=3 contextual links to RECIPES from `pipeline-data/derived-studies/recipe-slugs.txt`,
   woven where the food appears in prose. Pick genuinely related ones.
2. The parent study: protein topics -> /protein-per-dollar-cheapest-protein-sources/,
   fiber topics -> /fiber-per-dollar-cheapest-high-fiber-foods/, BOTH-metric topics link both.
3. The relevant pillar: /high-protein-on-a-budget-complete-guide/ or
   /how-to-eat-more-fiber-on-a-budget-complete-guide/ or
   /eat-healthy-on-a-budget-complete-playbook/.
4. Optional: one day-cost study (/what-30-grams-of-fiber-costs-per-day/ or
   /what-50-grams-of-protein-costs-per-day/) where natural.

## Special notes by topic type

- "BOTH" metric topics (beans-double-win, breakfast-staples): the JSON's `value`
  is protein g/$ PLUS fiber g/$ summed. Present the two metrics as separate
  columns in your table; use the sum only with a plain explanation ("total
  grams of protein and fiber per dollar, added together").
- cheapest-complete-protein-pairs: values are a 50/50 dollar split between the
  legume and the grain (the price_basis field spells it out). Say so plainly.
  Complete-protein framing must stay cautious: "legumes and grains complement
  each other's amino acid profiles" — no stronger claim.
- eggs-vs-everything: the frame is where eggs (34.4 g/$) sit in the full 49-food
  ranking — what beats them (all dried legumes, flour, oats, PB, drumsticks) and
  what they beat (most meat, all fish, most dairy).

## Validation per article (run it yourself)

- `py -3 scripts/validate_article.py src/data/articles/{slug}.md` -> must PASS.
- Grep your article for digits and confirm each against your JSON.
- Confirm every internal link target exists in `src/data/articles/`.

Do NOT run npm build (the integrator builds once at the end). Do NOT commit.
