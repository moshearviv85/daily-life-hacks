export const CATEGORY_TO_BOARD = {
  recipes: {
    id: "1124140825679184032",
    name: "High Fiber Dinner and Gut Health Recipes",
  },
  nutrition: {
    id: "1124140825679184034",
    name: "Gut Health Tips and Nutrition Charts",
  },
  tips: {
    id: "1124140825679184034",
    name: "Gut Health Tips and Nutrition Charts",
  },
};

const CATEGORY_HASHTAGS = {
  recipes: ["RecipeIdeas", "HighFiberRecipes", "EasyDinner"],
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

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

export function boardForCategory(category) {
  return CATEGORY_TO_BOARD[String(category || "").toLowerCase()] || null;
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
