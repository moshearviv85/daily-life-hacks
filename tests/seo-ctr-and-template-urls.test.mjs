import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { extname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const LEAK = /(?:href|src)=["']\/\$\{/;

function walkSource(dir, acc = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === "dist") continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      walkSource(full, acc);
      continue;
    }
    if ([".astro", ".js", ".ts", ".mjs", ".html"].includes(extname(entry.name))) {
      acc.push(full);
    }
  }
  return acc;
}

function articleFrontmatter(slug) {
  const raw = readFileSync(join(ROOT, "src/data/articles", `${slug}.md`), "utf8");
  const title = raw.match(/^title:\s*"([^"]+)"/m)?.[1];
  const excerpt = raw.match(/^excerpt:\s*"([^"]+)"/m)?.[1];
  assert.ok(title, `${slug} is missing a quoted title`);
  assert.ok(excerpt, `${slug} is missing a quoted excerpt`);
  return { title, excerpt };
}

test("answer-first titles and excerpts keep the on-page USDA numbers", () => {
  const popcorn = articleFrontmatter("popcorn-vs-potato-chips-fiber-comparison");
  assert.match(popcorn.title, /108/);
  assert.match(popcorn.title, /149/);
  assert.match(popcorn.title, /[Cc]alories/);
  const titleLower = popcorn.title.toLowerCase();
  const calorieAt = titleLower.indexOf("calorie");
  const fiberAt = titleLower.search(/fiber/);
  assert.ok(calorieAt !== -1, "popcorn title should mention calories");
  assert.ok(
    fiberAt === -1 || calorieAt < fiberAt,
    "popcorn title should lead with calories, not fiber",
  );
  assert.match(popcorn.excerpt, /108/);
  assert.match(popcorn.excerpt, /149/);
  assert.match(popcorn.excerpt, /4\.1g/);
  assert.match(popcorn.excerpt, /0\.9g/);
  const excerptLower = popcorn.excerpt.toLowerCase();
  assert.ok(
    excerptLower.indexOf("calorie") < excerptLower.search(/fiber|4\.1g/),
    "popcorn meta should put calories before fiber so the SERP snippet is not truncated",
  );

  const pizza = articleFrontmatter("comparing-fiber-content-different-pizza-crusts");
  assert.match(pizza.title, /2\.7g/);
  assert.match(pizza.title, /4\.2-5\.1g/);
  assert.match(pizza.excerpt, /2\.7g/);
  assert.match(pizza.excerpt, /4\.2-5\.1g/);

  const protein = articleFrontmatter("protein-per-serving-beans-chicken-tofu-compared");
  assert.match(protein.title, /Protein per Serving/);
  assert.match(protein.title, /Calculator/);
  assert.match(protein.excerpt, /calculate your portion from the label/);
  assert.match(protein.excerpt, /raw vs cooked/);

  const fiberFoods = articleFrontmatter("best-high-fiber-foods-ranked-by-fiber-content");
  const fiberTitleLower = fiberFoods.title.toLowerCase();
  const fiberExcerptLower = fiberFoods.excerpt.toLowerCase();
  assert.match(fiberFoods.title, /[Bb]est [Hh]igh-?[Ff]iber [Ff]oods/);
  assert.match(fiberFoods.title, /per 100g/i);
  assert.match(fiberFoods.title, /34\.4g/);
  assert.match(fiberFoods.title, /27\.3g/);
  assert.match(fiberFoods.title, /22\.2g/);
  assert.ok(
    fiberTitleLower.indexOf("best high-fiber foods") < fiberTitleLower.indexOf("34.4g"),
    "fiber ranking title should lead with the search query, not the study frame",
  );
  assert.equal(
    fiberTitleLower.includes("53-food price study"),
    false,
    "fiber ranking title should not lead with the 53-food study frame",
  );
  assert.match(fiberFoods.excerpt, /[Bb]est high-fiber foods/);
  assert.match(fiberFoods.excerpt, /34\.4g/);
  assert.match(fiberFoods.excerpt, /27\.3g/);
  assert.match(fiberFoods.excerpt, /22\.2g/);
  assert.ok(
    fiberExcerptLower.indexOf("best high-fiber foods") < fiberExcerptLower.indexOf("34.4g"),
    "fiber ranking meta should put the ranking query before the USDA numbers",
  );
});

test("canned vs dry beans title matches cost query and on-page protein-per-dollar numbers", () => {
  const beans = articleFrontmatter("canned-vs-dry-beans-cost");
  const titleLower = beans.title.toLowerCase();
  const excerptLower = beans.excerpt.toLowerCase();
  assert.match(beans.title, /[Cc]anned/);
  assert.match(beans.title, /\bvs\b/i);
  assert.match(beans.title, /\bdry\b/i);
  assert.match(beans.title, /[Cc]ost/);
  assert.match(beans.title, /97\.9g/);
  assert.match(beans.title, /22g/);
  assert.ok(
    titleLower.indexOf("canned") < titleLower.indexOf("vs"),
    "beans title should lead with canned vs dry, not convenience",
  );
  assert.ok(
    titleLower.indexOf("vs") < titleLower.indexOf("cost"),
    "beans title should state the vs comparison before cost",
  );
  assert.equal(
    titleLower.includes("convenience"),
    false,
    "beans title should not spend the SERP on convenience instead of cost",
  );

  assert.match(beans.excerpt, /[Cc]anned vs dry beans cost/);
  assert.match(beans.excerpt, /97\.9g/);
  assert.match(beans.excerpt, /22g/);
  assert.ok(
    excerptLower.indexOf("canned vs dry beans cost") < excerptLower.indexOf("97.9g"),
    "beans meta should put the cost query before the protein-per-dollar numbers",
  );
});

