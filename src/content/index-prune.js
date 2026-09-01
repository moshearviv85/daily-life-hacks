/**
 * GSC 27 Aug 2026: 158 URLs were "Discovered – currently not indexed".
 * These 107 thin URLs stay live for humans (no 410, no delete) but must be
 * `noindex, follow` and out of the sitemap so crawl budget concentrates on
 * the 51 KEEP money URLs (flagships + per-dollar cluster + tools/hubs).
 *
 * Single source of truth for:
 *   - src/pages/[slug].astro robots meta + rich-result schema
 *   - astro.config.mjs sitemap exclusions
 *   - related-article and feed eligibility (same noindex policy as unreleased)
 */

export const INDEX_PRUNE_SLUGS = new Set([
  "amaranth-millet-teff-beginner-cooking-guide",
  "batch-cooking-for-beginners-weekly-guide",
  "best-high-fiber-fruits-for-weight-loss-list",
  "best-way-to-cook-a-pork-tenderloin",
  "best-way-to-cook-baked-potatoes",
  "best-way-to-cook-pork-chops",
  "best-way-to-cook-prime-rib",
  "best-way-to-cook-ribs",
  "budget-meal-ideas-for-one",
  "budget-meal-ideas-philippines",
  "can-you-refreeze-frozen-vegetables-after-thawing",
  "cauliflower-fried-rice-with-eggs",
  "cheap-dinner-ideas-cost-per-serving",
  "cheap-dinner-ideas-for-a-family-of-4",
  "cheap-ground-beef-meals-large-families",
  "cheap-healthy-meals-for-college-students",
  "cheap-healthy-meals-for-two",
  "cheap-healthy-meals-with-leftovers",
  "cheap-lunch-ideas-cost-per-box",
  "chicken-veggie-lettuce-wraps-peanut-sauce",
  "crispy-roasted-chickpeas-high-fiber-snack",
  "crispy-smashed-potato-salad-dijon-herbs",
  "do-you-have-to-cook-canned-beans",
  "do-you-have-to-cook-frozen-vegetables",
  "does-leftover-pizza-need-to-be-refrigerated",
  "easy-cheap-healthy-meals",
  "easy-sandwich-bread-recipe-beginners",
  "easy-weeknight-fish-tacos-with-cabbage-slaw",
  "food-prep-guide-blog-recipes",
  "food-prep-guide-recipes",
  "food-prep-tips-to-save-time",
  "food-storage-temperature-rules",
  "grocery-budget-for-one-person-per-month",
  "grocery-shopping-list-for-healthy-eating-on-a-budget",
  "health-benefits-eating-soup-in-spring",
  "healthy-alternatives-white-rice-dinner",
  "healthy-fats-list-foods-to-eat-daily",
  "healthy-homemade-vegan-caesar-salad-dressing",
  "healthy-spring-vegetable-soup-recipes",
  "hearty-vegetarian-chili-with-three-beans-and-corn",
  "high-fiber-avocado-toast-variations",
  "high-fiber-cauliflower-rice-recipes",
  "high-fiber-meal-prep-ideas-for-busy-weeks-2026",
  "high-protein-meals-on-a-budget",
  "high-protein-vegetarian-breakfast-burritos-you-can-freeze",
  "how-long-can-rice-and-beans-sit-out",
  "how-long-do-canned-beans-last-after-the-best-by-date",
  "how-long-do-dried-beans-last",
  "how-long-do-frozen-vegetables-last-in-the-freezer",
  "how-long-do-leftovers-last-in-the-fridge",
  "how-long-do-opened-canned-beans-last",
  "how-much-dried-beans-per-person",
  "how-much-food-storage-do-you-need-per-person",
  "how-much-is-a-can-of-beans",
  "how-much-lentils-per-person-per-day",
  "how-much-oatmeal-is-a-serving",
  "how-much-protein-for-breakfast",
  "how-much-protein-in-a-can-of-beans",
  "how-much-protein-in-lentils",
  "how-much-protein-in-oatmeal",
  "how-much-protein-in-peanut-butter",
  "how-much-protein-in-two-eggs",
  "how-much-rice-and-beans-per-person-per-day",
  "how-to-choose-granola-not-dessert",
  "how-to-cook-frozen-vegetables-without-the-mush",
  "how-to-cool-rice-for-fried-rice",
  "how-to-eat-cheap-at-home",
  "how-to-freeze-bananas-for-smoothies",
  "how-to-freeze-fresh-vegetables-at-home",
  "how-to-get-more-protein-at-breakfast",
  "how-to-grocery-shop-for-a-month-on-a-budget",
  "how-to-keep-bread-fresh-longer-without-mold",
  "how-to-make-sourdough-pizza-dough-same-day",
  "how-to-meal-plan-on-a-budget",
  "how-to-meal-prep-on-a-budget-for-one-person",
  "how-to-measure-sourdough-discard-grams",
  "how-to-organize-a-small-kitchen-on-a-budget",
  "how-to-prep-high-protein-lunches-work",
  "how-to-properly-store-cooked-grains-for-meal-prep",
  "how-to-read-nutrition-labels-for-beginners",
  "how-to-save-money-on-groceries-at-walmart",
  "how-to-store-fresh-ginger",
  "how-to-store-fruits-and-vegetables-properly",
  "how-to-store-homemade-bread",
  "is-driving-to-cheaper-grocery-store-worth-it",
  "kitchen-hacks-for-sink",
  "low-cost-protein-meal-hacks-families",
  "macronutrient-breakdown-healthy-egg-sandwich",
  "make-ahead-breakfast-ideas-without-eggs",
  "nutritional-value-of-beans-compared",
  "one-theme-five-dinners-one-grocery-list",
  "quick-and-easy-stir-fry-sauce-recipes-no-bottled-stuff",
  "quick-black-bean-and-corn-salsa-no-cooking-required",
  "quick-black-bean-burgers-that-hold-their-shape",
  "quick-dinner-recipes-for-family",
  "quick-dinner-recipes",
  "ricotta-berry-toast-bar-no-cook",
  "savory-oatmeal-bowls-with-eggs-and-avocado",
  "sheet-pan-breakfast-hash-with-eggs-and-sweet-potatoes",
  "simple-lunch-recipes-indian-veg",
  "tabbouleh-salad-high-fiber-bulgur",
  "tuscan-white-bean-kale-soup-stovetop",
  "what-beans-for-red-beans-and-rice",
  "which-foods-are-complete-proteins",
  "which-lentils-are-the-best",
  "why-grocery-bill-went-up-after-cooking-more",
  "zinc-containing-foods-weekly-meals",
]);

