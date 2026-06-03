import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const htmlPath = resolve(
  "dist",
  "best-way-to-cook-baked-potatoes",
  "index.html",
);
const html = readFileSync(htmlPath, "utf8");

function metaContent(selector) {
  const match = html.match(selector);
  return match?.[1];
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const ogImage = metaContent(/<meta property="og:image" content="([^"]+)"/);
const twitterImage = metaContent(/<meta name="twitter:image" content="([^"]+)"/);

assert(
  ogImage?.startsWith("https://www.daily-life-hacks.com/images/"),
  `Expected absolute og:image, got ${ogImage}`,
);
assert(
  twitterImage?.startsWith("https://www.daily-life-hacks.com/images/"),
  `Expected absolute twitter:image, got ${twitterImage}`,
);

const jsonLdBlocks = [
  ...html.matchAll(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g,
  ),
].map((match) => JSON.parse(match[1]));

const recipe = jsonLdBlocks.find((node) => node["@type"] === "Recipe");

assert(recipe, "Expected Recipe JSON-LD block");
assert(recipe.url === "https://www.daily-life-hacks.com/best-way-to-cook-baked-potatoes/", "Expected canonical recipe URL");
assert(recipe.mainEntityOfPage?.["@id"] === recipe.url, "Expected mainEntityOfPage to point at recipe URL");
assert(recipe.image?.[0] === ogImage, "Expected Recipe image to match og:image");
assert(recipe.thumbnailUrl === ogImage, "Expected Recipe thumbnailUrl to match og:image");
assert(recipe.prepTime === "PT5M", `Expected prepTime PT5M, got ${recipe.prepTime}`);
assert(recipe.cookTime === "PT75M", `Expected cookTime PT75M, got ${recipe.cookTime}`);
assert(recipe.totalTime === "PT80M", `Expected totalTime PT80M, got ${recipe.totalTime}`);
assert(recipe.recipeYield === "4 servings", `Expected recipeYield, got ${recipe.recipeYield}`);
assert(recipe.nutrition?.calories === "160 calories", "Expected nutrition calories");
assert(recipe.author?.["@type"] === "Person", "Expected Person author");
assert(Array.isArray(recipe.recipeIngredient) && recipe.recipeIngredient.length >= 3, "Expected recipe ingredients");
assert(Array.isArray(recipe.recipeInstructions) && recipe.recipeInstructions.length >= 3, "Expected recipe instructions");

console.log("Rich Pin metadata verified for best-way-to-cook-baked-potatoes");
