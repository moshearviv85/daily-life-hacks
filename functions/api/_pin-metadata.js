export const PINTEREST_BOARDS = {
  groceryMathData: {
    id: "1124140825679640841",
    name: "Grocery Math: Food Prices and Nutrition Data",
    aliases: ["grocery-math", "Grocery Math", "food-price-data"],
  },
  highFiberRecipes: {
    id: "1124140825679184032",
    name: "High Fiber Dinner and Gut Health Recipes",
    aliases: ["high-fiber-recipes", "High Fiber Recipes"],
  },
  gutHealthNutrition: {
    id: "1124140825679184034",
    name: "Gut Health Tips and Nutrition Charts",
    aliases: ["gut-health-nutrition-tips", "Gut Health & Nutrition Tips", "Gut Health and Nutrition Tips"],
  },
  mealPrepKitchen: {
    id: "1124140825679184036",
    name: "Healthy Meal Prep & Kitchen Tips",
    aliases: ["Healthy Breakfast, Smoothies and Snacks", "Healthy Breakfast Smoothies and Snacks"],
  },
  easyDinnerRecipes: {
    id: "1124140825679548778",
    name: "Easy Dinner Recipes",
    aliases: ["easy-dinner-recipes", "Easy Weeknight Dinners"],
  },
  budgetMealsGrocery: {
    id: "1124140825679548779",
    name: "Budget Meals and Grocery Hacks",
    aliases: ["budget-meals", "Budget Meals", "Grocery Hacks"],
  },
  highProteinMeals: {
    id: "1124140825679548780",
    name: "High Protein Meals and Smart Swaps",
    aliases: ["high-protein-meals", "High Protein Recipes", "Protein Meals"],
  },
  foodStorageFreezer: {
    id: "1124140825679548781",
    name: "Food Storage and Freezer Tips",
    aliases: ["food-storage", "Food Storage Tips", "Freezer Tips"],
  },
};

export const CATEGORY_TO_BOARD = {
  recipes: PINTEREST_BOARDS.easyDinnerRecipes,
  nutrition: PINTEREST_BOARDS.gutHealthNutrition,
  tips: PINTEREST_BOARDS.mealPrepKitchen,
};

const CATEGORY_HASHTAGS = {
  recipes: ["RecipeIdeas", "EasyDinner", "WeeknightDinner"],
  nutrition: ["NutritionTips", "GutHealth", "HealthyHabits"],
  tips: ["KitchenTips", "MealPlanning", "BudgetMeals"],
};

const KEYWORD_HASHTAGS = [
  ["budget", "BudgetMeals"],
  ["meal prep", "MealPrep"],
  ["breakfast", "HealthyBreakfast"],
  ["dinner", "EasyDinner"],
  ["lunch", "LunchIdeas"],
  ["fiber", "HighFiber"],
  ["protein", "HighProtein"],
  ["vegetarian", "VegetarianRecipes"],
  ["soup", "SoupRecipe"],
  ["salad", "SaladRecipe"],
  ["smoothie", "SmoothieRecipe"],
  ["storage", "FoodStorage"],
  ["herb", "KitchenTips"],
];

const MEAL_PREP_KEYWORDS = [
  "meal prep",
  "meal-prep",
  "breakfast",
  "smoothie",
  "snack",
  "lunch",
  "sandwich",
  "organize",
  "organization",
  "kitchen",
  "picnic",
  "make ahead",
  "batch cooking",
  "prep",
];

const BUDGET_KEYWORDS = [
  "budget",
  "cheap",
  "affordable",
  "grocery",
  "groceries",
  "save money",
  "saving money",
  "frugal",
  "stretch",
];

const FOOD_STORAGE_KEYWORDS = [
  "freezer",
  "freeze",
  "storage",
  "store",
  "leftover",
  "leftovers",
  "keep fresh",
  "shelf life",
];

const HIGH_PROTEIN_KEYWORDS = [
  "protein",
  "high protein",
  "high-protein",
  "egg",
  "eggs",
  "tofu",
  "turkey",
  "greek yogurt",
  "cottage cheese",
];

