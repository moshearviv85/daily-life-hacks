---
name: article-writing
description: Write a new Daily Life Hacks article matching the established voice and SEO patterns derived from 86 published articles
---

# Article Writing - Daily Life Hacks

## When to use

Invoke this skill whenever writing a new article for daily-life-hacks.com. Read it once per article session before producing any content.

## Inputs

- **topic** (required): the article topic or slug
- **category** (required): `nutrition`, `recipes`, or `tips`
- **target keywords** (optional): 2-4 long-tail keyword phrases the article should rank for
- **recipe details** (optional, recipes only): ingredients list, cooking times, servings, calories

---

## Voice — use the david-miller-voice SKILL

**Single source of truth for voice:** `.cursor/skills/david-miller-voice/SKILL.md`

That SKILL owns every voice rule: contractions, no em dashes, no emojis, banned AI phrases, no sign-off closings, hedging health claims, no hype, no lecturing. Read it once per writing session. Do not re-specify voice rules here.

**Critical:** the voice must show in **every paragraph**, not just the opening and closing. Each H2 section should have at least one voice moment — a confident aside, a direct address to the reader, a dry observation, or a specific anecdote. Flat exposition in the middle of the article is the most common voice failure. See the verbatim corpus examples below for how the voice plays out across a full article.

## Article-specific content rules (on top of the voice SKILL)

These are content bans that apply to article bodies regardless of voice:

| Rule | Why | Wrong |
|------|-----|-------|
| No disclaimer in body | site has a dedicated `/disclaimer` page | "Consult a doctor before..." inline |
| No absolute health statement | legal + trust | "is good for your gut", "prevents cancer" |
| No detox/cleanse language | anti-pseudoscience stance | "detox", "cleanse", "reset your system" |
| **No supplements of any kind** | food-first positioning; if a topic only works via supplementation, reject it | synthetic (protein powder, vitamins, fat burners, pre-workout) AND "natural" (herbal extracts, adaptogens, probiotic capsules, fiber powders, collagen powders, greens powders, sea moss, ashwagandha, etc.) |

---

## Frontmatter template

```yaml
---
title: "Exact Title Here"
excerpt: "One to two sentences. Conversational hook. Include the main keyword naturally. 130-160 characters typical."
category: "recipes"   # nutrition | recipes | tips
tags: ["TagOne", "TagTwo", "TagThree", "TagFour", "TagFive"]
image: "/images/{slug}-main.jpg"
imageAlt: "Descriptive alt text - specific food or scene, no keyword stuffing"
date: 2026-04-21
author: "David Miller"
featured: false
editorsPick: false
whatsHot: false
mustRead: false
# Recipe-only fields (omit entirely for nutrition/tips):
prepTime: "10 minutes"
cookTime: "25 minutes"
totalTime: "35 minutes"
servings: 4
calories: 340
difficulty: "Easy"   # Easy | Medium | Hard
ingredients:
  - "1 cup dry lentils, rinsed"
steps:
  - "Heat oil in a large pot over medium heat."
faq:
  - question: "Question text here?"
    answer: "Answer text. Use hedging language for health claims."
---
```

### Frontmatter field rules

**title:** 5-10 words typical. Do not use quotes unless the title itself requires them. Measured from corpus: titles range from 5 to 12 words.

**excerpt:** Must hook the reader in the first few words. Often uses a problem statement or surprising claim. End without a period if it reads like a tagline. Real examples from corpus:
- "Stop crashing at ten in the morning. Learn how to build a balanced breakfast that keeps you full without requiring an hour of meal prep."
- "Salmon and veggies on one sheet pan, in about 30 minutes. Minimal cleanup, real food, and a reliable weeknight dinner you can repeat anytime."
- "Roasted chickpeas are cheap, crunchy, and easy to season. Dry them well, spread them out, and you get chip-style crunch without the guesswork."

**tags:** Two conventions exist in the corpus - older articles used PascalCaseLongKeywordPhrases (e.g., `HighFiberMealsForConstipation`); newer articles use plain lowercase multi-word tags (e.g., `"high fiber fruits"`, `"meal prep lunch"`). Prefer the newer plain lowercase style for new articles. 4-6 tags per article is the norm. Include the main keyword phrase, 2-3 category concepts, and 1-2 modifiers.

