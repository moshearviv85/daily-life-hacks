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
];

test("refreshed slugs stay indexable and skip prune plus sourdough", () => {
  assert.ok(refreshedSlugs.length >= 5 && refreshedSlugs.length <= 8);
  assert.equal(INDEX_PRUNE_SLUGS.has("savory-oatmeal-bowls-with-eggs-and-avocado"), true);
  assert.equal(refreshedSlugs.includes("savory-oatmeal-bowls-with-eggs-and-avocado"), false);
  assert.ok(refreshedSlugs.includes("beans-and-rice-complete-protein-meal"));
  assert.ok(refreshedSlugs.includes("meal-prep-for-beginners-complete-system"));

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

  const mealPrep = MEAL_PROTEIN_COST["meal-prep-for-beginners-complete-system"];
  const drums = proteinRow("Chicken drumsticks (bone-in)");
  const pintos = proteinRow("Pinto beans (dry)");
  assert.equal(
    mealPrep.derived.pairUsd,
    usd(packageCostUsd(drums) + packageCostUsd(pintos)),
  );

  const lentils = MEAL_PROTEIN_COST["lentils-vs-chicken-breast-protein-cost"];
  const lentilRow = proteinRow("Brown lentils (dry)");
  const breast = proteinRow("Chicken breast (boneless, skinless)");
  assert.equal(
    lentils.derived.rawRatio,
    (Number(lentilRow.protein_g_per_dollar) / Number(breast.protein_g_per_dollar)).toFixed(1),
  );
});

