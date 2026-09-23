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
    "Chips vs Popcorn: Which Has Fewer Calories? 149 vs 108",
  );
  assert.equal(popcorn.title.length, 54);
  assert.ok(
    popcorn.title.length <= 60,
    `popcorn title too long for SERP: ${popcorn.title.length}`,
  );
  const titleLower = popcorn.title.toLowerCase();
  assert.ok(
    titleLower.startsWith("chips vs popcorn"),
    "popcorn title should lead with chips vs popcorn",
  );
  assert.ok(
    titleLower.indexOf("which has fewer calories") < titleLower.indexOf("149"),
    "popcorn title should put which-has-fewer before the USDA calories",
  );
  assert.match(popcorn.title, /149/);
  assert.match(popcorn.title, /108/);
  assert.ok(
    titleLower.indexOf("149") < titleLower.indexOf("108"),
    "popcorn title should put chips calories (149) before popcorn (108)",
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
    "Which Has More Protein Per Serving: Chicken, Beans, Tofu?",
  );
  assert.equal(protein.title.length, 57);
  assert.ok(
    protein.title.length <= 60,
    `protein title too long for SERP: ${protein.title.length}`,
  );
  const proteinTitle = protein.title.toLowerCase();
  assert.ok(
    proteinTitle.startsWith("which has more protein per serving"),
    "protein title should lead with which has more protein per serving",
  );
  assert.ok(
    proteinTitle.indexOf("which has more") < proteinTitle.indexOf("chicken"),
    "protein title should put which-has-more before the foods",
  );
  assert.match(protein.title, /[Cc]hicken/);
  assert.match(protein.title, /[Bb]eans/);
  assert.match(protein.title, /[Tt]ofu/);
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