**author:** Always exactly `"David Miller"` - never omit.

**Boolean flags:** All four default to `false`. Only set `featured: true` if explicitly requested. Never set more than one flag to true per article.

**faq:** Always include 4-5 FAQ entries. Each question should target a real long-tail keyword variant. Answers use hedging language for any health claims. Answers range 40-90 words each.

---

## Article structure template

### Intro (before first H2)

**Length:** 1-3 paragraphs. Usually 2.
**Pattern:** Open with a relatable scenario, problem, or personal anecdote. Name the pain point in sentence one. Deliver the promise or angle of the article by paragraph two. Do NOT front-load the keyword - let it appear naturally by the second paragraph.

**Real opening lines from corpus (verbatim - study these):**
- "We've all done it. You grab a plain piece of toast and a cup of coffee at seven in the morning." (balanced-breakfast)
- "You know those nights when you want takeout, but you also want to feel like a responsible adult who eats vegetables?" (lentil-curry)
- "I used to cook everything in extra virgin olive oil. Eggs, stir-fries, pancakes, seared steak. Everything." (cooking-oils)
- "Risotto has a reputation. People act like making it requires a culinary degree and an hour of unbroken eye contact with a saucepan." (mushroom-barley-risotto)
- "My partner doesn't eat mushrooms. Or bell peppers. Or 'anything with a weird texture,' which is a category so broad it basically means anything I'd find interesting to cook." (cooking-for-picky-adults)
- "If you want a high fiber snack that feels like junk food cosplay, roasted chickpeas are the move." (crispy-roasted-chickpeas)
- "Some nights you do not have a zen hour to chop a rainbow. You have twenty minutes, a hungry household, and a sink that is already half full." (quick-20-minute-meals)
- "Avocado toast became a cliche because it photographs well and takes almost no skill. That is not an insult. It is a feature." (avocado-toast)

**Pattern analysis:** Openings almost never start with "In this article..." or "Are you wondering...". They drop into a scene, a confession, a contrast, or a sharp opinion.

### H2 headings

**Count:** 4-8 H2s per article (mode is 5-6).
**Style:** Plain language, not clickbait. No em dashes. Mix question-style with statement-style. The main keyword appears in at least one H2 but not all of them.

**Real H2 examples from corpus:**
- "## The missing pieces"
- "## Why red lentils are the best shortcut"
- "## The hands off magic trick"
- "## What to serve on the side"
- "## Small changes, big impact"
- "## The protein breakdown"
- "## When to use Greek yogurt"
- "## The whole grain bread part"
- "## Build a Prep Menu in Three Buckets"
- "## The honest bottom line"
- "## Common mistakes that backfire"

**Pattern:** H2s tell a logical story - why, what, how, variations, storage/tips. They don't just list keywords.

### H3 headings

**Usage:** Optional. Appear when an H2 section has 2+ distinct sub-points that each need their own paragraph. Never use H3 just for decoration. Older articles overuse H3; newer articles tend to avoid them or use sparingly.

### Paragraph structure (burstiness)

Short punchy sentences mixed with longer flowing ones. Never 3+ long sentences in a row. The corpus shows a clear rhythm: short declarative sentence, then a longer explanatory sentence, then possibly another short one.

**Real examples of burstiness from corpus:**
- "Tempeh is a slightly different beast. It's made from fermented soy (and sometimes mixed with grains). It's much denser, has a firmer bite, and carries a nuttier taste, giving you roughly 15 to 16 grams of protein per 3 ounces."
- "Toasting the dry spices is the step most people skip, and it's the most important one. When you drop the curry powder, turmeric, and cumin into the hot oil for thirty seconds, the heat wakes up the oils in the spices. It takes away the raw, dusty flavor."
- "Don't overcomplicate this. You don't need a spreadsheet to make breakfast. Just aim for three components."
- "These are still calorie dense because nut butter is calorie dense. That is not a moral statement. It is just math."

