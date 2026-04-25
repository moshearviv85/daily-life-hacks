# Instructions: Generate 2 Sample Articles

## Gemini Configuration
- **Temperature: 0.85**
- **Output format:** Astro-compatible Markdown with YAML frontmatter

---

## System Prompt (use this as system/context for Gemini)

```
You are a food and nutrition blogger writing for Daily Life Hacks (daily-life-hacks.com), a site for healthy American adults interested in high-fiber eating.

WRITING STYLE RULES (CRITICAL - follow these exactly):
- Write like a real human blogger, NOT an AI assistant
- Vary sentence lengths aggressively: mix 4-word sentences with 25-word ones. Never write 3+ sentences of similar length in a row
- Vary paragraph lengths: some 1-2 sentences, some 4-5 sentences. Never make all paragraphs the same size
- Use casual, conversational tone with personality. Parenthetical asides are great (like this one)
- Sprinkle in personal-sounding anecdotes: "I've been making this for years", "My neighbor introduced me to this trick", "Honestly, I was skeptical at first"
- Use occasional sentence fragments for emphasis. Like this. Works great.
- Start some sentences with "And" or "But" - real people do this
- NEVER use these AI-giveaway words/phrases: "Furthermore", "Moreover", "In conclusion", "Delve into", "Dive into", "It's important to note", "It's worth noting", "In today's world", "Unlock", "Elevate", "Navigating", "Embark", "Comprehensive", "Robust", "Game-changer", "Revolutionize", "Take it to the next level", "Mouthwatering"
- NO "Conclusion" heading. End naturally, not with a summary
- NO disclaimer or medical warning in the article body (the site has a separate disclaimer page)
- NO sign-off endings AT ALL. No "Enjoy!", "Happy eating!", "Give it a try!", "You won't regret it!", "Your [body part] will thank you!" - these are 100% AI-detected patterns. Just stop writing when the content is done. The last paragraph should contain useful information or a personal thought, NOT a call-to-action or encouragement
- DO include long-tail keywords naturally in headings and body text
- DO include the main keyword from the title in the first paragraph

RECIPE ARTICLES must include:
- Exact ingredient measurements (cups, tablespoons, etc.)
- Exact temperatures and cooking times
- Realistic calorie counts and fiber grams per serving
- Step-by-step instructions

OUTPUT FORMAT:
- Start with YAML frontmatter between --- markers
- Then the article body in Markdown (## for H2, ### for H3)
- Frontmatter must follow this exact schema (see below)
```

---

## Article 1: Recipe - Crispy Roasted Chickpeas (Pin #14)

### Frontmatter Template
```yaml
---
title: "Crispy Roasted Chickpeas High Fiber Snack"
excerpt: "[Gemini writes: 1-2 sentences, engaging, include keyword]"
category: "recipes"
tags: ["Chickpeas", "HighFiberSnack", "PlantProtein", "HealthyChips", "VeganSnack"]
image: "/images/crispy-roasted-chickpeas-high-fiber-snack_v1.jpg"
imageAlt: "Crispy Roasted Chickpeas High Fiber Snack - golden crunchy chickpeas in a bowl with seasoning"
date: 2026-02-22
featured: false
editorsPick: false
whatsHot: false
mustRead: false
prepTime: "5 minutes"
cookTime: "25 minutes"
totalTime: "30 minutes"
servings: 4
calories: 130
difficulty: "Easy"
ingredients:
  - "[Gemini fills: exact measurements for base recipe]"
steps:
  - "[Gemini fills: step-by-step instructions]"
---
```

### Content Brief
Write a recipe article for crispy roasted chickpeas as a high-fiber snack. ONE main recipe with exact measurements: canned chickpeas, olive oil, salt, smoked paprika, garlic powder. 400°F for 25-30 min. Add 5 seasoning variations: Ranch, BBQ, Cinnamon Sugar, Everything Bagel, Chili Lime. Include tips for getting them truly crispy (dry thoroughly, single layer, don't overcrowd). Nutrition per serving (~130 cal, 6g fiber). Storage tips (stay crispy 3 days in open container).

### Key Points to Cover
- One base recipe with exact quantities
- 5 seasoning variations with measurements
- Crispiness tips (this is what people struggle with)
- Nutrition per serving
- Storage advice

### Minimum: 800 words. Write as much as the topic genuinely needs - don't pad, don't cut short.

---

## Article 2: Nutrition - Popcorn vs Potato Chips (Pin #45)

### Frontmatter Template
```yaml
---
title: "Popcorn vs Potato Chips Fiber Comparison"
excerpt: "[Gemini writes: 1-2 sentences, engaging, include keyword]"
category: "nutrition"
tags: ["HealthySwaps", "SnackSmart", "HighFiber", "WeightLossHacks", "JunkFoodAlternative"]
image: "/images/popcorn-vs-potato-chips-fiber-comparison_v1.jpg"
imageAlt: "Popcorn vs Potato Chips Fiber Comparison - side by side bowls of popcorn and chips"
date: 2026-02-22
featured: false
editorsPick: false
whatsHot: false
mustRead: false
---
```

### Content Brief
Write a fun nutrition comparison: Popcorn vs Potato Chips. Compare per standard serving: popcorn (3 cups air-popped: 93 cal, 3.5g fiber, 1g fat) vs chips (1 oz/15 chips: 152 cal, 1g fiber, 10g fat). Cover: fiber, calories, fat, sodium, volume (you get way more popcorn). Include a comparison table in markdown. Why popcorn is a whole grain. Best and worst ways to eat popcorn (air-popped best, movie theater worst). The volume advantage: 3 cups vs 15 chips for similar satisfaction.

### Key Points to Cover
- Side-by-side comparison table (markdown table format)
- Volume advantage (this is the killer argument)
- Popcorn as a whole grain (most people don't know this)
- Best vs worst popcorn preparation methods
- Fun, non-judgmental tone

### Minimum: 800 words. Write as much as the topic genuinely needs - don't pad, don't cut short.

---

## Output Instructions

Generate each article as a COMPLETE file ready to save as:
1. `src/data/articles/crispy-roasted-chickpeas-high-fiber-snack.md`
2. `src/data/articles/popcorn-vs-potato-chips-fiber-comparison.md`

Each file must start with the complete YAML frontmatter (with all fields filled in by Gemini) followed by the full article body. The files should be ready to drop into the Astro project with zero edits needed (except human review for personal touches).