/** Pathnames (no leading slash) that must stay indexable and in the sitemap. */
export const INDEX_KEEP_PATHS = new Set([
  "api-docs",
  "canned-vs-dry-beans-cost",
  "cheapest-complete-protein-pairs",
  "cheapest-protein-per-gram",
  "chicken-thighs-vs-breast-protein-cost",
  "chipotle-protein-per-dollar",
  "dairy-protein-per-dollar-ranked",
  "data-reuse",
  "eat-healthy-on-a-budget-complete-playbook",
  "editorial-policy",
  "eggs-vs-greek-yogurt-protein-cost",
  "fiber-per-dollar-cheapest-high-fiber-foods",
  "frozen-vs-fresh-vegetables-fiber-cost",
  "grains-fiber-per-dollar-ranked",
  "ground-beef-vs-beans-protein-cost",
  "guides",
  "high-fiber-snacks-per-dollar",
  "high-protein-on-a-budget-complete-guide",
  "how-to-eat-more-fiber-on-a-budget-complete-guide",
  "kfc-protein-per-dollar",
  "lentils-vs-chicken-breast-protein-cost",
  "mcdonalds-protein-per-dollar",
  "meal-prep-for-beginners-complete-system",
  "meat-per-dollar-protein-ranked",
  "methodology",
  "no-cook-protein-per-dollar",
  "one-dollar-fiber-what-it-buys",
  "one-dollar-protein-what-it-buys",
  "peanut-butter-vs-almonds-protein-cost",
  "plant-based-protein-sources-complete-guide",
  "plant-protein-per-dollar-ranked",
  "popcorn-vs-almonds-fiber-cost",
  "printables/weekly-grocery-budget-planner",
  "produce-fiber-per-dollar-ranked",
  "protein-per-dollar-cheapest-protein-sources",
  "research",
  "shelf-stable-pantry-per-dollar",
  "statistics",
  "taco-bell-protein-per-dollar",
  "tofu-vs-chicken-protein-cost",
  "tools",
  "tools/dried-beans-to-canned-converter",
  "tools/fiber-per-dollar-calculator",
  "tools/grocery-trip-savings-calculator",
  "tools/grocery-unit-price-calculator",
  "tools/recipe-cost-calculator",
  "tools/recipe-finder",
  "tools/shopping-list-builder",
  "usda-thrifty-food-plan-weekly-cost",
  "wendys-protein-per-dollar",
  "whole-wheat-flour-vs-quinoa-fiber-cost",
]);

/**
 * Ranking or out-of-scope URLs that must never enter the prune set.
 * Two thin sourdough slugs are in INDEX_PRUNE_SLUGS on purpose; the rest stay.
 */
export const INDEX_PROTECTED_SLUGS = new Set([
  "popcorn-vs-potato-chips-fiber-comparison",
  "low-sodium-budget-foods-ranked",
  "costco-rotisserie-chicken-meal-ideas-dinner",
  "easy-sourdough-discard-pizza-dough-no-yeast",
  "easy-sourdough-discard-recipes-beginners",
  "gluten-free-sourdough-discard-pizza-dough",
]);

export function normalizeIndexPath(value) {
  return String(value ?? "")
    .replace(/^https?:\/\/[^/]+/i, "")
    .replace(/^\/+|\/+$/g, "");
}

export function isIndexPruned(slug) {
  return INDEX_PRUNE_SLUGS.has(normalizeIndexPath(slug));
}

function assertPruneSafety() {
  const collisions = [];
  for (const path of INDEX_KEEP_PATHS) {
    if (INDEX_PRUNE_SLUGS.has(path) || INDEX_PRUNE_SLUGS.has(path.split("/").pop())) {
      collisions.push(path);
    }
  }
  for (const slug of INDEX_PROTECTED_SLUGS) {
    if (INDEX_PRUNE_SLUGS.has(slug)) collisions.push(slug);
  }
  if (collisions.length) {
    throw new Error(
      `index-prune: KEEP/protected slug leaked into prune set: ${collisions.join(", ")}`,
    );
  }
  if (INDEX_PRUNE_SLUGS.size !== 107) {
    throw new Error(`index-prune: expected 107 prune slugs, got ${INDEX_PRUNE_SLUGS.size}`);
  }
  if (INDEX_KEEP_PATHS.size !== 51) {
    throw new Error(`index-prune: expected 51 KEEP paths, got ${INDEX_KEEP_PATHS.size}`);
  }
}

assertPruneSafety();
