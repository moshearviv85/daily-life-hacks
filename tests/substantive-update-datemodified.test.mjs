import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  SHARED_DATEMODIFIED_LIMIT,
  extractFrontmatterField,
  publicModifiedDay,
  sharedDateModifiedWithoutSubstantiveUpdate,
} from "../src/content/modified-date.mjs";

const ROOT = new URL("..", import.meta.url).pathname;
const ARTICLES = join(ROOT, "src/data/articles");
const BASELINE = "94167b6";
const TODAY = "2026-11-23";
// #250 and #252 merged back to back, so origin/main already has the restored
// dates. 84702a37 is main immediately before that restoration (#250).
const BEFORE_DATE_RESTORE = "84702a37";

/**
 * Pages whose body actually changed on 2026-11-23: merges #234, the cottage
 * table #239, savory chia #240, the protein table #245, the beans table #243,
 * the sandwich page #247, other >=15% rewrites since 94167b6, and the two
 * ranking-study targets expanded by the prune/301 work, plus the recipe
 * cards whose published calorie figure was replaced by the USDA total, plus
 * the yogurt fiber answer added the same day.
 */
const LATER_UPDATES = {
  "baking-sheet-liners-parchment-silicone-when-to-use": "2026-11-25",
  "best-breakfast-foods-for-sustained-energy": "2026-11-25",
  "best-high-protein-breads-healthy-sandwiches": "2026-11-25",
  "big-flavor-less-salt-citrus-herbs-umami-swaps": "2026-11-25",
  "chia-pudding-variations-for-breakfast": "2026-11-25",
  "costco-rotisserie-chicken-meal-ideas-dinner": "2026-11-25",
  "cooking-oils-smoke-points-best-uses": "2026-11-25",
  "cucumber-edamame-salad-sesame": "2026-11-25",
  "easy-one-pot-chicken-and-rice-dinner": "2026-11-25",
  "gluten-free-sourdough-discard-pizza-dough": "2026-11-25",
  "can-you-eat-rice-and-beans-everyday": "2026-11-25",
  "high-fiber-burrito-bowl-meal-prep": "2026-11-25",
  "high-fiber-grocery-list-30-grams": "2026-11-25",
  "high-fiber-meals-for-constipation-relief": "2026-11-25",
  "high-protein-grocery-list-50-grams": "2026-11-25",
  "sourdough-discard-buttermilk-substitute": "2026-11-25",
  "high-protein-high-fiber-meals-for-weight-loss": "2026-11-25",
  "low-sodium-budget-foods-ranked": "2026-11-25",
  "sourdough-discard-hydration-conversion-chart": "2026-11-25",
  "high-fiber-smoothies-for-kids-picky-eaters": "2026-11-25",
  "canned-beans-vs-dried-beans-nutrition": "2026-11-25",
  "how-to-cook-dried-beans-from-scratch": "2026-11-25",
  "how-to-pack-salad-for-work-not-soggy": "2026-11-25",
  "how-to-quick-soak-dried-beans-same-day": "2026-11-25",
  "beans-and-rice-complete-protein-meal": "2026-11-25",
  "easy-black-bean-tacos-weeknight-dinner": "2026-11-25",
  "fix-oversalted-soup-sauce-rice": "2026-11-25",
  "high-fiber-popcorn-toppings-healthy": "2026-11-25",
  "high-fiber-quinoa-salad-for-lunch-prep": "2026-11-25",
  "how-to-store-fresh-herbs-to-last-longer": "2026-11-25",
  "keep-berries-fresh-longer-when-to-wash": "2026-11-25",
};

const SUBSTANTIVE_SLUGS = new Set([
  "air-fryer-salmon-bites-garlic-honey-glaze",
  "best-high-fiber-foods-ranked-by-fiber-content",
  "best-way-to-cook-a-pork-tenderloin",
  "best-way-to-cook-baked-potatoes",
  "cheap-chicken-casserole-meals-large-families",
  "crispy-roasted-chickpeas-high-fiber-snack",
  "cottage-cheese-vs-greek-yogurt-protein-uses",
  "easy-cold-summer-pasta-salad-potlucks",
  "foods-highest-in-protein-per-100-grams",
  "gut-health-tea-peppermint-ginger",
  "healthy-blue-collar-lunch-ideas-men",
  "healthy-homemade-dumpling-wrapper-recipe",
  "high-fiber-bran-muffins-that-taste-good",
  "high-fiber-fast-food-options-guide",
  "high-fiber-gluten-free-bread-recipe",
  "high-fiber-yogurt-parfait-for-breakfast",
  "how-much-protein-in-bagel-sandwich",
  "how-to-double-recipe-seasoning-without-guessing",
  "how-to-keep-sandwiches-from-getting-soggy",
  "how-to-measure-sourdough-discard-grams",
  "how-to-store-homemade-salad-dressing-safely",
  "lentil-curry-high-fiber-vegan-dinner",
  "meal-prep-for-beginners-complete-system",
  "prebiotic-foods-beyond-the-buzzwords",
  "protein-per-dollar-adjusted-for-quality",
  "protein-per-serving-beans-chicken-tofu-compared",
  "quick-20-minute-high-fiber-meals-for-busy-days",
  "savory-chia-seed-recipes-breakfast",
  "sheet-pan-breakfast-hash-with-eggs-and-sweet-potatoes",
  "sourdough-discard-recipes-no-yeast",
  "what-30-grams-of-fiber-costs-per-day",
]);

