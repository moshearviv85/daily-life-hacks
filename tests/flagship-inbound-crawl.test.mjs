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
  ["savory-chia-seed-recipes-breakfast", fiberFlagship],
  ["costco-rotisserie-chicken-meal-ideas-dinner", proteinFlagship],
  ["how-to-keep-sandwiches-from-getting-soggy", proteinFlagship],
  ["beans-and-rice-complete-protein-meal", proteinFlagship],
  ["beans-and-rice-complete-protein-meal", fiberFlagship],
  ["high-protein-on-a-budget-complete-guide", fiberFlagship],
  ["lentils-vs-chicken-breast-protein-cost", fiberFlagship],
  ["canned-vs-dry-beans-cost", fiberFlagship],
  ["can-you-eat-rice-and-beans-everyday", proteinFlagship],
  ["can-you-eat-rice-and-beans-everyday", fiberFlagship],
  ["high-protein-vs-high-fiber-satiety", proteinFlagship],
  ["high-protein-vs-high-fiber-satiety", fiberFlagship],
  ["vegan-high-fiber-meal-prep-for-week", fiberFlagship],
  ["high-fiber-burrito-bowl-meal-prep", fiberFlagship],
  ["plant-protein-per-dollar-ranked", proteinFlagship],
  ["plant-protein-per-dollar-ranked", fiberFlagship],
  ["cheapest-complete-protein-pairs", proteinFlagship],
  ["cheapest-complete-protein-pairs", fiberFlagship],
  ["cottage-cheese-vs-greek-yogurt-protein-uses", proteinFlagship],
  ["how-to-eat-more-fiber-on-a-budget-complete-guide", proteinFlagship],
  ["lentil-curry-high-fiber-vegan-dinner", fiberFlagship],
  ["frozen-vs-fresh-produce-when-to-buy", fiberFlagship],
  ["easy-black-bean-tacos-weeknight-dinner", proteinFlagship],
  ["easy-black-bean-tacos-weeknight-dinner", fiberFlagship],
  ["how-to-cook-dried-beans-from-scratch", proteinFlagship],
  ["how-to-cook-dried-beans-from-scratch", fiberFlagship],
  ["high-fiber-quinoa-salad-for-lunch-prep", fiberFlagship],
  ["high-protein-bagel-sandwich-ideas-lunch", proteinFlagship],
  ["one-dollar-fiber-what-it-buys", proteinFlagship],
  ["one-dollar-fiber-what-it-buys", fiberFlagship],
  ["high-fiber-snacks-per-dollar", proteinFlagship],
  ["high-fiber-snacks-per-dollar", fiberFlagship],
  ["how-to-eat-cheap-at-home", proteinFlagship],
  ["how-to-eat-cheap-at-home", fiberFlagship],
  ["do-you-have-to-cook-canned-beans", proteinFlagship],
  ["do-you-have-to-cook-canned-beans", fiberFlagship],
  ["how-to-quick-soak-dried-beans-same-day", proteinFlagship],
  ["how-to-quick-soak-dried-beans-same-day", fiberFlagship],
  ["hearty-vegetarian-chili-with-three-beans-and-corn", proteinFlagship],
  ["hearty-vegetarian-chili-with-three-beans-and-corn", fiberFlagship],
  ["high-fiber-hummus-recipe-homemade", proteinFlagship],
  ["high-fiber-hummus-recipe-homemade", fiberFlagship],
  ["protein-per-dollar-cheapest-protein-sources", "cheapest-protein-per-gram"],
  ["chicken-thighs-vs-breast-protein-cost", "cheapest-protein-per-gram"],
  ["one-dollar-protein-what-it-buys", proteinFlagship],
  ["one-dollar-protein-what-it-buys", "one-dollar-fiber-what-it-buys"],
  ["how-much-dried-beans-per-person", proteinFlagship],
  ["how-much-dried-beans-per-person", fiberFlagship],
  ["how-much-oatmeal-is-a-serving", proteinFlagship],
  ["how-much-oatmeal-is-a-serving", fiberFlagship],
  ["how-much-protein-for-breakfast", proteinFlagship],
  ["how-much-protein-for-breakfast", fiberFlagship],
  ["which-foods-are-complete-proteins", proteinFlagship],
  ["high-fiber-popcorn-toppings-healthy", fiberFlagship],
  ["high-fiber-yogurt-parfait-for-breakfast", fiberFlagship],
  ["healthy-alternatives-potato-chips-snacking", fiberFlagship],
  ["best-high-protein-breads-healthy-sandwiches", proteinFlagship],
  ["best-breakfast-foods-for-sustained-energy", proteinFlagship],
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

