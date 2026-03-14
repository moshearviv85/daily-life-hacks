# Content Sprint: 12 Articles (4 Recipes + 4 Nutrition + 4 Tips)

**Goal:** One batch of 12 new articles. Same site language and tone. No overlap with existing 43 articles. Recipes = accessible and easy but not silly; nutrition and tips = real value.

---

## Tone & constraints (all 12)

- **Language:** Match site voice (About page: practical, a bit cynical, no drama, no "saved my life," contractions, no em dashes/emojis).
- **No medical claims:** No "cures," "treats," "relieves"; use "may support," "could help."
- **No detox/cleanse language.** No "perfect meal plans" or guilt.
- **Recipes:** Realistic quantities, calories, times; doable on a weeknight; not 40-step or "chill overnight when you're starving."
- **Nutrition/Tips:** Genuine takeaway; no fluff or obvious lists; avoid repeating existing pillars (we already have many fiber/gut pieces).

---

## 4 Recipes (slugs)

| # | Slug | Note |
|---|------|------|
| 1 | `easy-one-pot-chicken-and-rice-dinner` | Weeknight one-pot; realistic servings and time. |
| 2 | `healthy-turkey-meatballs-meal-prep` | Meal-prep friendly; not fussy. |
| 3 | `sheet-pan-salmon-and-vegetables-30-minutes` | One pan, ~30 min; clear temps/times. |
| 4 | `easy-black-bean-tacos-weeknight-dinner` | Simple tacos; accessible ingredients. |

---

## 4 Nutrition (slugs)

| # | Slug | Note |
|---|------|------|
| 5 | `how-much-protein-do-you-need-per-day` | Practical ranges, no bro-science; hedge claims. |
| 6 | `plant-based-protein-sources-complete-guide` | Real list with portions/ideas; no preaching. |
| 7 | `healthy-fats-list-foods-to-eat-daily` | Everyday foods; no "good vs bad" drama. |
| 8 | `best-breakfast-foods-for-sustained-energy` | Evidence-based, practical; no miracle claims. |

---

## 4 Tips (slugs)

| # | Slug | Note |
|---|------|------|
| 9  | `kitchen-tools-that-save-time-and-money` | Concrete tools; avoid overlap with "organize kitchen" / "meal prep." |
| 10 | `how-to-use-leftover-rice-creative-ideas` | Real ideas (fried rice, soups, etc.); not generic. |
| 11 | `how-to-cook-dried-beans-from-scratch` | Soak/cook times, no salt myths; practical. |
| 12 | `how-to-season-cast-iron-skillet-properly` | Clear steps; care/maintenance in site voice. |

---

## Execution

- **Writer:** Gemini (per project decision); use `pipeline-data/gemini-article-instructions.md` and example articles.
- **Format:** Recipes use full recipe frontmatter (prepTime, cookTime, servings, calories, difficulty, ingredients, steps). Nutrition and tips use article frontmatter only (no recipe fields).
- **Images:** After articles are approved, run image generation (web + pin variants) per existing pipeline.
- **Registry:** Add each new article to `pipeline-data/content-registry.json` (and public copy) when published.

---

## Status

Drafts written: all 12. Location: `pipeline-data/drafts/` (one .md per slug). Compliance: no banned words, no medical claims, no detox/cleanse, no Conclusion/sign-off; tone = site-general (warm, practical), not exaggerated About.

