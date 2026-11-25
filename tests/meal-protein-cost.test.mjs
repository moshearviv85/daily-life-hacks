import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { INDEX_PRUNE_SLUGS, isIndexPruned } from "../src/content/index-prune.js";
import {
  DISCLOSURE,
  FIBER_CSV,
  FIBER_FLAGSHIP_HREF,
  FOOD_VALUE_DB_HREF,
  MEAL_PROTEIN_COST,
  PRICE_MONTH_LABEL,
  PROTEIN_CSV,
  PROTEIN_FLAGSHIP_HREF,
  aboutGrams,
  fiberRow,
  getMealProteinCost,
  mealProteinCostHighlightNumbers,
  normalizeMealProteinCostSlug,
  packageCostUsd,
  packageProteinG,
  proteinRow,
  usd,
} from "../src/content/meal-protein-cost.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(relativePath) {
  return readFileSync(join(root, relativePath), "utf8");
}

function parseCsv(source) {
  const records = [];
  let record = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (quoted) {
      if (character === '"' && source[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
      continue;
    }
    if (character === '"') {
      quoted = true;
    } else if (character === ",") {
      record.push(field);
      field = "";
    } else if (character === "\n") {
      record.push(field.replace(/\r$/, ""));
      records.push(record);
      record = [];
      field = "";
    } else {
      field += character;
    }
  }
  if (field.length > 0 || record.length > 0) {
    record.push(field.replace(/\r$/, ""));
    records.push(record);
  }

  const [headers, ...rows] = records;
  return rows
    .filter((row) => row.some((cell) => cell !== ""))
    .map((row) =>
      Object.fromEntries(headers.map((header, index) => [header, row[index]])),
    );
}

const proteinRows = parseCsv(read(PROTEIN_CSV));
const fiberRows = parseCsv(read(FIBER_CSV));
const proteinByFood = new Map(proteinRows.map((row) => [row.food, row]));
const fiberByFood = new Map(fiberRows.map((row) => [row.food, row]));

const refreshedSlugs = Object.keys(MEAL_PROTEIN_COST);
const sourdoughSlugs = [
  "easy-sourdough-discard-pizza-dough-no-yeast",
  "easy-sourdough-discard-recipes-beginners",
  "gluten-free-sourdough-discard-pizza-dough",
  "how-to-make-sourdough-pizza-dough-same-day",
  "how-to-measure-sourdough-discard-grams",
  "what-to-make-with-sourdough-discard-by-amount",
  "can-you-use-sourdough-discard-from-a-new-starter",
  "how-long-does-sourdough-discard-last",
  "sourdough-discard-vs-active-starter",
];

test("refreshed slugs stay indexable and skip prune plus sourdough", () => {
  assert.deepEqual(refreshedSlugs.sort(), [
    "beans-and-rice-complete-protein-meal",
    "canned-beans-vs-dried-beans-nutrition",
    "costco-rotisserie-chicken-meal-ideas-dinner",
    "protein-per-serving-beans-chicken-tofu-compared",
  ]);
  assert.equal(INDEX_PRUNE_SLUGS.has("savory-oatmeal-bowls-with-eggs-and-avocado"), true);
  assert.equal(refreshedSlugs.includes("savory-oatmeal-bowls-with-eggs-and-avocado"), false);
  assert.equal(refreshedSlugs.includes("meal-prep-for-beginners-complete-system"), false);
  assert.equal(refreshedSlugs.includes("eat-healthy-on-a-budget-complete-playbook"), false);
  assert.equal(refreshedSlugs.includes("high-protein-on-a-budget-complete-guide"), false);

  for (const slug of refreshedSlugs) {
    assert.equal(isIndexPruned(slug), false, `${slug} is pruned`);
    assert.equal(/sourdough/i.test(slug), false, `${slug} looks like sourdough`);
    assert.equal(existsSync(join(root, "src/data/articles", `${slug}.md`)), true);
  }

  for (const slug of sourdoughSlugs) {
    assert.equal(getMealProteinCost(slug), null);
  }
});

test("every hardcoded highlight number matches the live study CSV", () => {
  for (const [slug, config] of Object.entries(MEAL_PROTEIN_COST)) {
    const numbers = mealProteinCostHighlightNumbers(config);
    assert.ok(numbers.length > 0, `${slug} has no highlight numbers`);

    for (const { food, csv, column, value } of numbers) {
      const row = csv === "fiber" ? fiberByFood.get(food) : proteinByFood.get(food);
      assert.ok(row, `${slug} highlight food missing from ${csv} CSV: ${food}`);
      assert.equal(
        row[column],
        value,
        `${slug} ${food} ${column} should be ${row[column]}, not ${value}`,
      );
      assert.match(
        `${config.highlight.value} ${config.highlight.claim} ${config.lines.join(" ")}`,
        new RegExp(value.replace(".", "\\.")),
        `${slug} should display CSV value ${value}`,
      );
    }

    assert.equal(config.proteinHref, PROTEIN_FLAGSHIP_HREF);
    assert.match(config.disclosure, new RegExp(PRICE_MONTH_LABEL));
    assert.match(config.disclosure, /USDA FoodData Central/);
    assert.match(config.disclosure, /not a food endorsement/i);
    assert.equal(config.disclosure, DISCLOSURE);
  }
});

test("derived meal totals recompute from study package prices", () => {
  const costco = MEAL_PROTEIN_COST["costco-rotisserie-chicken-meal-ideas-dinner"];
  const bird = proteinRow("Rotisserie chicken (whole, cooked)");
  const edible = packageProteinG(bird);
  assert.equal(costco.derived.edibleProteinG, aboutGrams(edible));
  assert.equal(costco.derived.perServingProteinG, aboutGrams(edible / 4));
  assert.equal(costco.derived.perServingUsd, usd(packageCostUsd(bird) / 4));
  assert.equal(costco.derived.packageUsd, usd(packageCostUsd(bird)));

  const beans = MEAL_PROTEIN_COST["beans-and-rice-complete-protein-meal"];
  const canned = proteinRow("Canned black beans");
  assert.equal(beans.derived.twoCanUsd, usd(packageCostUsd(canned, 2)));
  assert.equal(beans.derived.twoCanProteinG, aboutGrams(packageProteinG(canned) * 2));
  assert.equal(MEAL_PROTEIN_COST["meal-prep-for-beginners-complete-system"], undefined);
  assert.equal(MEAL_PROTEIN_COST["high-protein-on-a-budget-complete-guide"], undefined);
  assert.equal(MEAL_PROTEIN_COST["eat-healthy-on-a-budget-complete-playbook"], undefined);

  const lentils = MEAL_PROTEIN_COST["protein-per-serving-beans-chicken-tofu-compared"];
  const lentilRow = proteinRow("Brown lentils (dry)");
  const breast = proteinRow("Chicken breast (boneless, skinless)");
  assert.equal(
    lentils.derived.rawRatio,
    (Number(lentilRow.protein_g_per_dollar) / Number(breast.protein_g_per_dollar)).toFixed(1),
  );
});

test("article bodies lock the new highlight numbers and honest flagship links", () => {
  const costco = read("src/data/articles/costco-rotisserie-chicken-meal-ideas-dinner.md");
  const costcoCallout = MEAL_PROTEIN_COST["costco-rotisserie-chicken-meal-ideas-dinner"];
  assert.match(costco, /dateModified: 2026-11-25/);
  assert.match(costco, /substantiveUpdate: 2026-11-25/);
  assert.match(costco, /title: "Costco Rotisserie Chicken: \$5\.97 and ~160g Protein"/);
  assert.match(costco, /about 160 grams of edible protein after bone and skin/);
  assert.match(costco, /\$1\.49/);
  assert.match(costco, /40 grams/);
  assert.match(costcoCallout.highlight.claim, /\$5\.97/);
  assert.match(costcoCallout.highlight.claim, /about 160 grams/);
  assert.match(costcoCallout.highlight.value, /26\.7 g per \$1/);
  assert.match(costcoCallout.disclosure, /July 2026/);
  assert.equal(
    (costco.match(/\]\(\/protein-per-dollar-adjusted-for-quality\/\)/g) ?? []).length,
    1,
  );
  assert.doesNotMatch(costco, /fiber-per-dollar-cheapest-high-fiber-foods/);
  assert.doesNotMatch(costco, /protein-per-dollar-cheapest-protein-sources/);

  const beans = read("src/data/articles/beans-and-rice-complete-protein-meal.md");
  const canned = proteinRow("Canned black beans");
  const rice = proteinRow("White rice (long grain, dry)");
  const cannedFiber = fiberRow("Canned black beans");
  assert.match(beans, /dateModified: 2026-11-23/);
  assert.match(beans, new RegExp(`\\$${Number(canned.package_price_usd).toFixed(2)} each`));
  assert.match(beans, /\$1\.76 for the pot/);
  assert.match(beans, /about 53 grams of protein/);
  assert.match(beans, new RegExp(`${canned.protein_g_per_dollar} grams per dollar`));
  assert.match(beans, new RegExp(`${rice.protein_g_per_dollar} grams of protein per dollar`));
  assert.match(beans, new RegExp(`${cannedFiber.fiber_g_per_dollar} grams of fiber per dollar`));
  assert.equal(
    (beans.match(/\]\(\/protein-per-dollar-adjusted-for-quality\/\)/g) ?? []).length,
    2,
  );
  assert.equal(
    (beans.match(/\]\(\/what-30-grams-of-fiber-costs-per-day\/\)/g) ?? []).length,
    1,
  );
  assert.doesNotMatch(beans, /maybe two dollars a plate/);

  const redirects = read("public/_redirects");
  assert.equal(
    existsSync(join(root, "src/data/articles/high-protein-on-a-budget-complete-guide.md")),
    false,
  );
  assert.match(
    redirects,
    /^\/high-protein-on-a-budget-complete-guide \/protein-per-dollar-adjusted-for-quality\/ 301$/m,
  );

  const mealPrep = read("src/data/articles/meal-prep-for-beginners-complete-system.md");
  const pintos = proteinRow("Pinto beans (dry)");
  const drums = proteinRow("Chicken drumsticks (bone-in)");
  assert.match(mealPrep, /dateModified: 2026-11-23/);
  assert.match(mealPrep, new RegExp(`\\$${Number(drums.package_price_usd).toFixed(2)}`));
  assert.match(
    mealPrep,
    new RegExp(`\\$${Number(pintos.package_price_usd).toFixed(2)} for the 4 lb bag`),
  );
  assert.match(mealPrep, /\$12\.21/);

  const playbook = read("src/data/articles/eat-healthy-on-a-budget-complete-playbook.md");
  assert.match(playbook, /dateModified: 2026-09-24/);
  assert.match(playbook, /57\.6 grams of protein/);
  assert.match(playbook, /9\.4/);
  assert.doesNotMatch(playbook, /97\.9/);

  const lentils = read("src/data/articles/protein-per-serving-beans-chicken-tofu-compared.md");
  assert.match(lentils, /id="cost-per-25-g"/);
  assert.equal(
    (lentils.match(/\]\(\/what-30-grams-of-fiber-costs-per-day\/\)/g) ?? []).length,
    1,
  );

  const cannedVsDry = read("src/data/articles/canned-beans-vs-dried-beans-nutrition.md");
  assert.match(cannedVsDry, /id="cost-per-serving"/);
  assert.equal(
    (cannedVsDry.match(/\]\(\/what-30-grams-of-fiber-costs-per-day\/\)/g) ?? []).length,
    1,
  );
});

