import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { extname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { INDEX_KEEP_PATHS, INDEX_PRUNE_SLUGS } from "../src/content/index-prune.js";

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
  const popcornRaw = readFileSync(
    join(ROOT, "src/data/articles/popcorn-vs-potato-chips-fiber-comparison.md"),
    "utf8",
  );
  const popcorn = articleFrontmatter("popcorn-vs-potato-chips-fiber-comparison");
  assert.equal(
    popcorn.title,
    "Chips vs Popcorn: 4.1g vs 0.9g Fiber (108 vs 149 Cal)",
  );
  assert.equal(popcorn.title.length, 53);
  assert.ok(
    popcorn.title.length <= 60,
    `popcorn title too long for SERP: ${popcorn.title.length}`,
  );
  const titleLower = popcorn.title.toLowerCase();
  assert.ok(
    titleLower.startsWith("chips vs popcorn"),
    "popcorn title should lead with chips vs popcorn",
  );
  assert.match(popcorn.title, /4\.1g/);
  assert.match(popcorn.title, /0\.9g/);
  assert.ok(
    titleLower.indexOf("4.1g") < titleLower.indexOf("0.9g"),
    "popcorn title should put popcorn fiber (4.1g) before chips fiber (0.9g)",
  );
  assert.ok(
    titleLower.indexOf("fiber") < titleLower.indexOf("108"),
    "popcorn title should surface fiber before the calorie figures",
  );
  assert.match(popcorn.title, /149/);
  assert.match(popcorn.title, /108/);
  assert.ok(
    titleLower.indexOf("108") < titleLower.indexOf("149"),
    "popcorn title should put popcorn calories (108) before chips (149)",
  );
  assert.equal(
    /^chips vs popcorn: which has fewer calories\? 149 vs 108$/.test(titleLower),
    false,
    "popcorn title should not be the calories-only SERP",
  );
  assert.equal(
    /^chips vs popcorn calories: 149 vs 108 \(plus fiber\)$/.test(titleLower),
    false,
    "popcorn title should not be the old flat calorie comparison",
  );
  assert.equal(
    titleLower.startsWith("popcorn vs"),
    false,
    "popcorn title should not lead popcorn-first and miss chips vs popcorn",
  );
  assert.match(popcornRaw, /^dateModified: 2026-09-23$/m);
  assert.match(popcorn.excerpt, /[Cc]hips vs popcorn calories/);
  assert.match(popcorn.excerpt, /108/);
  assert.match(popcorn.excerpt, /149/);
  assert.match(popcorn.excerpt, /4\.1g/);
  assert.match(popcorn.excerpt, /0\.9g/);
  const excerptLower = popcorn.excerpt.toLowerCase();
  assert.ok(
    excerptLower.indexOf("calorie") < excerptLower.search(/fiber|4\.1g/),
    "popcorn meta should put calories before fiber so the SERP snippet is not truncated",
  );
  assert.ok(
    excerptLower.indexOf("chips vs popcorn calories") < excerptLower.indexOf("149"),
    "popcorn meta should put chips vs popcorn calories before the USDA numbers",
  );
  assert.ok(
    popcorn.excerpt.length <= 160,
    `popcorn meta too long: ${popcorn.excerpt.length}`,
  );

  const proteinRaw = readFileSync(
    join(ROOT, "src/data/articles/protein-per-serving-beans-chicken-tofu-compared.md"),
    "utf8",
  );
  const protein = articleFrontmatter("protein-per-serving-beans-chicken-tofu-compared");
  assert.equal(
    protein.title,
    "Chicken vs Beans vs Tofu: Protein Per Serving (26–35g)",
  );
  assert.equal(protein.title.length, 54);
  assert.ok(
    protein.title.length <= 60,
    `protein title too long for SERP: ${protein.title.length}`,
  );
  const proteinTitle = protein.title.toLowerCase();
  assert.ok(
    proteinTitle.startsWith("chicken vs beans vs tofu"),
    "protein title should lead with chicken vs beans vs tofu",
  );
  assert.ok(
    proteinTitle.indexOf("chicken vs beans vs tofu") <
      proteinTitle.indexOf("protein per serving"),
    "protein title should put the foods before protein per serving",
  );
  assert.ok(
    proteinTitle.indexOf("protein per serving") < proteinTitle.indexOf("26"),
    "protein title should put protein per serving before the chicken gram range",
  );
  assert.match(protein.title, /\(26\u201335g\)/);
  assert.equal(
    protein.title.includes("26-35g"),
    false,
    "protein title should use the en dash already in the cooked chicken range, not a hyphen",
  );
  assert.match(protein.title, /[Cc]hicken/);
  assert.match(protein.title, /[Bb]eans/);
  assert.match(protein.title, /[Tt]ofu/);
  assert.equal(
    /^which has more protein per serving: chicken, beans, tofu\?$/.test(proteinTitle),
    false,
    "protein title should not be the old which-has-more question SERP",
  );
  assert.equal(
    /^chicken vs beans vs tofu: 26-35g vs 15g vs 8-20g protein$/.test(proteinTitle),
    false,
    "protein title should not be the old flat three-way gram SERP",
  );
  assert.match(proteinRaw, /^dateModified: 2026-09-23$/m);
  assert.match(protein.excerpt, /26-35g/);
  assert.match(protein.excerpt, /15g/);
  assert.match(protein.excerpt, /8-20g/);
  assert.match(protein.excerpt, /\bvs\b/i);

  const fiberRaw = readFileSync(
    join(ROOT, "src/data/articles/best-high-fiber-foods-ranked-by-fiber-content.md"),
    "utf8",
  );
  const fiberFoods = articleFrontmatter("best-high-fiber-foods-ranked-by-fiber-content");
  const fiberTitleLower = fiberFoods.title.toLowerCase();
  const fiberExcerptLower = fiberFoods.excerpt.toLowerCase();
  assert.equal(
    fiberFoods.title,
    "Which Foods Have the Most Fiber per 100g? Chia 34.4g",
  );
  assert.equal(fiberFoods.title.length, 52);
  assert.ok(
    fiberFoods.title.length <= 60,
    `fiber ranking title should be ≤60 chars, got ${fiberFoods.title.length}`,
  );
  assert.ok(
    fiberTitleLower.startsWith("which foods have the most fiber per 100g"),
    "fiber ranking title should lead with which foods have the most fiber",
  );
  assert.ok(
    fiberTitleLower.indexOf("which foods have the most fiber") <
      fiberTitleLower.indexOf("34.4g"),
    "fiber ranking title should put the question before the chia figure",
  );
  assert.match(fiberFoods.title, /Chia 34\.4g/);
  assert.equal(
    /27\.3g/.test(fiberFoods.title),
    false,
    "fiber ranking title should not list flax 27.3g in a three-food comma lead",
  );
  assert.equal(
    /22\.2g/.test(fiberFoods.title),
    false,
    "fiber ranking title should not list split peas 22.2g in a three-food comma lead",
  );
  assert.equal(
    /^best high-fiber foods per 100g: chia 34\.4g, flax 27\.3g, split peas 22\.2g$/.test(
      fiberTitleLower,
    ),
    false,
    "fiber ranking title should not be the old three-food comma-list SERP",
  );
  assert.match(fiberRaw, /^dateModified: 2026-09-23$/m);
  assert.match(fiberFoods.excerpt, /[Bb]est high-fiber foods/);
  assert.match(fiberFoods.excerpt, /34\.4g/);
  assert.match(fiberFoods.excerpt, /27\.3g/);
  assert.match(fiberFoods.excerpt, /22\.2g/);
  assert.ok(
    fiberExcerptLower.indexOf("best high-fiber foods") < fiberExcerptLower.indexOf("34.4g"),
    "fiber ranking meta should put the ranking query before the USDA numbers",
  );
});

