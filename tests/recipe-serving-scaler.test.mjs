import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();

test("all declared recipes can use the shared serving scaler", async () => {
  const articleDir = path.join(root, "src/data/articles");
  const files = (await readdir(articleDir)).filter((name) => name.endsWith(".md"));
  let recipes = 0;
  for (const name of files) {
    const source = await readFile(path.join(articleDir, name), "utf8");
    if (!/^category:\s*["']?recipes["']?\s*$/m.test(source)) continue;
    recipes++;
    assert.match(source, /^servings:\s*\d+/m, name);
    assert.match(source, /^ingredients:\s*$/m, name);
  }
  assert.equal(recipes, 80);
});

test("article recipe card uses the serving scaler while schema keeps original ingredients", async () => {
  const article = await readFile(path.join(root, "src/pages/[slug].astro"), "utf8");
  assert.match(article, /import RecipeServingScaler/);
  assert.match(article, /<RecipeServingScaler ingredients=/);
  assert.match(article, /recipeIngredient: article\.data\.ingredients/);
  assert.match(article, /recipeYield: article\.data\.servings/);
});

test("serving scaler changes leading quantities but protects package sizes and temperatures", async () => {
  const component = await readFile(path.join(root, "src/components/RecipeServingScaler.astro"), "utf8");
  const script = component.match(/<script is:inline>([\s\S]*?)<\/script>/)?.[1] ?? "";
  assert.doesNotThrow(() => new Function(script));
  const helpers = script.match(/var glyphs=[\s\S]*?(?=\s+function render\()/)?.[0];
  assert.ok(helpers, "scaler helpers are extractable");
  const scale = new Function("text", "factor", `${helpers}; return scaleIngredient(text, factor);`);

  assert.equal(scale("1 cup rice", 1.5), "1 ½ cups rice");
  assert.equal(scale("1 (15 oz) can tomatoes", 2), "2 (15 oz) cans tomatoes");
  assert.equal(scale("2 cans (15 oz each)", 2), "4 cans (15 oz each)");
  assert.equal(scale("1 cup warm water (110°F)", 2), "2 cups warm water (110°F)");
  assert.equal(scale("Salt and pepper to taste", 2), "Salt and pepper to taste");
  assert.equal(scale("2-3 cloves garlic", 2), "4-6 cloves garlic");
});

test("serving changes update visible recipe yield and emit no entered value", async () => {
  const meta = await readFile(path.join(root, "src/components/RecipeMetaBar.astro"), "utf8");
  const component = await readFile(path.join(root, "src/components/RecipeServingScaler.astro"), "utf8");
  assert.match(meta, /data-recipe-servings/);
  assert.match(component, /recipe_scaler_used/);
  assert.match(component, /interaction_type:'servings_changed'/);
  assert.doesNotMatch(component, /requested_servings|serving_value|entered_value/);
  assert.match(component, /astro:page-load/);
});