const HIGH_FIBER_RECIPE_KEYWORDS = [
  "fiber",
  "high fiber",
  "high-fiber",
  "beans",
  "lentil",
  "lentils",
  "chia",
  "whole wheat",
  "oats",
  "oatmeal",
];

const GUT_NUTRITION_KEYWORDS = [
  "gut",
  "fiber",
  "nutrition",
  "sodium",
  "label",
  "cholesterol",
  "chia",
  "whole wheat",
  "constipation",
  "prebiotic",
  "vitamin",
  "mineral",
  "satiety",
];

const RECIPE_KEYWORDS = [
  "recipe",
  "dinner",
  "soup",
  "stew",
  "salad",
  "chicken",
  "pork",
  "beef",
  "salmon",
  "beans",
  "lentil",
  "tofu",
  "vegetarian",
  "pizza",
  "pasta",
  "rice",
  "bowl",
  "casserole",
  "dumpling",
  "bread",
  "sourdough",
];

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function pinHaystack(pin) {
  return [
    pin?.title,
    pin?.description,
    pin?.alt,
    pin?.article_slug,
    pin?.pin_slug,
  ].filter(Boolean).join(" ").toLowerCase();
}

function includesAny(haystack, needles) {
  return needles.some((needle) => haystack.includes(needle));
}

export function boardForCategory(category) {
  return CATEGORY_TO_BOARD[String(category || "").toLowerCase()] || null;
}

export function boardForPin(pin, category) {
  const normalizedCategory = String(category || "").toLowerCase();
  const haystack = pinHaystack(pin);

  if (includesAny(haystack, BUDGET_KEYWORDS)) return PINTEREST_BOARDS.budgetMealsGrocery;
  if (includesAny(haystack, FOOD_STORAGE_KEYWORDS)) return PINTEREST_BOARDS.foodStorageFreezer;
  if (includesAny(haystack, HIGH_PROTEIN_KEYWORDS)) return PINTEREST_BOARDS.highProteinMeals;
  if (normalizedCategory === "recipes" && includesAny(haystack, HIGH_FIBER_RECIPE_KEYWORDS)) {
    return PINTEREST_BOARDS.highFiberRecipes;
  }
  if (includesAny(haystack, GUT_NUTRITION_KEYWORDS)) return PINTEREST_BOARDS.gutHealthNutrition;
  if (includesAny(haystack, MEAL_PREP_KEYWORDS)) return PINTEREST_BOARDS.mealPrepKitchen;
  if (normalizedCategory === "recipes") return PINTEREST_BOARDS.easyDinnerRecipes;
  if (includesAny(haystack, RECIPE_KEYWORDS)) return PINTEREST_BOARDS.easyDinnerRecipes;
  return boardForCategory(normalizedCategory);
}

export function boardIdForName(name) {
  const normalized = String(name || "").trim().toLowerCase();
  if (!normalized) return "";

  for (const board of Object.values(PINTEREST_BOARDS)) {
    const names = [board.name, ...(board.aliases || [])];
    if (names.some((candidate) => candidate.toLowerCase() === normalized)) {
      return board.id;
    }
  }
  return "";
}

export function hashtagsForPin(pin, category) {
  const haystack = `${pin?.title || ""} ${pin?.description || ""} ${pin?.article_slug || ""}`.toLowerCase();
  const keywordTags = KEYWORD_HASHTAGS
    .filter(([needle]) => haystack.includes(needle))
    .map(([, tag]) => tag);
  const categoryTags = CATEGORY_HASHTAGS[String(category || "").toLowerCase()] || [];
  return unique([...keywordTags, ...categoryTags, "DailyLifeHacks"]).slice(0, 5);
}

export function formatHashtags(tags) {
  return unique(tags).map((tag) => `#${String(tag).replace(/^#/, "")}`).join(" ");
}

export function descriptionWithHashtags(description, tags) {
  const base = String(description || "").trim();
  const hashtagText = formatHashtags(tags);
  if (!hashtagText) return base;
  if (!base) return hashtagText;
  if (hashtagText.split(/\s+/).every((tag) => base.includes(tag))) return base;
  const full = `${base} ${hashtagText}`.trim();
  return full.length <= 500 ? full : full.slice(0, 499).trim();
}
