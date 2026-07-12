# Pinterest Title Rewrite Pack + Idea Pin Candidates

**Source:** `pipeline-data/reports/pin-performance-2026-07-12.*` + creative playbook  
**Rule:** rewrite titles for **new briefs / queue curation** only — do not mass-edit live pin objects without a measured test.

## Winning formulas (reuse)

1. `[N]-Day [Topic] Challenge Meal Plan`
2. `[Dish] ([Simple Method Version])`
3. `Fast [Thing] Without [Obstacle]: [N] Minute Recipe`
4. `What's the Best Way to [Task] for [Use Case]`
5. `[Benefit] [Dish] Meal Prep for [Life Outcome]`

Avoid: vague “Best …”, budget-only hooks, ultra-short category titles.

## Rewrite candidates (weak CTR / high intent)

| Current / article angle | Proposed pin title | Board |
|-------------------------|--------------------|-------|
| How to Meal Prep on a Budget | Meal Prep for One: 5 Cheap Lunches Under $3 | Budget Meals and Grocery Hacks |
| Ways to Make Grocery Shopping Cheaper | Grocery Run Checklist: Cut $40 Without Coupons | Budget Meals and Grocery Hacks |
| Easy High Fiber Breakfast Ideas | 7 High Fiber Breakfasts You Can Make in 10 Minutes | High Fiber Dinner and Gut Health Recipes |
| High Fiber Bran Muffins | Bran Muffins That Don't Taste Like Cardboard | High Fiber Dinner and Gut Health Recipes |
| Fiber for Constipation sources | High Fiber Meals That Actually Move Things Along | Gut Health Tips and Nutrition Charts |
| How Much Protein Per Day | How Much Protein Per Day Without Buying Powders | High Protein Meals and Smart Swaps |
| Black Bean Brownies (already strong) | Keep: Black Bean Brownies Hidden Fiber Dessert Tips | High Fiber Dinner and Gut Health Recipes |
| Split Pea Soup fiber | Split Pea Soup: 16g Fiber Per Bowl, Stovetop | High Fiber Dinner and Gut Health Recipes |
| High protein high fiber weight loss | High Protein High Fiber Meals That Keep You Full | High Protein Meals and Smart Swaps |
| Cabbage fiber soup | Cabbage Soup Meal Prep: High Fiber, Low Cost | Budget Meals and Grocery Hacks |

## Idea Pin / kinetic manual 5-pack (NO automation)

From `docs/idea-pin-automation-gate.md`. Upload manually; log 14d CTR.

| # | Asset angle | Suggested title | Board |
|---|-------------|-----------------|-------|
| 1 | 30-day fiber challenge kinetic (if exists) | 30 Day High Fiber Challenge Meal Plan | High Fiber… |
| 2 | Freeze bananas / smoothie tip | What's the Best Way to Freeze Bananas for Smoothies | Meal Prep & Kitchen Tips |
| 3 | Burrito bowl meal prep | High Fiber Burrito Bowl Meal Prep for Work Lunch | High Fiber… |
| 4 | Cast iron seasoning | How to Season a Cast Iron Skillet Properly | Meal Prep & Kitchen Tips |
| 5 | Pizza dough 30 min | Fast Pizza Dough Without Yeast: 30 Minute Recipe | Easy Dinner Recipes |

Pass bar: ≥6% CTR or beat matched static. Until 3/5 pass → automation stays NO-GO.

## Prompt for pin brief rewriter agent

```
Rewrite Pinterest pin titles for Daily Life Hacks.
Rules from docs/pinterest-creative-playbook.md and docs/pinterest-title-rewrite-pack.md.
Input: article slug + current title + board.
Output: 3 title options (40–70 chars), 1 description (≤400 chars), recommended board from docs/pinterest-boards.md.
No soft-duplicate URLs. Link must stay canonical article URL or existing pin destination only.
```
