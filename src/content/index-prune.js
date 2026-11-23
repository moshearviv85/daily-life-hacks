/**
 * GSC 27 Aug 2026: 158 URLs were "Discovered – currently not indexed".
 * These 87 thin URLs stay live for humans (no 410, no delete) but must be
 * `noindex, follow` and out of the sitemap so crawl budget concentrates on
 * the 20 KEEP money URLs (flagships + surviving studies + tools/hubs).
 *
 * INDEX_NOINDEX_TOOL_PATHS is the same policy for tool pages that stay
 * linked from /tools/ but must not be indexed. grocery-budget-calculator
 * stays out of that set and remains indexable. /guides/ and /research/
 * are retired with 301s and are not KEEP paths.
 *
 * Single source of truth for:
 *   - src/pages/[slug].astro robots meta + rich-result schema
 *   - tool-page robots meta via noindexFollowFor()
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
  "camping-meal-hacks-large-families",
  "cheap-dinner-ideas-cost-per-serving",
  "cheap-dinner-ideas-for-a-family-of-4",
  "cheap-ground-beef-meals-large-families",
  "cheap-healthy-meals-for-college-students",
  "cheap-healthy-meals-for-two",
  "cheap-healthy-meals-with-leftovers",
  "cheap-lunch-ideas-cost-per-box",
  "chicken-veggie-lettuce-wraps-peanut-sauce",
  "cooking-for-picky-adults-simple-options",
  "crispy-roasted-chickpeas-high-fiber-snack",
  "crispy-smashed-potato-salad-dijon-herbs",
  "cutting-board-basics-which-to-use",
  "does-leftover-pizza-need-to-be-refrigerated",
  "easy-cheap-healthy-meals",
  "easy-sandwich-bread-recipe-beginners",
  "easy-weeknight-fish-tacos-with-cabbage-slaw",
  "food-prep-guide-blog-recipes",
  "food-prep-guide-recipes",
  "food-prep-tips-to-save-time",
  "food-storage-temperature-rules",
  "grab-and-go-fridge-snack-drawer",
  "grocery-budget-for-one-person-per-month",
  "grocery-shopping-list-for-healthy-eating-on-a-budget",
  "health-benefits-eating-soup-in-spring",
  "healthy-alternatives-white-rice-dinner",
  "healthy-fats-list-foods-to-eat-daily",
  "healthy-homemade-vegan-caesar-salad-dressing",
  "healthy-spring-vegetable-soup-recipes",
  "healthy-sweet-tooth-snack-ideas-night",
  "hearty-vegetarian-chili-with-three-beans-and-corn",
  "high-fiber-avocado-toast-variations",
  "high-fiber-cauliflower-rice-recipes",
  "high-fiber-meal-prep-ideas-for-busy-weeks-2026",
  "high-protein-meals-on-a-budget",
  "high-protein-vegetarian-breakfast-burritos-you-can-freeze",
  "how-long-do-leftovers-last-in-the-fridge",
  "how-much-food-storage-do-you-need-per-person",
  "how-much-oatmeal-is-a-serving",
  "how-much-protein-for-breakfast",
  "how-to-choose-granola-not-dessert",
  "how-to-clean-blender-fast-no-scrub",
  "how-to-eat-cheap-at-home",
  "how-to-freeze-bananas-for-smoothies",
  "how-to-get-more-protein-at-breakfast",
  "how-to-grocery-shop-for-a-month-on-a-budget",
  "how-to-meal-plan-on-a-budget",
  "how-to-meal-prep-on-a-budget-for-one-person",
  "how-to-organize-a-small-kitchen-on-a-budget",
  "how-to-prep-high-protein-lunches-work",
  "how-to-properly-store-cooked-grains-for-meal-prep",
  "how-to-read-nutrition-labels-for-beginners",
  "how-to-save-money-on-groceries-at-walmart",
  "how-to-season-cast-iron-skillet-properly",
  "how-to-store-fresh-ginger",
  "how-to-store-fruits-and-vegetables-properly",
  "how-to-store-homemade-bread",
  "is-driving-to-cheaper-grocery-store-worth-it",
  "kitchen-hacks-for-sink",
  "low-cost-protein-meal-hacks-families",
  "macronutrient-breakdown-healthy-egg-sandwich",
  "make-ahead-breakfast-ideas-without-eggs",
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
  "which-lentils-are-the-best",
  "why-grocery-bill-went-up-after-cooking-more",
  "zinc-containing-foods-weekly-meals",
  // PR-50: zero-impression bulk-era pages (noindex, follow; still live).
  "add-flavor-without-more-sugar-tricks",
  "aldi-shopping-hacks-large-family-meals",
  "frozen-vs-fresh-produce-when-to-buy",
  "healthy-egg-sandwich-add-ins-toppings",
  "healthy-turkey-meatballs-meal-prep",
  "hidden-sugars-popular-summer-salad-dressings",
  "high-fiber-dinner-recipes-picky-kids",
  "high-fiber-pasta-alternatives",
  "high-fiber-raspberry-jam-recipe-chia",
  "how-to-preheat-skillet-even-browning",
  "how-to-stretch-meals-large-families",
  "how-to-use-leftover-rice-creative-ideas",
  "no-bake-high-fiber-energy-balls-recipe",
  "sheet-pan-ginger-tofu-broccoli-sticky-glaze",
  "stuffed-portobello-mushrooms-quinoa-spinach-feta",
  "vegan-high-fiber-meal-prep-for-week",
  // PR-52: hub playbooks stay live, but they are noindex, follow.
  "eat-healthy-on-a-budget-complete-playbook",
  "meal-prep-for-beginners-complete-system",
]);

/** Pathnames (no leading slash) that must stay indexable and in the sitemap. */
export const INDEX_KEEP_PATHS = new Set([
  "api-docs",
  "cheapest-complete-protein-pairs",
  "data-reuse",
  "editorial-policy",
  "methodology",
  "plant-based-protein-sources-complete-guide",
  "statistics",
  "tools",
  "tools/dried-beans-to-canned-converter",
  "tools/fiber-per-dollar-calculator",
  "tools/grocery-unit-price-calculator",
  "tools/recipe-cost-calculator",
  "tools/sourdough-discard-calculator",
  "usda-thrifty-food-plan-weekly-cost",
]);

