# Pinterest Board Map (CP5.2)

**Canonical source of truth:** `functions/api/_pin-metadata.js` → `PINTEREST_BOARDS` + `boardForPin()`.

**Also mirrored in:**
- `src/pages/dashboard.astro` → `pinterestBoardRouting` (display only)
- `scripts/pinterest_boards.py` → `TARGET_BOARDS` (create/list helper; must stay in sync)

## Boards (7)

| Key | Board name | Board ID | Typical routing |
|-----|------------|----------|-----------------|
| `highFiberRecipes` | High Fiber Dinner and Gut Health Recipes | `1124140825679184032` | fiber recipes, beans, lentils, oats |
| `gutHealthNutrition` | Gut Health Tips and Nutrition Charts | `1124140825679184034` | nutrition, labels, gut, vitamins |
| `mealPrepKitchen` | Healthy Meal Prep & Kitchen Tips | `1124140825679184036` | meal prep, breakfast, smoothies, snacks |
| `easyDinnerRecipes` | Easy Dinner Recipes | `1124140825679548778` | general dinners, soups, pasta, bowls |
| `budgetMealsGrocery` | Budget Meals and Grocery Hacks | `1124140825679548779` | budget, groceries, frugal cooking |
| `highProteinMeals` | High Protein Meals and Smart Swaps | `1124140825679548780` | protein, eggs, tofu, turkey, yogurt |
| `foodStorageFreezer` | Food Storage and Freezer Tips | `1124140825679548781` | freezer, leftovers, storage |

## Category defaults

| Site category | Default board |
|---------------|---------------|
| `recipes` | Easy Dinner Recipes (keyword override → fiber/budget/protein/storage/prep) |
| `nutrition` | Gut Health Tips and Nutrition Charts |
| `tips` | Healthy Meal Prep & Kitchen Tips |

## Rules

1. Do **not** invent boards outside this list for auto-post.
2. Auto-create boards only with explicit `CREATE_BOARDS=true` on `pinterest_boards.py`.
3. Keyword overrides in `boardForPin()` beat category defaults (budget / storage / protein / fiber / meal-prep).
4. When adding a board: update `_pin-metadata.js` first, then dashboard + `pinterest_boards.py` + this doc in the same PR.
