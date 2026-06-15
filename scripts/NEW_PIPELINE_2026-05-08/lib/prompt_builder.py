"""Dynamic prompt assembly from voice.md + content_policy.py.

Every LLM prompt is built here from the canonical sources so there is no
out-of-sync copy of rules scattered across prompt files.

Exports:
    load_voice() -> str
    build_write_system(category, slug) -> str
    build_write_user(topic, category, slug, rationale) -> str
    build_review_system() -> str
    build_pin_system(keyword, variants) -> str
    build_pin_desc_system() -> str
    build_hero_system() -> str
    build_medical_validator_system() -> str
"""
from __future__ import annotations

from datetime import date
from pathlib import Path

from lib.content_policy import (
    AI_WORDS_BANNED,
    HEDGING_WORDS,
    MEDICAL_TERMS_HARD_BAN,
    MEDICAL_TERMS_HEDGE_REQUIRED,
)

# ---------------------------------------------------------------------------
# voice.md loader
# ---------------------------------------------------------------------------

_VOICE_PATH = Path(__file__).parent / "voice.md"


def load_voice() -> str:
    """Read voice.md from the same directory as this module. Returns full text."""
    return _VOICE_PATH.read_text(encoding="utf-8")


# ---------------------------------------------------------------------------
# Shared content policy section (rendered from content_policy lists)
# ---------------------------------------------------------------------------

def _content_rules_section() -> str:
    hard_ban_terms = ", ".join(MEDICAL_TERMS_HARD_BAN)
    hedge_terms = ", ".join(MEDICAL_TERMS_HEDGE_REQUIRED)
    ai_words = ", ".join(AI_WORDS_BANNED)
    return f"""# CONTENT RULES

## Hard Bans
- NO em dashes (U+2014 character). Use commas, periods, or rewrite.
- NO emojis anywhere.

## Medical Language
NEVER use these terms (they are hard-banned even with hedging):
{hard_ban_terms}

These terms REQUIRE hedging (must be preceded by "may", "might", "could", "is thought to", "could help", "may support", "might improve"):
{hedge_terms}

- NO absolute health statements: never "is good for X", "helps regulate X", "boosts X" without hedging.
- NO detox/cleanse/reset language.

## Supplements
NO supplements of any kind: protein powder, collagen, greens powder, fiber powder, ashwagandha, sea moss, probiotic capsules, multivitamins, pre-workout, fat burners, herbal extracts, adaptogens.

## Banned AI Words
Never use: {ai_words}

## Banned Sign-offs
No: "Happy eating!", "Enjoy!", "Give it a try!", "Your gut will thank you!", "Your future self will thank you!", "You won't regret it!", "Bon appetit!", "Dig in!"
"""


# ---------------------------------------------------------------------------
# Article write prompt
# ---------------------------------------------------------------------------

_AUDIENCE = """# AUDIENCE
The reader is mostly a woman in the United States, somewhere between 25 and 55, who:
- Cooks for her household most nights. Kids, partner, sometimes picky eaters.
- Does not have the energy to "transform her lifestyle". She wants dinner on the table.
- Wants to sneak in a little more health (more fiber, more veg, less junk) without making it a project.
- Arrives from Pinterest. She scrolled past hundreds of pins and clicked yours because the promise was specific and the photo looked like real food.
- Scans first, decides in about three seconds whether to keep reading. If she keeps reading, she wants a clear payoff: a recipe she can actually make tonight, or a tip that saves her time or money this week.
- Saves articles to Pinterest boards. A useful article gets re-pinned. A useful article with a clear voice gets remembered.

Write directly to this reader. Don't write for a general "food audience". Don't write for SEO robots. Write for her.
"""

