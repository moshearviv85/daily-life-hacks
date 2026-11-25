import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { loadRecipeArticles } from "../src/lib/recipe-articles.mjs";
import { costForRows, packageGrams } from "../src/lib/recipe-cost.mjs";
import {
  calorieGap,
  caloriesWithinTolerance,
  foodsByDescription,
  matchPortion,
  nutritionFromFrontmatter,
  parseIngredientLine,
  resolveRecipeLines,
  roundNutrition,
  perServingTotals,
} from "../src/lib/recipe-nutrition.mjs";

const root = new URL("..", import.meta.url);
const cache = JSON.parse(readFileSync(new URL("../src/data/fdc-cache.json", import.meta.url), "utf8"));
const corrections = JSON.parse(readFileSync(new URL("../src/data/recipe-calorie-corrections.json", import.meta.url), "utf8"));
const unmapped = JSON.parse(readFileSync(new URL("../src/data/recipe-nutrition-unmapped.json", import.meta.url), "utf8"));
const foods = foodsByDescription(cache);
const articles = loadRecipeArticles(join(root.pathname, "src/data/articles"));

test("FDC cache matches the API spot check from 2026-11-23", () => {
  const oil = cache.foods["171413"];
  assert.equal(oil.description, "Oil, olive, salad or cooking");
  assert.equal(oil.nutrientsPer100g.kcal, 884);
  assert.equal(oil.portions.find((portion) => portion.modifier === "tablespoon").grams, 13.5);

  const honey = cache.foods["169640"];
  assert.equal(honey.nutrientsPer100g.kcal, 304);
  assert.equal(honey.nutrientsPer100g.sugar, 82.12);
  assert.equal(honey.portions.find((portion) => portion.modifier === "cup").grams, 339);

  const beans = cache.foods["175238"];
  assert.equal(beans.description, "Beans, black, mature seeds, canned, low sodium");
  assert.equal(beans.nutrientsPer100g.kcal, 91);
  assert.equal(beans.nutrientsPer100g.fiber, 6.9);
  assert.equal(beans.portions.find((portion) => portion.modifier === "cup").grams, 240);

  const chickpeas = cache.foods["173801"];
  assert.equal(chickpeas.portions.find((portion) => portion.modifier === "can drained, rinsed").grams, 254);
  assert.equal(chickpeas.nutrientsPer100g.kcal, 138);
});

test("one tablespoon of olive oil is the FDC portion, not a guessed density", () => {
  const parsed = parseIngredientLine("1 tbsp olive oil");
  assert.equal(parsed.qty, 1);
  assert.equal(parsed.unit, "tablespoon");
  const food = foods.get("Oil, olive, salad or cooking");
  const portion = matchPortion(food, "tablespoon", "1 tbsp olive oil");
  assert.equal(portion.gramsPerUnit, 13.5);
  const rows = resolveRecipeLines(["1 tbsp olive oil"], foods).rows;
  assert.equal(rows[0].grams, 13.5);
  assert.equal(rows[0].fdcId, 171413);
  assert.equal(Math.round(rows[0].kcal), 119);
});

test("every mapped recipe restates FDC gram weights and stays inside 15%", () => {
  const mapped = articles.filter((article) => article.data.ingredientsGrams?.length);
  assert.equal(mapped.length, 32);
  for (const article of mapped) {
    const resolved = resolveRecipeLines(article.data.ingredients, foods);
    assert.equal(resolved.unmapped.length, 0, `${article.id} no longer resolves`);
    assert.equal(resolved.rows.length, article.data.ingredientsGrams.length, article.id);
    resolved.rows.forEach((row, index) => {
      const stored = article.data.ingredientsGrams[index];
      assert.equal(stored.item, row.item, article.id);
      assert.equal(stored.fdcId, row.fdcId, `${article.id} ${row.item}`);
      assert.ok(Math.abs(stored.grams - row.grams) < 0.02, `${article.id} ${row.item}`);
    });
    const nutrition = nutritionFromFrontmatter({ ...article.data, id: article.id }, cache);
    assert.equal(nutrition.error, undefined, article.id);
    assert.equal(
      caloriesWithinTolerance(Number(article.data.calories), nutrition.raw.kcal),
      true,
      `${article.id} stated ${article.data.calories} computed ${nutrition.rounded.kcal}`,
    );
    const food = cache.foods[String(article.data.ingredientsGrams[0].fdcId)];
    assert.equal(typeof food.description, "string");
  }
});

test("calorie corrections match the published card and the unmapped list is the remainder", () => {
  const bySlug = new Map(articles.map((article) => [article.id, article]));
  assert.equal(corrections.length, 8);
  for (const correction of corrections) {
    const article = bySlug.get(correction.slug);
    assert.ok(article, correction.slug);
    assert.equal(Number(article.data.calories), correction.to);
    const nutrition = nutritionFromFrontmatter({ ...article.data, id: article.id }, cache);
    assert.equal(nutrition.rounded.kcal, correction.to);
    assert.ok(calorieGap(correction.from, nutrition.raw.kcal) > 0.15);
  }
  assert.equal(unmapped.length, articles.length - 32);
  for (const entry of unmapped) {
    const article = bySlug.get(entry.slug);
    assert.equal(article.data.ingredientsGrams, undefined, entry.slug);
    const resolved = resolveRecipeLines(article.data.ingredients, foods);
    assert.ok(resolved.unmapped.length > 0, entry.slug);
  }
});

test("bran muffins still land on the published 293 kcal and 5.9 g fiber", () => {
  const article = articles.find((entry) => entry.id === "high-fiber-bran-muffins-that-taste-good");
  const nutrition = nutritionFromFrontmatter(article.data, cache);
  assert.deepEqual(roundNutrition(nutrition.raw), nutrition.rounded);
  assert.equal(nutrition.rounded.kcal, 293);
  assert.equal(nutrition.rounded.fiber, 5.9);
  const per = perServingTotals(nutrition.rows, 12);
  assert.ok(Math.abs(per.fiber - 5.9) < 0.05);
});

test("study CSV prices use package weight and only real fdc ids", () => {
  assert.equal(packageGrams({ package: "5 lb bag", package_price_usd: "3.12" }), 5 * 453.59237);
  assert.equal(packageGrams({ package: "1 dozen (600 g edible)", package_price_usd: "2.19" }), 600);
  assert.equal(packageGrams({ package_weight_g: "2268", edible_fraction: "1.0", package: "5 lb bag" }), 2268);
  const article = articles.find((entry) => entry.id === "split-pea-soup-recipe-high-fiber");
  const nutrition = nutritionFromFrontmatter(article.data, cache);
  const cost = costForRows(nutrition.rows, 4);
  assert.ok(cost);
  assert.ok(cost.perServing > 0);
  assert.equal(cost.complete, false);
  assert.ok(cost.priced.some((row) => row.food.toLowerCase().includes("split pea") || row.item.toLowerCase().includes("split pea")));
  assert.match(cost.bases.join(" "), /Walmart|BLS/);
});