function gitShow(rev, path) {
  try {
    return execFileSync("git", ["show", `${rev}:${path}`], {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch {
    return null;
  }
}

function readArticles() {
  return readdirSync(ARTICLES)
    .filter((name) => name.endsWith(".md"))
    .map((name) => {
      const slug = name.replace(/\.md$/, "");
      const path = `src/data/articles/${name}`;
      const markdown = readFileSync(join(ARTICLES, name), "utf8");
      const baseline = gitShow(BASELINE, path);
      return {
        slug,
        path,
        markdown,
        title: extractFrontmatterField(markdown, "title"),
        author: extractFrontmatterField(markdown, "author"),
        dateModified: extractFrontmatterField(markdown, "dateModified"),
        substantiveUpdate: extractFrontmatterField(markdown, "substantiveUpdate"),
        baselineModified: baseline
          ? extractFrontmatterField(baseline, "dateModified")
          : null,
        mainTitle: null,
        mainAuthor: null,
      };
    });
}

test("more than 10 articles sharing one dateModified without substantiveUpdate fails", () => {
  const shared = Array.from({ length: SHARED_DATEMODIFIED_LIMIT + 1 }, (_, index) => ({
    slug: `example-${index}`,
    dateModified: "2026-11-23",
  }));
  const violations = sharedDateModifiedWithoutSubstantiveUpdate(shared);
  assert.equal(violations.length, 1);
  assert.equal(violations[0].date, "2026-11-23");
  assert.equal(violations[0].count, SHARED_DATEMODIFIED_LIMIT + 1);

  assert.deepEqual(
    sharedDateModifiedWithoutSubstantiveUpdate(shared.slice(0, SHARED_DATEMODIFIED_LIMIT)),
    [],
  );
  assert.deepEqual(
    sharedDateModifiedWithoutSubstantiveUpdate(
      shared.map((article) => ({ ...article, substantiveUpdate: "2026-11-23" })),
    ),
    [],
  );
});

test("public modified day follows substantiveUpdate, then dateModified, then date", () => {
  const markdown = `---
title: "Example"
date: 2026-04-28
dateModified: 2026-07-20
substantiveUpdate: 2026-11-23
---
body
`;
  assert.equal(publicModifiedDay(markdown), "2026-11-23");
  assert.equal(
    publicModifiedDay(markdown.replace(/^substantiveUpdate:.*\n/m, "")),
    "2026-07-20",
  );
  assert.equal(publicModifiedDay("---\ndate: 2026-04-28\n---\n"), "2026-04-28");
});

test("article template and sitemap read substantiveUpdate before dateModified", () => {
  const page = readFileSync(join(ROOT, "src/pages/[slug].astro"), "utf8");
  const config = readFileSync(join(ROOT, "astro.config.mjs"), "utf8");
  const feed = readFileSync(join(ROOT, "src/content/feed.ts"), "utf8");
  assert.match(page, /pickModifiedDate\(\s*article\.data\.substantiveUpdate,\s*article\.data\.dateModified,/);
  assert.match(config, /publicModifiedDay\(content\)/);
  assert.match(feed, /article\.data\.substantiveUpdate \?\?\s*article\.data\.dateModified/);
});

test("2026-11-23 stays only on substantive updates; other bumps match 94167b6", () => {
  const articles = readArticles();
  const today = [];
  const restored = [];
  for (const article of articles) {
    const onMain = gitShow("origin/main", article.path);
    if (onMain) {
      assert.equal(
        article.title,
        extractFrontmatterField(onMain, "title"),
        `${article.slug} title changed`,
      );
      assert.equal(
        article.author,
        extractFrontmatterField(onMain, "author"),
        `${article.slug} author changed`,
      );
    }
    assert.equal(article.author ?? "David Miller", "David Miller", `${article.slug} author`);
    if (SUBSTANTIVE_SLUGS.has(article.slug)) {
      assert.equal(article.dateModified, TODAY, article.slug);
      assert.equal(article.substantiveUpdate, TODAY, `${article.slug} substantiveUpdate`);
      today.push(article.slug);
      continue;
    }
    if (Object.hasOwn(LATER_UPDATES, article.slug)) {
      const day = LATER_UPDATES[article.slug];
      assert.equal(article.dateModified, day, article.slug);
      assert.equal(article.substantiveUpdate, day, `${article.slug} substantiveUpdate`);
      continue;
    }
    assert.equal(
      article.substantiveUpdate,
      null,
      `${article.slug} has substantiveUpdate without a real content change`,
    );
    assert.equal(
      article.dateModified,
      article.baselineModified,
      `${article.slug} dateModified should be the 94167b6 value`,
    );
    if (article.dateModified === TODAY) today.push(article.slug);
    else if (article.baselineModified !== TODAY && article.dateModified !== TODAY) {
      // restored, or never bumped
    }
  }
  assert.equal(today.filter((slug) => SUBSTANTIVE_SLUGS.has(slug)).length, SUBSTANTIVE_SLUGS.size);

  const bumpedSinceBaseline = articles.filter(
    (article) => article.dateModified !== article.baselineModified,
  );
  assert.deepEqual(
    bumpedSinceBaseline.map((article) => article.slug).sort(),
    [...SUBSTANTIVE_SLUGS, ...Object.keys(LATER_UPDATES)].filter((slug) => {
      const article = articles.find((item) => item.slug === slug);
      return article.dateModified !== article.baselineModified;
    }).sort(),
  );

  // Dates already clustered at 94167b6 stay. Anything moved since then needs
  // substantiveUpdate, and no new day may be shared by more than 10 articles
  // that lack it.
  const introduced = articles.filter(
    (article) => article.dateModified && article.dateModified !== article.baselineModified,
  );
  assert.deepEqual(sharedDateModifiedWithoutSubstantiveUpdate(introduced), []);

  const stillToday = articles.filter((article) => article.dateModified === TODAY);
  const todayWithoutField = stillToday.filter((article) => !article.substantiveUpdate);
  assert.ok(
    todayWithoutField.length <= SHARED_DATEMODIFIED_LIMIT,
    `2026-11-23 without substantiveUpdate: ${todayWithoutField.map((article) => article.slug).join(", ")}`,
  );
  restored.push(
    ...articles.filter((article) => {
      if (article.baselineModified === TODAY || article.dateModified === TODAY) return false;
      const before = gitShow(BEFORE_DATE_RESTORE, article.path);
      return Boolean(before) && extractFrontmatterField(before, "dateModified") === TODAY;
    }),
  );
  assert.equal(stillToday.length, 37, `pages still on ${TODAY}`);
  // Measured against 84702a37, not origin/main. #252 is already on main, so
  // a comparison with origin/main is 0 and cannot see a later re-bump.
  // The yogurt fiber answer is the extra 2026-11-23 page on this branch.
  // how-to-cook-dried-beans-from-scratch, the Costco rotisserie page, and
  // the canned-versus-dried week-cost table left this day for 2026-11-25.
  // Costco's baseline was not 2026-11-23, so leaving that day also counts here.
  // The canned page's baseline was 2026-11-23, so it drops out of stillToday
  // and stays out of the restored count. The live count after that drop is 38.
  // Beans and rice left this day for the USDA gram weights, so the count is 37.
  assert.equal(restored.length, 63, "pages restored off 2026-11-23");
});

test("restored and substantive pages render the honest Updated day", () => {
  const cases = [
    // eat-healthy is noindex, so it does not emit Article JSON-LD.
    ["artichoke-recipes-for-gut-health", "2026-09-23"],
    ["cottage-cheese-vs-greek-yogurt-protein-uses", TODAY],
    ["what-30-grams-of-fiber-costs-per-day", TODAY],
    ["protein-per-dollar-adjusted-for-quality", TODAY],
    ["how-to-keep-sandwiches-from-getting-soggy", TODAY],
  ];
  const built = cases.every(([slug]) => existsSync(join(ROOT, "dist", slug, "index.html")));
  if (!built) return;
  for (const [slug, day] of cases) {
    const html = readFileSync(join(ROOT, "dist", slug, "index.html"), "utf8");
    assert.match(html, new RegExp(`<time datetime="${day}"`), slug);
    // Pruned pages stay noindex and omit rich-result JSON-LD.
    if (!html.includes("noindex")) {
      assert.match(html, new RegExp(`"dateModified":"${day}T00:00:00.000Z"`), slug);
    }
    if (day !== TODAY) {
      assert.equal(html.includes('"dateModified":"2026-11-23T'), false, slug);
    }
  }
});
