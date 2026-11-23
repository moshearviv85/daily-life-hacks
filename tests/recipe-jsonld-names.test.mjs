import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const DIST = new URL("../dist/", import.meta.url);

function jsonLdBlocks(html, pageUrl) {
  const values = [];
  for (const match of html.matchAll(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    assert.doesNotThrow(
      () => values.push(JSON.parse(match[1])),
      `Invalid JSON-LD on ${pageUrl}`,
    );
  }
  return values;
}

function visit(value, callback) {
  if (Array.isArray(value)) {
    for (const item of value) visit(item, callback);
    return;
  }
  if (!value || typeof value !== "object") return;
  callback(value);
  for (const child of Object.values(value)) visit(child, callback);
}

function htmlFiles(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) htmlFiles(path, out);
    else if (entry.name.endsWith(".html")) out.push(path);
  }
  return out;
}

const COLLECTION_WORDS =
  /\b(?:Meals|Ideas|Recipes|Add-ins|Toppings|Dressings)\b/i;

test("every Recipe JSON-LD names one dish and declares recipeCuisine", () => {
  assert.ok(existsSync(DIST), "dist/ is required; run npm run build first");
  const recipes = [];

  for (const file of htmlFiles(DIST.pathname)) {
    const html = readFileSync(file, "utf8");
    for (const block of jsonLdBlocks(html, file)) {
      visit(block, (node) => {
        if (node["@type"] !== "Recipe") return;
        recipes.push({ file, name: node.name, recipeCuisine: node.recipeCuisine });
      });
    }
  }

  assert.ok(recipes.length > 0, "expected Recipe JSON-LD in the build");
  for (const recipe of recipes) {
    assert.equal(typeof recipe.name, "string", `Recipe name missing: ${recipe.file}`);
    assert.equal(
      /\d+g/i.test(recipe.name),
      false,
      `Recipe name contains a digit+g amount: ${recipe.name} (${recipe.file})`,
    );
    assert.equal(
      recipe.name.includes("$"),
      false,
      `Recipe name contains $: ${recipe.name} (${recipe.file})`,
    );
    assert.equal(
      COLLECTION_WORDS.test(recipe.name),
      false,
      `Recipe name is a collection, not one dish: ${recipe.name} (${recipe.file})`,
    );
    assert.equal(
      typeof recipe.recipeCuisine,
      "string",
      `Recipe missing recipeCuisine: ${recipe.name} (${recipe.file})`,
    );
    assert.ok(
      recipe.recipeCuisine.trim(),
      `Recipe recipeCuisine is blank: ${recipe.name} (${recipe.file})`,
    );
  }
});
