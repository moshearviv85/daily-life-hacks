/**
 * Fail the build when a recipe states a calorie figure more than 15%
 * away from the per-serving total of its ingredientsGrams rows.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadRecipeArticles } from "../src/lib/recipe-articles.mjs";
import { calorieGap, caloriesWithinTolerance, nutritionFromFrontmatter } from "../src/lib/recipe-nutrition.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const cache = JSON.parse(readFileSync(join(root, "src/data/fdc-cache.json"), "utf8"));
const failures = [];
let checked = 0;

for (const article of loadRecipeArticles(join(root, "src/data/articles"))) {
  const grams = article.data.ingredientsGrams;
  if (!Array.isArray(grams) || !grams.length) continue;
  checked += 1;
  const nutrition = nutritionFromFrontmatter({ ...article.data, id: article.id }, cache);
  if (nutrition.error) {
    failures.push(`${article.id}: ${nutrition.error}`);
    continue;
  }
  for (const row of grams) {
    if (!row.item || !Number.isFinite(Number(row.grams)) || !Number.isFinite(Number(row.fdcId))) {
      failures.push(`${article.id}: ingredientsGrams row is missing item, grams, or fdcId`);
    }
    if (Number(row.grams) <= 0) {
      failures.push(`${article.id}: ${row.item} has no positive gram weight`);
    }
  }
  const stated = Number(article.data.calories);
  if (!Number.isFinite(stated)) {
    failures.push(`${article.id}: calories missing`);
    continue;
  }
  if (!caloriesWithinTolerance(stated, nutrition.raw.kcal)) {
    const gap = calorieGap(stated, nutrition.raw.kcal);
    failures.push(
      `${article.id}: stated ${stated} kcal is ${(gap * 100).toFixed(1)}% from computed ${nutrition.rounded.kcal} kcal`,
    );
  }
}

if (!checked) {
  console.error("recipe nutrition: no recipes have ingredientsGrams");
  process.exit(1);
}

if (failures.length) {
  console.error(`recipe nutrition: ${failures.length} problem(s)`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`recipe nutrition: ${checked} recipes within 15% of the FDC total`);
