import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const articleRoute = readFileSync(
  new URL("../src/pages/[slug].astro", import.meta.url),
  "utf8",
);
const contentConfig = readFileSync(
  new URL("../src/content.config.ts", import.meta.url),
  "utf8",
);

test("zero-minute recipe durations remain valid ISO-8601 durations", () => {
  assert.match(articleRoute, /hasExplicitZeroDuration[\s\S]*?return hasExplicitZeroDuration \? "PT0M" : undefined;/);
});

test("recipe category is always present; cuisine stays a factual optional field", () => {
  assert.match(contentConfig, /recipeCategory:\s*z\.string\(\)\.optional\(\)/);
  assert.match(contentConfig, /recipeCuisine:\s*z\.string\(\)\.optional\(\)/);
  assert.match(
    articleRoute,
    /const authoredRecipeCategory = article\.data\.recipeCategory\?\.trim\(\)/,
  );
  assert.match(
    articleRoute,
    /authoredRecipeCategory \|\|\s*firstMatch\(MEAL_TYPE_BY_TAG\) \|\|\s*derivedRecipeCategory\(\) \|\|\s*"Main Course"/,
  );
  assert.match(articleRoute, /article\.data\.category\.toLowerCase\(\), \.\.\.normalizedTags/);
  assert.match(
    articleRoute,
    /const recipeCuisine = article\.data\.recipeCuisine \?\? firstMatch\(CUISINE_BY_TAG\)/,
  );
  assert.match(articleRoute, /^\s+recipeCategory,\s*$/m);
  assert.match(articleRoute, /^\s+recipeCuisine,\s*$/m);
  assert.doesNotMatch(articleRoute, /recipeCategory:\s*["']Healthy["']/);
  assert.doesNotMatch(articleRoute, /recipeCuisine:\s*["']American["']/);
});

test("article structured data is connected through stable entity identifiers", () => {
  assert.match(articleRoute, /const webPageId = `\$\{articleUrl\}#webpage`/);
  assert.match(articleRoute, /const articleEntityId = `\$\{articleUrl\}#\$\{isRecipe \? "recipe" : "article"\}`/);
  assert.match(articleRoute, /mainEntityOfPage:\s*\{ "@id": webPageId \}/);
  assert.match(articleRoute, /mainEntity:\s*\{ "@id": articleEntityId \}/);
  assert.match(articleRoute, /isPartOf:\s*\{ "@id": `\$\{siteUrl\}\/#website` \}/);
});