test("high-protein guide starter prices and callout follow the protein CSV", () => {
  const redirects = read("public/_redirects");
  assert.equal(
    existsSync(join(root, "src/data/articles/high-protein-on-a-budget-complete-guide.md")),
    false,
  );
  assert.match(
    redirects,
    /^\/high-protein-on-a-budget-complete-guide\/ \/protein-per-dollar-adjusted-for-quality\/ 301$/m,
  );
  assert.equal(MEAL_PROTEIN_COST["high-protein-on-a-budget-complete-guide"], undefined);

  const quality = read("src/data/articles/protein-per-dollar-adjusted-for-quality.md");
  const cart = [
    ["Chicken drumsticks (bone-in)", 1],
    ["Pinto beans (dry)", 1],
    ["Eggs (large)", 2],
    ["Brown lentils (dry)", 1],
    ["Canned tuna (chunk light, in water)", 2],
    ["Cottage cheese (4%)", 1],
  ];
  let basket = 0;
  for (const [food, count] of cart) {
    const price = packageCostUsd(proteinRow(food), count);
    basket += price;
    assert.match(quality, new RegExp(usd(price).replaceAll("$", "\\$")), food);
  }
  assert.match(quality, new RegExp(usd(basket).replaceAll("$", "\\$")));
  assert.match(quality, /id="weekly-protein-cart"/);
  assert.doesNotMatch(quality, /\$20 backbone/);
});