_SEO_AEO_GEO = """# SEO / AEO / GEO
Three discovery surfaces matter. Serve all three without keyword-stuffing.

- SEO (Google / Bing): the article should rank for the topic's long-tail keyword plus 2-4 close variants. Put the main keyword naturally in the title, the excerpt, the first ~100 words of the body, and at least one H2. Spread variants across other H2s and paragraphs. No stuffing.
- AEO (ChatGPT / Claude / Perplexity answer engines): AI tools lift concrete, answerable sentences. Each H2 section should contain at least one short, self-contained sentence that answers a specific question a reader might ask. Avoid vague hedging when a concrete answer would do.
- GEO (Generative Engine Optimization): clean structure, descriptive headings, numbered steps where relevant, factual specifics (exact temperatures, times, quantities). Assume a generative engine may cite a single sentence from your article — make each section quotable.

The FAQ in the frontmatter YAML is a direct AEO asset (it renders as FAQPage structured data on the site, so Google and some AI engines can pull it). Write FAQs that answer the real long-tail questions the reader would type into Google, not filler questions.
"""

_LENGTH = """# LENGTH (guidance, not a cap)
- For recipes, aim for 2400 to 3200 words in the body before the recipe card. Recipe posts must have enough useful scrolling depth before the ingredients and instructions.
- For nutrition and tips, aim for 1800 to 2400 words. Most non-recipe articles should land around 2000.
- Length should be driven by usefulness, not fluff. Add practical explanation, decision points, mistakes, storage notes, substitutions, and timing details instead of padding.
- The reader is scanning from Pinterest. If a paragraph isn't earning its place (isn't giving her a concrete how, why, or "this is what matters"), cut it.
"""

_STRUCTURE = """# STRUCTURE
- Intro: 1 to 3 paragraphs. Let the first sentence come from the topic itself, not from a reusable opening formula. The opening can be practical, opinionated, sensory, observational, or personal, as long as it feels specific to this article. The main keyword appears by paragraph 2, not in sentence 1.
- Do not copy or closely mimic phrasing from this prompt. Use these instructions as direction, not as language to echo.
- 3 to 8 H2 headings. Plain language, not clickbait. Mix question-style and statement-style. Main keyword appears in at least one H2 but not in all of them.
- Paragraphs: 2 to 5 sentences. Single-sentence paragraphs are welcome for emphasis.
- Lists: use sparingly. When used, prefix named options with `**Label:**`.
- After the final H2 section, write EXACTLY ONE natural closing paragraph, then stop. No "Conclusion" heading, no sign-off, no FAQ section in the body.

Recipe article structure:
- Do NOT put the full ingredient list or numbered recipe instructions in the body. The site renders them from YAML at the bottom of the article before FAQ.
- The visible top of the page will show a small recipe details box with prep time, cook time, total time, servings, calories, difficulty, and a note that the full recipe details are at the end. Do not duplicate that box in the body.
- Before the recipe card, write enough body sections to make the reader scroll: why the method works, timing cues, doneness checks, mistakes to avoid, variations, what to serve with it, storage, and reheating.
- Treat the body as the useful explanation around the recipe, not the recipe card itself.
"""

_OUTPUT = """# OUTPUT
Output ONLY the complete markdown file. No preface, no "Here is your article", no trailing commentary.
Start with the bare `---` frontmatter fence on line 1.
End with the last sentence of the article body.
"""

_FRONTMATTER_SCHEMA_TEMPLATE = """# FRONTMATTER (YAML at the very top of the file)
Always include:
  title: a 5 to 10 word plain title, no quotes unless necessary
  excerpt: 100 to 200 characters, hooks the reader, promises a specific payoff
  category: {category}
  tags: 4 to 6 lowercase plain multi-word strings (e.g. "easy weeknight dinner")
  image: "/images/{slug}-main.jpg"
  date: {today}
  author: "David Miller"
  featured: false
  faq: a YAML list of exactly 4 or 5 items. Each item is an object with two string fields:
         question: "A question a reader would type into Google"
         answer: "40 to 80 words, hedged health language, directly answers the question"

If category is "recipes", ALSO include:
  prepTime, cookTime, totalTime: strings like "10 minutes"
  servings: integer
  calories: integer (per serving)
  difficulty: one of "Easy", "Medium", "Hard"
  ingredients: YAML list of strings, quantity + unit + ingredient + prep note
  steps: YAML list of strings, each step is one complete instruction

CRITICAL YAML FORMATTING FOR `faq`
The correct shape is exactly this, nothing else:
  faq:
    - question: "Some question?"
      answer: "Some answer of 40 to 80 words."
    - question: "Another question?"
      answer: "Another answer."
Do NOT put a `|` block-scalar indicator between question and answer.
Do NOT put a `-` before `answer:` (that makes answer a new list item).
Both of those break the Astro YAML parser and fail the build.
"""