| Slug | Teaser (for email) | Draft | Edited | Approved | Images | Published |
|------|-------------------|-------|--------|----------|--------|-----------|
| easy-one-pot-chicken-and-rice-dinner | One pot, one mess. You brown the chicken, add rice and broth, and let it simmer. No three skillets, no pile of dishes. Tuesday can stay chill. | yes | | | | |
| healthy-turkey-meatballs-meal-prep | Turkey meatballs that don't taste like cardboard. Make a batch once, then eat them with pasta, in a sandwich, or over rice all week. They actually reheat. | yes | | | | |
| sheet-pan-salmon-and-vegetables-30-minutes | Salmon and veggies on one tray. You slide it in, set a timer, and walk away. One pan to wash when you're done. | yes | | | | |
| easy-black-bean-tacos-weeknight-dinner | Two cans, a skillet, tortillas. Dinner in 15 minutes. No long simmering and no guilt trip. Tacos don't need a backstory. | yes | | | | |
| how-much-protein-do-you-need-per-day | Not one magic number. A sane range based on your size and how you actually move. No spreadsheets, no bro-science. | yes | | | | |
| plant-based-protein-sources-complete-guide | Beans, lentils, tofu, nuts. What to buy, how much, and how to use it without turning dinner into a sermon. | yes | | | | |
| healthy-fats-list-foods-to-eat-daily | Oils, nuts, avocado, fatty fish. Real foods you can eat without turning every meal into a macro-tracking project. | yes | | | | |
| best-breakfast-foods-for-sustained-energy | What to eat so you don't crash at 10 a.m. Protein and fiber, less sugar. No miracle claims. Just what keeps you from wanting a nap with your coffee. | yes | | | | |
| kitchen-tools-that-save-time-and-money | The few tools that actually earn their place. Knife, board, sheet pan, can opener. Not a drawer full of junk you never touch. | yes | | | | |
| how-to-use-leftover-rice-creative-ideas | That container of rice in the back of the fridge. Fried rice, soup, fritters, stuffed peppers. Real ideas before it becomes a science experiment. | yes | | | | |
| how-to-cook-dried-beans-from-scratch | Soak, simmer, season. Cheaper than cans and you control the salt. One batch and you're set for tacos and soups all week. | yes | | | | |
| how-to-season-cast-iron-skillet-properly | A thin layer of oil baked on. Simple method, 60 seconds of upkeep after you cook. No mystery, no ruined pan. | yes | | | | |

---

## Teaser bank (copy-paste for daily email)

Use these in the daily email template: **Block 1** = today's article, **Block 2** = tomorrow's article. Replace title + teaser + link each day.

| Day | Slug | Title | Teaser |
|-----|------|-------|--------|
| 1 | easy-one-pot-chicken-and-rice-dinner | Easy One-Pot Chicken and Rice Dinner | One pot, one mess. You brown the chicken, add rice and broth, and let it simmer. No three skillets, no pile of dishes. Tuesday can stay chill. |
| 2 | how-much-protein-do-you-need-per-day | How Much Protein Do You Need Per Day? | Not one magic number. A sane range based on your size and how you actually move. No spreadsheets, no bro-science. |
| 3 | kitchen-tools-that-save-time-and-money | Kitchen Tools That Save Time and Money | The few tools that actually earn their place. Knife, board, sheet pan, can opener. Not a drawer full of junk you never touch. |
| 4 | healthy-turkey-meatballs-meal-prep | Healthy Turkey Meatballs for Meal Prep | Turkey meatballs that don't taste like cardboard. Make a batch once, then eat them with pasta, in a sandwich, or over rice all week. They actually reheat. |
| 5 | plant-based-protein-sources-complete-guide | Plant-Based Protein Sources: A Complete Guide | Beans, lentils, tofu, nuts. What to buy, how much, and how to use it without turning dinner into a sermon. |
| 6 | how-to-use-leftover-rice-creative-ideas | How to Use Leftover Rice: Creative Ideas | That container of rice in the back of the fridge. Fried rice, soup, fritters, stuffed peppers. Real ideas before it becomes a science experiment. |
| 7 | sheet-pan-salmon-and-vegetables-30-minutes | Sheet Pan Salmon and Vegetables in 30 Minutes | Salmon and veggies on one tray. You slide it in, set a timer, and walk away. One pan to wash when you're done. |
| 8 | healthy-fats-list-foods-to-eat-daily | Healthy Fats: A List of Foods to Eat Daily | Oils, nuts, avocado, fatty fish. Real foods you can eat without turning every meal into a macro-tracking project. |
| 9 | how-to-cook-dried-beans-from-scratch | How to Cook Dried Beans From Scratch | Soak, simmer, season. Cheaper than cans and you control the salt. One batch and you're set for tacos and soups all week. |
| 10 | easy-black-bean-tacos-weeknight-dinner | Easy Black Bean Tacos for Weeknight Dinner | Two cans, a skillet, tortillas. Dinner in 15 minutes. No long simmering and no guilt trip. Tacos don't need a backstory. |
| 11 | best-breakfast-foods-for-sustained-energy | Best Breakfast Foods for Sustained Energy | What to eat so you don't crash at 10 a.m. Protein and fiber, less sugar. No miracle claims. Just what keeps you from wanting a nap with your coffee. |
| 12 | how-to-season-cast-iron-skillet-properly | How to Season a Cast Iron Skillet Properly | A thin layer of oil baked on. Simple method, 60 seconds of upkeep after you cook. No mystery, no ruined pan. |