test("sourdough pages stay free of protein and fiber flagship links", () => {
  for (const slug of sourdoughSlugs) {
    const articlePath = join(root, "src/data/articles", `${slug}.md`);
    if (!existsSync(articlePath)) continue;
    const source = readFileSync(articlePath, "utf8");
    assert.doesNotMatch(source, /protein-per-dollar-cheapest-protein-sources/);
    assert.doesNotMatch(source, /fiber-per-dollar-cheapest-high-fiber-foods/);
    assert.doesNotMatch(source, /food-value-database/);
  }
});

test("shared callout reuses StudyLead and stays wired on the article page", () => {
  const component = read("src/components/MealProteinCost.astro");
  const slugPage = read("src/pages/[slug].astro");
  const css = read("src/styles/global.css");

  assert.match(component, /class="meal-protein-cost"/);
  assert.match(component, /data-meal-protein-cost=\{mealCost\.slug\}/);
  assert.match(component, /StudyLead/);
  assert.match(component, /jumpHref=\{showFlagshipLinks \? mealCost\.proteinHref : undefined\}/);
  assert.match(component, /href=\{link\.href\}/);

  const contentConfig = read("src/content.config.ts");
  assert.match(contentConfig, /generateId:/);
  assert.match(contentConfig, /entry\.replace/);

  assert.match(slugPage, /getMealProteinCost/);
  assert.match(slugPage, /normalizeMealProteinCostSlug/);
  assert.match(slugPage, /articleFilePath/);
  assert.match(slugPage, /Astro\.params\.slug/);
  assert.match(slugPage, /mealCostSlug in MEAL_PROTEIN_COST/);
  assert.match(slugPage, /<MealProteinCost/);
  assert.match(slugPage, /!flagship && mealCost/);

  assert.equal(
    normalizeMealProteinCostSlug("src/data/articles/beans-and-rice-complete-protein-meal.md"),
    "beans-and-rice-complete-protein-meal",
  );
  assert.equal(
    normalizeMealProteinCostSlug(
      "src\\data\\articles\\meal-prep-for-beginners-complete-system.md",
    ),
    "meal-prep-for-beginners-complete-system",
  );
  assert.equal(
    getMealProteinCost("src/data/articles/meal-prep-for-beginners-complete-system.md"),
    null,
  );
  assert.equal(getMealProteinCost("eat-healthy-on-a-budget-complete-playbook"), null);
  assert.equal(getMealProteinCost("high-protein-on-a-budget-complete-guide"), null);
  assert.equal(
    getMealProteinCost(
      undefined,
      "beans-and-rice-complete-protein-meal/",
      "unused",
    )?.slug,
    "beans-and-rice-complete-protein-meal",
  );
  assert.ok(getMealProteinCost("beans-and-rice-complete-protein-meal"));
  assert.equal(getMealProteinCost("meal-prep-for-beginners-complete-system"), null);
  assert.equal(
    MEAL_PROTEIN_COST["beans-and-rice-complete-protein-meal"].highlight.value,
    `${proteinRow("Canned black beans").protein_g_per_dollar} g per $1`,
  );
  assert.equal(MEAL_PROTEIN_COST["costco-rotisserie-chicken-meal-ideas-dinner"].fiberHref, null);

  for (const needle of [
    ".meal-protein-cost",
    ".meal-protein-cost-lines",
    ".meal-protein-cost-more",
  ]) {
    assert.ok(css.includes(needle), `missing CSS for ${needle}`);
  }

  assert.equal(
    MEAL_PROTEIN_COST["beans-and-rice-complete-protein-meal"].fiberHref,
    FIBER_FLAGSHIP_HREF,
  );
  assert.equal(
    MEAL_PROTEIN_COST["canned-beans-vs-dried-beans-nutrition"].dbHref,
    FOOD_VALUE_DB_HREF,
  );
  assert.equal(Object.keys(MEAL_PROTEIN_COST).length, 4);
});