_WRITE_USER_TEMPLATE = """Topic: {topic}
Category: {category}
Slug: {slug}
Keywords and angle: {rationale}

Write the complete article now.
Reminders:
- FAQ goes in the YAML frontmatter `faq:` field only. Do NOT add a body FAQ section.
- End with exactly ONE closing paragraph. Do not add a second wrap-up paragraph after it.
- Keep an eye on the YAML formatting of `faq` — no `|` and no extra `-` before `answer`."""


def _hard_bans_section() -> str:
    """Generate the HARD BANS section dynamically from content_policy lists."""
    hard_ban_terms = ", ".join(MEDICAL_TERMS_HARD_BAN)
    hedge_terms = ", ".join(MEDICAL_TERMS_HEDGE_REQUIRED)
    ai_words = ", ".join(AI_WORDS_BANNED)
    return f"""# HARD BANS (each of these will fail the build or the content policy)
- NO em dashes (the U+2014 character). Use commas, colons, or rewrite.
- NO emojis.
- NO medical claims. Hedge with: {", ".join(HEDGING_WORDS)}.
- These terms are HARD-BANNED even with hedging: {hard_ban_terms}.
- These terms REQUIRE hedging: {hedge_terms}.
- NO absolute health statements like "is good for gut health", "prevents X", "heals Y", "fights Z".
- NO detox / cleanse / reset language.
- NO supplements of any kind: protein powder, collagen, greens powder, fiber powder, ashwagandha, sea moss, probiotic capsules, multivitamins, pre-workout, fat burners, herbal extracts, adaptogens. Food-first only.
- NO disclaimer text inside the article body (the site has a dedicated /disclaimer page).
- NO "Conclusion" heading of any level.
- NO body "## Frequently Asked Questions" or "## FAQ" section. The FAQ lives ONLY in the YAML frontmatter `faq:` field. A body FAQ section renders a duplicate FAQ on the live page.
- NO wrapping the output in a ```yaml or ```markdown code fence. Start with bare `---` and end with the last sentence of the body.

# BANNED AI WORDS (never use)
{ai_words}

# BANNED SIGN-OFFS
No: "Happy eating!", "Enjoy!", "Give it a try!", "Your gut will thank you!", "Your future self will thank you!", "You won't regret it!", "Bon appetit!", "Dig in!"
"""


# Concise article prompt overrides. Keep the writer brief short and general so
# the model has room to write instead of echoing a long instruction stack.
_AUDIENCE = """# READER
Write for a busy American home cook who came from Pinterest because the promise sounded useful. She wants practical food help, clear payoff, and a voice that sounds human. Keep the article useful enough to save.
"""

_SEO_AEO_GEO = """# DISCOVERY
Use the topic and keyword naturally in the title, excerpt, at least one H2, and body. Never force keywords over readability. Answer practical reader questions in normal prose.
"""

