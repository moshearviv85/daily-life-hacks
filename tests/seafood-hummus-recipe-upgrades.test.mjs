import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const ROOT = new URL("..", import.meta.url).pathname;

const PAGES = [
  {
    slug: "baked-cod-lemon-capers-green-beans",
    heading: "How long should you bake cod at 400°F by thickness, and what does one serving deliver?",
    numbers: ["145", "400", "19.4", "89.3", "0.73", "32.0", "171956", "171955", "169961"],
  },
  {
    slug: "high-fiber-hummus-recipe-homemade",
    heading: "How much fiber and protein does homemade chickpea hummus have, and what fixes grainy texture?",
    numbers: ["14.2", "10.9", "508", "120", "61", "60", "173801", "170189", "167747", "171413"],
  },
];

const SOURCE_LINKS = [
  ["air-fryer-salmon-bites-garlic-honey-glaze", "baked-cod-lemon-capers-green-beans"],
  ["sheet-pan-salmon-and-vegetables-30-minutes", "baked-cod-lemon-capers-green-beans"],
  ["farro-lunch-bowl-roasted-vegetables-lemon-tahini", "high-fiber-hummus-recipe-homemade"],
  ["black-bean-brownies-hidden-fiber-dessert", "high-fiber-hummus-recipe-homemade"],
];

function readArticle(slug) {
  return readFileSync(join(ROOT, "src/data/articles", `${slug}.md`), "utf8");
}

function gitShow(path) {
  return execFileSync("git", ["show", `origin/main:${path}`], {
    cwd: ROOT,
    encoding: "utf8",
  });
}

function field(markdown, name) {
  const match = markdown.match(new RegExp(`^${name}:\\s*["']?([^"'\\n#]+?)["']?\\s*$`, "m"));
  return match ? match[1].trim() : null;
}

function bodyOf(markdown) {
  return markdown.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "");
}

function words(value) {
  return value.split(/\s+/).filter(Boolean);
}

function jsonLdBlocks(html) {
  const values = [];
  for (const match of html.matchAll(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    values.push(JSON.parse(match[1]));
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

test("cod and hummus answers keep the recipe card and add the USDA tables", () => {
  const later = readFileSync(join(ROOT, "tests/substantive-update-datemodified.test.mjs"), "utf8");
  for (const page of PAGES) {
    const markdown = readArticle(page.slug);
    const before = gitShow(`src/data/articles/${page.slug}.md`);
    assert.equal(field(markdown, "title"), field(before, "title"), page.slug);
    assert.equal(field(markdown, "excerpt"), field(before, "excerpt"), page.slug);
    assert.equal(field(markdown, "author"), "David Miller", page.slug);
    assert.equal(field(markdown, "dateModified"), "2026-11-26", page.slug);
    assert.equal(field(markdown, "substantiveUpdate"), "2026-11-26", page.slug);
    assert.match(later, new RegExp(`"${page.slug}": "2026-11-26"`));
    assert.equal(
      markdown.match(/^ingredientsGrams:[\s\S]*?(?=^[A-Za-z])/m)?.[0],
      before.match(/^ingredientsGrams:[\s\S]*?(?=^[A-Za-z])/m)?.[0],
      `${page.slug} ingredientsGrams`,
    );
    assert.doesNotMatch(markdown, /FAQPage|\.csv\)|\]\([^)]*#/);

    const after = bodyOf(markdown).slice(bodyOf(markdown).indexOf(`## ${page.heading}`));
    assert.ok(after.startsWith(`## ${page.heading}`), page.slug);
    const paragraph = after.slice(page.heading.length + 3).trimStart().split(/\n\s*\n/)[0];
    const count = words(paragraph).length;
    assert.ok(count >= 40 && count <= 60, `${page.slug} answer is ${count} words`);
    for (const number of page.numbers) {
      assert.ok(paragraph.includes(number), `${page.slug} missing ${number}`);
    }
    assert.match(bodyOf(markdown), /^\| /m, `${page.slug} table`);
  }
});

test("contextual links land on canonical paths and do not move source dates", () => {
  for (const [source, target] of SOURCE_LINKS) {
    const markdown = readArticle(source);
    const before = gitShow(`src/data/articles/${source}.md`);
    assert.equal(field(markdown, "dateModified"), field(before, "dateModified"), source);
    assert.equal(field(markdown, "substantiveUpdate"), field(before, "substantiveUpdate"), source);
    assert.equal(field(markdown, "author"), "David Miller", source);
    assert.match(bodyOf(markdown), new RegExp(`\\]\\(/${target}/\\)`), source);
    assert.doesNotMatch(bodyOf(markdown), new RegExp(`\\]\\(/${target}/#`));
    assert.doesNotMatch(bodyOf(markdown), new RegExp(`\\]\\(/${target}[^)]*\\.csv`));
  }
});

test("built recipe pages keep valid Recipe JSON-LD and omit FAQPage", () => {
  const dist = join(ROOT, "dist");
  if (!existsSync(dist)) return;
  for (const page of PAGES) {
    const html = readFileSync(join(dist, page.slug, "index.html"), "utf8");
    assert.doesNotMatch(html, /FAQPage/, page.slug);
    const recipes = [];
    for (const block of jsonLdBlocks(html)) {
      visit(block, (node) => {
        if (node["@type"] === "Recipe") recipes.push(node);
      });
    }
    assert.equal(recipes.length, 1, page.slug);
    const recipe = recipes[0];
    assert.equal(recipe.author.name, "David Miller", page.slug);
    assert.equal(typeof recipe.recipeCuisine, "string", page.slug);
    assert.ok(recipe.recipeCuisine.trim(), page.slug);
    assert.ok(Array.isArray(recipe.recipeIngredient) && recipe.recipeIngredient.length > 0, page.slug);
    assert.ok(Array.isArray(recipe.recipeInstructions) && recipe.recipeInstructions.length > 0, page.slug);
    assert.equal(recipe.dateModified, "2026-11-26T00:00:00.000Z", page.slug);
    assert.equal(recipe.nutrition["@type"], "NutritionInformation", page.slug);
    assert.match(recipe.nutrition.calories, /^\d+ calories$/, page.slug);
    assert.match(html, new RegExp(`<h2[^>]*>${page.heading.replace(/[?]/g, "\\?")}</h2>`));
  }
});
