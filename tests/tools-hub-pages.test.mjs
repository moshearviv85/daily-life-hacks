import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const pages = [
  "src/pages/tools/grocery-unit-price-calculator/index.astro",
  "src/pages/tools/recipe-cost-calculator/index.astro",
  "src/pages/tools/grocery-budget-calculator/index.astro",
];

test("new calculator pages expose the required search and privacy signals", async () => {
  for (const relative of pages) {
    const source = await readFile(path.join(root, relative), "utf8");
    assert.match(source, /"@type": "WebApplication"/, relative);
    assert.match(source, /"@type": "FAQPage"/, relative);
    assert.match(source, /applicationCategory/, relative);
    assert.match(source, /browser tab/, relative);
    assert.match(source, /href="\/methodology\/"/, relative);
    assert.match(source, /document\.addEventListener\('astro:page-load'/, relative);
    assert.doesNotMatch(source, /—/, `${relative} contains an em dash`);
  }
});

test("FAQ schema matches the five questions and answers visible on each tool", async () => {
  const normalize = (value) =>
    value.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

  for (const relative of pages) {
    const source = await readFile(path.join(root, relative), "utf8");
    if (relative.includes("grocery-budget-calculator")) {
      assert.match(source, /const faqs = \[/);
      assert.match(source, /mainEntity: faqs\.map/);
      assert.match(source, /\{faqs\.map\(\(\[question, answer\]\)/);
      continue;
    }
    const schemaBlock = source.match(/mainEntity:\s*\[(.*?)\]\.map/s)?.[1] ?? "";
    const schemaEntries = [...schemaBlock.matchAll(/\["([^"]+)", "([^"]+)"\]/g)]
      .map((match) => [match[1], normalize(match[2])]);
    const visibleEntries = [...source.matchAll(/<details><summary>(.*?)<\/summary><p>(.*?)<\/p><\/details>/gs)]
      .map((match) => [normalize(match[1]), normalize(match[2])]);

    assert.equal(schemaEntries.length, 5, `${relative} schema FAQ count`);
    assert.deepEqual(schemaEntries, visibleEntries, `${relative} FAQ mismatch`);
  }
});

test("tools hub links all four calculators", async () => {
  const source = await readFile(
    path.join(root, "src/pages/tools/index.astro"),
    "utf8",
  );
  for (const route of [
    "/tools/grocery-unit-price-calculator/",
    "/tools/recipe-cost-calculator/",
    "/tools/grocery-budget-calculator/",
    "/tools/fiber-per-dollar-calculator/",
    "/recipes/",
  ]) {
    assert.match(source, new RegExp(route.replaceAll("/", "\\/")), route);
  }
  assert.match(source, /"@type": "ItemList"/);
});

test("tools hub exposes the practical recipe workflows", async () => {
  const source = await readFile(path.join(process.cwd(), "src/pages/tools/index.astro"), "utf8");
  assert.match(source, /href: "\/tools\/recipe-finder\/"/);
  assert.match(source, /href: "\/tools\/shopping-list-builder\/"/);
  assert.match(source, /You've Got Ingredients\. Let's Find Dinner\./);
  assert.match(source, /Make One Shopping List, Not Five/);
});

test("calculator formulas and interaction hooks remain present", async () => {
  const unit = await readFile(path.join(root, pages[0]), "utf8");
  const recipe = await readFile(path.join(root, pages[1]), "utf8");
  const budget = await readFile(path.join(root, pages[2]), "utf8");

  assert.match(unit, /Is This a Good Price\?/);
  assert.match(unit, /fiber-per-dollar-2026\.csv/);
  assert.match(unit, /protein-per-dollar-2026\.csv/);
  assert.match(unit, /currentPer100=price\/\(grams\/100\)/);
  assert.match(unit, /fiberBaseline\*parseFloat\(food\.fiber\.price_per_100g_usd\)\/currentPer100/);
  assert.match(unit, /proteinBaseline\*parseFloat\(food\.protein\.price_per_100g_usd\)\/currentPer100/);
  assert.match(unit, /Compare two packages directly/);
  assert.match(unit, /a\.price\/\(a\.size\*a\.meta\.factor\)/);
  assert.match(recipe, /amount used ÷ package amount/);
  assert.match(recipe, /\(used\*u\.factor\)\/\(pack\*p\.factor\)\*price/);
  assert.match(budget, /fiber-day-cost-2026\.csv/);
  assert.match(budget, /protein-day-cost-2026\.csv/);
  assert.match(budget, /menu\.cost\*days\*people/);
  assert.match(budget, /restaurant\.cost\*planned\*people/);
});

test("calculator engagement is measured without sending entered values", async () => {
  const layout = await readFile(
    path.join(root, "src/layouts/BaseLayout.astro"),
    "utf8",
  );
  assert.match(layout, /'tool_engagement'/);
  assert.match(layout, /tool_name: toolName/);
  assert.match(layout, /sessionStorage\.getItem\(storageKey\)/);
  assert.doesNotMatch(layout, /input_value|entered_price|recipe_name/);
});

test("inline calculator programs parse as JavaScript", async () => {
  for (const relative of pages) {
    const source = await readFile(path.join(root, relative), "utf8");
    const match = source.match(/<script is:inline>([\s\S]*?)<\/script>/);
    assert.ok(match, `${relative} has an inline calculator program`);
    assert.doesNotThrow(() => new Function(match[1]), relative);
  }
});