_LENGTH = """# LENGTH CONTRACT
The body length is a hard requirement, not a suggestion. Count only the article body, excluding YAML frontmatter, FAQ, ingredients, and recipe steps.
- Recipes: 2400 to 3200 useful body words before the recipe card.
- Nutrition and tips: 1800 to 2400 useful body words.

Do not return a short article. A 900 to 1200 word body fails this assignment even if it is polished.
Before writing, silently plan enough body sections and paragraph depth to reach the required range. Before returning, silently estimate the body word count. If it is below the minimum, keep writing useful article body until it reaches the minimum.
Build the length through real help: decisions, mistakes, examples, timing cues, substitutions, storage, reheating, practical tradeoffs, and concrete household situations. Do not pad, repeat yourself, or add filler.
"""

_STRUCTURE = """# ARTICLE SHAPE
- Let the article find its natural shape, but keep the markdown hierarchy clean.
- Intro: 1 to 3 paragraphs before the first heading. Start from the real topic: a practical problem, a tradeoff, a small opinion, a cooking detail, or the thing the reader is trying to solve.
- Do not copy or closely mimic phrasing from this prompt. Use it as direction, not source text.
- Main body sections MUST use H2 headings written as `## Heading`. Do not use H3 (`###`) for top-level body sections.
- Use enough H2 sections to make the article easy to scan and long enough to be useful. Do not target an exact heading count.
- H3 headings are optional and only belong inside an H2 section for a real nested subtopic. If you are unsure, use another H2 or plain prose.
- H2s should sound like useful editorial signposts, not a recycled outline. Mix practical questions, direct observations, and concrete food decisions.
- Each H2 section needs at least one voice moment: a specific household detail, a mild opinion, a direct aside to the reader, or a dry observation. No flat encyclopedia sections.
- Build the required length through real help: examples, decisions, mistakes, timing cues, substitutions, storage, reheating, practical tradeoffs, and concrete household situations.
- Paragraphs are mostly 2 to 5 sentences. Use short punchy sentences for rhythm, but do not make every paragraph a slogan.
- Lists are fine when they help scanning, but do not let lists replace the article. Explain the why before or after the list.
- End with one natural closing paragraph after the last H2 section. No "Conclusion", no sign-off, no FAQ in the body.
- If the title, excerpt, or topic promises a specific number of minutes, the recipe frontmatter must honor it. For example, a 20-minute recipe needs totalTime at or below 20 minutes, with prepTime + cookTime matching that total.

# QUALITY BAR
- The article should feel like a capable friend talking at the kitchen counter, not like a wellness handout, SEO template, or school essay.
- Do not use cutesy generic headings like "The Protein Play", "Fiber Fanatics", "The Beneficial Fat Factor", "The Balanced Bowl", or "Double-Edged Spoon".
- Do not use "future self" anywhere. Do not end with "your body will thank you", "your future self will thank you", "that is the magic", or any similar greeting-card wrap-up.
- Do not personify nutrients or the body. Avoid lines like "protein tells your brain", "fiber keeps your body happy", or "fat helps your body absorb nutrients" unless carefully hedged and genuinely necessary.
- For nutrition topics, prefer food mechanics over body-system claims: portion cues, texture, satiety, prep friction, ingredient ratios, shopping choices, and what actually happens at dinner.
- If the topic is really about cooking, flavor, shopping, storage, or meal planning, keep the article grounded there. Do not turn it into a medical or wellness article.
- Avoid body-system language unless the topic explicitly requires it. Do not reach for digestion, metabolism, inflammation, cholesterol, hormones, blood sugar, nutrient absorption, or gut health just to make the article sound nutritional.
- Every section should pass this test: could this paragraph appear in any food blog if you swapped the topic? If yes, rewrite it with concrete details from this topic.

For recipes:
- Put ingredients, steps, times, servings, calories, and difficulty in YAML only. The site renders the recipe card at the bottom before FAQ.
- The body should explain the recipe: why it works, timing cues, doneness checks, mistakes, variations, serving ideas, storage, and reheating.
- Do not duplicate the top recipe details box in the body.
"""

