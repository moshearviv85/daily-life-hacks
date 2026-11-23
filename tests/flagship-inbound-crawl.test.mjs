import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { INDEX_KEEP_PATHS, INDEX_PRUNE_SLUGS } from "../src/content/index-prune.js";
import { isGuideHubSpoke } from "../src/content/guideHubSpokes.js";

const articleDirectory = join(process.cwd(), "src", "data", "articles");
const fiberFlagship = "fiber-per-dollar-cheapest-high-fiber-foods";
const proteinFlagship = "protein-per-dollar-cheapest-protein-sources";
const retiredProteinSlug = "protein-per-dollar-cheapest-high-protein-foods";

const requiredLinks = [
  [fiberFlagship, proteinFlagship],
  ["costco-rotisserie-chicken-meal-ideas-dinner", proteinFlagship],
  ["beans-and-rice-complete-protein-meal", proteinFlagship],
  ["beans-and-rice-complete-protein-meal", fiberFlagship],
  ["high-protein-on-a-budget-complete-guide", fiberFlagship],
  ["can-you-eat-rice-and-beans-everyday", proteinFlagship],
  ["can-you-eat-rice-and-beans-everyday", fiberFlagship],
  ["high-protein-vs-high-fiber-satiety", proteinFlagship],
  ["high-protein-vs-high-fiber-satiety", fiberFlagship],
  ["cheapest-complete-protein-pairs", proteinFlagship],
  ["cheapest-complete-protein-pairs", fiberFlagship],
  ["cottage-cheese-vs-greek-yogurt-protein-uses", proteinFlagship],
  ["how-to-eat-more-fiber-on-a-budget-complete-guide", proteinFlagship],
  ["frozen-vs-fresh-produce-when-to-buy", fiberFlagship],
  ["how-to-eat-cheap-at-home", proteinFlagship],
  ["how-to-eat-cheap-at-home", fiberFlagship],
  ["hearty-vegetarian-chili-with-three-beans-and-corn", proteinFlagship],
  ["hearty-vegetarian-chili-with-three-beans-and-corn", fiberFlagship],
  ["how-much-oatmeal-is-a-serving", proteinFlagship],
  ["how-much-oatmeal-is-a-serving", fiberFlagship],
  ["how-much-protein-for-breakfast", proteinFlagship],
  ["how-much-protein-for-breakfast", fiberFlagship],
  ["high-fiber-popcorn-toppings-healthy", fiberFlagship],
  ["high-fiber-yogurt-parfait-for-breakfast", fiberFlagship],
  ["healthy-alternatives-potato-chips-snacking", fiberFlagship],
  ["best-high-protein-breads-healthy-sandwiches", proteinFlagship],
  ["best-breakfast-foods-for-sustained-energy", proteinFlagship],
  ["best-high-fiber-foods-ranked-by-fiber-content", proteinFlagship],
  ["good-source-of-fiber-label-meaning", proteinFlagship],
  ["high-fiber-yogurt-parfait-for-breakfast", proteinFlagship],
  ["oatmeal-vs-grits-fiber-content", proteinFlagship],
  ["foods-highest-in-protein-per-100-grams", fiberFlagship],
  ["protein-per-serving-beans-chicken-tofu-compared", fiberFlagship],
  ["fast-food-protein-per-dollar-ranked", fiberFlagship],
  ["canned-beans-vs-dried-beans-nutrition", fiberFlagship],
  ["canned-beans-vs-dried-beans-nutrition", proteinFlagship],
  ["comparing-fiber-content-different-pizza-crusts", fiberFlagship],
  ["comparing-fiber-content-different-pizza-crusts", proteinFlagship],
  ["high-fiber-fast-food-options-guide", fiberFlagship],
  ["high-fiber-fast-food-options-guide", proteinFlagship],
  ["healthy-alternatives-potato-chips-snacking", proteinFlagship],
  ["best-low-cost-protein-sources-large-families", fiberFlagship],
  ["cheap-crockpot-meals-large-families", proteinFlagship],
  ["cheap-crockpot-meals-large-families", fiberFlagship],
  ["whole-wheat-vs-white-pasta-fiber", fiberFlagship],
  ["whole-wheat-vs-white-pasta-fiber", proteinFlagship],
  ["gut-health-tea-peppermint-ginger", fiberFlagship],
  ["high-fiber-smoothies-for-kids-picky-eaters", fiberFlagship],
  ["prune-juice-alternatives-for-constipation", proteinFlagship],
  ["chia-pudding-variations-for-breakfast", proteinFlagship],
  ["protein-per-dollar-adjusted-for-quality", fiberFlagship],
  ["cottage-cheese-vs-greek-yogurt-protein-uses", fiberFlagship],
  ["30-day-high-fiber-challenge-meal-plan", proteinFlagship],
  ["eggs-vs-everything-protein-value", fiberFlagship],
  ["best-breakfast-foods-for-sustained-energy", fiberFlagship],
  ["how-much-protein-in-bagel-sandwich", proteinFlagship],
  ["balanced-breakfast-that-keeps-you-full", proteinFlagship],
  ["balanced-breakfast-that-keeps-you-full", fiberFlagship],
];