test("canned beans vs dried beans nutrition title puts protein grams per 100g in the SERP", () => {
  const beans = articleFrontmatter("canned-beans-vs-dried-beans-nutrition");
  const raw = readFileSync(
    join(ROOT, "src/data/articles/canned-beans-vs-dried-beans-nutrition.md"),
    "utf8",
  );
  const titleLower = beans.title.toLowerCase();
  const excerptLower = beans.excerpt.toLowerCase();

  assert.equal(
    beans.title,
    "Dried vs Canned Beans: 21.6g vs 6.0g Protein per 100g",
  );
  assert.equal(beans.title.length, 53);
  assert.ok(
    beans.title.length <= 60,
    `nutrition beans title too long for SERP: ${beans.title.length}`,
  );
  assert.ok(
    titleLower.startsWith("dried vs canned beans"),
    "nutrition beans title should lead with dried vs canned beans",
  );
  assert.ok(
    titleLower.indexOf("21.6g") < titleLower.indexOf("6.0g"),
    "nutrition beans title should put dry protein (21.6g) before canned (6.0g)",
  );
  assert.match(beans.title, /21\.6g/);
  assert.match(beans.title, /6\.0g/);
  assert.match(beans.title, /Protein per 100g/);
  assert.equal(
    /^are dried beans better than canned\?$/.test(titleLower),
    false,
    "nutrition beans title should not stay on the soft question SERP",
  );
  assert.equal(
    titleLower.includes("nutrition compared"),
    false,
    "nutrition beans title should not use the nutrition compared SERP lead",
  );
  assert.equal(
    /^dried beans vs canned beans: nutrition compared$/.test(titleLower),
    false,
    "nutrition beans title should not be the old nutrition compared SERP",
  );
  assert.equal(
    /^canned beans or dry beans/.test(titleLower),
    false,
    "nutrition beans title should not lead with canned beans or dry beans",
  );
  assert.match(raw, /^dateModified: 2026-09-23$/m);

  assert.match(beans.excerpt, /[Dd]ried beans vs canned beans/);
  assert.match(beans.excerpt, /21\.6 g/);
  assert.match(beans.excerpt, /6\.0 g/);
  assert.match(beans.excerpt, /81\.0 g/);
  assert.match(beans.excerpt, /30\.1 g/);
  assert.ok(
    excerptLower.indexOf("dried beans vs canned beans") < excerptLower.indexOf("21.6"),
    "beans nutrition meta should put the ranking query before the USDA numbers",
  );
  assert.ok(
    beans.excerpt.length <= 160,
    `nutrition beans meta too long: ${beans.excerpt.length}`,
  );
  assert.ok(
    excerptLower.indexOf("dried beans vs canned beans") === 0,
    "beans nutrition meta should put dried beans vs canned beans first",
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

test("ground beef vs beans title puts protein-per-dollar grams in the SERP", () => {
  const page = articleFrontmatter("ground-beef-vs-beans-protein-cost");
  const titleLower = page.title.toLowerCase();

  assert.equal(
    page.title,
    "Ground Beef vs Beans: 11.5g vs 97.9g Protein per Dollar",
  );
  assert.equal(page.title.length, 55);
  assert.ok(
    page.title.length <= 60,
    `beef vs beans title too long for SERP: ${page.title.length}`,
  );
  assert.ok(
    titleLower.startsWith("ground beef vs beans"),
    "beef vs beans title should lead with ground beef vs beans",
  );
  assert.ok(
    titleLower.indexOf("11.5g") < titleLower.indexOf("97.9g"),
    "beef vs beans title should put ground beef (11.5g) before dry pinto beans (97.9g)",
  );
  assert.match(page.title, /11\.5g/);
  assert.match(page.title, /97\.9g/);
  assert.match(page.title, /Protein per Dollar/);
  assert.equal(
    /^ground beef vs beans: which is cheaper protein\?$/.test(titleLower),
    false,
    "beef vs beans title should not stay on the soft question SERP",
  );
});

test("high-protein high-fiber meals title leads with the 30–40g protein template", () => {
  const page = articleFrontmatter("high-protein-high-fiber-meals-for-weight-loss");
  const raw = readFileSync(
    join(ROOT, "src/data/articles/high-protein-high-fiber-meals-for-weight-loss.md"),
    "utf8",
  );
  const titleLower = page.title.toLowerCase();
  const excerptLower = page.excerpt.toLowerCase();

  assert.equal(
    page.title,
    "High Protein High Fiber Meals: 30–40g Protein Template",
  );
  assert.equal(page.title.length, 54);
  assert.ok(
    page.title.length <= 60,
    `protein fiber meals title should be ≤60 chars, got ${page.title.length}`,
  );
  assert.ok(
    titleLower.startsWith("high protein high fiber meals"),
    "title should lead with high protein high fiber meals, not a soft how-to",
  );
  assert.ok(
    titleLower.indexOf("high protein") < titleLower.indexOf("high fiber"),
    "title should put high protein before high fiber",
  );
  assert.ok(
    titleLower.indexOf("high fiber") < titleLower.indexOf("meals"),
    "title should put high fiber before meals",
  );
  assert.ok(
    titleLower.indexOf("meals") < titleLower.indexOf("30"),
    "title should put meals before the protein gram range",
  );
  assert.match(page.title, /30\u201340g/);
  assert.equal(
    page.title.includes("30-40g"),
    false,
    "title should use the en dash in the 30–40g protein range, not a hyphen",
  );
  assert.ok(
    titleLower.indexOf("30") < titleLower.indexOf("protein template"),
    "title should put the gram range before protein template",
  );
  assert.equal(
    titleLower.startsWith("how to build"),
    false,
    "title should not spend the SERP on a soft how-to lead",
  );
  assert.equal(
    /^how to build high protein high fiber meals for weight loss$/.test(titleLower),
    false,
    "title should not be the old how-to weight-loss SERP",
  );
  assert.equal(
    /^high protein high fiber meals for weight loss$/.test(titleLower),
    false,
    "title should not be the old flat keyword stack",
  );
  assert.equal(
    titleLower.includes("best"),
    false,
    "title should not use a best superlative",
  );
  assert.equal(
    titleLower.includes("what is"),
    false,
    "title should not spend the SERP on a diet definition",
  );
  assert.equal(
    titleLower.includes("diet"),
    false,
    "title should not lead with diet instead of meals",
  );
  assert.match(raw, /^dateModified: 2026-09-23$/m);

  assert.match(page.excerpt, /^High protein high fiber meals for weight loss/i);
  assert.ok(
    excerptLower.indexOf("high protein high fiber meals for weight loss") <
      excerptLower.indexOf("diet salad"),
    "meta should put the meals query before the salad hook",
  );
});

test("costco rotisserie chicken title leads with the meals query", () => {
  const page = articleFrontmatter("costco-rotisserie-chicken-meal-ideas-dinner");
  const titleLower = page.title.toLowerCase();
  const excerptLower = page.excerpt.toLowerCase();
  assert.match(page.title, /^Rotisserie Chicken Meals:/);
  assert.match(page.title, /\b5\b/);
  assert.match(page.title, /Quick/);
  assert.match(page.title, /Costco/);
  assert.equal(
    titleLower.indexOf("rotisserie chicken meals"),
    0,
    "title should lead with rotisserie chicken meals so the GSC query is not buried after Costco",
  );
  assert.equal(
    titleLower.startsWith("5 quick costco"),
    false,
    "title should not spend the SERP prefix on 5 Quick Costco",
  );
  assert.match(page.excerpt, /^Rotisserie chicken meals/);
  assert.match(page.excerpt, /Costco/);
  assert.match(page.excerpt, /quantities for four/);
  assert.match(page.excerpt, /stir-fry/);
  assert.match(page.excerpt, /tacos/);
  assert.ok(
    excerptLower.indexOf("rotisserie chicken meals") < excerptLower.indexOf("costco"),
    "meta should put rotisserie chicken meals before Costco",
  );
});

test("homemade salad dressing title puts the fridge windows in the title", () => {
  const dressing = articleFrontmatter("how-to-store-homemade-salad-dressing-safely");
  const raw = readFileSync(
    join(ROOT, "src/data/articles/how-to-store-homemade-salad-dressing-safely.md"),
    "utf8",
  );
  const titleLower = dressing.title.toLowerCase();
  const excerptLower = dressing.excerpt.toLowerCase();

  assert.equal(
    dressing.title,
    "Homemade Salad Dressing Fridge Life: 2 Weeks, 1 Week, or 3–4 Days",
  );
  assert.equal(dressing.title.length, 65);
  assert.ok(
    titleLower.startsWith("homemade salad dressing fridge life"),
    "dressing title should lead with homemade salad dressing fridge life",
  );
  assert.match(dressing.title, /2 Weeks/);
  assert.match(dressing.title, /1 Week/);
  assert.match(dressing.title, /3\u20134 Days/);
  assert.match(dressing.title, /fridge/i);
  assert.equal(
    /oil\s*(?:and|&)\s*vinegar/.test(titleLower),
    false,
    "dressing title should not lead with oil-and-vinegar-only framing",
  );
  assert.match(raw, /^dateModified: 2026-09-23$/m);

  assert.match(dressing.excerpt, /oil\s*(?:and|&)\s*vinegar/i);
  assert.match(dressing.excerpt, /[Rr]efrigerat/);
  assert.match(dressing.excerpt, /2 weeks/);
  assert.match(dressing.excerpt, /1 week/);
  assert.match(dressing.excerpt, /3-4 days/);
  assert.match(dressing.excerpt, /[Gg]arlic-in-oil:\s*4 days/);
  assert.ok(
    excerptLower.search(/oil\s*(?:and|&)\s*vinegar/) < excerptLower.search(/2 weeks/),
    "dressing meta should put oil-and-vinegar before the storage windows",
  );
});

test("bran muffin title leads with high fiber bran muffins", () => {
  const page = articleFrontmatter("high-fiber-bran-muffins-that-taste-good");
  const raw = readFileSync(
    join(ROOT, "src/data/articles/high-fiber-bran-muffins-that-taste-good.md"),
    "utf8",
  );
  const titleLower = page.title.toLowerCase();
  const excerptLower = page.excerpt.toLowerCase();

  assert.equal(page.title, "High Fiber Bran Muffins (About 5.9g Each)");
  assert.equal(page.title.length, 41);
  assert.ok(
    page.title.length <= 60,
    `bran muffin title should be ≤60 chars, got ${page.title.length}`,
  );
  assert.ok(
    titleLower.startsWith("high fiber bran muffins"),
    "bran muffin title should lead with high fiber bran muffins",
  );
  assert.ok(
    titleLower.indexOf("bran muffins") < titleLower.indexOf("5.9g"),
    "bran muffin title should put bran muffins before the 5.9g fiber amount",
  );
  assert.match(page.title, /5\.9g/);
  assert.equal(
    titleLower.includes("that taste good"),
    false,
    "bran muffin title should not spend the SERP on that taste good",
  );
  assert.equal(
    titleLower.includes("best"),
    false,
    "bran muffin title should not use a best superlative",
  );
  assert.equal(
    titleLower.startsWith("how much fiber"),
    false,
    "bran muffin title should not lead with the fiber-amount question",
  );
  assert.equal(
    /\bmoist\b/.test(titleLower),
    false,
    "bran muffin title should not spend the SERP on moist",
  );
  assert.equal(
    titleLower.includes("whole wheat"),
    false,
    "bran muffin title should not spend the SERP on whole wheat",
  );
  assert.equal(
    /^high fiber bran muffins that taste good \(about 5\.9g each\)$/.test(titleLower),
    false,
    "bran muffin title should not keep the old that-taste-good fluff",
  );

  assert.ok(
    excerptLower.startsWith("high fiber bran muffins"),
    "bran muffin meta should lead with high fiber bran muffins",
  );
  assert.match(page.excerpt, /high fiber muffin recipe/i);
  assert.match(page.excerpt, /5\.9 g/);
  assert.ok(
    excerptLower.indexOf("high fiber bran muffins") < excerptLower.indexOf("5.9"),
    "bran muffin meta should put the query before the 5.9 g estimate",
  );
  assert.ok(
    page.excerpt.length <= 160,
    `bran muffin meta too long: ${page.excerpt.length}`,
  );
  assert.match(raw, /^date: 2025-12-28$/m);
  assert.match(raw, /^dateModified: 2026-09-23$/m);
});

test("soggy sandwich title locks the fat barrier differentiator", () => {
  const raw = readFileSync(
    join(ROOT, "src/data/articles/how-to-keep-sandwiches-from-getting-soggy.md"),
    "utf8",
  );
  const page = articleFrontmatter("how-to-keep-sandwiches-from-getting-soggy");
  const titleLower = page.title.toLowerCase();
  const excerptLower = page.excerpt.toLowerCase();

  assert.equal(
    page.title,
    "How to Keep Sandwiches From Getting Soggy (Fat Barrier First)",
  );
  assert.equal(page.title.length, 61);
  assert.ok(
    titleLower.startsWith("how to keep sandwiches from getting soggy"),
    "sandwich title should lead with GSC query how to keep sandwiches from getting soggy",
  );
  assert.ok(
    titleLower.includes("(fat barrier first)"),
    "sandwich title should name the fat barrier differentiator",
  );
  assert.equal(
    titleLower.startsWith("how to prevent"),
    false,
    "sandwich title should not lead with prevent",
  );
  assert.equal(
    titleLower.includes("best"),
    false,
    "sandwich title should not use a best superlative",
  );
  assert.equal(
    titleLower.includes("healthy"),
    false,
    "sandwich title should not spend the SERP on healthy",
  );
  assert.equal(
    titleLower.includes("homemade"),
    false,
    "sandwich title should not spend the SERP on homemade",
  );
  assert.equal(
    /^how to keep sandwiches from getting soggy$/.test(titleLower),
    false,
    "sandwich title should not be the old generic SERP",
  );
  assert.match(raw, /^date: 2026-04-28$/m);
  assert.match(raw, /^dateModified: 2026-09-23$/m);

  assert.match(page.excerpt, /^How to keep sandwiches from getting soggy/i);
  assert.match(page.excerpt, /soggy/i);
  assert.match(page.excerpt, /sandwiches/i);
  assert.ok(
    page.excerpt.length <= 160,
    `sandwich meta too long: ${page.excerpt.length}`,
  );
  assert.ok(
    excerptLower.indexOf("how to keep") === 0,
    "sandwich meta should put how to keep first",
  );
  assert.ok(
    excerptLower.indexOf("keep") < excerptLower.indexOf("soggy"),
    "sandwich meta should put keep before soggy",
  );
});

test("savory chia title locks the not-sweet breakfast differentiator", () => {
  const raw = readFileSync(
    join(ROOT, "src/data/articles/savory-chia-seed-recipes-breakfast.md"),
    "utf8",
  );
  const page = articleFrontmatter("savory-chia-seed-recipes-breakfast");
  const titleLower = page.title.toLowerCase();
  const excerptLower = page.excerpt.toLowerCase();

  assert.equal(page.title, "Savory Chia Breakfast Recipes (Not Sweet)");
  assert.equal(page.title.length, 41);
  assert.ok(
    page.title.length <= 60,
    `savory chia title too long for SERP: ${page.title.length}`,
  );
  assert.ok(
    titleLower.startsWith("savory chia breakfast recipes"),
    "savory chia title should lead with savory chia breakfast recipes",
  );
  assert.ok(
    titleLower.includes("(not sweet)"),
    "savory chia title should name the not-sweet differentiator",
  );
  assert.equal(
    titleLower.includes("pudding"),
    false,
    "savory chia title should not force pudding",
  );
  assert.equal(
    titleLower.includes("best"),
    false,
    "savory chia title should not use a best superlative",
  );
  assert.equal(
    titleLower.includes("healthy"),
    false,
    "savory chia title should not spend the SERP on healthy",
  );
  assert.equal(
    /^savory chia seed recipes for breakfast$/.test(titleLower),
    false,
    "savory chia title should not be the old seed recipes for breakfast SERP",
  );
  assert.match(raw, /^date: 2026-04-28$/m);
  assert.match(raw, /^dateModified: 2026-09-23$/m);

  assert.match(page.excerpt, /savory chia seed recipes/i);
  assert.ok(
    excerptLower.indexOf("savory chia seed recipes") !== -1,
    "savory chia meta should name chia seed recipes, not lead with pudding recipes",
  );
  assert.ok(
    page.excerpt.length <= 160,
    `savory chia meta too long: ${page.excerpt.length}`,
  );
});

test("packed lunch title leads with how to pack without soggy sandwiches", () => {
  const page = articleFrontmatter("how-to-pack-lunch-crisp-sandwiches-salads");
  const raw = readFileSync(
    join(ROOT, "src/data/articles/how-to-pack-lunch-crisp-sandwiches-salads.md"),
    "utf8",
  );
  const titleLower = page.title.toLowerCase();
  const excerptLower = page.excerpt.toLowerCase();

  assert.equal(
    page.title,
    "How to Pack Lunch Without Soggy Sandwiches or Wilted Salads",
  );
  assert.equal(page.title.length, 59);
  assert.ok(
    page.title.length <= 60,
    `packed lunch title should be ≤60 chars, got ${page.title.length}`,
  );
  assert.ok(
    titleLower.startsWith("how to pack lunch without soggy sandwiches"),
    "packed lunch title should lead with how to pack lunch without soggy sandwiches",
  );
  assert.ok(
    titleLower.indexOf("soggy sandwiches") < titleLower.indexOf("wilted salads"),
    "packed lunch title should name soggy sandwiches before wilted salads",
  );
  assert.equal(
    titleLower.startsWith("pack lunch without"),
    false,
    "packed lunch title should not use the old flat imperative SERP",
  );
  assert.equal(
    /^how to pack lunch so sandwiches and salads stay crisp$/.test(titleLower),
    false,
    "packed lunch title should not be the old stay-crisp SERP",
  );
  assert.match(raw, /^dateModified: 2026-09-23$/m);

  assert.match(page.excerpt, /pack lunch without/i);
  assert.match(page.excerpt, /soggy sandwiches/i);
  assert.match(page.excerpt, /wilted salads/i);
  assert.ok(
    page.excerpt.length <= 160,
    `packed lunch meta too long: ${page.excerpt.length}`,
  );
  assert.ok(
    excerptLower.indexOf("pack lunch without") === 0,
    "packed lunch meta should put pack lunch without first",
  );
  assert.ok(
    excerptLower.indexOf("soggy sandwiches") < excerptLower.indexOf("wilted salads"),
    "packed lunch meta should keep soggy sandwiches before wilted salads",
  );
});

test("food value database title leads with protein and fiber per dollar", () => {
  const page = readFileSync(join(ROOT, "src/pages/food-value-database/index.astro"), "utf8");
  const titleTemplate = page.match(/const title = `([^`]+)`/)?.[1] ?? "";
  const description = page.match(/const description =\s*`([^`]+)`/)?.[1] ?? "";
  const title = titleTemplate.replaceAll("${foods.length}", "79");
  const titleLower = title.toLowerCase();

  assert.equal(title, "Protein and Fiber per Dollar: 79 Foods Ranked");
  assert.equal(title.length, 45);
  assert.ok(
    title.length <= 60,
    `food value title should be ≤60 chars, got ${title.length}`,
  );
  assert.ok(
    titleLower.startsWith("protein and fiber per dollar"),
    "food value title should lead with protein and fiber per dollar",
  );
  assert.ok(
    titleLower.indexOf("protein and fiber per dollar") < titleLower.indexOf("79 foods ranked"),
    "food value title should put the per-dollar answer before the 79-food count",
  );
  assert.match(title, /79 Foods Ranked/);
  assert.equal(
    /\bdatabase\b/.test(titleLower),
    false,
    "food value title should not spend the SERP on database",
  );
  assert.equal(
    /^nutrition per dollar: \d+-food protein and fiber database$/.test(titleLower),
    false,
    "food value title should not be the old database SERP",
  );
  assert.match(page, /<h1[^>]*>\s*\{title\}\s*<\/h1>/);
  assert.match(page, /const dateModified = "2026-09-23";/);
  assert.match(page, /dateModified,/);
  assert.equal(
    page.includes("DATA_RELEASE_DATE"),
    false,
    "food value page dateModified should be the title refresh, not the dataset release date",
  );

  assert.match(description, /^Nutrition per dollar for \$\{foods\.length\} grocery foods/);
  assert.match(description, /protein and fiber per \$1/);
  assert.match(description, /July 2026 US prices plus USDA FoodData Central/);
  assert.match(description, /Not USDA-endorsed/);
});

test("artichoke recipe title leads with the macrobiotic steam method", () => {
  const artichoke = articleFrontmatter("artichoke-recipes-for-gut-health");
  const raw = readFileSync(
    join(ROOT, "src/data/articles/artichoke-recipes-for-gut-health.md"),
    "utf8",
  );
  const titleLower = artichoke.title.toLowerCase();
  const excerptLower = artichoke.excerpt.toLowerCase();

  assert.equal(
    artichoke.title,
    "Macrobiotic Artichoke Recipe: Steam Until Leaves Pull Free",
  );
  assert.equal(artichoke.title.length, 58);
  assert.ok(
    artichoke.title.length <= 60,
    `artichoke title should be ≤60 chars, got ${artichoke.title.length}`,
  );
  assert.ok(
    titleLower.startsWith("macrobiotic artichoke recipe"),
    "artichoke title should lead with the macrobiotic artichoke recipe query",
  );
  assert.ok(
    titleLower.includes("steam until leaves pull free"),
    "artichoke title should name the steam-until-leaves-pull-free method",
  );
  assert.equal(
    titleLower.startsWith("artichoke recipes for gut health"),
    false,
    "artichoke title should not lead with the old gut-health SERP",
  );
  assert.equal(
    /^artichoke recipes for gut health$/.test(titleLower),
    false,
    "artichoke title should not be the old gut-health SERP",
  );
  assert.match(raw, /^dateModified: 2026-09-23$/m);

  assert.match(artichoke.excerpt, /[Mm]acrobiotic artichoke recipe/);
  assert.match(artichoke.excerpt, /steam/i);
  assert.match(artichoke.excerpt, /lemon-garlic/i);
  assert.ok(
    excerptLower.indexOf("macrobiotic artichoke recipe") === 0,
    "artichoke meta stays on the existing excerpt lead",
  );
});

test("rice and beans everyday title puts cost and protein grams in the SERP", () => {
  const rice = articleFrontmatter("can-you-eat-rice-and-beans-everyday");
  const raw = readFileSync(
    join(ROOT, "src/data/articles/can-you-eat-rice-and-beans-everyday.md"),
    "utf8",
  );
  const titleLower = rice.title.toLowerCase();
  const excerptLower = rice.excerpt.toLowerCase();

  assert.equal(
    rice.title,
    "Rice and Beans Every Day? $0.32 Dinner, 23.8g Protein",
  );
  assert.equal(rice.title.length, 53);
  assert.ok(
    rice.title.length <= 60,
    `rice and beans title should be ≤60 chars, got ${rice.title.length}`,
  );
  assert.ok(
    titleLower.startsWith("rice and beans every day"),
    "rice and beans title should lead with rice and beans every day",
  );
  assert.ok(
    titleLower.indexOf("$0.32") < titleLower.indexOf("23.8g"),
    "rice and beans title should put the dinner cost before the protein grams",
  );
  assert.match(rice.title, /\$0\.32/);
  assert.match(rice.title, /23\.8g/);
  assert.equal(
    /^can you eat rice and beans every day\?$/.test(titleLower),
    false,
    "rice and beans title should not stay on the soft question SERP",
  );
  assert.equal(
    titleLower.startsWith("is it healthy"),
    false,
    "rice and beans title should not lead with the old Is It Healthy SERP",
  );
  assert.match(raw, /^dateModified: 2026-09-23$/m);

  assert.match(rice.excerpt, /is it healthy to eat rice and beans every day/i);
  assert.match(rice.excerpt, /protein and fiber/i);
  assert.match(rice.excerpt, /\$0\.32/);
  assert.match(rice.excerpt, /23\.8/);
  assert.ok(
    excerptLower.indexOf("healthy") < excerptLower.indexOf("0.32"),
    "rice and beans meta should put the healthy everyday query before the protein cost numbers",
  );
});

test("fiber label title leads with high-fiber minimum grams query", () => {
  const page = articleFrontmatter("good-source-of-fiber-label-meaning");
  const titleLower = page.title.toLowerCase();
  const excerptLower = page.excerpt.toLowerCase();
  const highFiberAt = titleLower.search(/high fiber/);
  const goodSourceAt = titleLower.search(/good source/);
  const quizFiveAt = titleLower.search(/\b5\b/);
  const currentFiveSixAt = titleLower.indexOf("5.6");

  assert.equal(
    page.title,
    "High Fiber Label Minimum: 5 or 5.6 Grams Per Serving",
  );
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
    highFiberAt < quizFiveAt && quizFiveAt < currentFiveSixAt,
    "fiber label title should put high fiber, then the quiz 5g answer, then 5.6g",
  );
  assert.equal(
    /^high fiber label: minimum 5\.6 grams per serving$/.test(titleLower),
    false,
    "fiber label title should not lead with 5.6g and miss the quiz 5 gram answer",
  );

  assert.match(page.excerpt, /high fiber/i);
  assert.match(page.excerpt, /must contain a minimum of 5 grams per serving/i);
  assert.match(page.excerpt, /5\.6/);
  assert.match(page.excerpt, /2\.8 to 5\.3/);
  assert.match(page.excerpt, /5 grams/);
  assert.ok(
    excerptLower.search(/high fiber/) < excerptLower.search(/good source|2\.8/),
    "fiber label meta should put high fiber before good source",
  );
  assert.ok(
    excerptLower.indexOf("5 grams") < excerptLower.indexOf("5.6"),
    "fiber label meta should put the quiz 5 grams answer before 5.6g",
  );
  assert.ok(
    page.excerpt.length <= 160,
    `fiber label meta too long: ${page.excerpt.length}`,
  );
});

test("popcorn toppings title leads with high fiber", () => {
  const page = articleFrontmatter("high-fiber-popcorn-toppings-healthy");
  const raw = readFileSync(
    join(ROOT, "src/data/articles/high-fiber-popcorn-toppings-healthy.md"),
    "utf8",
  );
  const titleLower = page.title.toLowerCase();
  const excerptLower = page.excerpt.toLowerCase();

  assert.equal(page.title, "High Fiber Popcorn Toppings");
  assert.equal(page.title.length, 27);
  assert.ok(
    page.title.length <= 60,
    `popcorn toppings title should be ≤60 chars, got ${page.title.length}`,
  );
  assert.ok(
    titleLower.indexOf("high fiber") === 0,
    "popcorn toppings title should lead with high fiber",
  );
  assert.ok(
    titleLower.indexOf("high fiber") < titleLower.indexOf("popcorn toppings"),
    "popcorn toppings title should put high fiber before popcorn toppings",
  );
  assert.equal(
    titleLower.includes("that taste good"),
    false,
    "popcorn toppings title should not spend the SERP on that taste good",
  );
  assert.equal(
    titleLower.includes("best"),
    false,
    "popcorn toppings title should not use a best superlative",
  );
  assert.equal(
    /diet food/.test(titleLower),
    false,
    "popcorn toppings title should not use the diet-food angle",
  );
  assert.equal(
    /^7 popcorn toppings that don't taste like diet food$/.test(titleLower),
    false,
    "popcorn toppings title should not be the old diet-food SERP",
  );
  assert.equal(
    /^high fiber popcorn toppings that taste good$/.test(titleLower),
    false,
    "popcorn toppings title should not keep the old that-taste-good fluff",
  );

  assert.equal(
    excerptLower.startsWith("don't taste like diet") || excerptLower.includes("diet food"),
    false,
    "popcorn toppings meta should not lead with the old diet-food framing",
  );
  assert.ok(
    page.excerpt.length <= 160,
    `popcorn toppings meta too long: ${page.excerpt.length}`,
  );
  assert.match(raw, /^date: 2026-02-01$/m);
  assert.match(raw, /^dateModified: 2026-09-23$/m);
});

test("yogurt title leads with high fiber yogurt, not parfait framing", () => {
  const raw = readFileSync(
    join(ROOT, "src/data/articles/high-fiber-yogurt-parfait-for-breakfast.md"),
    "utf8",
  );
  const title = raw.match(/^title:\s*"([^"]+)"/m)?.[1];
  const excerpt = raw.match(/^excerpt:\s*(.+)$/m)?.[1]?.replace(/^"|"$/g, "");
  assert.ok(title, "yogurt article is missing a quoted title");
  assert.ok(excerpt, "yogurt article is missing an excerpt");
  const titleLower = title.toLowerCase();

  assert.equal(
    title,
    "High Fiber Yogurt: How to Add Fiber (Plain Greek Is 0g)",
  );
  assert.ok(
    title.length <= 60,
    `yogurt title should be ≤60 chars, got ${title.length}`,
  );
  assert.equal(title.length, 55);
  assert.ok(
    titleLower.indexOf("high fiber yogurt") === 0,
    "yogurt title should lead with high fiber yogurt",
  );
  assert.ok(
    titleLower.indexOf("how to add fiber") > titleLower.indexOf("high fiber yogurt"),
    "yogurt title should put how to add fiber after the query lead",
  );
  assert.match(title, /Plain Greek Is 0g/);
  assert.equal(
    /^high[ -]fiber yogurt parfait/.test(titleLower),
    false,
    "yogurt title should not lead with the parfait framing",
  );
  assert.equal(
    /layer by layer/.test(titleLower),
    false,
    "yogurt title should not use the old layer-by-layer SERP",
  );
  assert.match(raw, /^dateModified: 2026-09-23$/m);
  assert.equal(
    excerpt.toLowerCase().includes("the real gram count, layer by layer"),
    false,
    "yogurt meta should not hard-sell the old layer-by-layer title",
  );
});

test("cooking oil smoke points title leads with smoke point chart", () => {
  const page = articleFrontmatter("cooking-oils-smoke-points-best-uses");
  const raw = readFileSync(
    join(ROOT, "src/data/articles/cooking-oils-smoke-points-best-uses.md"),
    "utf8",
  );
  const titleLower = page.title.toLowerCase();

  assert.equal(page.title, "Smoke Point Chart: Cooking Oil Smoke Points");
  assert.equal(page.title.length, 43);
  assert.ok(
    page.title.length <= 60,
    `smoke point title should be ≤60 chars, got ${page.title.length}`,
  );
  assert.ok(
    titleLower.startsWith("smoke point chart"),
    "smoke point title should lead with the smoke point chart query",
  );
  assert.ok(
    titleLower.includes("cooking oil smoke points"),
    "smoke point title should name cooking oil smoke points",
  );
  assert.equal(
    titleLower.includes("cites its sources"),
    false,
    "smoke point title should not spend the SERP on cites-its-sources",
  );
  assert.match(raw, /^dateModified: 2026-09-23$/m);
});

test("pizza crust fiber title leads with which crust has more fiber", () => {
  const page = articleFrontmatter("comparing-fiber-content-different-pizza-crusts");
  const raw = readFileSync(
    join(ROOT, "src/data/articles/comparing-fiber-content-different-pizza-crusts.md"),
    "utf8",
  );
  const titleLower = page.title.toLowerCase();
  const excerptLower = page.excerpt.toLowerCase();

  assert.equal(page.title, "Pizza Crust Fiber: Which Has More? 2.7g vs 4.2-5.1g");
  assert.equal(page.title.length, 51);
  assert.ok(
    page.title.length <= 60,
    `pizza crust title should be ≤60 chars, got ${page.title.length}`,
  );
  assert.ok(
    titleLower.startsWith("pizza crust fiber"),
    "pizza crust title should lead with pizza crust fiber",
  );
  assert.ok(
    titleLower.indexOf("which has more") < titleLower.indexOf("2.7g"),
    "pizza crust title should put which-has-more before the USDA grams",
  );
  assert.match(page.title, /2\.7g/);
  assert.match(page.title, /4\.2-5\.1g/);
  assert.equal(
    titleLower.includes("comparing fiber in different"),
    false,
    "pizza crust title should not lead with Comparing Fiber in Different",
  );
  assert.match(raw, /^dateModified: 2026-09-23$/m);

  assert.match(page.excerpt, /[Cc]omparing [Ff]iber/);
  assert.match(page.excerpt, /2\.7g/);
  assert.match(page.excerpt, /4\.2-5\.1g/);
  assert.ok(
    excerptLower.indexOf("comparing") < excerptLower.indexOf("2.7g"),
    "pizza meta should put the compare query before the USDA numbers",
  );
});

test("protein density title leads with highest protein foods per 100g", () => {
  const page = articleFrontmatter("foods-highest-in-protein-per-100-grams");
  const raw = readFileSync(
    join(ROOT, "src/data/articles/foods-highest-in-protein-per-100-grams.md"),
    "utf8",
  );
  const titleLower = page.title.toLowerCase();
  const excerptLower = page.excerpt.toLowerCase();

  assert.equal(page.title, "Highest Protein Foods per 100g: TVP 52.17g");
  assert.equal(page.title.length, 42);
  assert.ok(
    page.title.length <= 60,
    `protein density title should be ≤60 chars, got ${page.title.length}`,
  );
  assert.ok(
    titleLower.startsWith("highest protein foods per 100g"),
    "protein density title should lead with highest protein foods per 100g",
  );
  assert.ok(
    titleLower.indexOf("highest protein foods per 100g") < titleLower.indexOf("52.17g"),
    "protein density title should put the ranking query before the 52.17g leader",
  );
  assert.match(page.title, /52\.17g/);
  assert.equal(
    titleLower.includes("study"),
    false,
    "protein density title should not spend the SERP on study",
  );
  assert.equal(
    /^foods highest in protein per 100g: 49-food study$/.test(titleLower),
    false,
    "protein density title should not be the old 49-food study SERP",
  );
  assert.match(raw, /^dateModified: 2026-09-23$/m);

  assert.match(page.excerpt, /[Ff]oods highest in protein/);
  assert.match(page.excerpt, /52\.17g/);
  assert.match(page.excerpt, /proxy/i);
  assert.match(page.excerpt, /24\.63g/);
  assert.match(page.excerpt, /24\.62g/);
  assert.match(page.excerpt, /July 2026/);
  assert.ok(
    excerptLower.indexOf("foods highest in protein") < excerptLower.indexOf("52.17g"),
    "protein density meta should put the ranking query before the table numbers",
  );
});

test("cauliflower pizza crust title leads with is it high in fiber", () => {
  const page = articleFrontmatter("high-fiber-pizza-crust-cauliflower");
  const raw = readFileSync(
    join(ROOT, "src/data/articles/high-fiber-pizza-crust-cauliflower.md"),
    "utf8",
  );
  const titleLower = page.title.toLowerCase();
  const excerptLower = page.excerpt.toLowerCase();

  assert.equal(
    page.title,
    "Is Cauliflower Pizza Crust High in Fiber? About 5.8g",
  );
  assert.equal(page.title.length, 52);
  assert.ok(
    page.title.length <= 60,
    `cauliflower crust title should be ≤60 chars, got ${page.title.length}`,
  );
  assert.ok(
    titleLower.startsWith("is cauliflower pizza crust high in fiber"),
    "cauliflower crust title should lead with the is-it-high-fiber question",
  );
  assert.ok(
    titleLower.indexOf("is cauliflower pizza crust high in fiber") <
      titleLower.indexOf("5.8g"),
    "cauliflower crust title should put the question before the 5.8g estimate",
  );
  assert.match(page.title, /About 5\.8g/);
  assert.equal(
    titleLower.includes("that actually gets crispy"),
    false,
    "cauliflower crust title should not spend the SERP on that actually gets crispy",
  );
  assert.match(raw, /^dateModified: 2026-09-23$/m);

  assert.match(page.excerpt, /about 5\.8g fiber per quarter-crust/i);
  assert.match(page.excerpt, /1-2g per serving/);
  assert.ok(
    excerptLower.indexOf("5.8g") < excerptLower.indexOf("1-2g"),
    "cauliflower crust meta should put the homemade 5.8g estimate before store-bought 1-2g",
  );
});

test("fast food protein per dollar title leads with which has the best", () => {
  const page = articleFrontmatter("fast-food-protein-per-dollar-ranked");
  const raw = readFileSync(
    join(ROOT, "src/data/articles/fast-food-protein-per-dollar-ranked.md"),
    "utf8",
  );
  const titleLower = page.title.toLowerCase();

  assert.equal(
    page.title,
    "Which Fast Food Has the Best Protein per Dollar? 8.4g",
  );
  assert.equal(page.title.length, 53);
  assert.ok(
    page.title.length <= 60,
    `fast food protein title should be ≤60 chars, got ${page.title.length}`,
  );
  assert.ok(
    titleLower.startsWith("which fast food has the best protein per dollar"),
    "fast food protein title should lead with which fast food has the best protein per dollar",
  );
  assert.ok(
    titleLower.indexOf("which fast food has the best") < titleLower.indexOf("8.4g"),
    "fast food protein title should put the which-has-best question before the 8.4g leader",
  );
  assert.match(page.title, /8\.4g/);
  assert.equal(
    titleLower.includes("the best deals ranked"),
    false,
    "fast food protein title should not use the old best deals ranked SERP",
  );
  assert.match(raw, /^dateModified: 2026-09-23$/m);

  assert.match(page.excerpt, /8\.4g protein per dollar/);
  assert.match(page.excerpt, /7\.6/);
});

test("fiber and protein daily values title leads with why the daily fiber goal is 28g", () => {
  const page = articleFrontmatter("fiber-protein-daily-values-explained");
  const raw = readFileSync(
    join(ROOT, "src/data/articles/fiber-protein-daily-values-explained.md"),
    "utf8",
  );
  const titleLower = page.title.toLowerCase();

  assert.equal(page.title, "Why the Daily Fiber Goal Is 28g (Protein 50g)");
  assert.equal(page.title.length, 45);
  assert.ok(
    page.title.length <= 60,
    `daily values title should be ≤60 chars, got ${page.title.length}`,
  );
  assert.ok(
    titleLower.startsWith("why the daily fiber goal is 28g"),
    "daily values title should lead with why the daily fiber goal is 28g",
  );
  assert.ok(
    titleLower.indexOf("28g") < titleLower.indexOf("50g"),
    "daily values title should put the 28g fiber figure before protein 50g",
  );
  assert.match(page.title, /28g/);
  assert.match(page.title, /50g/);
  assert.equal(
    titleLower.includes("come from"),
    false,
    "daily values title should not use the old where-it-comes-from SERP",
  );
  assert.equal(
    titleLower.includes("explained"),
    false,
    "daily values title should not spend the SERP on explained",
  );
  assert.match(raw, /^dateModified: 2026-09-23$/m);

  assert.match(page.excerpt, /28g/);
  assert.match(page.excerpt, /50g/);
});

test("water and fiber title leads with how much water you need", () => {
  const page = articleFrontmatter("water-and-fiber-the-golden-rule");
  const raw = readFileSync(
    join(ROOT, "src/data/articles/water-and-fiber-the-golden-rule.md"),
    "utf8",
  );
  const titleLower = page.title.toLowerCase();

  assert.equal(page.title, "How Much Water Do You Need With Fiber?");
  assert.equal(page.title.length, 38);
  assert.ok(
    page.title.length <= 60,
    `water and fiber title should be ≤60 chars, got ${page.title.length}`,
  );
  assert.ok(
    titleLower.startsWith("how much water do you need with fiber"),
    "water and fiber title should lead with how much water do you need with fiber",
  );
  assert.equal(
    titleLower.includes("golden rule gets wrong"),
    false,
    "water and fiber title should not use the golden rule gets wrong SERP",
  );
  assert.equal(
    titleLower.includes("golden rule"),
    false,
    "water and fiber title should not spend the SERP on golden rule",
  );
  assert.match(raw, /^dateModified: 2026-09-23$/m);

  assert.match(page.excerpt, /isn't a magic water-to-fiber ratio/i);
});

test("oatmeal vs grits title leads with which has more fiber", () => {
  const page = articleFrontmatter("oatmeal-vs-grits-fiber-content");
  const raw = readFileSync(
    join(ROOT, "src/data/articles/oatmeal-vs-grits-fiber-content.md"),
    "utf8",
  );
  const titleLower = page.title.toLowerCase();
  const excerptLower = page.excerpt.toLowerCase();

  assert.equal(page.title, "Oatmeal vs Grits: Which Has More Fiber?");
  assert.equal(page.title.length, 39);
  assert.ok(
    page.title.length <= 60,
    `oatmeal vs grits title should be ≤60 chars, got ${page.title.length}`,
  );
  assert.ok(
    titleLower.startsWith("oatmeal vs grits"),
    "oatmeal vs grits title should lead with oatmeal vs grits",
  );
  assert.ok(
    titleLower.indexOf("which has more fiber") > titleLower.indexOf("oatmeal vs grits"),
    "oatmeal vs grits title should put which has more fiber after the foods",
  );
  assert.equal(
    titleLower.includes("the actual numbers"),
    false,
    "oatmeal vs grits title should not spend the SERP on the actual numbers",
  );
  assert.match(raw, /^dateModified: 2026-09-23$/m);

  assert.match(page.excerpt, /4\.0g/);
  assert.match(page.excerpt, /1\.6-2\.4g/);
  assert.ok(
    excerptLower.indexOf("4.0g") < excerptLower.indexOf("1.6-2.4g"),
    "oatmeal vs grits meta should put oatmeal 4.0g before the grits range",
  );
});

test("selenium foods title leads with how much you need", () => {
  const page = articleFrontmatter("selenium-containing-foods-easy-ways");
  const raw = readFileSync(
    join(ROOT, "src/data/articles/selenium-containing-foods-easy-ways.md"),
    "utf8",
  );
  const titleLower = page.title.toLowerCase();

  assert.equal(
    page.title,
    "Selenium Foods: How Much You Need (Brazil Nut Limits)",
  );
  assert.equal(page.title.length, 53);
  assert.ok(
    page.title.length <= 60,
    `selenium foods title should be ≤60 chars, got ${page.title.length}`,
  );
  assert.ok(
    titleLower.startsWith("selenium foods"),
    "selenium foods title should lead with selenium foods",
  );
  assert.ok(
    titleLower.indexOf("how much you need") < titleLower.indexOf("brazil nut"),
    "selenium foods title should put how much you need before the brazil nut limit",
  );
  assert.equal(
    titleLower.includes("what to eat"),
    false,
    "selenium foods title should not spend the SERP on what to eat",
  );
  assert.equal(
    /^selenium foods: what to eat, how much you need, and brazil nut limits$/.test(
      titleLower,
    ),
    false,
    "selenium foods title should not be the old three-clause comma stack",
  );
  assert.match(raw, /^dateModified: 2026-09-23$/m);

  assert.match(page.excerpt, /Brazil nuts/);
  assert.match(page.excerpt, /400 mcg/);
  assert.match(page.excerpt, /55 mcg/);
});

test("prune juice alternatives title leads with the constipation query", () => {
  const page = articleFrontmatter("prune-juice-alternatives-for-constipation");
  const raw = readFileSync(
    join(ROOT, "src/data/articles/prune-juice-alternatives-for-constipation.md"),
    "utf8",
  );
  const titleLower = page.title.toLowerCase();

  assert.equal(page.title, "Prune Juice Alternatives for Constipation");
  assert.equal(page.title.length, 41);
  assert.ok(
    page.title.length <= 60,
    `prune juice alternatives title should be ≤60 chars, got ${page.title.length}`,
  );
  assert.ok(
    titleLower.startsWith("prune juice alternatives"),
    "prune juice alternatives title should lead with prune juice alternatives",
  );
  assert.ok(
    titleLower.indexOf("for constipation") > titleLower.indexOf("prune juice alternatives"),
    "prune juice alternatives title should put for constipation after the alternatives lead",
  );
  assert.equal(
    titleLower.includes("with actual evidence"),
    false,
    "prune juice alternatives title should not spend the SERP on with actual evidence",
  );
  assert.match(raw, /^dateModified: 2026-09-23$/m);

  assert.match(page.excerpt, /sorbitol/);
  assert.match(page.excerpt, /kiwifruit/);
});

test("indian salad dressing title leads with 5-minute yogurt-mint and tamarind", () => {
  const page = articleFrontmatter("healthy-homemade-indian-salad-dressing-recipes");
  const raw = readFileSync(
    join(ROOT, "src/data/articles/healthy-homemade-indian-salad-dressing-recipes.md"),
    "utf8",
  );
  const titleLower = page.title.toLowerCase();

  assert.equal(
    page.title,
    "Indian Salad Dressing in 5 Minutes: Yogurt-Mint & Tamarind",
  );
  assert.equal(page.title.length, 58);
  assert.ok(
    page.title.length <= 60,
    `indian salad dressing title should be ≤60 chars, got ${page.title.length}`,
  );
  assert.ok(
    titleLower.startsWith("indian salad dressing in 5 minutes"),
    "indian salad dressing title should lead with the 5-minute dressing query",
  );
  assert.ok(
    titleLower.indexOf("5 minutes") < titleLower.indexOf("yogurt-mint"),
    "indian salad dressing title should put 5 minutes before yogurt-mint",
  );
  assert.ok(
    titleLower.indexOf("yogurt-mint") < titleLower.indexOf("tamarind"),
    "indian salad dressing title should put yogurt-mint before tamarind",
  );
  assert.equal(
    titleLower.startsWith("homemade"),
    false,
    "indian salad dressing title should not stack homemade in front of the query",
  );
  assert.equal(
    titleLower.includes("healthy"),
    false,
    "indian salad dressing title should not stack healthy in front of the query",
  );
  assert.equal(
    titleLower.includes("best"),
    false,
    "indian salad dressing title should not use a best superlative",
  );
  assert.equal(
    /^indian salad dressing recipes \(homemade\)$/.test(titleLower),
    false,
    "indian salad dressing title should not be the old homemade recipes SERP",
  );
  assert.equal(
    /^healthy homemade indian salad dressing recipes$/.test(titleLower),
    false,
    "indian salad dressing title should not be the old healthy homemade stack",
  );
  assert.match(raw, /^date: 2026-04-28$/m);
  assert.match(raw, /^dateModified: 2026-09-23$/m);
  assert.match(
    raw,
    /^excerpt: "Indian-inspired salad dressings you whisk in 5 minutes flat\. Yogurt-mint, tamarind and chaat masala, all cheaper and brighter than bottled ranch\."$/m,
  );
});

test("high fiber breakfast title leads with breakfast ideas for gut health", () => {
  const page = articleFrontmatter("easy-high-fiber-breakfast-ideas-for-gut-health");
  const raw = readFileSync(
    join(ROOT, "src/data/articles/easy-high-fiber-breakfast-ideas-for-gut-health.md"),
    "utf8",
  );
  const titleLower = page.title.toLowerCase();

  assert.equal(page.title, "High Fiber Breakfast Ideas for Gut Health");
  assert.equal(page.title.length, 41);
  assert.ok(
    page.title.length <= 60,
    `high fiber breakfast title should be ≤60 chars, got ${page.title.length}`,
  );
  assert.ok(
    titleLower.startsWith("high fiber breakfast ideas"),
    "high fiber breakfast title should lead with high fiber breakfast ideas",
  );
  assert.ok(
    titleLower.indexOf("breakfast ideas") < titleLower.indexOf("gut health"),
    "high fiber breakfast title should put breakfast ideas before gut health",
  );
  assert.equal(
    titleLower.startsWith("easy"),
    false,
    "high fiber breakfast title should not lead with the easy high fiber stack",
  );
  assert.equal(
    titleLower.includes("best"),
    false,
    "high fiber breakfast title should not use a best superlative",
  );
  assert.equal(
    /^easy high fiber breakfast ideas for gut health$/.test(titleLower),
    false,
    "high fiber breakfast title should not be the old easy high fiber stack",
  );
  assert.match(raw, /^date: 2026-02-15$/m);
  assert.match(raw, /^dateModified: 2026-09-23$/m);
});

test("egg sandwich add-ins title leads with add-ins and toppings", () => {
  const raw = readFileSync(
    join(ROOT, "src/data/articles/healthy-egg-sandwich-add-ins-toppings.md"),
    "utf8",
  );
  const title = raw.match(/^title:\s*"([^"]+)"/m)?.[1];
  assert.ok(title, "healthy-egg-sandwich-add-ins-toppings is missing a quoted title");
  const titleLower = title.toLowerCase();

  assert.equal(title, "Egg Sandwich Add-Ins and Toppings");
  assert.equal(title.length, 33);
  assert.ok(
    title.length <= 60,
    `egg sandwich add-ins title should be ≤60 chars, got ${title.length}`,
  );
  assert.ok(
    titleLower.startsWith("egg sandwich add-ins"),
    "egg sandwich add-ins title should lead with egg sandwich add-ins",
  );
  assert.ok(
    titleLower.indexOf("add-ins") < titleLower.indexOf("toppings"),
    "egg sandwich add-ins title should put add-ins before toppings",
  );
  assert.equal(
    titleLower.includes("healthy"),
    false,
    "egg sandwich add-ins title should not spend the SERP on healthy",
  );
  assert.equal(
    titleLower.includes("that taste good"),
    false,
    "egg sandwich add-ins title should not spend the SERP on that taste good",
  );
  assert.equal(
    titleLower.includes("best"),
    false,
    "egg sandwich add-ins title should not use a best superlative",
  );
  assert.equal(
    /^healthy egg sandwich add-ins that taste good$/.test(titleLower),
    false,
    "egg sandwich add-ins title should not be the old healthy taste-good SERP",
  );
  assert.match(raw, /^date: 2026-04-28$/m);
  assert.match(raw, /^dateModified: 2026-09-23$/m);
});

test("high fiber smoothies title leads with high fiber smoothies for picky kids", () => {
  const raw = readFileSync(
    join(ROOT, "src/data/articles/high-fiber-smoothies-for-kids-picky-eaters.md"),
    "utf8",
  );
  const title = raw.match(/^title:\s*"([^"]+)"/m)?.[1];
  assert.ok(title, "high-fiber-smoothies-for-kids-picky-eaters is missing a quoted title");
  const titleLower = title.toLowerCase();

  assert.equal(title, "High Fiber Smoothies for Picky Kids");
  assert.equal(title.length, 35);
  assert.ok(
    title.length <= 60,
    `high fiber smoothies title should be ≤60 chars, got ${title.length}`,
  );
  assert.ok(
    titleLower.startsWith("high fiber smoothies"),
    "high fiber smoothies title should lead with high fiber smoothies",
  );
  assert.ok(
    titleLower.indexOf("smoothies") < titleLower.indexOf("for picky kids"),
    "high fiber smoothies title should put smoothies before for picky kids",
  );
  assert.equal(
    titleLower.includes("kids picky eaters"),
    false,
    "high fiber smoothies title should not stack kids picky eaters",
  );
  assert.equal(
    titleLower.includes("best"),
    false,
    "high fiber smoothies title should not use a best superlative",
  );
  assert.equal(
    /^high fiber smoothies for kids picky eaters$/.test(titleLower),
    false,
    "high fiber smoothies title should not be the old kids picky eaters stack",
  );
  assert.match(raw, /^date: 2026-02-16$/m);
  assert.match(raw, /^dateModified: 2026-09-23$/m);
});