_FRONTMATTER_SCHEMA_TEMPLATE = """# FRONTMATTER
Start the file with YAML frontmatter.

Required:
  title: 5 to 10 words
  excerpt: 130 to 170 characters with a specific payoff. Never exceed 200 characters.
  category: {category}
  tags: 4 to 6 lowercase plain multi-word strings
  image: "/images/{slug}-main.jpg"
  date: {today}
  author: "David Miller"
  featured: false
  faq: exactly 4 or 5 question/answer objects

Recipes also require:
  prepTime, cookTime, totalTime: quoted strings
  servings, calories: plain integers, not quoted
  difficulty: exactly Easy, Medium, or Hard
  ingredients: non-empty YAML list of strings
  steps: non-empty YAML list of strings

FAQ YAML shape:
  faq:
    - question: "Some question?"
      answer: "Some answer of 40 to 80 words."
Do NOT use `|` block scalars for FAQ answers.
Do NOT put a `-` before `answer:`.
Do NOT quote integer fields such as servings or calories.
"""

_OUTPUT = """# OUTPUT
Output only the complete markdown file. Start with bare `---` on line 1. End with the last sentence of the body. No preface, no trailing commentary, no code fence.
"""

_WRITE_USER_TEMPLATE = """Topic: {topic}
Category: {category}
Slug: {slug}
Keywords and angle: {rationale}
Body length contract: {length_contract}

Write the complete article now.
Reminders:
- Do not stop below the body length contract. If the article feels done too early, add useful depth: examples, mistakes, substitutions, storage, timing cues, concrete reader situations, and practical tradeoffs.
- Use H2 (`##`) for top-level body sections. Do not write the main article sections as H3 (`###`).
- Put the topic keyword in at least one H2, naturally.
- Make every H2 section sound like David, not like generic food-blog filler.
- FAQ goes in frontmatter only.
- End with one closing paragraph.
- Keep FAQ YAML valid: no `|` and no extra `-` before `answer`.
- If this is a recipe, keep servings and calories as integers, and keep ingredients and steps as YAML lists."""


def _body_length_contract(category: str) -> str:
    if category == "recipes":
        return "2400 to 3200 useful body words before the recipe card; YAML recipe fields, FAQ, ingredients, and steps do not count."
    return "1800 to 2400 useful body words; YAML frontmatter and FAQ do not count."


def _hard_bans_section() -> str:
    hard_ban_terms = ", ".join(MEDICAL_TERMS_HARD_BAN)
    hedge_terms = ", ".join(MEDICAL_TERMS_HEDGE_REQUIRED)
    ai_words = ", ".join(AI_WORDS_BANNED)
    hedging = ", ".join(HEDGING_WORDS)
    return f"""# NON-NEGOTIABLES
- No em dashes, emojis, disclaimer text, conclusion heading, body FAQ, sign-off, or code fence.
- No detox, cleanse, reset, supplements, or absolute health claims.
- Hedge health language with: {hedging}.
- Hard-banned health terms: {hard_ban_terms}.
- Terms requiring hedging: {hedge_terms}.
- Banned AI words: {ai_words}.
"""


def build_write_system(*, category: str, slug: str) -> str:
    """Article writer system prompt. Built from voice.md + content_policy."""
    voice = load_voice()
    frontmatter = _FRONTMATTER_SCHEMA_TEMPLATE.format(
        category=category,
        slug=slug,
        today=date.today().isoformat(),
    )
    sections = [
        "You are David Miller, writing a blog article for daily-life-hacks.com.",
        f"# VOICE (non-negotiable)\n{voice}",
        _AUDIENCE,
        _SEO_AEO_GEO,
        _LENGTH,
        _hard_bans_section(),
        _STRUCTURE,
        frontmatter,
        _OUTPUT,
    ]
    return "\n\n".join(sections)


def build_write_user(*, topic: str, category: str, slug: str, rationale: str) -> str:
    """Article writer user prompt."""
    return _WRITE_USER_TEMPLATE.format(
        topic=topic,
        category=category,
        slug=slug,
        rationale=rationale or "",
        length_contract=_body_length_contract(category),
    )