// Re-checked 2026-09-29 against the live articles and the July 2026 CSVs.
// Salad dressing no longer quotes the fiber-per-dollar row for chia.
// The close still points at the high-fiber dressing jars. Protein stays
// off that page.
// Yogurt is a 3-to-4-day fridge ingredient, and "dairy proteins" is the
// broken emulsion, not a price.
// Smoke-point oils are not rows in either ranking. Peanut, sunflower,
// almond, and sesame oils are not the peanut, seed, or almond foods.
// Popcorn already links the fiber flagship. Kernels are not in the protein
// study, chips were never priced, and a pinch of hard cheese is not a
// protein-study row. Eggs, yogurt, and milk on the tea and smoothie pages
// stay flavor or texture, not a protein price.
// Berry storage, wilted lettuce, salad dressing, gluten-free bread, and
// the bagel lunch page no longer cite the per-dollar studies. Those
// sentences were off the page topic, so the flagship hrefs went with them.
// Protein stays off the berry, lettuce, dressing, and gluten-free pages.
const unfitFlagshipLinks = [
  ["how-to-store-homemade-salad-dressing-safely", proteinFlagship],
  ["cooking-oils-smoke-points-best-uses", fiberFlagship],
  ["cooking-oils-smoke-points-best-uses", proteinFlagship],
  ["gut-health-tea-peppermint-ginger", proteinFlagship],
  ["high-fiber-smoothies-for-kids-picky-eaters", proteinFlagship],
  ["popcorn-vs-potato-chips-fiber-comparison", proteinFlagship],
  ["keep-berries-fresh-longer-when-to-wash", proteinFlagship],
  ["how-to-revive-wilted-lettuce-and-greens", proteinFlagship],
  ["high-fiber-gluten-free-bread-recipe", proteinFlagship],
  ["how-much-protein-in-bagel-sandwich", fiberFlagship],
];

function articleBody(slug) {
  const articlePath = join(articleDirectory, `${slug}.md`);
  assert.equal(existsSync(articlePath), true, `missing article: ${slug}`);
  return readFileSync(articlePath, "utf8");
}

function hrefMatches(body, slug) {
  return body.match(new RegExp(`\\]\\(\\/${slug}\\/\\)`, "g")) ?? [];
}

test("ranking pages keep one honest in-body href to each required flagship", () => {
  for (const [source, target] of requiredLinks) {
    const matches = hrefMatches(articleBody(source), target);
    assert.equal(
      matches.length,
      1,
      `${source} should link to /${target}/ exactly once`,
    );
  }
});

test("clarity donors without an honest flagship fit stay unlinked", () => {
  for (const [source, target] of unfitFlagshipLinks) {
    const matches = hrefMatches(articleBody(source), target);
    assert.equal(
      matches.length,
      0,
      `${source} should not link to /${target}/`,
    );
  }
});

const sourdoughSlugs = [
  "easy-sourdough-discard-recipes-beginners",
  "easy-sourdough-discard-pizza-dough-no-yeast",
  "gluten-free-sourdough-discard-pizza-dough",
  "how-to-measure-sourdough-discard-grams",
  "what-to-make-with-sourdough-discard-by-amount",
  "can-you-use-sourdough-discard-from-a-new-starter",
  "how-long-does-sourdough-discard-last",
  "sourdough-discard-vs-active-starter",
];

test("sourdough stays out of the flagship crawl-path bet", () => {
  for (const slug of sourdoughSlugs) {
    const body = articleBody(slug);
    assert.equal(
      hrefMatches(body, fiberFlagship).length,
      0,
      `${slug} should not link to /${fiberFlagship}/`,
    );
    assert.equal(
      hrefMatches(body, proteinFlagship).length,
      0,
      `${slug} should not link to /${proteinFlagship}/`,
    );
    assert.equal(
      hrefMatches(body, "cheapest-protein-per-gram").length,
      0,
      `${slug} should not link to /cheapest-protein-per-gram/`,
    );
    assert.equal(
      hrefMatches(body, "one-dollar-fiber-what-it-buys").length,
      0,
      `${slug} should not link to /one-dollar-fiber-what-it-buys/`,
    );
  }
});