test("rendered beans-and-rice and meal-prep pages expose the callout when dist exists", () => {
  const beans = "dist/beans-and-rice-complete-protein-meal/index.html";
  const mealPrep = "dist/meal-prep-for-beginners-complete-system/index.html";
  if (!existsSync(join(root, beans)) || !existsSync(join(root, mealPrep))) {
    return;
  }

  const beansHtml = read(beans);
  assert.match(beansHtml, /class="[^"]*meal-protein-cost[^"]*"/);
  assert.match(beansHtml, /data-meal-protein-cost="beans-and-rice-complete-protein-meal"/);
  assert.match(beansHtml, /class="[^"]*study-pull-quote[^"]*"/);
  assert.doesNotMatch(beansHtml, /href="\/protein-per-dollar-cheapest-protein-sources\/"/);
  assert.doesNotMatch(beansHtml, /href="\/fiber-per-dollar-cheapest-high-fiber-foods\/"/);
  assert.match(beansHtml, /July 2026/);
  assert.doesNotMatch(beansHtml, /protein-per-dollar-cheapest-high-protein-foods/);
  assert.doesNotMatch(beansHtml, /maybe two dollars a plate/);

  const mealPrepHtml = read(mealPrep);
  assert.match(mealPrepHtml, /noindex,\s*follow/i);
  assert.doesNotMatch(mealPrepHtml, /class="[^"]*meal-protein-cost[^"]*"/);
  assert.doesNotMatch(mealPrepHtml, /href="\/protein-per-dollar-cheapest-protein-sources\/"/);
  assert.doesNotMatch(mealPrepHtml, /href="\/fiber-per-dollar-cheapest-high-fiber-foods\/"/);
});