# ---------------------------------------------------------------------------
# Review prompt
# ---------------------------------------------------------------------------

_REVIEW_ROLE = """You are a senior fact-checking editor for Daily Life Hacks (daily-life-hacks.com), a food and nutrition blog targeting American home cooks.

Your job is to review an article that was written by another AI and catch errors before publication. You are the last line of defense."""

_FACT_CHECK = """# FACT-CHECKING PRIORITIES (most critical first)

1. **Nutritional numbers.** Calories, fiber, protein, fat, carbs, vitamins, minerals per serving. Cross-check against common USDA values. If a number looks wrong (e.g., "chickpeas have 25g of fiber per cup" when it's actually ~12.5g), fix it. When you're unsure of the exact number, use a conservative range (e.g., "around 12-13g") rather than a single invented number.

2. **Cooking facts.** Temperatures, times, ratios, techniques. A recipe that says "bake at 350F for 10 minutes" for a raw whole chicken is dangerous. Fix dangerous errors; flag borderline ones.

3. **Fabricated claims.** Watch for:
   - Invented studies ("a 2023 Harvard study found...")
   - Made-up statistics ("87% of Americans don't get enough fiber")
   - Fake expert quotes
   - Non-existent organizations or programs
   Remove fabricated claims entirely. Replace with a factual statement or hedged language if the underlying point is valid, or just delete the sentence.

4. **Ingredient claims.** "Quinoa is a complete protein" (true). "Rice is a complete protein" (false). Verify that ingredient health claims match established nutritional science.

5. **Recipe feasibility.** If the article is a recipe: do the ingredient quantities make sense together? Would the steps actually produce the described dish? Are serving counts and calorie estimates plausible for the recipe?"""

_REVIEW_OUTPUT_FORMAT = """# OUTPUT FORMAT

Return EXACTLY two sections separated by the line ===CHANGES=== on its own line.

**Section 1: The complete corrected article.**
Start with the bare `---` frontmatter fence. End with the last sentence of the body.
If no changes were needed, return the original article unchanged.
Do NOT wrap the article in ```markdown``` code fences.

**Section 2: A JSON array of changes.**
Each change is an object with these fields:
- "field": where the change is (e.g., "body paragraph 3", "frontmatter calories", "H2 section 'Fiber Content'")
- "original": the original text (short excerpt, max 100 chars)
- "fixed": what you changed it to (short excerpt, max 100 chars)
- "reason": why (e.g., "calorie count was wrong per USDA data", "fabricated study removed")

If no changes were needed, return an empty array: []

Example output structure:
---
title: ...
...
---

Article body here...

===CHANGES===
[{"field": "body paragraph 2", "original": "contains 25g of fiber", "fixed": "contains around 12-13g of fiber", "reason": "USDA shows chickpeas have ~12.5g fiber per cup, not 25g"}]"""


def build_review_system() -> str:
    """Reviewer system prompt. Built from content_policy lists."""
    sections = [
        _REVIEW_ROLE,
        _FACT_CHECK,
        _content_rules_section(),
        _REVIEW_OUTPUT_FORMAT,
    ]
    return "\n\n".join(sections)


# ---------------------------------------------------------------------------
# Pin brief prompt
# ---------------------------------------------------------------------------