const sourdoughSlugs = [
  "easy-sourdough-discard-recipes-beginners",
  "easy-sourdough-discard-pizza-dough-no-yeast",
  "gluten-free-sourdough-discard-pizza-dough",
  "how-to-make-sourdough-pizza-dough-same-day",
  "how-to-measure-sourdough-discard-grams",
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

test("recipes hub cites both flagships in the intro, not only recipe cards", () => {
  const source = pageSource("recipes", "index.astro");
  const headerEnd = source.indexOf("Cooking for two instead of six");
  assert.ok(headerEnd > 0, "recipes hub should keep the servings callout");
  const intro = source.slice(0, headerEnd);
  assert.equal(htmlHrefMatches(intro, fiberFlagship).length, 1);
  assert.equal(htmlHrefMatches(intro, proteinFlagship).length, 1);
  assert.equal(htmlHrefMatches(source, fiberFlagship).length, 1);
  assert.equal(htmlHrefMatches(source, proteinFlagship).length, 1);
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

test("KEEP grocery protein-per-gram ranking cites the fiber flagship once", () => {
  const source = pageSource("cheapest-protein-per-gram.astro");
  assert.equal(htmlHrefMatches(source, fiberFlagship).length, 1);
  assert.equal(htmlHrefMatches(source, proteinFlagship).length, 1);
  assert.equal(source.includes(retiredProteinSlug), false);
});

test("guides hub cites both flagships above the fold, plus dataset landings", () => {
  const source = pageSource("guides", "index.astro");
  const headerEnd = source.indexOf("space-y-10");
  assert.ok(headerEnd > 0, "guides hub should keep the cluster list");
  const intro = source.slice(0, headerEnd);
  assert.equal(htmlHrefMatches(intro, fiberFlagship).length, 1);
  assert.equal(htmlHrefMatches(intro, "cheapest-protein-per-gram").length, 1);
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
  assert.equal(htmlHrefMatches(source, "one-dollar-fiber-what-it-buys").length, 1);
  assert.equal(htmlHrefMatches(source, "cheapest-protein-per-gram").length, 1);
  assert.equal(source.includes(retiredProteinSlug), false);
  assert.match(source, /isGuideHubSpoke\(article\.id\)/);
  assert.doesNotMatch(source, /\.slice\(0,\s*8\)/);
});

const keepChainPages = [
  "chipotle-protein-per-dollar",
  "kfc-protein-per-dollar",
  "mcdonalds-protein-per-dollar",
  "taco-bell-protein-per-dollar",
  "wendys-protein-per-dollar",
];

test("research and statistics hubs link each KEEP chain page once", () => {
  for (const slug of keepChainPages) {
    assert.equal(INDEX_KEEP_PATHS.has(slug), true, slug);
    assert.equal(INDEX_PRUNE_SLUGS.has(slug), false, slug);
  }

  for (const segments of [
    ["research", "index.astro"],
    ["statistics", "index.astro"],
  ]) {
    const source = pageSource(...segments);
    for (const slug of keepChainPages) {
      assert.equal(
        htmlHrefMatches(source, slug).length,
        1,
        `${segments.join("/")} should link /${slug}/ once`,
      );
    }
  }
});

test("homepage lead links each KEEP chain page and the plant-protein guide once", () => {
  const source = pageSource("index.astro");
  const mainStart = source.indexOf("<main");
  const hero = source.indexOf("<HeroSection");
  assert.ok(mainStart !== -1 && hero > mainStart, "homepage lead should sit above HeroSection");
  const lead = source.slice(mainStart, hero);
  const homepageKeepLinks = [
    ...keepChainPages,
    "plant-based-protein-sources-complete-guide",
  ];

  for (const slug of homepageKeepLinks) {
    assert.equal(INDEX_KEEP_PATHS.has(slug), true, slug);
    assert.equal(INDEX_PRUNE_SLUGS.has(slug), false, slug);
    assert.equal(
      htmlHrefMatches(lead, slug).length,
      1,
      `homepage lead should link /${slug}/ once`,
    );
    assert.equal(
      htmlHrefMatches(source, slug).length,
      1,
      `homepage should link /${slug}/ once`,
    );
  }
});

test("guides hub spokes stay on KEEP paths and skip pruned slugs", () => {
  for (const slug of INDEX_PRUNE_SLUGS) {
    assert.equal(isGuideHubSpoke(slug), false, slug);
  }

  const requiredSpokes = [
    "plant-based-protein-sources-complete-guide",
    "protein-per-dollar-cheapest-protein-sources",
    "fiber-per-dollar-cheapest-high-fiber-foods",
    "one-dollar-protein-what-it-buys",
    "produce-fiber-per-dollar-ranked",
    "popcorn-vs-almonds-fiber-cost",
    "whole-wheat-flour-vs-quinoa-fiber-cost",
    "grains-fiber-per-dollar-ranked",
    "high-fiber-snacks-per-dollar",
    "tofu-vs-chicken-protein-cost",
    "shelf-stable-pantry-per-dollar",
    "usda-thrifty-food-plan-weekly-cost",
  ];
  for (const slug of requiredSpokes) {
    assert.equal(INDEX_KEEP_PATHS.has(slug), true, slug);
    assert.equal(isGuideHubSpoke(slug), true, slug);
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

test("KEEP chain protein pages inherit one grocery flagship href from ChainLimits", () => {
  const limits = pageSource("_lib", "ChainLimits.astro");
  assert.equal(htmlHrefMatches(limits, proteinFlagship).length, 1);
  assert.equal(htmlHrefMatches(limits, fiberFlagship).length, 0);
  assert.equal(limits.includes(retiredProteinSlug), false);

  const chainPages = [
    ["chipotle-protein-per-dollar.astro"],
    ["kfc-protein-per-dollar.astro"],
    ["mcdonalds-protein-per-dollar.astro"],
    ["taco-bell-protein-per-dollar.astro"],
    ["wendys-protein-per-dollar.astro"],
  ];
  for (const segments of chainPages) {
    const source = pageSource(...segments);
    assert.equal(
      htmlHrefMatches(source, proteinFlagship).length,
      0,
      `${segments[0]} should inherit the grocery flagship href from ChainLimits, not duplicate it`,
    );
    assert.equal(source.includes(retiredProteinSlug), false);
  }
});