test("high fiber fast food title leads with what to order at 6 chains", () => {
  const raw = readFileSync(
    join(ROOT, "src/data/articles/high-fiber-fast-food-options-guide.md"),
    "utf8",
  );
  const title = raw.match(/^title:\s*"([^"]+)"/m)?.[1];
  assert.ok(title, "high-fiber-fast-food-options-guide is missing a quoted title");
  const titleLower = title.toLowerCase();

  assert.equal(title, "High-Fiber Fast Food: What to Order at 6 Chains");
  assert.equal(title.length, 47);
  assert.ok(
    title.length <= 60,
    `high fiber fast food title should be ≤60 chars, got ${title.length}`,
  );
  assert.ok(
    titleLower.startsWith("high-fiber fast food"),
    "high fiber fast food title should lead with high-fiber fast food",
  );
  assert.ok(
    titleLower.indexOf("what to order") < titleLower.indexOf("6 chains"),
    "high fiber fast food title should put what to order before 6 chains",
  );
  assert.equal(
    titleLower.includes("best"),
    false,
    "high fiber fast food title should not use a best superlative",
  );
  assert.equal(
    /^high-fiber fast food: the best orders at 6 chains$/.test(titleLower),
    false,
    "high fiber fast food title should not be the old best orders SERP",
  );
  assert.match(raw, /^date: 2026-01-21$/m);
  assert.match(raw, /^dateModified: 2026-09-23$/m);
});

