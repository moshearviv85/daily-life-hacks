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
  // Overnight oats and lentil-barley soup publish ingredientsGrams.
  assert.equal(mapped.length, 40);
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
  assert.equal(unmapped.length, articles.length - 40);
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

test("Grey Poupon Dijon counts only when the line states grams", () => {
  const dijon = cache.foods["2597124"];
  assert.equal(dijon.description, "GREY POUPON DIJON MUSTARD, 10 OZ");
  assert.equal(dijon.nutrientsPer100g.kcal, 100);
  assert.equal(dijon.nutrientsPer100g.sodium, 2300);
  assert.equal(dijon.portions.find((portion) => portion.modifier === "tsp").grams, 5);

  const weighed = resolveRecipeLines(["1 tsp Dijon mustard (5 g)"], foods);
  assert.equal(weighed.unmapped.length, 0);
  assert.equal(weighed.rows[0].grams, 5);
  assert.equal(weighed.rows[0].fdcId, 2597124);
  assert.equal(Math.round(weighed.rows[0].kcal), 5);

  for (const line of ["1 tsp Dijon mustard", "1 tbsp Dijon mustard", "1/2 teaspoon Dijon mustard"]) {
    const bare = resolveRecipeLines([line], foods);
    assert.equal(bare.rows.length, 0, line);
    assert.equal(bare.unmapped[0].reason, "no FDC food matched the line", line);
  }

  const cumin = resolveRecipeLines(["1/2 tsp ground cumin"], foods);
  assert.equal(cumin.rows.length, 0);
  assert.equal(cumin.omitted[0].reason, "spice without a matching FDC measure");
  const lentilCumin = resolveRecipeLines(["1/2 tsp ground cumin (1.05 g)"], foods);
  assert.equal(lentilCumin.rows.length, 0);
  assert.equal(lentilCumin.omitted[0].reason, "spice without a matching FDC measure");
  const weighedCumin = resolveRecipeLines(["1/2 tsp ground cumin (1.05 g, whole-seed teaspoon)"], foods);
  assert.equal(weighedCumin.rows[0].grams, 1.05);
  assert.equal(weighedCumin.rows[0].fdcId, 170923);
});

test("black bean tacos and quinoa salad publish the USDA per-serving totals", () => {
  const tacos = articles.find((entry) => entry.id === "easy-black-bean-tacos-weeknight-dinner");
  const quinoa = articles.find((entry) => entry.id === "high-fiber-quinoa-salad-for-lunch-prep");
  const tacoNutrition = nutritionFromFrontmatter(tacos.data, cache);
  const quinoaNutrition = nutritionFromFrontmatter(quinoa.data, cache);
  assert.equal(tacoNutrition.rounded.kcal, 316);
  assert.equal(tacoNutrition.rounded.protein, 15.6);
  assert.equal(tacoNutrition.rounded.fiber, 17.6);
  assert.equal(Number(tacos.data.calories), 316);
  assert.equal(tacoNutrition.rows[0].fdcId, 2707363);
  assert.equal(tacoNutrition.rows[0].grams, 540);
  assert.equal(quinoaNutrition.rounded.kcal, 399);
  assert.equal(quinoaNutrition.rounded.protein, 11.9);
  assert.equal(quinoaNutrition.rounded.fiber, 8.7);
  assert.equal(Number(quinoa.data.calories), 399);
  assert.equal(quinoaNutrition.rows.find((row) => row.fdcId === 2597124).grams, 5);
  assert.equal(unmapped.some((entry) => entry.slug === tacos.id || entry.slug === quinoa.id), false);
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