test("canned beans vs dried beans nutrition title leads with are dried beans better", () => {
  const beans = articleFrontmatter("canned-beans-vs-dried-beans-nutrition");
  const raw = readFileSync(
    join(ROOT, "src/data/articles/canned-beans-vs-dried-beans-nutrition.md"),
    "utf8",
  );
  const titleLower = beans.title.toLowerCase();
  const excerptLower = beans.excerpt.toLowerCase();

  assert.equal(beans.title, "Are Dried Beans Better Than Canned?");
  assert.equal(beans.title.length, 35);
  assert.ok(
    beans.title.length <= 60,
    `nutrition beans title too long for SERP: ${beans.title.length}`,
  );
  assert.ok(
    titleLower.startsWith("are dried beans better than canned"),
    "nutrition beans title should lead with are dried beans better than canned",
  );
  assert.ok(
    titleLower.indexOf("better") < titleLower.indexOf("canned"),
    "nutrition beans title should put better before canned",
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

test("high-protein high-fiber meals title leads with how to build", () => {
  const page = articleFrontmatter("high-protein-high-fiber-meals-for-weight-loss");
  const raw = readFileSync(
    join(ROOT, "src/data/articles/high-protein-high-fiber-meals-for-weight-loss.md"),
    "utf8",
  );
  const titleLower = page.title.toLowerCase();
  const excerptLower = page.excerpt.toLowerCase();

  assert.equal(
    page.title,
    "How to Build High Protein High Fiber Meals for Weight Loss",
  );
  assert.equal(page.title.length, 58);
  assert.ok(
    page.title.length <= 60,
    `protein fiber meals title should be ≤60 chars, got ${page.title.length}`,
  );
  assert.ok(
    titleLower.startsWith("how to build"),
    "title should lead with how to build, not a flat keyword stack",
  );
  assert.ok(
    titleLower.indexOf("how to build") < titleLower.indexOf("high protein"),
    "title should put the how-to lead before high protein",
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
    titleLower.indexOf("meals") < titleLower.indexOf("weight loss"),
    "title should state meals before weight-loss intent",
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

test("homemade salad dressing title leads with how long in the fridge", () => {
  const dressing = articleFrontmatter("how-to-store-homemade-salad-dressing-safely");
  const raw = readFileSync(
    join(ROOT, "src/data/articles/how-to-store-homemade-salad-dressing-safely.md"),
    "utf8",
  );
  const titleLower = dressing.title.toLowerCase();
  const excerptLower = dressing.excerpt.toLowerCase();

  assert.equal(
    dressing.title,
    "How Long Does Homemade Salad Dressing Last in the Fridge?",
  );
  assert.equal(dressing.title.length, 57);
  assert.ok(
    dressing.title.length <= 60,
    `dressing title should be ≤60 chars, got ${dressing.title.length}`,
  );
  assert.ok(
    titleLower.startsWith("how long does homemade salad dressing last in the fridge"),
    "dressing title should lead with the how-long homemade salad dressing fridge query",
  );
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

  assert.equal(
    page.title,
    "High Fiber Bran Muffins That Taste Good (About 5.9g Each)",
  );
  assert.equal(page.title.length, 57);
  assert.ok(
    page.title.length <= 60,
    `bran muffin title should be ≤60 chars, got ${page.title.length}`,
  );
  assert.ok(
    titleLower.startsWith("high fiber bran muffins"),
    "bran muffin title should lead with high fiber bran muffins",
  );
  assert.match(page.title, /5\.9g/);
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
  assert.match(raw, /^dateModified: 2026-09-23$/m);
});

test("soggy sandwich title leads with keep query", () => {
  const page = articleFrontmatter("how-to-keep-sandwiches-from-getting-soggy");
  const titleLower = page.title.toLowerCase();
  const excerptLower = page.excerpt.toLowerCase();

  assert.match(page.title, /^How to Keep Sandwiches From Getting Soggy$/);
  assert.ok(
    page.title.length <= 60,
    `sandwich title should be ≤60 chars, got ${page.title.length}`,
  );
  assert.ok(
    titleLower.startsWith("how to keep sandwiches from getting soggy"),
    "sandwich title should lead with GSC query how to keep sandwiches from getting soggy",
  );
  assert.equal(
    titleLower.startsWith("how to prevent"),
    false,
    "sandwich title should not lead with prevent",
  );

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

test("savory chia title leads with chia seed recipes query", () => {
  const page = articleFrontmatter("savory-chia-seed-recipes-breakfast");
  const titleLower = page.title.toLowerCase();
  const excerptLower = page.excerpt.toLowerCase();

  assert.match(page.title, /^Savory Chia Seed Recipes for Breakfast$/);
  assert.ok(
    page.title.length <= 60,
    `savory chia title too long for SERP: ${page.title.length}`,
  );
  assert.ok(
    titleLower.startsWith("savory chia seed recipes"),
    "savory chia title should lead with GSC query savory chia seed recipes",
  );
  assert.equal(
    titleLower.includes("pudding"),
    false,
    "savory chia title should not force pudding and miss chia seed recipes",
  );

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

test("artichoke recipe title leads with artichoke recipes for gut health", () => {
  const artichoke = articleFrontmatter("artichoke-recipes-for-gut-health");
  const raw = readFileSync(
    join(ROOT, "src/data/articles/artichoke-recipes-for-gut-health.md"),
    "utf8",
  );
  const titleLower = artichoke.title.toLowerCase();
  const excerptLower = artichoke.excerpt.toLowerCase();

  assert.equal(artichoke.title, "Artichoke Recipes for Gut Health");
  assert.equal(artichoke.title.length, 32);
  assert.ok(
    artichoke.title.length <= 60,
    `artichoke title should be ≤60 chars, got ${artichoke.title.length}`,
  );
  assert.ok(
    titleLower.startsWith("artichoke recipes for gut health"),
    "artichoke title should lead with artichoke recipes for gut health",
  );
  assert.equal(
    titleLower.includes("macrobiotic"),
    false,
    "artichoke title should not spend the SERP on macrobiotic",
  );
  assert.equal(
    /^macrobiotic artichoke recipe:/.test(titleLower),
    false,
    "artichoke title should not be the old macrobiotic steam-and-dip SERP",
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

test("rice and beans everyday title leads with can you eat", () => {
  const rice = articleFrontmatter("can-you-eat-rice-and-beans-everyday");
  const raw = readFileSync(
    join(ROOT, "src/data/articles/can-you-eat-rice-and-beans-everyday.md"),
    "utf8",
  );
  const titleLower = rice.title.toLowerCase();
  const excerptLower = rice.excerpt.toLowerCase();

  assert.equal(rice.title, "Can You Eat Rice and Beans Every Day?");
  assert.equal(rice.title.length, 37);
  assert.ok(
    rice.title.length <= 60,
    `rice and beans title should be ≤60 chars, got ${rice.title.length}`,
  );
  assert.ok(
    titleLower.startsWith("can you eat rice and beans every day"),
    "rice and beans title should lead with the can-you-eat everyday query",
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
  const titleLower = page.title.toLowerCase();
  const excerptLower = page.excerpt.toLowerCase();

  assert.equal(page.title, "High Fiber Popcorn Toppings That Taste Good");
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
    excerptLower.startsWith("don't taste like diet") || excerptLower.includes("diet food"),
    false,
    "popcorn toppings meta should not lead with the old diet-food framing",
  );
  assert.ok(
    page.excerpt.length <= 160,
    `popcorn toppings meta too long: ${page.excerpt.length}`,
  );
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
  assert.match(raw, /^dateModified: 2026-09-22$/m);
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

test("indian salad dressing title leads with indian salad dressing recipes", () => {
  const page = articleFrontmatter("healthy-homemade-indian-salad-dressing-recipes");
  const raw = readFileSync(
    join(ROOT, "src/data/articles/healthy-homemade-indian-salad-dressing-recipes.md"),
    "utf8",
  );
  const titleLower = page.title.toLowerCase();

  assert.equal(page.title, "Indian Salad Dressing Recipes (Homemade)");
  assert.equal(page.title.length, 40);
  assert.ok(
    page.title.length <= 60,
    `indian salad dressing title should be ≤60 chars, got ${page.title.length}`,
  );
  assert.ok(
    titleLower.startsWith("indian salad dressing recipes"),
    "indian salad dressing title should lead with indian salad dressing recipes",
  );
  assert.ok(
    titleLower.indexOf("indian salad dressing recipes") < titleLower.indexOf("homemade"),
    "indian salad dressing title should put the recipe query before homemade",
  );
  assert.equal(
    titleLower.startsWith("homemade"),
    false,
    "indian salad dressing title should not stack homemade in front of the recipe query",
  );
  assert.equal(
    titleLower.includes("healthy"),
    false,
    "indian salad dressing title should not stack healthy in front of the recipe query",
  );
  assert.equal(
    titleLower.includes("best"),
    false,
    "indian salad dressing title should not use a best superlative",
  );
  assert.equal(
    /^healthy homemade indian salad dressing recipes$/.test(titleLower),
    false,
    "indian salad dressing title should not be the old healthy homemade stack",
  );
  assert.match(raw, /^date: 2026-04-28$/m);
  assert.match(raw, /^dateModified: 2026-09-23$/m);
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
  const page = articleFrontmatter("healthy-egg-sandwich-add-ins-toppings");
  const raw = readFileSync(
    join(ROOT, "src/data/articles/healthy-egg-sandwich-add-ins-toppings.md"),
    "utf8",
  );
  const titleLower = page.title.toLowerCase();

  assert.equal(page.title, "Egg Sandwich Add-Ins and Toppings");
  assert.equal(page.title.length, 33);
  assert.ok(
    page.title.length <= 60,
    `egg sandwich add-ins title should be ≤60 chars, got ${page.title.length}`,
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