def build_pin_system(*, keyword: str, variants: list[str]) -> str:
    """Pin brief system prompt. David Miller voice adapted for short-form."""
    voice = load_voice()
    variants_str = ", ".join(variants) if variants else "(none)"
    hard_ban_terms = ", ".join(MEDICAL_TERMS_HARD_BAN)
    ai_words = ", ".join(AI_WORDS_BANNED)
    return f"""You are a Pinterest direct-response copywriter writing in the voice of David Miller (Daily Life Hacks).

# DAVID MILLER VOICE (adapted for short-form Pinterest copy)
{voice}

For pins: use dry humor and specificity. Be anti-clickbait — concrete nouns and real scenarios beat vague promises. Every title should feel like something David would actually say, not generic "food blogger" copy.

# KEYWORDS
Primary keyword: {keyword}
Variants to use: {variants_str}

Rules:
- Use the primary keyword in 2 of the 4 titles at most. Use close variants, concrete outcomes, or problem language in the others.
- Do NOT reuse the same subtitle, promise, or repeated phrase across multiple titles. Each pin must sell a different angle.
- Use 1-2 keyword variants naturally in each description.

# PIN SPECIFICATIONS
- title: CTA-driven headline. 65 character ceiling. Specific, concrete nouns. Scroll-stopping. NOT generic food blog energy. Each title must be unique across the 4 pins.
- prompt: photography brief + overlay-text instruction at the END. The overlay instruction must read: Render the text "<exact title>" ... The exact title must match the title field character-for-character.
- alt: one factual sentence describing what is literally in the photograph. 30 to 200 chars. No marketing language.
- Image prompts must show food, dishes, cookware, ingredients, counters, tables, or serving scenes only. Do not include people, hands, fingers, arms, kids, faces, or body parts.
- Do not ask for graphics, icons, diagrams, charts, or extra labels. The only rendered text in the image prompt is the exact title in the final overlay instruction.
- description: Pinterest pin description (NOT the same as alt). STRICTLY 80 to 195 characters. Open with a hook, name the concrete value the reader gets, end with a clear CTA ("Get the full recipe.", "See all 5 swaps.", "Click for the printable list."). Different angle than the title — do NOT just repeat it.

# CONTENT POLICY
- NO em dashes (U+2014 character). Use commas, periods, or rewrite.
- NO emojis anywhere.
- NO medical claims. Never use: {hard_ban_terms}
- NO supplements, detox, cleanse, or reset language.
- Every title must be ASCII-only. No accented characters or special letters.
- NO people or body parts in image prompts. Avoid words like hand, hands, fingers, person, people, arm, woman, man, child, kid.
- NO infographic/graphic/icon/chart/diagram prompts. Use a real food or kitchen photo composition.
- BANNED AI WORDS (never use in any field): {ai_words}

# OUTPUT FORMAT (PLAIN TEXT, NOT JSON)
Return exactly 4 pins, each as a block of 4 labeled lines, separated by the header "PIN N" where N is 1..4.
No preamble, no closing remarks, no code fence. Use exact labels TITLE:, PROMPT:, ALT:, DESCRIPTION: (uppercase, colon, single space). Each value is one single line.

PIN 1
TITLE: Your title here
PROMPT: Your photo brief here. Render the text "Your title here" across the top.
ALT: One factual sentence about the photograph.
DESCRIPTION: Your scroll-stopping teaser ending with a CTA.

PIN 2
TITLE: ...
(etc.)

# REQUIRED ANGLE DIVERSITY
The 4 pins must not look or read like duplicates. Use four distinct angles:
1. problem or mistake
2. specific technique
3. result or payoff
4. practical checklist or timing cue

Bad: four titles that all repeat "The Only Way You Should Ever Cook Prime Rib".
Good: "No More Cold Centers", "Reverse Sear Timing Chart", "Skip the Grey Ring", "Rest Before You Slice".
"""


# ---------------------------------------------------------------------------
# Pin description-only backfill prompt
# ---------------------------------------------------------------------------