test("edited articles do not reintroduce the retired protein flagship slug", () => {
  const sources = new Set(requiredLinks.map(([source]) => source));
  for (const slug of sourdoughSlugs) sources.add(slug);

  for (const slug of sources) {
    assert.equal(
      articleBody(slug).includes(retiredProteinSlug),
      false,
      `${slug} should not mention ${retiredProteinSlug}`,
    );
  }
});

test("nutrition hub cites both flagships in the intro, not only article cards", () => {
  const hubPath = join(process.cwd(), "src", "pages", "nutrition", "index.astro");
  assert.equal(existsSync(hubPath), true, "missing nutrition hub");
  const source = readFileSync(hubPath, "utf8");
  const headerEnd = source.indexOf("All nutrition articles");
  assert.ok(headerEnd > 0, "nutrition hub should keep the article-grid heading");
  const intro = source.slice(0, headerEnd);
  assert.equal(
    (intro.match(/href="\/fiber-per-dollar-cheapest-high-fiber-foods\/"/g) ?? [])
      .length,
    1,
  );
  assert.equal(
    (intro.match(/href="\/protein-per-dollar-cheapest-protein-sources\/"/g) ?? [])
      .length,
    1,
  );
  assert.equal(source.includes(retiredProteinSlug), false);
});

test("recipes hub does not inject flagship links", () => {
  const source = pageSource("recipes", "index.astro");
  const headerEnd = source.indexOf("Cooking for two instead of six");
  assert.ok(headerEnd > 0, "recipes hub should keep the servings callout");
  const intro = source.slice(0, headerEnd);
  assert.equal(htmlHrefMatches(intro, fiberFlagship).length, 0);
  assert.equal(htmlHrefMatches(intro, proteinFlagship).length, 0);
  assert.equal(htmlHrefMatches(source, fiberFlagship).length, 0);
  assert.equal(htmlHrefMatches(source, proteinFlagship).length, 0);
  assert.equal(source.includes(retiredProteinSlug), false);
});

test("tips hub cites both flagships in the intro, not only article cards", () => {
  const source = pageSource("tips", "index.astro");
  const headerEnd = source.indexOf("All kitchen and money-saving tips");
  assert.ok(headerEnd > 0, "tips hub should keep the article-grid heading");
  const intro = source.slice(0, headerEnd);
  assert.equal(htmlHrefMatches(intro, fiberFlagship).length, 1);
  assert.equal(htmlHrefMatches(intro, proteinFlagship).length, 1);
  assert.equal(htmlHrefMatches(source, fiberFlagship).length, 1);
  assert.equal(htmlHrefMatches(source, proteinFlagship).length, 1);
  assert.equal(source.includes(retiredProteinSlug), false);
});

function pageSource(...segments) {
  const pagePath = join(process.cwd(), "src", "pages", ...segments);
  assert.equal(existsSync(pagePath), true, `missing page: ${segments.join("/")}`);
  return readFileSync(pagePath, "utf8");
}

function htmlHrefMatches(source, slug) {
  return source.match(new RegExp(`href="/${slug}/"`, "g")) ?? [];
}

const leftoverToolPages = [
  ["tools hub intro", ["tools", "index.astro"]],
  ["dried beans converter", ["tools", "dried-beans-to-canned-converter", "index.astro"]],
  ["grocery budget calculator", ["tools", "grocery-budget-calculator", "index.astro"]],
  ["recipe cost calculator", ["tools", "recipe-cost-calculator", "index.astro"]],
];

test("leftover tool pages cite each flagship once in the page source", () => {
  for (const [label, segments] of leftoverToolPages) {
    const source = pageSource(...segments);
    assert.equal(
      htmlHrefMatches(source, fiberFlagship).length,
      1,
      `${label} should link to /${fiberFlagship}/ exactly once`,
    );
    assert.equal(
      htmlHrefMatches(source, proteinFlagship).length,
      1,
      `${label} should link to /${proteinFlagship}/ exactly once`,
    );
    assert.equal(source.includes(retiredProteinSlug), false);
  }
});

test("protein flagship keeps the per-gram section that replaced the standalone ranking", () => {
  const source = articleBody(proteinFlagship);
  assert.match(source, /id="per-gram"/);
  assert.equal(source.includes("cheapest-protein-per-gram"), false);
  assert.equal(source.includes(retiredProteinSlug), false);
});