test("high protein breads title leads with high protein breads for sandwiches", () => {
  const raw = readFileSync(
    join(ROOT, "src/data/articles/best-high-protein-breads-healthy-sandwiches.md"),
    "utf8",
  );
  const title = raw.match(/^title:\s*"([^"]+)"/m)?.[1];
  assert.ok(title, "best-high-protein-breads-healthy-sandwiches is missing a quoted title");
  const titleLower = title.toLowerCase();

  assert.equal(title, "High Protein Breads for Sandwiches");
  assert.equal(title.length, 34);
  assert.ok(
    title.length <= 60,
    `high protein breads title should be ≤60 chars, got ${title.length}`,
  );
  assert.ok(
    titleLower.startsWith("high protein breads"),
    "high protein breads title should lead with high protein breads",
  );
  assert.ok(
    titleLower.indexOf("breads") < titleLower.indexOf("for sandwiches"),
    "high protein breads title should put breads before for sandwiches",
  );
  assert.equal(
    titleLower.includes("best"),
    false,
    "high protein breads title should not use a best superlative",
  );
  assert.equal(
    titleLower.includes("healthy"),
    false,
    "high protein breads title should not spend the SERP on healthy",
  );
  assert.equal(
    /^best high protein breads for healthy sandwiches$/.test(titleLower),
    false,
    "high protein breads title should not be the old best healthy sandwiches stack",
  );
  assert.match(raw, /^date: 2026-04-28$/m);
  assert.match(raw, /^dateModified: 2026-09-23$/m);
});

test("breakfast energy title drops the leading Best superlative", () => {
  const raw = readFileSync(
    join(ROOT, "src/data/articles/best-breakfast-foods-for-sustained-energy.md"),
    "utf8",
  );
  const title = raw.match(/^title:\s*"([^"]+)"/m)?.[1];
  assert.ok(title, "best-breakfast-foods-for-sustained-energy is missing a quoted title");
  const titleLower = title.toLowerCase();

  assert.equal(title, "Breakfast Foods for Sustained Energy");
  assert.equal(title.length, 36);
  assert.ok(
    title.length <= 60,
    `breakfast energy title should be ≤60 chars, got ${title.length}`,
  );
  assert.ok(
    titleLower.startsWith("breakfast foods for sustained energy"),
    "breakfast energy title should lead with breakfast foods for sustained energy",
  );
  assert.equal(
    titleLower.startsWith("best "),
    false,
    "breakfast energy title should not lead with Best ",
  );
  assert.equal(
    titleLower.includes("best"),
    false,
    "breakfast energy title should not use a best superlative",
  );
  assert.equal(
    /^best breakfast foods for sustained energy$/.test(titleLower),
    false,
    "breakfast energy title should not be the old Best breakfast foods SERP",
  );
  assert.match(raw, /^date: 2026-03-15$/m);
  assert.match(raw, /^dateModified: 2026-09-23$/m);
});

test("low cost protein families title drops the leading Best superlative", () => {
  const raw = readFileSync(
    join(ROOT, "src/data/articles/best-low-cost-protein-sources-large-families.md"),
    "utf8",
  );
  const title = raw.match(/^title:\s*"([^"]+)"/m)?.[1];
  assert.ok(title, "best-low-cost-protein-sources-large-families is missing a quoted title");
  const titleLower = title.toLowerCase();

  assert.equal(title, "Low Cost Protein Sources for Large Families");
  assert.equal(title.length, 43);
  assert.ok(
    title.length <= 60,
    `low cost protein families title should be ≤60 chars, got ${title.length}`,
  );
  assert.ok(
    titleLower.startsWith("low cost protein sources for large families"),
    "low cost protein families title should lead with low cost protein sources for large families",
  );
  assert.equal(
    titleLower.startsWith("best "),
    false,
    "low cost protein families title should not lead with Best ",
  );
  assert.equal(
    titleLower.includes("best"),
    false,
    "low cost protein families title should not use a best superlative",
  );
  assert.equal(
    /^best low cost protein sources for large families$/.test(titleLower),
    false,
    "low cost protein families title should not be the old Best low cost protein SERP",
  );
  assert.match(raw, /^date: 2026-04-28$/m);
  assert.match(raw, /^dateModified: 2026-09-23$/m);
});

test("stir-fry vegetables title drops the leading Best superlative", () => {
  const raw = readFileSync(
    join(ROOT, "src/data/articles/high-fiber-stir-fry-vegetables.md"),
    "utf8",
  );
  const title = raw.match(/^title:\s*"([^"]+)"/m)?.[1];
  assert.ok(title, "high-fiber-stir-fry-vegetables is missing a quoted title");
  const titleLower = title.toLowerCase();

  assert.equal(title, "Vegetables for Stir-Fry (And How to Keep Them Crisp)");
  assert.equal(title.length, 52);
  assert.ok(
    title.length <= 60,
    `stir-fry vegetables title should be ≤60 chars, got ${title.length}`,
  );
  assert.ok(
    titleLower.startsWith("vegetables for stir-fry"),
    "stir-fry vegetables title should lead with vegetables for stir-fry",
  );
  assert.ok(
    titleLower.indexOf("stir-fry") < titleLower.indexOf("how to keep them crisp"),
    "stir-fry vegetables title should keep the crisp how-to after the vegetable query",
  );
  assert.equal(
    titleLower.startsWith("best "),
    false,
    "stir-fry vegetables title should not lead with Best ",
  );
  assert.equal(
    titleLower.includes("best"),
    false,
    "stir-fry vegetables title should not use a best superlative",
  );
  assert.equal(
    /^best vegetables for stir-fry and how to keep them crisp$/.test(titleLower),
    false,
    "stir-fry vegetables title should not be the old Best vegetables SERP",
  );
  assert.match(raw, /^date: 2026-02-19$/m);
  assert.match(raw, /^dateModified: 2026-09-23$/m);
  assert.match(
    raw,
    /^excerpt: "Broccoli, snap peas, and peppers cook in 12 minutes with a glossy ginger-soy sauce that doesn't turn the vegetables limp\."$/m,
  );
});