test("homemade salad dressing title matches refrigerate and how-long queries", () => {
  const dressing = articleFrontmatter("how-to-store-homemade-salad-dressing-safely");
  const titleLower = dressing.title.toLowerCase();
  assert.match(dressing.title, /refrigerat|fridge/i);
  assert.match(dressing.title, /how long|lasts/i);
  assert.ok(
    titleLower.search(/refrigerat|fridge/) < titleLower.search(/how long|lasts/),
    "dressing title should lead with refrigerate language, then how-long",
  );

  assert.match(dressing.excerpt, /[Rr]efrigerat/);
  assert.match(dressing.excerpt, /2 weeks/);
  assert.match(dressing.excerpt, /1 week/);
  assert.match(dressing.excerpt, /3-4 days/);
  assert.match(dressing.excerpt, /[Gg]arlic-in-oil:\s*4 days/);
});

test("fiber label title leads with high-fiber minimum grams query", () => {
  const page = articleFrontmatter("good-source-of-fiber-label-meaning");
  const titleLower = page.title.toLowerCase();
  const excerptLower = page.excerpt.toLowerCase();
  const highFiberAt = titleLower.search(/high fiber/);
  const goodSourceAt = titleLower.search(/good source/);

  assert.ok(highFiberAt !== -1, "fiber label title should name high fiber");
  assert.match(page.title, /5\.6/);
  assert.match(page.title, /[Mm]inimum/);
  assert.match(page.title, /[Gg]ram/);
  assert.match(page.title, /[Ss]erving/);
  assert.ok(
    page.title.length <= 60,
    `fiber label title should be ≤60 chars, got ${page.title.length}`,
  );
  assert.ok(
    goodSourceAt === -1 || highFiberAt < goodSourceAt,
    "fiber label title should lead with high fiber, not good source",
  );
  assert.ok(
    highFiberAt < titleLower.indexOf("5.6"),
    "fiber label title should put high fiber before the 5.6g minimum",
  );

  assert.match(page.excerpt, /high fiber/i);
  assert.match(page.excerpt, /5\.6/);
  assert.match(page.excerpt, /2\.8 to 5\.3/);
  assert.match(page.excerpt, /5 grams/);
  assert.ok(
    excerptLower.search(/high fiber/) < excerptLower.search(/good source|2\.8/),
    "fiber label meta should put high fiber before good source",
  );
});

test("food value database title and meta lead with nutrition-per-dollar intent", () => {
  const page = readFileSync(join(ROOT, "src/pages/food-value-database/index.astro"), "utf8");
  const title = page.match(/const title = `([^`]+)`/)?.[1] ?? "";
  const description = page.match(/const description =\s*`([^`]+)`/)?.[1] ?? "";

  assert.match(title, /^Nutrition per Dollar:/);
  assert.match(title, /Protein and Fiber Database/);
  assert.equal(title.includes("Compare"), false, "title should not lead with generic compare");
  assert.match(description, /^Nutrition per dollar for \$\{foods\.length\} grocery foods/);
  assert.match(description, /protein and fiber per \$1/);
  assert.match(description, /July 2026 US prices plus USDA FoodData Central/);
  assert.match(description, /Not USDA-endorsed/);
});

test("homepage and dashboard sources do not leak template-placeholder hrefs", () => {
  const files = [
    ...walkSource(join(ROOT, "src")),
    ...walkSource(join(ROOT, "public/js")),
  ];
  const leaks = [];
  for (const file of files) {
    const source = readFileSync(file, "utf8");
    if (LEAK.test(source)) leaks.push(file.replace(ROOT, ""));
  }
  assert.deepEqual(leaks, []);
});

test("FreshToday builds article hrefs by concatenation, not a placeholder path", () => {
  const source = readFileSync(join(ROOT, "src/components/FreshToday.astro"), "utf8");
  assert.match(source, /function articleHref\(slug\)/);
  assert.match(source, /'<a href="' \+/);
  assert.equal(source.includes('href="/${article.slug}'), false);
});

test("Cloudflare _redirects sends /sitemap.xml to the generated sitemap index", () => {
  const redirects = readFileSync(join(ROOT, "public/_redirects"), "utf8");
  assert.match(redirects, /^\/sitemap\.xml\s+\/sitemap-index\.xml\s+301$/m);
  assert.match(redirects, /^\/sitemap\.xml\/\s+\/sitemap-index\.xml\s+301$/m);
});