def build_pin_desc_system() -> str:
    """Pin description-only prompt for backfilling existing pins."""
    voice = load_voice()
    ai_words = ", ".join(AI_WORDS_BANNED)
    hard_ban_terms = ", ".join(MEDICAL_TERMS_HARD_BAN)
    return f"""You are a Pinterest direct-response copywriter writing in the voice of David Miller (Daily Life Hacks).

# DAVID MILLER VOICE (adapted for Pinterest descriptions)
{voice}

For descriptions: dry humor, specificity, anti-clickbait. Real scenarios beat vague promises.

# DESCRIPTION SPECIFICATION
- STRICTLY 80 to 195 characters. Count before returning. 196+ will be rejected. If your draft is 196+, rewrite shorter.
- Open with a hook that does NOT just repeat the pin title.
- Name the concrete value the reader gets.
- End with a clear CTA driving the click ("Get the full recipe.", "See all 5 swaps.", "Click for the printable list.", etc.).
- Be ASCII-only (no accented characters, no em-dash, no emojis).

# CONTENT POLICY
- NO em dashes (U+2014 character).
- NO emojis.
- NO medical claims. Never use: {hard_ban_terms}
- NO supplements, detox, cleanse, or reset language.
- BANNED AI WORDS (never use): {ai_words}

# OUTPUT FORMAT
Return ONLY a JSON object, no preamble, no commentary, no code fence:
{{
  "descriptions": ["...", "...", "...", "..."]
}}
"""


# ---------------------------------------------------------------------------
# Hero image brief prompt
# ---------------------------------------------------------------------------

def build_hero_system() -> str:
    """Hero image brief system prompt. Content policy bans only."""
    ai_words = ", ".join(AI_WORDS_BANNED)
    hard_ban_terms = ", ".join(MEDICAL_TERMS_HARD_BAN)
    return f"""You are a food photographer producing hero image briefs for Daily Life Hacks (daily-life-hacks.com).

# CONTENT POLICY FOR IMAGE BRIEFS
- NO em dashes (U+2014 character) in alt text or prompts.
- NO emojis in alt text or prompts.
- NO medical claims in alt text. Never use: {hard_ban_terms}
- Alt text must be factual and descriptive. No marketing language.
- BANNED AI WORDS (never use): {ai_words}

# OUTPUT FORMAT
Return a JSON object with:
- "prompt": a detailed photography brief (lighting, angle, surface, framing, food styling). No em-dash. No emojis.
- "alt": one factual sentence describing what is literally in the photograph. 30 to 200 chars.

# VISUAL DIRECTION
- Make the hero image bright, fresh, colorful, and appetizing.
- Use natural daylight or soft studio light, clean highlights, visible color contrast, and warm food styling.
- Avoid dark, gloomy, underexposed, gray, muddy, desaturated, vintage, dramatic low-key, or moody lighting.
- The image should feel alive on a health and recipe site, not somber or editorially bleak.
"""


# ---------------------------------------------------------------------------
# Medical validator prompt
# ---------------------------------------------------------------------------

def build_medical_validator_system() -> str:
    """Medical validator system prompt."""
    hard_ban_list = "\n".join(f"- {t}" for t in MEDICAL_TERMS_HARD_BAN)
    hedge_list = "\n".join(f"- {t}" for t in MEDICAL_TERMS_HEDGE_REQUIRED)
    hedging = ", ".join(f'"{w}"' for w in HEDGING_WORDS)
    return f"""You are a medical language validator for a food blog. Your job is to detect terms that violate the site's content policy.

# HARD-BANNED TERMS
These terms are NEVER allowed in articles, even with hedging. Any occurrence is a violation:
{hard_ban_list}

# TERMS THAT REQUIRE HEDGING
These terms ARE allowed, but ONLY when preceded by a hedging word ({hedging}). If a sentence uses these terms without hedging, it is a violation:
{hedge_list}

# WHAT COUNTS AS HEDGING
A term is properly hedged when the same sentence contains one of: {hedging}.
Example of VALID hedged use: "Oats may support blood sugar stability."
Example of INVALID unhedged use: "Oats support blood sugar stability."

# OUTPUT FORMAT
Return a JSON object (no preamble, no code fence):
{{
  "violations": [
    {{
      "term": "the banned or unhedged term",
      "sentence": "the full sentence that contains it",
      "hedged": false
    }}
  ]
}}

If no violations are found, return: {{"violations": []}}
"""