test("popcorn vs almonds fiber-cost title puts grams per dollar in the SERP", () => {
  const page = articleFrontmatter("popcorn-vs-almonds-fiber-cost");
  const titleLower = page.title.toLowerCase();

  assert.equal(
    page.title,
    "Popcorn vs Almonds: 51.3g vs 8.8g Fiber per Dollar",
  );
  assert.equal(page.title.length, 50);
  assert.ok(
    page.title.length <= 60,
    `popcorn vs almonds title should be ≤60 chars, got ${page.title.length}`,
  );
  assert.ok(
    titleLower.startsWith("popcorn vs almonds"),
    "popcorn vs almonds title should lead with popcorn vs almonds",
  );
  assert.ok(
    titleLower.indexOf("51.3g") < titleLower.indexOf("8.8g"),
    "popcorn vs almonds title should put popcorn fiber grams before almonds",
  );
  assert.match(page.title, /51\.3g/);
  assert.match(page.title, /8\.8g/);
  assert.equal(
    /^popcorn vs almonds: which one buys more fiber per dollar\?$/.test(titleLower),
    false,
    "popcorn vs almonds title should not stay on the soft question SERP",
  );
});

test("flour vs quinoa fiber-cost title puts grams per dollar in the SERP", () => {
  const page = articleFrontmatter("whole-wheat-flour-vs-quinoa-fiber-cost");
  const titleLower = page.title.toLowerCase();

  assert.equal(
    page.title,
    "Whole Wheat Flour vs Quinoa: 77.8g vs 10.6g Fiber per Dollar",
  );
  assert.equal(page.title.length, 60);
  assert.ok(
    page.title.length <= 60,
    `flour vs quinoa title should be ≤60 chars, got ${page.title.length}`,
  );
  assert.ok(
    titleLower.startsWith("whole wheat flour vs quinoa"),
    "flour vs quinoa title should lead with whole wheat flour vs quinoa",
  );
  assert.ok(
    titleLower.indexOf("77.8g") < titleLower.indexOf("10.6g"),
    "flour vs quinoa title should put flour fiber grams before quinoa",
  );
  assert.match(page.title, /77\.8g/);
  assert.match(page.title, /10\.6g/);
  assert.equal(
    /^whole wheat flour vs quinoa: which fiber is cheaper\?$/.test(titleLower),
    false,
    "flour vs quinoa title should not stay on the soft question SERP",
  );
});

test("lentils vs chicken breast title puts protein-per-dollar grams in the SERP", () => {
  const page = articleFrontmatter("lentils-vs-chicken-breast-protein-cost");
  const titleLower = page.title.toLowerCase();

  assert.equal(
    page.title,
    "Lentils vs Chicken Breast: 77.7g vs 24.5g Protein per Dollar",
  );
  assert.equal(page.title.length, 60);
  assert.ok(
    page.title.length <= 60,
    `lentils vs chicken title should be ≤60 chars, got ${page.title.length}`,
  );
  assert.ok(
    titleLower.startsWith("lentils vs chicken breast"),
    "lentils vs chicken title should lead with lentils vs chicken breast",
  );
  assert.ok(
    titleLower.indexOf("77.7g") < titleLower.indexOf("24.5g"),
    "lentils vs chicken title should put dry brown lentils (77.7g) before chicken breast (24.5g)",
  );
  assert.match(page.title, /77\.7g/);
  assert.match(page.title, /24\.5g/);
  assert.match(page.title, /Protein per Dollar/);
  assert.equal(
    /^lentils vs chicken breast: which is cheaper protein\?$/.test(titleLower),
    false,
    "lentils vs chicken title should not stay on the soft question SERP",
  );
});

test("eggs vs Greek yogurt title puts protein-per-dollar grams in the SERP", () => {
  const page = articleFrontmatter("eggs-vs-greek-yogurt-protein-cost");
  const titleLower = page.title.toLowerCase();

  assert.equal(
    page.title,
    "Eggs vs Greek Yogurt: 34.4g vs 27.5g Protein per Dollar",
  );
  assert.equal(page.title.length, 55);
  assert.ok(
    page.title.length <= 60,
    `eggs vs Greek yogurt title should be ≤60 chars, got ${page.title.length}`,
  );
  assert.ok(
    titleLower.startsWith("eggs vs greek yogurt"),
    "eggs vs Greek yogurt title should lead with eggs vs greek yogurt",
  );
  assert.ok(
    titleLower.indexOf("34.4g") < titleLower.indexOf("27.5g"),
    "eggs vs Greek yogurt title should put eggs (34.4g) before Greek yogurt (27.5g)",
  );
  assert.match(page.title, /34\.4g/);
  assert.match(page.title, /27\.5g/);
  assert.match(page.title, /Protein per Dollar/);
  assert.equal(
    /^eggs vs greek yogurt: which is cheaper protein\?$/.test(titleLower),
    false,
    "eggs vs Greek yogurt title should not stay on the soft question SERP",
  );
});

test("peanut butter vs almonds title puts protein-per-dollar grams in the SERP", () => {
  const page = articleFrontmatter("peanut-butter-vs-almonds-protein-cost");
  const titleLower = page.title.toLowerCase();

  assert.equal(
    page.title,
    "Peanut Butter vs Almonds: 50.7g vs 14.8g Protein per Dollar",
  );
  assert.equal(page.title.length, 59);
  assert.ok(
    page.title.length <= 60,
    `peanut butter vs almonds title should be ≤60 chars, got ${page.title.length}`,
  );
  assert.ok(
    titleLower.startsWith("peanut butter vs almonds"),
    "peanut butter vs almonds title should lead with peanut butter vs almonds",
  );
  assert.ok(
    titleLower.indexOf("50.7g") < titleLower.indexOf("14.8g"),
    "peanut butter vs almonds title should put peanut butter (50.7g) before almonds (14.8g)",
  );
  assert.match(page.title, /50\.7g/);
  assert.match(page.title, /14\.8g/);
  assert.match(page.title, /Protein per Dollar/);
  assert.equal(
    /^peanut butter vs almonds: which is cheaper protein\?$/.test(titleLower),
    false,
    "peanut butter vs almonds title should not stay on the soft question SERP",
  );
});

test("tofu vs chicken title puts protein-per-dollar grams in the SERP", () => {
  const page = articleFrontmatter("tofu-vs-chicken-protein-cost");
  const titleLower = page.title.toLowerCase();

  assert.equal(
    page.title,
    "Tofu vs Chicken: 13.6g vs 24.5g Protein per Dollar",
  );
  assert.equal(page.title.length, 50);
  assert.ok(
    page.title.length <= 60,
    `tofu vs chicken title should be ≤60 chars, got ${page.title.length}`,
  );
  assert.ok(
    titleLower.startsWith("tofu vs chicken"),
    "tofu vs chicken title should lead with tofu vs chicken",
  );
  assert.ok(
    titleLower.indexOf("13.6g") < titleLower.indexOf("24.5g"),
    "tofu vs chicken title should put extra firm tofu (13.6g) before chicken breast (24.5g)",
  );
  assert.match(page.title, /13\.6g/);
  assert.match(page.title, /24\.5g/);
  assert.match(page.title, /Protein per Dollar/);
  assert.equal(
    /^tofu vs chicken: which is cheaper protein\?$/.test(titleLower),
    false,
    "tofu vs chicken title should not stay on the soft question SERP",
  );
});

test("chicken thighs vs breast title puts protein-per-dollar grams in the SERP", () => {
  const page = articleFrontmatter("chicken-thighs-vs-breast-protein-cost");
  const titleLower = page.title.toLowerCase();

  assert.equal(
    page.title,
    "Chicken Thighs vs Breast: 50.3g vs 24.5g Protein per Dollar",
  );
  assert.equal(page.title.length, 59);
  assert.ok(
    page.title.length <= 60,
    `chicken thighs vs breast title should be ≤60 chars, got ${page.title.length}`,
  );
  assert.ok(
    titleLower.startsWith("chicken thighs vs breast"),
    "chicken thighs vs breast title should lead with chicken thighs vs breast",
  );
  assert.ok(
    titleLower.indexOf("50.3g") < titleLower.indexOf("24.5g"),
    "chicken thighs vs breast title should put drumsticks (50.3g) before breast (24.5g)",
  );
  assert.match(page.title, /50\.3g/);
  assert.match(page.title, /24\.5g/);
  assert.match(page.title, /Protein per Dollar/);
  assert.equal(
    /^chicken thighs vs breast: which is cheaper protein\?$/.test(titleLower),
    false,
    "chicken thighs vs breast title should not stay on the soft question SERP",
  );
});

test("frozen vs fresh vegetables title puts fiber-per-dollar grams in the SERP", () => {
  const page = articleFrontmatter("frozen-vs-fresh-vegetables-fiber-cost");
  const titleLower = page.title.toLowerCase();

  assert.equal(
    page.title,
    "Frozen vs Fresh Vegetables: 17.6g vs 6.1g Fiber per Dollar",
  );
  assert.equal(page.title.length, 58);
  assert.ok(
    page.title.length <= 60,
    `frozen vs fresh vegetables title should be ≤60 chars, got ${page.title.length}`,
  );
  assert.ok(
    titleLower.startsWith("frozen vs fresh vegetables"),
    "frozen vs fresh vegetables title should lead with frozen vs fresh vegetables",
  );
  assert.ok(
    titleLower.indexOf("17.6g") < titleLower.indexOf("6.1g"),
    "frozen vs fresh vegetables title should put frozen green peas (17.6g) before fresh broccoli crowns (6.1g)",
  );
  assert.match(page.title, /17\.6g/);
  assert.match(page.title, /6\.1g/);
  assert.match(page.title, /Fiber per Dollar/);
  assert.equal(
    /^frozen vs fresh vegetables: fiber per dollar compared$/.test(titleLower),
    false,
    "frozen vs fresh vegetables title should not stay on the gram-free compared SERP",
  );
});

test("dairy protein ranking title puts protein-per-dollar grams in the SERP", () => {
  const page = articleFrontmatter("dairy-protein-per-dollar-ranked");
  const titleLower = page.title.toLowerCase();

  assert.equal(
    page.title,
    "Cheapest Dairy Protein: Milk 29.1g vs Yogurt 27.5g per $",
  );
  assert.equal(page.title.length, 56);
  assert.ok(
    page.title.length <= 60,
    `dairy protein ranking title should be ≤60 chars, got ${page.title.length}`,
  );
  assert.ok(
    titleLower.startsWith("cheapest dairy protein"),
    "dairy protein ranking title should lead with cheapest dairy protein",
  );
  assert.ok(
    titleLower.indexOf("29.1g") < titleLower.indexOf("27.5g"),
    "dairy protein ranking title should put whole milk (29.1g) before Greek yogurt (27.5g)",
  );
  assert.match(page.title, /29\.1g/);
  assert.match(page.title, /27\.5g/);
  assert.match(page.title, /per \$/);
  assert.equal(
    /^the cheapest dairy protein: milk beats greek yogurt$/.test(titleLower),
    false,
    "dairy protein ranking title should not stay on the soft milk-beats-yogurt SERP",
  );
});