test("article bodies lock the new highlight numbers and honest flagship links", () => {
  const costco = read("src/data/articles/costco-rotisserie-chicken-meal-ideas-dinner.md");
  assert.match(costco, /dateModified: 2026-09-05/);
  assert.match(costco, /26\.7 grams per dollar/);
  assert.match(costco, /\$5\.97/);
  assert.match(costco, /July 2026/);
  assert.equal(
    (costco.match(/\]\(\/protein-per-dollar-cheapest-protein-sources\/\)/g) ?? []).length,
    1,
  );
  assert.doesNotMatch(costco, /fiber-per-dollar-cheapest-high-fiber-foods/);

  const beans = read("src/data/articles/beans-and-rice-complete-protein-meal.md");
  const canned = proteinRow("Canned black beans");
  const rice = proteinRow("White rice (long grain, dry)");
  const cannedFiber = fiberRow("Canned black beans");
  assert.match(beans, /dateModified: 2026-09-06/);
  assert.match(beans, new RegExp(`\\$${Number(canned.package_price_usd).toFixed(2)} each`));
  assert.match(beans, /\$1\.76 for the pot/);
  assert.match(beans, /about 53 grams of protein/);
  assert.match(beans, new RegExp(`${canned.protein_g_per_dollar} grams per dollar`));
  assert.match(beans, new RegExp(`${rice.protein_g_per_dollar} grams of protein per dollar`));
  assert.match(beans, new RegExp(`${cannedFiber.fiber_g_per_dollar} grams of fiber per dollar`));
  assert.equal(
    (beans.match(/\]\(\/protein-per-dollar-cheapest-protein-sources\/\)/g) ?? []).length,
    1,
  );
  assert.equal(
    (beans.match(/\]\(\/fiber-per-dollar-cheapest-high-fiber-foods\/\)/g) ?? []).length,
    1,
  );
  assert.doesNotMatch(beans, /maybe two dollars a plate/);

  const highProtein = read("src/data/articles/high-protein-on-a-budget-complete-guide.md");
  assert.match(highProtein, /dateModified: 2026-09-05/);
  assert.match(highProtein, /\$9\.43 at the July 2026 study prices \(\$5\.46 plus \$3\.97\)/);
  assert.equal(
    (highProtein.match(/\]\(\/fiber-per-dollar-cheapest-high-fiber-foods\/\)/g) ?? []).length,
    1,
  );

  const mealPrep = read("src/data/articles/meal-prep-for-beginners-complete-system.md");
  const pintos = proteinRow("Pinto beans (dry)");
  const drums = proteinRow("Chicken drumsticks (bone-in)");
  assert.match(mealPrep, /dateModified: 2026-09-06/);
  assert.match(mealPrep, new RegExp(`\\$${Number(drums.package_price_usd).toFixed(2)}`));
  assert.match(
    mealPrep,
    new RegExp(`\\$${Number(pintos.package_price_usd).toFixed(2)} for the 4 lb bag`),
  );
  assert.match(mealPrep, /\$12\.21/);

  const playbook = read("src/data/articles/eat-healthy-on-a-budget-complete-playbook.md");
  assert.match(playbook, /dateModified: 2026-09-05/);
  assert.match(playbook, /97\.9 grams of protein/);
  assert.match(playbook, /9\.2/);

  const lentils = read("src/data/articles/lentils-vs-chicken-breast-protein-cost.md");
  const lentilFiber = fiberRow("Brown lentils (dry)");
  assert.match(lentils, /dateModified: 2026-09-05/);
  assert.match(lentils, new RegExp(`${lentilFiber.fiber_g_per_dollar} grams of fiber per dollar`));
  assert.equal(
    (lentils.match(/\]\(\/fiber-per-dollar-cheapest-high-fiber-foods\/\)/g) ?? []).length,
    1,
  );

  const cannedVsDry = read("src/data/articles/canned-vs-dry-beans-cost.md");
  assert.match(cannedVsDry, /dateModified: 2026-09-05/);
  assert.equal(
    (cannedVsDry.match(/\]\(\/fiber-per-dollar-cheapest-high-fiber-foods\/\)/g) ?? []).length,
    1,
  );
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
  assert.match(component, /jumpHref=\{mealCost\.proteinHref\}/);
  assert.match(component, /href=\{link\.href\}/);

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
    getMealProteinCost(
      "src/data/articles/meal-prep-for-beginners-complete-system.md",
    )?.slug,
    "meal-prep-for-beginners-complete-system",
  );
  assert.equal(
    getMealProteinCost(
      undefined,
      "beans-and-rice-complete-protein-meal/",
      "unused",
    )?.slug,
    "beans-and-rice-complete-protein-meal",
  );
  assert.ok(getMealProteinCost("beans-and-rice-complete-protein-meal"));
  assert.ok(getMealProteinCost("meal-prep-for-beginners-complete-system"));
  assert.equal(
    MEAL_PROTEIN_COST["beans-and-rice-complete-protein-meal"].highlight.value,
    `${proteinRow("Canned black beans").protein_g_per_dollar} g per $1`,
  );
  assert.equal(
    MEAL_PROTEIN_COST["meal-prep-for-beginners-complete-system"].derived.pairUsd,
    usd(
      packageCostUsd(proteinRow("Chicken drumsticks (bone-in)")) +
        packageCostUsd(proteinRow("Pinto beans (dry)")),
    ),
  );

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
    MEAL_PROTEIN_COST["costco-rotisserie-chicken-meal-ideas-dinner"].fiberHref,
    null,
  );
  assert.equal(
    MEAL_PROTEIN_COST["high-protein-on-a-budget-complete-guide"].dbHref,
    FOOD_VALUE_DB_HREF,
  );
});

test("rendered beans-and-rice and meal-prep pages expose the callout when dist exists", () => {
  const requiredLive = [
    "beans-and-rice-complete-protein-meal",
    "meal-prep-for-beginners-complete-system",
  ];
  const rendered = requiredLive.map((slug) => `dist/${slug}/index.html`);
  const builtThisRefresh = rendered.every((path) => {
    const full = join(root, path);
    return (
      existsSync(full) &&
      read(path).includes('dateModified":"2026-09-06T00:00:00.000Z"')
    );
  });
  if (!builtThisRefresh) {
    return;
  }

  for (const [slug, path] of requiredLive.map((slug, index) => [slug, rendered[index]])) {
    const html = read(path);
    assert.match(html, /class="[^"]*meal-protein-cost[^"]*"/);
    assert.match(html, new RegExp(`data-meal-protein-cost="${slug}"`));
    assert.match(html, /class="[^"]*study-pull-quote[^"]*"/);
    assert.match(html, /href="\/protein-per-dollar-cheapest-protein-sources\/"/);
    assert.match(html, /July 2026/);
    assert.match(html, /dateModified":"2026-09-06T00:00:00.000Z"/);
    assert.doesNotMatch(html, /protein-per-dollar-cheapest-high-protein-foods/);
    assert.doesNotMatch(html, /maybe two dollars a plate/);
  }
});
