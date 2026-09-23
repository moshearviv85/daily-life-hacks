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