test("meat protein ranking title puts protein-per-dollar grams in the SERP", () => {
  const page = articleFrontmatter("meat-per-dollar-protein-ranked");
  const titleLower = page.title.toLowerCase();

  assert.equal(
    page.title,
    "Cheapest Meat Protein: Drumsticks 50.3g vs Breast 24.5g",
  );
  assert.equal(page.title.length, 55);
  assert.ok(
    page.title.length <= 60,
    `meat protein ranking title should be ≤60 chars, got ${page.title.length}`,
  );
  assert.ok(
    titleLower.startsWith("cheapest meat protein"),
    "meat protein ranking title should lead with cheapest meat protein",
  );
  assert.ok(
    titleLower.indexOf("50.3g") < titleLower.indexOf("24.5g"),
    "meat protein ranking title should put drumsticks (50.3g) before chicken breast (24.5g)",
  );
  assert.match(page.title, /50\.3g/);
  assert.match(page.title, /24\.5g/);
  assert.equal(
    /^the cheapest meat for protein \(it isn't chicken breast\)$/.test(titleLower),
    false,
    "meat protein ranking title should not stay on the soft chicken-breast SERP",
  );
});

test("plant protein ranking title puts protein-per-dollar grams in the SERP", () => {
  const page = articleFrontmatter("plant-protein-per-dollar-ranked");
  const titleLower = page.title.toLowerCase();

  assert.equal(
    page.title,
    "Cheapest Plant Protein: Pinto 97.9g vs Black Beans 81.0g",
  );
  assert.equal(page.title.length, 56);
  assert.ok(
    page.title.length <= 60,
    `plant protein ranking title should be ≤60 chars, got ${page.title.length}`,
  );
  assert.ok(
    titleLower.startsWith("cheapest plant protein"),
    "plant protein ranking title should lead with cheapest plant protein",
  );
  assert.ok(
    titleLower.indexOf("97.9g") < titleLower.indexOf("81.0g"),
    "plant protein ranking title should put dry pinto beans (97.9g) before dry black beans (81.0g)",
  );
  assert.match(page.title, /97\.9g/);
  assert.match(page.title, /81\.0g/);
  assert.equal(
    /^the cheapest plant protein: 18 sources ranked$/.test(titleLower),
    false,
    "plant protein ranking title should not stay on the soft 18-sources SERP",
  );
});

test("complete protein pairs title puts rice-and-beans grams per dollar in the SERP", () => {
  const page = articleFrontmatter("cheapest-complete-protein-pairs");
  const titleLower = page.title.toLowerCase();

  assert.equal(
    page.title,
    "Cheapest Complete Protein: Rice & Beans 67.2g per Dollar",
  );
  assert.equal(page.title.length, 56);
  assert.ok(
    page.title.length <= 60,
    `complete protein pairs title should be ≤60 chars, got ${page.title.length}`,
  );
  assert.ok(
    titleLower.startsWith("cheapest complete protein"),
    "complete protein pairs title should lead with cheapest complete protein",
  );
  assert.match(page.title, /67\.2g/);
  assert.match(page.title, /per Dollar/);
  assert.equal(
    /^the cheapest complete protein: rice and beans math$/.test(titleLower),
    false,
    "complete protein pairs title should not stay on the soft rice-and-beans-math SERP",
  );
});

test("one-dollar fiber title puts fiber grams per dollar in the SERP", () => {
  const page = articleFrontmatter("one-dollar-fiber-what-it-buys");
  const titleLower = page.title.toLowerCase();

  assert.equal(
    page.title,
    "Fiber for $1: Whole Wheat Flour 77.8g vs Split Peas 71.0g",
  );
  assert.equal(page.title.length, 57);
  assert.ok(
    page.title.length <= 60,
    `one-dollar fiber title should be ≤60 chars, got ${page.title.length}`,
  );
  assert.ok(
    titleLower.startsWith("fiber for $1"),
    "one-dollar fiber title should lead with fiber for $1",
  );
  assert.ok(
    titleLower.indexOf("77.8g") < titleLower.indexOf("71.0g"),
    "one-dollar fiber title should put whole wheat flour (77.8g) before green split peas (71.0g)",
  );
  assert.match(page.title, /77\.8g/);
  assert.match(page.title, /71\.0g/);
  assert.match(page.title, /Whole Wheat Flour/);
  assert.match(page.title, /Split Peas/);
  assert.equal(
    /^the cheapest fiber foods: what \$1 actually buys$/.test(titleLower),
    false,
    "one-dollar fiber title should not stay on the soft what-$1-actually-buys SERP",
  );
});

test("one-dollar protein title puts protein grams per dollar in the SERP", () => {
  const page = articleFrontmatter("one-dollar-protein-what-it-buys");
  const titleLower = page.title.toLowerCase();

  assert.equal(
    page.title,
    "Protein for $1: Pinto 97.9g vs Whole Wheat Flour 96.0g",
  );
  assert.equal(page.title.length, 54);
  assert.ok(
    page.title.length <= 60,
    `one-dollar protein title should be ≤60 chars, got ${page.title.length}`,
  );
  assert.ok(
    titleLower.startsWith("protein for $1"),
    "one-dollar protein title should lead with protein for $1",
  );
  assert.ok(
    titleLower.indexOf("97.9g") < titleLower.indexOf("96.0g"),
    "one-dollar protein title should put dry pinto beans (97.9g) before whole wheat flour (96.0g)",
  );
  assert.match(page.title, /97\.9g/);
  assert.match(page.title, /96\.0g/);
  assert.match(page.title, /Whole Wheat Flour/);
  assert.equal(
    /^the cheapest protein foods: what \$1 actually buys$/.test(titleLower),
    false,
    "one-dollar protein title should not stay on the soft what-$1-actually-buys SERP",
  );
});

test("fiber per dollar ranking title puts fiber grams per dollar in the SERP", () => {
  const page = articleFrontmatter("fiber-per-dollar-cheapest-high-fiber-foods");
  const titleLower = page.title.toLowerCase();

  assert.equal(
    page.title,
    "Fiber per Dollar: Whole Wheat Flour 77.8g, Split Peas 71.0g",
  );
  assert.equal(page.title.length, 59);
  assert.ok(
    page.title.length <= 60,
    `fiber per dollar ranking title should be ≤60 chars, got ${page.title.length}`,
  );
  assert.ok(
    titleLower.startsWith("fiber per dollar"),
    "fiber per dollar ranking title should lead with fiber per dollar",
  );
  assert.ok(
    titleLower.indexOf("77.8g") < titleLower.indexOf("71.0g"),
    "fiber per dollar ranking title should put whole wheat flour (77.8g) before green split peas (71.0g)",
  );
  assert.match(page.title, /77\.8g/);
  assert.match(page.title, /71\.0g/);
  assert.match(page.title, /Whole Wheat Flour/);
  assert.match(page.title, /Split Peas/);
  assert.equal(
    /^fiber per dollar: the cheapest high-fiber foods, ranked$/.test(titleLower),
    false,
    "fiber per dollar ranking title should not stay on the soft cheapest-foods-ranked SERP",
  );
});

test("high-fiber snacks title puts fiber-per-dollar grams in the SERP", () => {
  const page = articleFrontmatter("high-fiber-snacks-per-dollar");
  const titleLower = page.title.toLowerCase();

  assert.equal(
    page.title,
    "High-Fiber Snacks per $: Popcorn 51.3g vs Carrots 16.1g",
  );
  assert.equal(page.title.length, 55);
  assert.ok(
    page.title.length <= 60,
    `high-fiber snacks title should be ≤60 chars, got ${page.title.length}`,
  );
  assert.ok(
    titleLower.startsWith("high-fiber snacks per $"),
    "high-fiber snacks title should lead with high-fiber snacks per $",
  );
  assert.ok(
    titleLower.indexOf("51.3g") < titleLower.indexOf("16.1g"),
    "high-fiber snacks title should put popcorn (51.3g) before carrots (16.1g)",
  );
  assert.match(page.title, /51\.3g/);
  assert.match(page.title, /16\.1g/);
  assert.match(page.title, /Popcorn/);
  assert.match(page.title, /Carrots/);
  assert.equal(
    /^cheap high-fiber snacks that actually fill you up$/.test(titleLower),
    false,
    "high-fiber snacks title should not stay on the soft fill-you-up SERP",
  );
});

test("grains fiber ranking title puts fiber-per-dollar grams in the SERP", () => {
  const page = articleFrontmatter("grains-fiber-per-dollar-ranked");
  const titleLower = page.title.toLowerCase();

  assert.equal(
    page.title,
    "Grains Fiber per $: Whole Wheat Flour 77.8g vs Barley 57.1g",
  );
  assert.equal(page.title.length, 59);
  assert.ok(
    page.title.length <= 60,
    `grains fiber ranking title should be ≤60 chars, got ${page.title.length}`,
  );
  assert.ok(
    titleLower.startsWith("grains fiber per $"),
    "grains fiber ranking title should lead with grains fiber per $",
  );
  assert.ok(
    titleLower.indexOf("77.8g") < titleLower.indexOf("57.1g"),
    "grains fiber ranking title should put whole wheat flour (77.8g) before pearled barley (57.1g)",
  );
  assert.match(page.title, /77\.8g/);
  assert.match(page.title, /57\.1g/);
  assert.match(page.title, /Whole Wheat Flour/);
  assert.match(page.title, /Barley/);
  assert.equal(
    /^the cheapest high-fiber grains, ranked by real cost$/.test(titleLower),
    false,
    "grains fiber ranking title should not stay on the soft ranked-by-real-cost SERP",
  );
});

test("protein per dollar ranking title puts protein grams per dollar in the SERP", () => {
  const page = articleFrontmatter("protein-per-dollar-cheapest-protein-sources");
  const titleLower = page.title.toLowerCase();

  assert.equal(
    page.title,
    "Protein per $: Whole Wheat Flour 96.0g vs Lentils 77.7g",
  );
  assert.equal(page.title.length, 55);
  assert.ok(
    page.title.length <= 60,
    `protein per dollar ranking title should be ≤60 chars, got ${page.title.length}`,
  );
  assert.ok(
    titleLower.startsWith("protein per $"),
    "protein per dollar ranking title should lead with protein per $",
  );
  assert.ok(
    titleLower.indexOf("96.0g") < titleLower.indexOf("77.7g"),
    "protein per dollar ranking title should put whole wheat flour (96.0g) before brown lentils (77.7g)",
  );
  assert.match(page.title, /96\.0g/);
  assert.match(page.title, /77\.7g/);
  assert.match(page.title, /Whole Wheat Flour/);
  assert.match(page.title, /Lentils/);
  assert.equal(
    /^protein per dollar: the cheapest protein sources, ranked$/.test(titleLower),
    false,
    "protein per dollar ranking title should not stay on the soft cheapest-sources-ranked SERP",
  );
});

test("produce fiber ranking title puts fiber-per-dollar grams in the SERP", () => {
  const page = articleFrontmatter("produce-fiber-per-dollar-ranked");
  const titleLower = page.title.toLowerCase();

  assert.equal(
    page.title,
    "Produce Fiber per $: Frozen Peas 17.6g vs Carrots 16.1g",
  );
  assert.equal(page.title.length, 55);
  assert.ok(
    page.title.length <= 60,
    `produce fiber ranking title should be ≤60 chars, got ${page.title.length}`,
  );
  assert.ok(
    titleLower.startsWith("produce fiber per $"),
    "produce fiber ranking title should lead with produce fiber per $",
  );
  assert.ok(
    titleLower.indexOf("17.6g") < titleLower.indexOf("16.1g"),
    "produce fiber ranking title should put frozen green peas (17.6g) before bagged carrots (16.1g)",
  );
  assert.match(page.title, /17\.6g/);
  assert.match(page.title, /16\.1g/);
  assert.match(page.title, /Frozen Peas/);
  assert.match(page.title, /Carrots/);
  assert.equal(
    /^the cheapest high-fiber vegetables and fruits, ranked$/.test(titleLower),
    false,
    "produce fiber ranking title should not stay on the soft ranked SERP",
  );
});

test("shelf-stable pantry title puts protein-per-dollar grams in the SERP", () => {
  const page = articleFrontmatter("shelf-stable-pantry-per-dollar");
  const titleLower = page.title.toLowerCase();

  assert.equal(
    page.title,
    "Shelf-Stable Protein per $: Pinto 97.9g vs Flour 96.0g",
  );
  assert.equal(page.title.length, 54);
  assert.ok(
    page.title.length <= 60,
    `shelf-stable pantry title should be ≤60 chars, got ${page.title.length}`,
  );
  assert.ok(
    titleLower.startsWith("shelf-stable protein per $"),
    "shelf-stable pantry title should lead with shelf-stable protein per $",
  );
  assert.ok(
    titleLower.indexOf("97.9g") < titleLower.indexOf("96.0g"),
    "shelf-stable pantry title should put dry pinto beans (97.9g) before whole wheat flour (96.0g)",
  );
  assert.match(page.title, /97\.9g/);
  assert.match(page.title, /96\.0g/);
  assert.match(page.title, /Pinto/);
  assert.match(page.title, /Flour/);
  assert.equal(
    /^cheap shelf-stable protein: 27 pantry foods ranked$/.test(titleLower),
    false,
    "shelf-stable pantry title should not stay on the soft 27-pantry-foods-ranked SERP",
  );
});

test("cheapest protein per gram title puts cost-per-gram dollars in the SERP", () => {
  const page = readFileSync(join(ROOT, "src/pages/cheapest-protein-per-gram.astro"), "utf8");
  const title = page.match(/const title = "([^"]+)"/)?.[1] ?? "";
  const description = page.match(/const description =\s*\n\s*"([^"]+)"/)?.[1] ?? "";
  const titleLower = title.toLowerCase();

  assert.equal(
    title,
    "Protein per Gram: Flour $0.0104 vs Lentils $0.0129",
  );
  assert.equal(title.length, 50);
  assert.ok(
    title.length <= 60,
    `cheapest protein per gram title should be ≤60 chars, got ${title.length}`,
  );
  assert.ok(
    titleLower.startsWith("protein per gram"),
    "cheapest protein per gram title should lead with protein per gram",
  );
  assert.ok(
    titleLower.indexOf("$0.0104") < titleLower.indexOf("$0.0129"),
    "cheapest protein per gram title should put whole wheat flour ($0.0104/g, 1.04¢) before brown lentils ($0.0129/g, 1.29¢)",
  );
  assert.match(title, /\$0\.0104/);
  assert.match(title, /\$0\.0129/);
  assert.match(title, /Flour/);
  assert.match(title, /Lentils/);
  assert.equal(
    /^cheapest protein per gram: 49 foods ranked \(july 2026 prices\)$/.test(titleLower),
    false,
    "cheapest protein per gram title should not stay on the soft 49-foods-ranked SERP",
  );
  assert.equal(
    description,
    "The cheapest protein per gram and per pound, ranked across 49 foods at real July 2026 US grocery prices. USDA nutrition, audited prices, free CSV download.",
  );
  assert.match(page, /const PATH = "\/cheapest-protein-per-gram\/"/);
});

test("no-cook protein title puts protein-per-dollar grams in the SERP", () => {
  const page = articleFrontmatter("no-cook-protein-per-dollar");
  const titleLower = page.title.toLowerCase();

  assert.equal(
    page.title,
    "No-Cook Protein per $: PB 50.7g vs Peanuts 39.8g",
  );
  assert.equal(page.title.length, 48);
  assert.ok(
    page.title.length <= 60,
    `no-cook protein title should be ≤60 chars, got ${page.title.length}`,
  );
  assert.ok(
    titleLower.startsWith("no-cook protein per $"),
    "no-cook protein title should lead with no-cook protein per $",
  );
  assert.ok(
    titleLower.indexOf("50.7g") < titleLower.indexOf("39.8g"),
    "no-cook protein title should put peanut butter (50.7g) before dry roasted peanuts (39.8g)",
  );
  assert.match(page.title, /50\.7g/);
  assert.match(page.title, /39\.8g/);
  assert.match(page.title, /PB/);
  assert.match(page.title, /Peanuts/);
  assert.equal(
    /^no-cook protein per dollar: cheapest options ranked$/.test(titleLower),
    false,
    "no-cook protein title should not stay on the soft cheapest-options-ranked SERP",
  );
});

test("chipotle protein per dollar title puts protein-per-dollar grams in the SERP", () => {
  const page = readFileSync(join(ROOT, "src/pages/chipotle-protein-per-dollar.astro"), "utf8");
  const title = page.match(/const title = "([^"]+)"/)?.[1] ?? "";
  const titleLower = title.toLowerCase();

  assert.equal(
    title,
    "Chipotle Protein per $: Protein Cup 8.4g vs Double Bowl 5.3g",
  );
  assert.equal(title.length, 60);
  assert.ok(
    title.length <= 60,
    `chipotle protein per dollar title should be ≤60 chars, got ${title.length}`,
  );
  assert.ok(
    titleLower.startsWith("chipotle protein per $"),
    "chipotle protein per dollar title should lead with chipotle protein per $",
  );
  assert.ok(
    titleLower.indexOf("8.4g") < titleLower.indexOf("5.3g"),
    "chipotle protein per dollar title should put the High Protein Cup (8.4g per $) before the Double Chicken Burrito Bowl (5.3g per $)",
  );
  assert.match(title, /8\.4g/);
  assert.match(title, /5\.3g/);
  assert.match(title, /Protein Cup/);
  assert.match(title, /Double Bowl/);
  assert.equal(
    /^chipotle protein per dollar: 4 orders ranked \(2026 prices\)$/.test(titleLower),
    false,
    "chipotle protein per dollar title should not stay on the soft orders-ranked SERP",
  );
  assert.match(
    page,
    /Chipotle's \$\{cup\.item\} is the best protein-per-dollar order in our whole fast food study at/,
  );
  assert.match(page, /Chipotle Protein per Dollar, Ranked/);
  assert.equal(INDEX_KEEP_PATHS.has("chipotle-protein-per-dollar"), true);
  assert.equal(INDEX_PRUNE_SLUGS.has("chipotle-protein-per-dollar"), false);
});

test("mcdonald's protein per dollar title puts protein-per-dollar grams in the SERP", () => {
  const page = readFileSync(join(ROOT, "src/pages/mcdonalds-protein-per-dollar.astro"), "utf8");
  const title = page.match(/const title = "([^"]+)"/)?.[1] ?? "";
  const titleLower = title.toLowerCase();

  assert.equal(
    title,
    "McDonald's Protein per $: Double QP 5.9g vs McDouble 5.5g",
  );
  assert.equal(title.length, 57);
  assert.ok(
    title.length <= 60,
    `mcdonald's protein per dollar title should be ≤60 chars, got ${title.length}`,
  );
  assert.ok(
    titleLower.startsWith("mcdonald's protein per $"),
    "mcdonald's protein per dollar title should lead with mcdonald's protein per $",
  );
  assert.ok(
    titleLower.indexOf("5.9g") < titleLower.indexOf("5.5g"),
    "mcdonald's protein per dollar title should put the Double Quarter Pounder with Cheese (5.9g per $) before the McDouble (5.5g per $)",
  );
  assert.match(title, /5\.9g/);
  assert.match(title, /5\.5g/);
  assert.match(title, /Double QP/);
  assert.match(title, /McDouble/);
  assert.equal(
    /^mcdonald's protein per dollar: 6 items ranked \(july 2026 prices\)$/.test(titleLower),
    false,
    "mcdonald's protein per dollar title should not stay on the soft items-ranked SERP",
  );
  assert.match(
    page,
    /Every McDonald's item we priced, ranked by grams of protein per dollar\. The \$\{best\.item\} wins at/,
  );
  assert.match(page, /McDonald's Protein per Dollar, Ranked/);
  assert.equal(INDEX_KEEP_PATHS.has("mcdonalds-protein-per-dollar"), true);
  assert.equal(INDEX_PRUNE_SLUGS.has("mcdonalds-protein-per-dollar"), false);
});

test("kfc protein per dollar title puts protein-per-dollar grams in the SERP", () => {
  const page = readFileSync(join(ROOT, "src/pages/kfc-protein-per-dollar.astro"), "utf8");
  const title = page.match(/const title = "([^"]+)"/)?.[1] ?? "";
  const titleLower = title.toLowerCase();

  assert.equal(
    title,
    "KFC Protein per $: Chicken Breast 7.6g vs 8pc Bucket 7.3g",
  );
  assert.equal(title.length, 57);
  assert.ok(
    title.length <= 60,
    `kfc protein per dollar title should be ≤60 chars, got ${title.length}`,
  );
  assert.ok(
    titleLower.startsWith("kfc protein per $"),
    "kfc protein per dollar title should lead with kfc protein per $",
  );
  assert.ok(
    titleLower.indexOf("7.6g") < titleLower.indexOf("7.3g"),
    "kfc protein per dollar title should put the Original Recipe Chicken Breast (7.6g per $) before the 8 pc Bucket (7.3g per $)",
  );
  assert.match(title, /7\.6g/);
  assert.match(title, /7\.3g/);
  assert.match(title, /Chicken Breast/);
  assert.match(title, /8pc Bucket/);
  assert.equal(
    /^kfc protein per dollar: 5 items ranked \(2026 prices\)$/.test(titleLower),
    false,
    "kfc protein per dollar title should not stay on the soft items-ranked SERP",
  );
  assert.match(
    page,
    /Every KFC item we priced, ranked by grams of protein per dollar\. The \$\{best\.item\} leads at/,
  );
  assert.match(page, /KFC Protein per Dollar, Ranked/);
  assert.equal(INDEX_KEEP_PATHS.has("kfc-protein-per-dollar"), true);
  assert.equal(INDEX_PRUNE_SLUGS.has("kfc-protein-per-dollar"), false);
});