/**
 * Tool pages that stay reachable and linked from /tools/ but must render
 * `noindex, follow` and stay out of the sitemap.
 * Do not add tools/grocery-budget-calculator.
 */
export const INDEX_NOINDEX_TOOL_PATHS = new Set([
  "tools/grocery-trip-savings-calculator",
  "tools/recipe-finder",
  "tools/shopping-list-builder",
]);

export const NOINDEX_FOLLOW = "noindex, follow";

/**
 * Ranking or out-of-scope URLs that must never enter the prune set.
 * The discard conversion page was upgraded with a calculator on 2026-09-14 and restored.
 */
export const INDEX_PROTECTED_SLUGS = new Set([
  "popcorn-vs-potato-chips-fiber-comparison",
  "low-sodium-budget-foods-ranked",
  "costco-rotisserie-chicken-meal-ideas-dinner",
  "easy-sourdough-discard-pizza-dough-no-yeast",
  "easy-sourdough-discard-recipes-beginners",
  "gluten-free-sourdough-discard-pizza-dough",
  "how-to-measure-sourdough-discard-grams",
]);

export function normalizeIndexPath(value) {
  return String(value ?? "")
    .replace(/^https?:\/\/[^/]+/i, "")
    .replace(/^\/+|\/+$/g, "");
}

export function isIndexPruned(slug) {
  return INDEX_PRUNE_SLUGS.has(normalizeIndexPath(slug));
}

/** `noindex, follow` when the tool path is delisted; otherwise indexable. */
export function noindexFollowFor(path) {
  return INDEX_NOINDEX_TOOL_PATHS.has(normalizeIndexPath(path)) ? NOINDEX_FOLLOW : undefined;
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
  for (const path of INDEX_NOINDEX_TOOL_PATHS) {
    if (INDEX_KEEP_PATHS.has(path) || INDEX_PRUNE_SLUGS.has(path) || INDEX_PRUNE_SLUGS.has(path.split("/").pop())) {
      collisions.push(path);
    }
  }
  if (INDEX_NOINDEX_TOOL_PATHS.has("tools/grocery-budget-calculator")) {
    collisions.push("tools/grocery-budget-calculator");
  }
  if (collisions.length) {
    throw new Error(
      `index-prune: KEEP/protected slug leaked into prune set: ${collisions.join(", ")}`,
    );
  }
  if (INDEX_PRUNE_SLUGS.size !== 105) {
    throw new Error(`index-prune: expected 105 prune slugs, got ${INDEX_PRUNE_SLUGS.size}`);
  }
  if (INDEX_KEEP_PATHS.size !== 14) {
    throw new Error(`index-prune: expected 14 KEEP paths, got ${INDEX_KEEP_PATHS.size}`);
  }
  if (INDEX_NOINDEX_TOOL_PATHS.size !== 3) {
    throw new Error(
      `index-prune: expected 3 noindex tool paths, got ${INDEX_NOINDEX_TOOL_PATHS.size}`,
    );
  }
}

assertPruneSafety();
