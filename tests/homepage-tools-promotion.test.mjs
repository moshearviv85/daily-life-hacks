import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

function csvCells(line) {
  const cells = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      quoted = !quoted;
      continue;
    }
    if (character === "," && !quoted) {
      cells.push(field);
      field = "";
      continue;
    }
    field += character;
  }
  cells.push(field);
  return cells;
}

function csvRow(csv, food) {
  const [header, ...lines] = csv.trim().split(/\n/);
  const headers = csvCells(header);
  const line = lines.find((row) => csvCells(row)[headers.indexOf("food")] === food);
  assert.ok(line, `missing CSV row for ${food}`);
  return Object.fromEntries(headers.map((name, index) => [name, csvCells(line)[index]]));
}

test("homepage sends research readers to the priced weekly planner", async () => {
  const source = await readFile("src/pages/index.astro", "utf8");
  assert.match(source, /href="\/tools\/grocery-budget-calculator\/"/);
  assert.match(source, /10 priced menus/);
  assert.match(source, /Plan the Week Before the Cart Gets Ideas/);
  assert.match(source, /Cheapest Fiber and Protein per Grocery Dollar \| USDA \+ Real US Prices/);
  assert.match(source, /<h1[^>]*>\s*Cheapest Fiber and Protein per Grocery Dollar\s*<\/h1>/);
  assert.doesNotMatch(source, /Join 2,500\+ readers/);
  assert.doesNotMatch(source, /rebuilding our spreadsheet one bean at a time[^<]*—/);
});

test("homepage leads with a visible grocery-dollar H1 and flagship study links", async () => {
  const source = await readFile("src/pages/index.astro", "utf8");
  assert.match(
    source,
    /const HOME_TITLE = 'Cheapest Fiber and Protein per Grocery Dollar \| USDA \+ Real US Prices'/,
  );
  assert.match(source, /name: HOME_TITLE/);
  assert.match(source, /description: HOME_DESCRIPTION/);
  assert.equal([...source.matchAll(/<h1[\s>]/g)].length, 1);
  assert.doesNotMatch(source, /class="sr-only"[\s\S]{0,120}<h1/);
  assert.doesNotMatch(source, /Grocery Cost Studies, Practical Recipes, and Food Tools/);

  const mainStart = source.indexOf("<main");
  const hero = source.indexOf("<HeroSection");
  const fiberHref = source.indexOf(
    'href="/fiber-per-dollar-cheapest-high-fiber-foods/"',
    mainStart,
  );
  const proteinHref = source.indexOf(
    'href="/protein-per-dollar-cheapest-protein-sources/"',
    mainStart,
  );
  assert.ok(mainStart !== -1 && hero !== -1, "homepage should render main before HeroSection");
  assert.ok(
    fiberHref !== -1 && fiberHref < hero,
    "fiber flagship href should appear above Latest Article / HeroSection",
  );
  assert.ok(
    proteinHref !== -1 && proteinHref < hero,
    "protein flagship href should appear above Latest Article / HeroSection",
  );
  assert.match(source, /href="\/tools\/grocery-budget-calculator\/"/);
  assert.match(source, /href="\/research\/"/);
});

test("homepage does not cite the pre-BLS 97.9 protein-per-dollar snapshot", async () => {
  const source = await readFile("src/pages/index.astro", "utf8");
  const proteinCsv = await readFile("public/data/protein-per-dollar-2026.csv", "utf8");
  const fiberCsv = await readFile("public/data/fiber-per-dollar-2026.csv", "utf8");
  const flour = csvRow(proteinCsv, "Whole wheat flour").protein_g_per_dollar;
  const lentils = csvRow(proteinCsv, "Brown lentils (dry)").protein_g_per_dollar;
  const pinto = csvRow(proteinCsv, "Pinto beans (dry)").protein_g_per_dollar;
  const tempeh = csvRow(proteinCsv, "Tempeh").protein_g_per_dollar;
  const splitPeas = csvRow(fiberCsv, "Green split peas (dry)").fiber_g_per_dollar;

  assert.equal(pinto, "57.6");
  assert.equal(flour, "96.0");
  assert.equal(lentils, "77.7");
  assert.doesNotMatch(source, /97\.9/);
  assert.doesNotMatch(source, /about 98 grams of protein/);
  assert.match(source, new RegExp(`${splitPeas} grams of fiber`));
  assert.match(source, new RegExp(`${flour} grams of protein`));
  assert.match(source, new RegExp(`${lentils} grams of protein per dollar`));
  assert.match(source, new RegExp(`dry pinto beans buy ${pinto}`));
  assert.match(source, new RegExp(`tempeh buys ${tempeh}`));
});

test("one-dollar fiber page matches the fiber CSV and drops the 70.8 pinto snapshot", async () => {
  const article = await readFile("src/data/articles/one-dollar-fiber-what-it-buys.md", "utf8");
  const derived = await readFile("public/data/one-dollar-fiber-what-it-buys-2026.csv", "utf8");
  const parent = await readFile("public/data/fiber-per-dollar-2026.csv", "utf8");
  const [header, ...lines] = derived.trim().split(/\n/);
  const headers = csvCells(header);

  assert.doesNotMatch(article, /70\.8/);
  assert.doesNotMatch(article, /\$3\.97/);
  for (const line of lines) {
    const row = Object.fromEntries(headers.map((name, index) => [name, csvCells(line)[index]]));
    const parentRow = csvRow(parent, row.food);
    assert.equal(parentRow.fiber_g_per_dollar, row.value, row.food);
    assert.equal(parentRow.package_price_usd, row.package_price_usd, row.food);
    assert.match(article, new RegExp(`${row.value.replace(".", "\\.")} g`));
    assert.match(article, new RegExp(`\\$${row.package_price_usd.replace(".", "\\.")}`));
  }

  const fiberGuide = await readFile(
    "src/data/articles/how-to-eat-more-fiber-on-a-budget-complete-guide.md",
    "utf8",
  );
  assert.doesNotMatch(fiberGuide, /70\.8/);
  assert.match(fiberGuide, /41\.7/);
  assert.match(fiberGuide, /\$0\.96/);
});

test("recipes index advertises the scaler where people choose a recipe", async () => {
  const source = await readFile("src/pages/recipes/index.astro", "utf8");
  assert.match(source, /Easy Recipes With Adjustable Servings/);
  assert.match(source, /change the servings inside the ingredient card/);
  assert.match(source, /All \{articles\.length\} recipes scale/);
});

test("recipes index links the finder and combined shopping list", async () => {
  const source = await readFile("src/pages/recipes/index.astro", "utf8");
  assert.match(source, /href="\/tools\/recipe-finder\/"/);
  assert.match(source, /href="\/tools\/shopping-list-builder\/"/);
  assert.match(source, /You've Got Ingredients\. Let's Find Dinner\./);
  assert.match(source, /Make One Shopping List, Not Five/);
});

test("weekly planner cannot quietly become a 35-day week", async () => {
  const source = await readFile("src/pages/tools/grocery-budget-calculator/index.astro", "utf8");
  assert.match(source, /allowed=Math\.max\(0,7-others\)/);
  assert.match(source, /planned===7\?money\(totalCost\*4\.33\)/);
  assert.match(source, /planner caps the total at seven days/);
});