test("taco bell protein per dollar title puts protein-per-dollar grams in the SERP", () => {
  const page = readFileSync(join(ROOT, "src/pages/taco-bell-protein-per-dollar.astro"), "utf8");
  const title = page.match(/const title = "([^"]+)"/)?.[1] ?? "";
  const titleLower = title.toLowerCase();

  assert.equal(
    title,
    "Taco Bell Protein per $: Cheesy Bean 5.7g vs Bean Burrito 5.2g",
  );
  assert.equal(title.length, 62);
  assert.ok(
    title.length <= 62,
    `taco bell protein per dollar title should be ≤62 chars, got ${title.length}`,
  );
  assert.ok(
    titleLower.startsWith("taco bell protein per $"),
    "taco bell protein per dollar title should lead with taco bell protein per $",
  );
  assert.ok(
    titleLower.indexOf("5.7g") < titleLower.indexOf("5.2g"),
    "taco bell protein per dollar title should put the Cheesy Bean and Rice Burrito (5.7g per $) before the Bean Burrito (5.2g per $)",
  );
  assert.match(title, /5\.7g/);
  assert.match(title, /5\.2g/);
  assert.match(title, /Cheesy Bean/);
  assert.match(title, /Bean Burrito/);
  assert.equal(
    /^taco bell protein per dollar: 5 items ranked \(april 2026 prices\)$/.test(titleLower),
    false,
    "taco bell protein per dollar title should not stay on the soft items-ranked SERP",
  );
  assert.match(
    page,
    /Every Taco Bell item we priced, ranked by grams of protein per dollar\. The \$\{best\.item\} leads at/,
  );
  assert.match(page, /Taco Bell Protein per Dollar, Ranked/);
  assert.equal(INDEX_KEEP_PATHS.has("taco-bell-protein-per-dollar"), true);
  assert.equal(INDEX_PRUNE_SLUGS.has("taco-bell-protein-per-dollar"), false);
});

test("wendys protein per dollar title puts protein-per-dollar grams in the SERP", () => {
  const page = readFileSync(join(ROOT, "src/pages/wendys-protein-per-dollar.astro"), "utf8");
  const title = page.match(/const title = "([^"]+)"/)?.[1] ?? "";
  const titleLower = title.toLowerCase();

  assert.equal(
    title,
    "Wendy's Protein per $: Jr. Bacon 6.2g vs Spicy Chicken 5.7g",
  );
  assert.equal(title.length, 59);
  assert.ok(
    title.length <= 62,
    `wendys protein per dollar title should be ≤62 chars, got ${title.length}`,
  );
  assert.ok(
    titleLower.startsWith("wendy's protein per $"),
    "wendys protein per dollar title should lead with wendy's protein per $",
  );
  assert.ok(
    titleLower.indexOf("6.2g") < titleLower.indexOf("5.7g"),
    "wendys protein per dollar title should put the Jr. Bacon Cheeseburger (6.2g per $) before the Spicy Chicken Sandwich (5.7g per $)",
  );
  assert.match(title, /6\.2g/);
  assert.match(title, /5\.7g/);
  assert.match(title, /Jr\. Bacon/);
  assert.match(title, /Spicy Chicken/);
  assert.equal(
    /^wendy's protein per dollar: 4 items ranked \(july 2026 prices\)$/.test(titleLower),
    false,
    "wendys protein per dollar title should not stay on the soft items-ranked SERP",
  );
  assert.match(
    page,
    /Every Wendy's item we priced, ranked by grams of protein per dollar, from the \$\{best\.item\} at/,
  );
  assert.match(page, /Wendy's Protein per Dollar, Ranked/);
  assert.equal(INDEX_KEEP_PATHS.has("wendys-protein-per-dollar"), true);
  assert.equal(INDEX_PRUNE_SLUGS.has("wendys-protein-per-dollar"), false);
});

test("high protein on a budget title puts protein-per-dollar grams in the SERP", () => {
  const page = articleFrontmatter("high-protein-on-a-budget-complete-guide");
  const titleLower = page.title.toLowerCase();

  assert.equal(
    page.title,
    "High Protein on a Budget: Pinto 97.9g vs Bacon 9.2g",
  );
  assert.equal(page.title.length, 51);
  assert.ok(
    page.title.length <= 60,
    `high protein on a budget title should be ≤60 chars, got ${page.title.length}`,
  );
  assert.ok(
    titleLower.startsWith("high protein on a budget"),
    "high protein on a budget title should lead with high protein on a budget",
  );
  assert.ok(
    titleLower.indexOf("97.9g") < titleLower.indexOf("9.2g"),
    "high protein on a budget title should put dry pinto beans (97.9g per $) before bacon (9.2g per $)",
  );
  assert.match(page.title, /97\.9g/);
  assert.match(page.title, /9\.2g/);
  assert.match(page.title, /Pinto/);
  assert.match(page.title, /Bacon/);
  assert.equal(
    /^high protein on a budget: the complete guide$/.test(titleLower),
    false,
    "high protein on a budget title should not stay on the soft complete-guide SERP",
  );
  assert.equal(INDEX_KEEP_PATHS.has("high-protein-on-a-budget-complete-guide"), true);
  assert.equal(INDEX_PRUNE_SLUGS.has("high-protein-on-a-budget-complete-guide"), false);
});

test("fiber on a budget title puts fiber-per-dollar grams in the SERP", () => {
  const page = articleFrontmatter("how-to-eat-more-fiber-on-a-budget-complete-guide");
  const titleLower = page.title.toLowerCase();

  assert.equal(
    page.title,
    "Fiber on a Budget: Flour 77.8g vs Split Peas 71.0g",
  );
  assert.equal(page.title.length, 50);
  assert.ok(
    page.title.length <= 60,
    `fiber on a budget title should be ≤60 chars, got ${page.title.length}`,
  );
  assert.ok(
    titleLower.startsWith("fiber on a budget"),
    "fiber on a budget title should lead with fiber on a budget",
  );
  assert.ok(
    titleLower.indexOf("77.8g") < titleLower.indexOf("71.0g"),
    "fiber on a budget title should put whole wheat flour (77.8g per $) before dry green split peas (71.0g per $)",
  );
  assert.match(page.title, /77\.8g/);
  assert.match(page.title, /71\.0g/);
  assert.match(page.title, /Flour/);
  assert.match(page.title, /Split Peas/);
  assert.equal(
    /^how to eat more fiber on a budget: the complete guide$/.test(titleLower),
    false,
    "fiber on a budget title should not stay on the soft complete-guide SERP",
  );
  assert.equal(INDEX_KEEP_PATHS.has("how-to-eat-more-fiber-on-a-budget-complete-guide"), true);
  assert.equal(INDEX_PRUNE_SLUGS.has("how-to-eat-more-fiber-on-a-budget-complete-guide"), false);
});

test("plant-based protein sources title puts protein-per-dollar grams in the SERP", () => {
  const raw = readFileSync(
    join(ROOT, "src/data/articles/plant-based-protein-sources-complete-guide.md"),
    "utf8",
  );
  const title = raw.match(/^title:\s*"([^"]+)"/m)?.[1];
  assert.ok(title, "plant-based protein sources is missing a quoted title");
  const titleLower = title.toLowerCase();

  assert.equal(
    title,
    "Plant-Based Protein: Pinto 97.9g vs Tempeh 13.2g",
  );
  assert.equal(title.length, 48);
  assert.ok(
    title.length <= 60,
    `plant-based protein title should be ≤60 chars, got ${title.length}`,
  );
  assert.ok(
    titleLower.startsWith("plant-based protein"),
    "plant-based protein title should lead with plant-based protein",
  );
  assert.ok(
    titleLower.indexOf("97.9g") < titleLower.indexOf("13.2g"),
    "plant-based protein title should put dry pinto beans (97.9g per $) before tempeh (13.2g per $)",
  );
  assert.match(title, /97\.9g/);
  assert.match(title, /13\.2g/);
  assert.match(title, /Pinto/);
  assert.match(title, /Tempeh/);
  assert.equal(
    /^plant-based protein sources: a complete guide$/.test(titleLower),
    false,
    "plant-based protein title should not stay on the soft complete-guide SERP",
  );
  assert.equal(INDEX_KEEP_PATHS.has("plant-based-protein-sources-complete-guide"), true);
  assert.equal(INDEX_PRUNE_SLUGS.has("plant-based-protein-sources-complete-guide"), false);
});

test("eat healthy on a budget title puts protein-per-dollar grams in the SERP", () => {
  const page = articleFrontmatter("eat-healthy-on-a-budget-complete-playbook");
  const titleLower = page.title.toLowerCase();

  assert.equal(
    page.title,
    "Eat Healthy on a Budget: Pinto 97.9g vs Bacon 9.2g",
  );
  assert.equal(page.title.length, 50);
  assert.ok(
    page.title.length <= 60,
    `eat healthy on a budget title should be ≤60 chars, got ${page.title.length}`,
  );
  assert.ok(
    titleLower.startsWith("eat healthy on a budget"),
    "eat healthy on a budget title should lead with eat healthy on a budget",
  );
  assert.ok(
    titleLower.indexOf("97.9g") < titleLower.indexOf("9.2g"),
    "eat healthy on a budget title should put dry pinto beans (97.9g per $) before bacon (9.2g per $)",
  );
  assert.match(page.title, /97\.9g/);
  assert.match(page.title, /9\.2g/);
  assert.match(page.title, /Pinto/);
  assert.match(page.title, /Bacon/);
  assert.equal(
    /^how to eat healthy on a budget: the complete playbook$/.test(titleLower),
    false,
    "eat healthy on a budget title should not stay on the soft complete-playbook SERP",
  );
  assert.equal(INDEX_KEEP_PATHS.has("eat-healthy-on-a-budget-complete-playbook"), true);
  assert.equal(INDEX_PRUNE_SLUGS.has("eat-healthy-on-a-budget-complete-playbook"), false);
});

test("usda thrifty food plan title puts the family weekly cost in the SERP", () => {
  const page = articleFrontmatter("usda-thrifty-food-plan-weekly-cost");
  const titleLower = page.title.toLowerCase();

  assert.equal(
    page.title,
    "USDA Thrifty Plan: Family of 4 ≈ $235/week",
  );
  assert.equal(page.title.length, 42);
  assert.ok(
    page.title.length <= 60,
    `usda thrifty food plan title should be ≤60 chars, got ${page.title.length}`,
  );
  assert.ok(
    titleLower.startsWith("usda thrifty plan"),
    "usda thrifty food plan title should lead with usda thrifty plan",
  );
  assert.match(page.title, /Family of 4/);
  assert.match(page.title, /\$235\/week/);
  assert.equal(
    /^grocery budget for a family of 4: what usda says$/.test(titleLower),
    false,
    "usda thrifty food plan title should not stay on the soft grocery-budget SERP",
  );
  assert.equal(INDEX_KEEP_PATHS.has("usda-thrifty-food-plan-weekly-cost"), true);
  assert.equal(INDEX_PRUNE_SLUGS.has("usda-thrifty-food-plan-weekly-cost"), false);
});

test("meal prep for beginners title puts the 8-meal 90-minute system in the SERP", () => {
  const page = articleFrontmatter("meal-prep-for-beginners-complete-system");
  const titleLower = page.title.toLowerCase();

  assert.equal(
    page.title,
    "Meal Prep for Beginners: 8 Meals in 90 Minutes",
  );
  assert.equal(page.title.length, 46);
  assert.ok(
    page.title.length <= 60,
    `meal prep for beginners title should be ≤60 chars, got ${page.title.length}`,
  );
  assert.ok(
    titleLower.startsWith("meal prep for beginners"),
    "meal prep for beginners title should lead with meal prep for beginners",
  );
  assert.ok(
    titleLower.indexOf("8 meals") < titleLower.indexOf("90 minutes"),
    "meal prep for beginners title should put the eight-meal count before the 90-minute session",
  );
  assert.match(page.title, /8 Meals/);
  assert.match(page.title, /90 Minutes/);
  assert.equal(
    /^meal prep for beginners: the complete system$/.test(titleLower),
    false,
    "meal prep for beginners title should not stay on the soft complete-system SERP",
  );
  assert.equal(INDEX_KEEP_PATHS.has("meal-prep-for-beginners-complete-system"), true);
  assert.equal(INDEX_PRUNE_SLUGS.has("meal-prep-for-beginners-complete-system"), false);
});

test("dried beans converter title puts the 15.5 oz can size in the SERP", () => {
  const page = readFileSync(
    join(ROOT, "src/pages/tools/dried-beans-to-canned-converter/index.astro"),
    "utf8",
  );
  const title = page.match(/const title = "([^"]+)"/)?.[1] ?? "";
  const titleLower = title.toLowerCase();

  assert.equal(title, "How Many Dried Beans Equal a 15.5 oz Can?");
  assert.equal(title.length, 41);
  assert.ok(
    title.length <= 60,
    `dried beans converter title should be ≤60 chars, got ${title.length}`,
  );
  assert.ok(
    titleLower.startsWith("how many dried beans"),
    "dried beans converter title should lead with how many dried beans",
  );
  assert.match(title, /15\.5 oz/);
  assert.match(title, /Equal/);
  assert.equal(
    /^how many dried beans equal a can\? converter \+ cost$/.test(titleLower),
    false,
    "dried beans converter title should not stay on the soft converter-plus-cost SERP",
  );
  assert.match(
    page,
    /how many grams or cups of dry beans replace a 15\.5 oz can/,
  );
  assert.match(page, /One 15\.5 oz can replaced by each dry legume/);
  assert.match(page, /const PATH = "\/tools\/dried-beans-to-canned-converter\/"/);
  assert.equal(INDEX_KEEP_PATHS.has("tools/dried-beans-to-canned-converter"), true);
  assert.equal(INDEX_PRUNE_SLUGS.has("tools/dried-beans-to-canned-converter"), false);
  assert.equal(INDEX_PRUNE_SLUGS.has("dried-beans-to-canned-converter"), false);
});

test("grocery trip calculator title puts the sample cash savings in the SERP", () => {
  const page = readFileSync(
    join(ROOT, "src/pages/tools/grocery-trip-savings-calculator/index.astro"),
    "utf8",
  );
  const title = page.match(/const title = "([^"]+)"/)?.[1] ?? "";
  const titleLower = title.toLowerCase();
  const input = (id) => Number(page.match(new RegExp(`id="${id}"[^>]*value="([^"]+)"`))?.[1]);
  const savings = input("trip-savings");
  const miles = input("trip-miles");
  const mpg = input("trip-mpg");
  const gas = input("trip-gas");
  const fees = input("trip-fees");
  const timeValue = input("trip-time-value");
  const fuel = (miles / mpg) * gas;
  const cashNet = savings - fuel - fees;

  assert.equal(savings, 18);
  assert.equal(miles, 16);
  assert.equal(mpg, 28);
  assert.equal(gas, 3.5);
  assert.equal(fees, 0);
  assert.equal(timeValue, 0);
  assert.equal(fuel, 2);
  assert.equal(cashNet, 16);
  assert.equal(
    title,
    "Is Driving to a Cheaper Grocery Store Worth It? Save $16",
  );
  assert.equal(title.length, 56);
  assert.ok(
    title.length <= 60,
    `grocery trip calculator title should be ≤60 chars, got ${title.length}`,
  );
  assert.ok(
    titleLower.startsWith("is driving to a cheaper grocery store worth it"),
    "grocery trip calculator title should lead with the driving-to-a-cheaper-store query",
  );
  assert.match(title, /Save \$16/);
  assert.equal(
    /^is driving to a cheaper grocery store worth it\? calculator$/.test(titleLower),
    false,
    "grocery trip calculator title should not stay on the soft calculator SERP",
  );
  assert.match(
    page,
    /<h1[^>]*>Is Driving to a Cheaper Grocery Store Worth It\?<\/h1>/,
  );
  assert.match(page, /a \$9 discount loses some swagger after a 50-minute detour/);
  assert.equal(
    page.match(/const description = "([^"]+)"/)?.[1],
    "Compare grocery savings with gas, parking, transit, and travel time. See the real break-even savings before making the extra trip.",
  );
  assert.equal(INDEX_KEEP_PATHS.has("tools/grocery-trip-savings-calculator"), true);
  assert.equal(INDEX_PRUNE_SLUGS.has("tools/grocery-trip-savings-calculator"), false);
  assert.equal(INDEX_PRUNE_SLUGS.has("grocery-trip-savings-calculator"), false);
});