test("guides hub cites both flagships above the fold, plus dataset landings", () => {
  const source = pageSource("guides", "index.astro");
  const headerEnd = source.indexOf("space-y-10");
  assert.ok(headerEnd > 0, "guides hub should keep the cluster list");
  const intro = source.slice(0, headerEnd);
  assert.equal(htmlHrefMatches(intro, fiberFlagship).length, 1);
  assert.equal(
    (intro.match(/href="\/protein-per-dollar-cheapest-protein-sources\/#per-gram"/g) ?? [])
      .length,
    1,
  );
  assert.equal(htmlHrefMatches(intro, proteinFlagship).length, 0);
  assert.equal(
    (intro.match(/href="\/data\/fiber-per-dollar-2026\/"/g) ?? []).length,
    1,
  );
  assert.equal(
    (intro.match(/href="\/data\/protein-per-dollar-2026\/"/g) ?? []).length,
    1,
  );
  assert.equal(intro.includes("HUGGINGFACE_DATASET_URL"), true);
  assert.equal(source.includes('../../content/datasets'), true);
  assert.equal(htmlHrefMatches(intro, "one-dollar-fiber-what-it-buys").length, 0);
  assert.equal(
    (source.match(/href="\/fiber-per-dollar-cheapest-high-fiber-foods\/#what-1-buys"/g) ?? [])
      .length,
    1,
  );
  assert.equal(htmlHrefMatches(source, "cheapest-protein-per-gram").length, 0);
  assert.equal(source.includes(retiredProteinSlug), false);
  assert.match(source, /isGuideHubSpoke\(article\.id\)/);
  assert.doesNotMatch(source, /\.slice\(0,\s*8\)/);
});

const chainAnchors = ["chipotle", "kfc", "mcdonalds", "taco-bell", "wendys"];

test("research and statistics hubs link each chain section on the fast-food study once", () => {
  for (const segments of [
    ["research", "index.astro"],
    ["statistics", "index.astro"],
  ]) {
    const source = pageSource(...segments);
    for (const anchor of chainAnchors) {
      assert.equal(
        (source.match(new RegExp(`href="/fast-food-protein-per-dollar-ranked/#${anchor}"`, "g")) ?? [])
          .length,
        1,
        `${segments.join("/")} should link #${anchor} once`,
      );
    }
  }
});

test("homepage lead links each chain section and the plant-protein guide once", () => {
  const source = pageSource("index.astro");
  const mainStart = source.indexOf("<main");
  const hero = source.indexOf("<HeroSection");
  assert.ok(mainStart !== -1 && hero > mainStart, "homepage lead should sit above HeroSection");
  const lead = source.slice(mainStart, hero);
  for (const anchor of chainAnchors) {
    const pattern = new RegExp(`href="/fast-food-protein-per-dollar-ranked/#${anchor}"`, "g");
    assert.equal((lead.match(pattern) ?? []).length, 1, `homepage lead #${anchor}`);
    assert.equal((source.match(pattern) ?? []).length, 1, `homepage #${anchor}`);
  }
  const plant = "plant-based-protein-sources-complete-guide";
  assert.equal(INDEX_KEEP_PATHS.has(plant), true);
  assert.equal(htmlHrefMatches(lead, plant).length, 1);
  assert.equal(htmlHrefMatches(source, plant).length, 1);
});

test("guides hub spokes stay on KEEP paths and skip pruned slugs", () => {
  for (const slug of INDEX_PRUNE_SLUGS) {
    assert.equal(isGuideHubSpoke(slug), false, slug);
  }

  const requiredSpokes = [
    "plant-based-protein-sources-complete-guide",
    "protein-per-dollar-cheapest-protein-sources",
    "fiber-per-dollar-cheapest-high-fiber-foods",
    "usda-thrifty-food-plan-weekly-cost",
  ];
  for (const slug of requiredSpokes) {
    assert.equal(INDEX_KEEP_PATHS.has(slug), true, slug);
    assert.equal(isGuideHubSpoke(slug), true, slug);
  }
  for (const slug of [
    "one-dollar-protein-what-it-buys",
    "produce-fiber-per-dollar-ranked",
    "popcorn-vs-almonds-fiber-cost",
    "whole-wheat-flour-vs-quinoa-fiber-cost",
    "grains-fiber-per-dollar-ranked",
    "high-fiber-snacks-per-dollar",
    "tofu-vs-chicken-protein-cost",
    "shelf-stable-pantry-per-dollar",
  ]) {
    assert.equal(isGuideHubSpoke(slug), false, slug);
  }

  assert.equal(isGuideHubSpoke("how-much-protein-in-lentils"), false);
  assert.equal(isGuideHubSpoke("cheap-dinner-ideas-for-a-family-of-4"), false);
  assert.equal(isGuideHubSpoke("fast-food-protein-per-dollar-ranked"), false);
  assert.equal(isGuideHubSpoke("what-30-grams-of-fiber-costs-per-day"), false);
});