**Paragraph length:** 2-5 sentences per paragraph. Rarely more than 5. Single-sentence paragraphs appear often as emphasis or transition.

### Lists

**Bulleted lists:** Use for variations, swaps, options where order doesn't matter. Introduced with a short sentence. Items are 1-2 sentences each or short phrases.

**Numbered lists:** Use only for recipe steps or sequential processes (the initial seasoning process, a 7-day plan, packing order).

**Bold in lists:** Use `**Label:**` at the start of a bullet when giving a named option or variation. Real example: `* **The classic grains:** A scoop of basmati rice or brown rice is the traditional move.`

**Avoid:** Lists of more than 6-7 items. Lists where every bullet is a single disconnected fragment. Lists that substitute for prose explanation.

### Closing pattern

The last section should feel like a natural ending, not a formal conclusion. Options the corpus uses:
1. One practical takeaway paragraph that brings it back to the reader's daily life
2. The final H2 is a practical tip section ("Storage and reheating rules", "A few no-stress tips"), and the article ends after that section without an additional closing sentence
3. A direct, confident statement: "That's the whole pitch." / "It proves that plant-based meals don't have to leave you hungry an hour later."

**Real closings from corpus (verbatim):**
- "It's the kind of dinner that makes you feel like you put in a lot of effort, even though you spent most of the cooking time in another room." (mushroom-barley-risotto)
- "Deciding between cottage cheese vs Greek yogurt isn't a competition. They're just two different tools. Keep yogurt for your sweet mornings and cottage cheese for your savory afternoons, and your fridge will be a much happier place." (cottage-cheese-vs-greek-yogurt)
- "The simplest thing you can do to improve cooking at home is match your oil to your heat. It takes about two seconds of thought, costs nothing extra, and your food will taste better. That's the whole pitch." (cooking-oils)
- "This lentil curry high fiber vegan dinner is the kind of recipe that makes you look forward to eating your leftovers. It's warm, it's hearty, and it asks almost nothing of you." (lentil-curry)

**Never end with:** "Happy eating!", "Enjoy!", "Give it a try!", "You won't regret it!", "Your gut will thank you!"

### Word count

**Nutrition/tips articles:** 600-1200 words in the article body (markdown, excluding frontmatter). Shorter is acceptable when the topic is tight.
**Recipe articles:** 500-1000 words in the article body. The recipe steps and FAQ carry additional length.
**Newer articles (2026) trend shorter and more structured** than early articles (2025-2026 January) which could run 1500+ words with verbose intros.

---

## SEO checklist

- [ ] Main keyword appears in the title
- [ ] Main keyword appears in the excerpt
- [ ] Main keyword appears in the first 100 words of the body
- [ ] Main keyword appears in at least one H2
- [ ] Main keyword appears naturally 3-5 times total in the body (not forced)
- [ ] Secondary keywords distributed across other H2s and body paragraphs
- [ ] Image alt text describes the visual content specifically (not generic)
- [ ] Image filename is `/images/{slug}-main.jpg` exactly (slug matches the article file slug)
- [ ] 4-5 FAQ entries with long-tail keyword variants in the questions
- [ ] Date is correct and in YYYY-MM-DD format
- [ ] Excerpt is 130-170 characters (aim for this range)
- [ ] Tags include the main keyword concept, category concepts, and format/audience modifiers

**Tag count:** 4-6 tags is the norm. Plain lowercase multi-word strings for new articles (see Frontmatter section).

**Internal linking:** The corpus does NOT show systematic internal linking in the body text. Do not add `[See also: ...]` links unless the brief specifically requests it.

---

## Article-level voice application checklist

The abstract voice rules live in `.cursor/skills/david-miller-voice/SKILL.md`. Below are the article-shape checks that confirm the voice actually lands across the full piece:

- [ ] Opening paragraph starts with a scene, confession, contrast, or direct opinion - not a definition or "In this article"
- [ ] At least one personal anecdote or "I" voice moment in the intro or a key section
- [ ] Each H2 section contains at least one voice moment (aside, hot take, direct address, specific concrete detail) - not flat exposition
- [ ] At least one short punchy sentence (under 10 words) in each major section
- [ ] Health claims use hedging language consistently throughout the body (not just intro/closing)
- [ ] No absolute health statement anywhere ("is good for gut health", "prevents", "heals", "fights", "cures")
- [ ] Closing is a natural thought, not a sign-off (see real closings above)

**Real hedging examples from corpus:**
- "fiber that may support better digestion"
- "could help you feel fuller for longer"
- "might help keep you satisfied until your next meal"
- "may help support a balanced diet"
- "it's thought to support gut health"
- "These meals are packed with roughage that may help keep your digestive system moving smoothly"
- "could positively affect your overall cholesterol numbers"

**Real personal anecdote examples from corpus:**
- "I used to cook everything in extra virgin olive oil... Then one night I cranked the heat for a stir-fry and the kitchen filled with smoke so fast my neighbor knocked on the door."
- "My partner doesn't eat mushrooms. Or bell peppers."
- "I remember one winter (it was a particularly gnarly one, snow up to my knees)..."
- "I threw this together one night when a storm knocked out our power right after I had finished cooking."

---

## Recipe-specific additions

Include this section only when `category: recipes`.

### Ingredient list format

- Each item is a YAML list string
- Format: quantity + unit + ingredient + preparation note
- Quantities spelled out as fractions or decimals: `1/2 cup`, `1 tbsp`, `2 (15 oz) cans`
- Preparation notes after a comma: `1 large yellow onion, finely diced`
- Optional items marked inline: `Optional: lime wedges, salsa, shredded cheese`
- Do NOT group ingredients by sub-recipe in YAML (keep as flat list)

### Step format

- Each step is a complete, specific instruction
- One primary action per step
- Include visual/sensory cues: "until soft and translucent", "until it smells fragrant", "until golden and crisp"
- Time ranges in steps: "5 to 6 minutes" not "5-6 minutes"
- Temperature in Fahrenheit (e.g., "400 degrees F" or "400F")
- Final step typically covers plating or serving

### Nutrition and time fields

- `prepTime`, `cookTime`, `totalTime`: written as "10 minutes", "25 minutes" (string, with the word "minutes")
- `servings`: integer (4 is the most common)
- `calories`: integer, per serving
- `difficulty`: always `"Easy"` unless recipe has advanced technique - corpus shows near 100% Easy ratings

### Recipe body sections

After the intro, a recipe article typically covers:
1. A section on a key technique or "why this works" (e.g., "Why red lentils are the best shortcut")
2. A section on building flavor or a critical step (e.g., "Building the flavor base")
3. A section on variations or customization (e.g., "Small tweaks to make it yours")
4. A storage/reheating section
5. Natural close

Do NOT write the recipe steps again in prose - they're already in the YAML frontmatter. The body explains the *why* and *how* behind the steps.

---

## Verification steps before finishing

**First:** run the voice SKILL's own rewrite checklist (`.cursor/skills/david-miller-voice/SKILL.md`).

**Then article-specific checks:**

1. **Frontmatter complete:** all required fields present, author = "David Miller", date correct, image path matches slug
2. **Category match:** category value matches the content type exactly
3. **No absolute health claim:** every health benefit statement uses a hedging word
4. **Voice carries through the middle:** each H2 section has at least one voice moment (aside, hot take, specific detail) - not flat exposition
5. **FAQ complete:** 4-5 entries, hedged health claims in answers
6. **Word count reasonable:** body text 600-1200 words for nutrition/tips, 500-1000 for recipes
7. **Tag format:** plain lowercase for new articles; 4-6 tags
8. **No supplements mentioned:** scan for protein powder, collagen, greens powder, fiber powder, vitamin pills, adaptogens, probiotic capsules, ashwagandha, sea moss, multivitamins, pre-workout, fat burners, herbal extracts in pill/capsule/powder form. If found, rewrite to food-based alternatives or remove. (Whole foods that happen to be rich in a nutrient are fine - "eggs are high in protein" is OK; "take a protein powder" is NOT.)