test("recipe cost calculator title puts the $10.50 batch example in the SERP", () => {
  const page = readFileSync(
    join(ROOT, "src/pages/tools/recipe-cost-calculator/index.astro"),
    "utf8",
  );
  const title = page.match(/const title = "([^"]+)"/)?.[1] ?? "";
  const titleLower = title.toLowerCase();

  assert.equal(title, "Recipe Cost Calculator: $10.50 per Batch");
  assert.equal(title.length, 40);
  assert.ok(
    title.length <= 60,
    `recipe cost calculator title should be ≤60 chars, got ${title.length}`,
  );
  assert.ok(
    titleLower.startsWith("recipe cost calculator"),
    "recipe cost calculator title should lead with recipe cost calculator",
  );
  assert.match(title, /\$10\.50/);
  assert.match(title, /per Batch/);
  assert.equal(
    /^recipe cost calculator: cost per batch and serving$/.test(titleLower),
    false,
    "recipe cost calculator title should not stay on the soft cost-per-batch-and-serving SERP",
  );
  assert.match(
    page,
    /A \$10 subtotal with a 5% buffer becomes \$10\.50\./,
  );
  assert.match(page, /<h1[^>]*>What Did That Recipe Actually Cost\?<\/h1>/);
  assert.match(
    page,
    /https:\/\/www\.daily-life-hacks\.com\/tools\/recipe-cost-calculator\//,
  );
  assert.equal(INDEX_KEEP_PATHS.has("tools/recipe-cost-calculator"), true);
  assert.equal(INDEX_PRUNE_SLUGS.has("tools/recipe-cost-calculator"), false);
  assert.equal(INDEX_PRUNE_SLUGS.has("recipe-cost-calculator"), false);
});

test("recipe finder title puts the searchable recipe count in the SERP", () => {
  const page = readFileSync(join(ROOT, "src/pages/tools/recipe-finder/index.astro"), "utf8");
  const title = page.match(/const title = "([^"]+)"/)?.[1] ?? "";
  const titleLower = title.toLowerCase();
  const now = Date.now();
  let count = 0;
  for (const file of readdirSync(join(ROOT, "src/data/articles"))) {
    if (!file.endsWith(".md")) continue;
    const raw = readFileSync(join(ROOT, "src/data/articles", file), "utf8");
    const fm = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1];
    if (!fm) continue;
    const category = fm.match(/^category:\s*"?([^"\n]+)"?/m)?.[1]?.trim();
    if (category !== "recipes") continue;
    const release = fm.match(/^publishAt:\s*(\d{4}-\d{2}-\d{2})/m)?.[1]
      ?? fm.match(/^date:\s*(\d{4}-\d{2}-\d{2})/m)?.[1];
    if (!release || Date.parse(`${release}T00:00:00.000Z`) > now) continue;
    const servings = Number(fm.match(/^servings:\s*"?(\d+(?:\.\d+)?)"?/m)?.[1]);
    if (!Number.isFinite(servings) || servings <= 0) continue;
    const lines = fm.split("\n");
    const start = lines.findIndex((line) => /^ingredients:\s*$/.test(line));
    let ingredients = 0;
    if (start !== -1) {
      for (let i = start + 1; i < lines.length; i++) {
        if (/^\s*-\s+\S/.test(lines[i])) {
          ingredients += 1;
          continue;
        }
        if (lines[i].trim() === "") continue;
        break;
      }
    }
    if (ingredients === 0) continue;
    count += 1;
  }

  assert.equal(count, 80);
  assert.equal(title, "Recipe Finder by Ingredients: 80 Recipes");
  assert.equal(title, `Recipe Finder by Ingredients: ${count} Recipes`);
  assert.equal(title.length, 40);
  assert.ok(
    title.length <= 60,
    `recipe finder title should be ≤60 chars, got ${title.length}`,
  );
  assert.ok(
    titleLower.startsWith("recipe finder by ingredients"),
    "recipe finder title should lead with recipe finder by ingredients",
  );
  assert.match(title, /80 Recipes/);
  assert.equal(
    /^recipe finder by ingredients: use what you have$/.test(titleLower),
    false,
    "recipe finder title should not stay on the soft use-what-you-have SERP",
  );
  assert.match(page, /\{recipes\.length\} real recipes/);
  assert.match(page, /It currently searches \$\{recipes\.length\} published recipes/);
  assert.match(page, /<h1[^>]*>You've Already Got Dinner\. Let's Find the Recipe\.<\/h1>/);
  assert.equal(
    page.match(/const description = "([^"]+)"/)?.[1],
    "Enter the ingredients you have and find published recipes ranked by overlap, with the missing groceries shown before you open the recipe.",
  );
  assert.equal(INDEX_KEEP_PATHS.has("tools/recipe-finder"), true);
  assert.equal(INDEX_PRUNE_SLUGS.has("tools/recipe-finder"), false);
  assert.equal(INDEX_PRUNE_SLUGS.has("recipe-finder"), false);
});

test("shopping list builder title puts the recipe count in the SERP", () => {
  const page = readFileSync(join(ROOT, "src/pages/tools/shopping-list-builder/index.astro"), "utf8");
  const title = page.match(/const title = "([^"]+)"/)?.[1] ?? "";
  const titleLower = title.toLowerCase();
  const now = Date.now();
  let count = 0;
  for (const file of readdirSync(join(ROOT, "src/data/articles"))) {
    if (!file.endsWith(".md")) continue;
    const raw = readFileSync(join(ROOT, "src/data/articles", file), "utf8");
    const fm = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1];
    if (!fm) continue;
    const category = fm.match(/^category:\s*"?([^"\n]+)"?/m)?.[1]?.trim();
    if (category !== "recipes") continue;
    const release = fm.match(/^publishAt:\s*(\d{4}-\d{2}-\d{2})/m)?.[1]
      ?? fm.match(/^date:\s*(\d{4}-\d{2}-\d{2})/m)?.[1];
    if (!release || Date.parse(`${release}T00:00:00.000Z`) > now) continue;
    const servings = Number(fm.match(/^servings:\s*"?(\d+(?:\.\d+)?)"?/m)?.[1]);
    if (!Number.isFinite(servings) || servings <= 0) continue;
    const lines = fm.split("\n");
    const start = lines.findIndex((line) => /^ingredients:\s*$/.test(line));
    let ingredients = 0;
    if (start !== -1) {
      for (let i = start + 1; i < lines.length; i++) {
        if (/^\s*-\s+\S/.test(lines[i])) {
          ingredients += 1;
          continue;
        }
        if (lines[i].trim() === "") continue;
        break;
      }
    }
    if (ingredients === 0) continue;
    count += 1;
  }

  assert.equal(count, 80);
  assert.equal(title, "Shopping List Builder: 80 Recipes, One List");
  assert.equal(title, `Shopping List Builder: ${count} Recipes, One List`);
  assert.equal(title.length, 43);
  assert.ok(
    title.length <= 60,
    `shopping list builder title should be ≤60 chars, got ${title.length}`,
  );
  assert.ok(
    titleLower.startsWith("shopping list builder"),
    "shopping list builder title should lead with shopping list builder",
  );
  assert.match(title, /80 Recipes/);
  assert.equal(
    /^multi-recipe shopping list builder: scale and combine ingredients$/.test(titleLower),
    false,
    "shopping list builder title should not stay on the soft scale-and-combine SERP",
  );
  assert.match(page, /\{recipes\.length\} real recipes\. One grocery list\./);
  assert.match(
    page,
    /Choose from \$\{recipes\.length\} recipes, change the servings, and combine their ingredients into one printable shopping list\./,
  );
  assert.match(page, /<h1[^>]*>Several Recipes\. One List\. Nobody Needs Five Notes\.<\/h1>/);
  assert.equal(INDEX_KEEP_PATHS.has("tools/shopping-list-builder"), true);
  assert.equal(INDEX_PRUNE_SLUGS.has("tools/shopping-list-builder"), false);
  assert.equal(INDEX_PRUNE_SLUGS.has("shopping-list-builder"), false);
});

test("weekly grocery budget planner title puts the page count and week length in the SERP", () => {
  const page = readFileSync(
    join(ROOT, "src/pages/printables/weekly-grocery-budget-planner/index.astro"),
    "utf8",
  );
  const title = page.match(/const title = "([^"]+)"/)?.[1] ?? "";
  const titleLower = title.toLowerCase();
  const pdf = readFileSync(
    join(ROOT, "public/downloads/weekly-grocery-budget-planner.pdf"),
  );
  const pdfPages = (pdf.toString("latin1").match(/\/Type\s*\/Page(?!s)/g) ?? []).length;

  assert.equal(pdfPages, 2);
  assert.match(page, /US Letter, 2 pages/);
  assert.match(page, /two-page/);
  assert.match(page, /seven-day/);
  assert.match(page, /Plan seven dinners/);
  assert.equal(title, "Free 2-Page 7-Day Grocery Budget Planner PDF");
  assert.equal(title.length, 44);
  assert.ok(
    title.length <= 60,
    `weekly grocery budget planner title should be ≤60 chars, got ${title.length}`,
  );
  assert.ok(
    titleLower.startsWith("free 2-page"),
    "weekly grocery budget planner title should lead with free 2-page",
  );
  assert.match(title, /2-Page/);
  assert.match(title, /7-Day/);
  assert.match(title, /Planner/);
  assert.match(title, /PDF/);
  assert.equal(
    /^free weekly grocery budget and meal planner pdf$/.test(titleLower),
    false,
    "weekly grocery budget planner title should not stay on the soft meal-planner SERP",
  );
  assert.match(
    page,
    /<h1>Plan the Week Before the Grocery Cart Starts Freelancing<\/h1>/,
  );
  assert.equal(
    page.match(/const description = "([^"]+)"/)?.[1],
    "Download a free two-page grocery budget planner with a seven-day meal plan, pantry check, shopping list, and checkout math.",
  );
  assert.equal(INDEX_KEEP_PATHS.has("printables/weekly-grocery-budget-planner"), true);
  assert.equal(INDEX_PRUNE_SLUGS.has("printables/weekly-grocery-budget-planner"), false);
  assert.equal(INDEX_PRUNE_SLUGS.has("weekly-grocery-budget-planner"), false);
});

test("tools hub title puts the on-page recipe count in the SERP", () => {
  const page = readFileSync(join(ROOT, "src/pages/tools/index.astro"), "utf8");
  const title = page.match(/const title = "([^"]+)"/)?.[1] ?? "";
  const titleLower = title.toLowerCase();
  const now = Date.now();
  let count = 0;
  for (const file of readdirSync(join(ROOT, "src/data/articles"))) {
    if (!file.endsWith(".md")) continue;
    const raw = readFileSync(join(ROOT, "src/data/articles", file), "utf8");
    const fm = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1];
    if (!fm) continue;
    const category = fm.match(/^category:\s*"?([^"\n]+)"?/m)?.[1]?.trim();
    if (category !== "recipes") continue;
    const release = fm.match(/^publishAt:\s*(\d{4}-\d{2}-\d{2})/m)?.[1]
      ?? fm.match(/^date:\s*(\d{4}-\d{2}-\d{2})/m)?.[1];
    if (!release || Date.parse(`${release}T00:00:00.000Z`) > now) continue;
    const servings = Number(fm.match(/^servings:\s*"?(\d+(?:\.\d+)?)"?/m)?.[1]);
    if (!Number.isFinite(servings) || servings <= 0) continue;
    const lines = fm.split("\n");
    const start = lines.findIndex((line) => /^ingredients:\s*$/.test(line));
    let ingredients = 0;
    if (start !== -1) {
      for (let i = start + 1; i < lines.length; i++) {
        if (/^\s*-\s+\S/.test(lines[i])) {
          ingredients += 1;
          continue;
        }
        if (lines[i].trim() === "") continue;
        break;
      }
    }
    if (ingredients === 0) continue;
    count += 1;
  }

  assert.equal(count, 80);
  assert.match(page, /Searches 80 real recipes/);
  assert.match(page, /Built into 80 recipes/);
  assert.match(page, /80 recipes are already loaded/);
  assert.equal(title, "Free Grocery Tools Built From 80 Recipes");
  assert.equal(title, `Free Grocery Tools Built From ${count} Recipes`);
  assert.equal(title.length, 40);
  assert.ok(
    title.length <= 60,
    `tools hub title should be ≤60 chars, got ${title.length}`,
  );
  assert.ok(
    titleLower.startsWith("free grocery tools"),
    "tools hub title should lead with free grocery tools",
  );
  assert.match(title, /80 Recipes/);
  assert.equal(
    /^free grocery and recipe tools built from real site data$/.test(titleLower),
    false,
    "tools hub title should not stay on the soft real-site-data SERP",
  );
  assert.match(page, /<BaseLayout title=\{title\}/);
  assert.match(
    page,
    /<h1[^>]*>Grocery Tools for the Math Nobody Wants to Do<\/h1>/,
  );
  assert.equal(
    page.match(/const description = "([^"]+)"/)?.[1],
    "Find recipes from ingredients, combine shopping lists, scale 80 recipes, plan a food-cost week, and check prices. Free and private.",
  );
  assert.equal(INDEX_KEEP_PATHS.has("tools"), true);
  assert.equal(INDEX_PRUNE_SLUGS.has("tools"), false);
});

test("api docs title puts the on-page dataset count in the SERP", () => {
  const page = readFileSync(join(ROOT, "src/pages/api-docs.astro"), "utf8");
  const title = page.match(/const title = "([^"]+)"/)?.[1] ?? "";
  const titleLower = title.toLowerCase();
  const datasetsSource = readFileSync(join(ROOT, "src/content/datasets.ts"), "utf8");
  const datasetsBlock = datasetsSource.match(/export const DATASETS:[\s\S]*?\n\};/)?.[0] ?? "";
  const ids = [...datasetsBlock.matchAll(/^\s{2}"([a-z0-9-]+)": \{/gm)].map((match) => match[1]);
  const order = [
    ...(datasetsSource.match(/export const STUDY_DATASET_ORDER: string\[\] = \[([\s\S]*?)\];/)?.[1] ?? "")
      .matchAll(/"([a-z0-9-]+)"/g),
  ].map((match) => match[1]);

  assert.equal(ids.length, 24);
  assert.equal(order.length, ids.length);
  assert.deepEqual(new Set(order), new Set(ids));
  assert.match(page, /const datasetCount = STUDY_DATASETS\.length;/);
  assert.match(page, /dated rows across \{datasetCount\} datasets/);
  assert.match(page, /lists all \{datasetCount\} datasets/);
  assert.equal(title, "Free Food Value API: 24 Datasets, No Key");
  assert.equal(title, `Free Food Value API: ${ids.length} Datasets, No Key`);
  assert.equal(title.length, 40);
  assert.ok(
    title.length <= 60,
    `api docs title should be ≤60 chars, got ${title.length}`,
  );
  assert.ok(
    titleLower.startsWith("free food value api"),
    "api docs title should lead with free food value api",
  );
  assert.match(title, /24 Datasets/);
  assert.match(title, /No Key/);
  assert.equal(
    /^free food value api: no key, no limits, just attribution$/.test(titleLower),
    false,
    "api docs title should not stay on the soft no-limits attribution SERP",
  );
  assert.equal(page.includes("No Key, No Limits, Just Attribution"), false);
  assert.match(page, /<BaseLayout title=\{title\}/);
  assert.match(page, /<h1[^>]*>\s*The Food Value API\s*<\/h1>/);
  assert.match(
    page,
    /const description = `A free JSON API over \$\{datasetCount\} original food-cost datasets and \$\{TOTAL_DATA_ROWS\} priced rows, with documented USDA, restaurant-chain, product-label, and DIAAS sources\.`;/,
  );
  assert.equal(INDEX_KEEP_PATHS.has("api-docs"), true);
  assert.equal(INDEX_PRUNE_SLUGS.has("api-docs"), false);
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