test("data hub names both flagship indexes with hrefs before the dataset table", () => {
  const source = pageSource("data", "index.astro");
  const headerEnd = source.indexOf('id="datasets"');
  assert.ok(headerEnd > 0, "data hub should keep the datasets heading");
  const intro = source.slice(0, headerEnd);
  assert.equal(
    htmlHrefMatches(intro, fiberFlagship).length,
    1,
    "data hub intro should link the fiber flagship once",
  );
  assert.equal(
    htmlHrefMatches(intro, proteinFlagship).length,
    1,
    "data hub intro should link the protein flagship once",
  );
  assert.equal(source.includes(retiredProteinSlug), false);
});

test("homepage, guides, and research each link the beans double-win page once", () => {
  const doubleWin = "beans-double-win-fiber-protein";
  assert.equal(INDEX_PRUNE_SLUGS.has(doubleWin), false, doubleWin);
  const csv = readFileSync(
    join(process.cwd(), "public", "data", "beans-double-win-fiber-protein-2026.csv"),
    "utf8",
  );
  const [headerLine, ...lines] = csv.trim().split(/\n/);
  const headers = headerLine.split(",");
  const valueIndex = headers.indexOf("value");
  const foodIndex = headers.indexOf("food");
  const leader = lines
    .map((line) => {
      const cells = [];
      let field = "";
      let quoted = false;
      for (const character of line) {
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
    })
    .find((cells) => cells[foodIndex] === "Green split peas (dry)");
  assert.ok(leader, "beans CSV should include green split peas");
  const combinedGrams = leader[valueIndex];
  assert.equal(combinedGrams, "144.9");
  const anchor = new RegExp(
    `split peas at ${combinedGrams.replace(".", "\\.")} combined grams`,
  );

  const homepage = pageSource("index.astro");
  const mainStart = homepage.indexOf("<main");
  const hero = homepage.indexOf("<HeroSection");
  assert.ok(mainStart !== -1 && hero > mainStart, "homepage lead should sit above HeroSection");
  const lead = homepage.slice(mainStart, hero);
  assert.equal(htmlHrefMatches(lead, doubleWin).length, 1, "homepage lead");
  assert.equal(htmlHrefMatches(homepage, doubleWin).length, 1, "homepage");
  assert.match(lead, anchor);

  for (const segments of [
    ["guides", "index.astro"],
    ["research", "index.astro"],
  ]) {
    const source = pageSource(...segments);
    assert.equal(
      htmlHrefMatches(source, doubleWin).length,
      1,
      `${segments.join("/")} should link /${doubleWin}/ once`,
    );
    assert.match(source, anchor);
  }
});

test("research hub intro cites both flagships before the study cards", () => {
  const source = pageSource("research", "index.astro");
  const headerEnd = source.indexOf('id="study-heading"');
  assert.ok(headerEnd > 0, "research hub should keep the study heading");
  const intro = source.slice(0, headerEnd);
  assert.equal(
    htmlHrefMatches(intro, fiberFlagship).length,
    1,
    "research hub intro should link the fiber flagship once",
  );
  assert.equal(
    htmlHrefMatches(intro, proteinFlagship).length,
    1,
    "research hub intro should link the protein flagship once",
  );
  assert.equal(source.includes(retiredProteinSlug), false);
});

test("data reuse page cites both flagship studies once", () => {
  const source = pageSource("data-reuse.astro");
  assert.equal(htmlHrefMatches(source, fiberFlagship).length, 1);
  assert.equal(htmlHrefMatches(source, proteinFlagship).length, 1);
  assert.equal(source.includes(retiredProteinSlug), false);
});

test("ChainLimits still cites the protein flagship once for the shared fast-food library", () => {
  const limits = pageSource("_lib", "ChainLimits.astro");
  assert.equal(htmlHrefMatches(limits, proteinFlagship).length, 1);
  assert.equal(htmlHrefMatches(limits, fiberFlagship).length, 0);
  assert.equal(limits.includes(retiredProteinSlug), false);
  const fastFood = articleBody("fast-food-protein-per-dollar-ranked");
  for (const anchor of chainAnchors) {
    assert.match(fastFood, new RegExp(`id="${anchor}"`));
  }
});
