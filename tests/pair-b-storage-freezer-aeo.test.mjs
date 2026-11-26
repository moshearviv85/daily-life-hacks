import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const UPDATED = "2026-11-25";

const AVOCADO = "best-way-to-store-avocados-to-stop-browning";
const FREEZER = "freezer-organization-tips-large-family-meals";
const AVOCADO_TITLE = "How to Store Avocados to Keep Them Fresh";
const FREEZER_TITLE = "Freezer Organization Tips for Large Family Meals";
const AVOCADO_EXCERPT =
  "Keep ripe, cut, and mashed avocados greener longer with cold storage, tight surface contact, and a little lemon or lime juice.";
const FREEZER_EXCERPT =
  "Stop digging through frozen tundra for dinner. These freezer organization tips make large family meal prep actually work without the stress.";
const AVOCADO_HEADING =
  "## Is it safe to store cut avocados in water, and which method stops browning best?";
const FREEZER_HEADING =
  "## How long do bulk freezer meals, raw meats, and soups keep peak quality at 0°F?";

const FDA_AVOCADO =
  "https://www.fda.gov/food/sampling-protect-food-supply/microbiological-surveillance-sampling-fy14-16-whole-fresh-avocados";
const FDA_LAB = "https://pubmed.ncbi.nlm.nih.gov/27497134/";
const FDA_WASH =
  "https://www.fda.gov/food/buy-store-serve-safe-food/selecting-and-serving-produce-safely";
const UC_DAVIS = "https://postharvest.ucdavis.edu/produce-facts-sheets/avocado";
const FOODKEEPER = "https://www.foodsafety.gov/keep-food-safe/foodkeeper-app";
const FSIS =
  "https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/freezing-and-food-safety";
const NCHFP = "https://nchfp.uga.edu/how/freeze/how-long-can-i-store-frozen-foods/";
const COLD_CHART = "https://www.foodsafety.gov/food-safety-charts/cold-food-storage-charts";
const ILLINOIS = "https://extension.illinois.edu/food-safety/freezer-storage";

function readArticle(slug) {
  return readFileSync(join(ROOT, "src/data/articles", `${slug}.md`), "utf8");
}

function frontmatter(markdown) {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  assert.ok(match, "article is missing frontmatter");
  return match[1];
}

function field(markdown, name) {
  const lines = frontmatter(markdown).split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    if (!lines[i].startsWith(`${name}:`)) continue;
    const rest = lines[i].slice(name.length + 1).trim();
    if (
      (rest.startsWith('"') && rest.endsWith('"')) ||
      (rest.startsWith("'") && rest.endsWith("'"))
    ) {
      return rest.slice(1, -1);
    }
    return rest;
  }
  return undefined;
}

function visibleWords(markdown) {
  const visible = markdown.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  return visible.match(/\b[\p{L}\p{N}][\p{L}\p{N}'’-]*\b/gu) ?? [];
}

function answerUnder(markdown, heading) {
  const at = markdown.indexOf(heading);
  assert.ok(at !== -1, `missing heading: ${heading}`);
  return markdown.slice(at + heading.length).trimStart().split(/\n\s*\n/)[0];
}

function internalLinks(markdown) {
  return [...markdown.matchAll(/\]\(([^)]+)\)/g)]
    .map((match) => match[1])
    .filter((link) => link.startsWith("/"));
}

function assertNewLinksAreCanonical(markdown, slug) {
  for (const link of internalLinks(markdown)) {
    if (link === "/protein-per-serving-beans-chicken-tofu-compared/#cost-per-25-g") continue;
    assert.equal(link.includes("#"), false, `${slug} internal link has an anchor: ${link}`);
    assert.equal(link.includes("?"), false, `${slug} internal link has a query: ${link}`);
    assert.equal(/\.csv(?:$|\?)/i.test(link), false, `${slug} links a CSV: ${link}`);
    assert.equal(
      /\.(?:pdf|json|jpe?g|png|webp|gif|svg|txt|md)(?:$|\?)/i.test(link),
      false,
      `${slug} links a file: ${link}`,
    );
    assert.ok(link.endsWith("/"), `${slug} internal link is not canonical: ${link}`);
  }
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

test("avocado page answers the water question with a 5-row method table", () => {
  const markdown = readArticle(AVOCADO);
  assert.equal(field(markdown, "title"), AVOCADO_TITLE);
  assert.equal(field(markdown, "excerpt"), AVOCADO_EXCERPT);
  assert.equal(field(markdown, "author"), "David Miller");
  assert.equal(field(markdown, "dateModified"), UPDATED);
  assert.equal(field(markdown, "substantiveUpdate"), UPDATED);
  assert.doesNotMatch(markdown, /FAQPage/);
  assert.doesNotMatch(markdown, /\u2014/);

  const answer = answerUnder(markdown, AVOCADO_HEADING);
  const count = visibleWords(answer).length;
  assert.ok(count >= 40 && count <= 60, `avocado answer is ${count} words`);
  assert.match(answer, /17\.73%/);
  assert.match(answer, /Listeria monocytogenes/);
  assert.match(answer, /multiply and enter the pulp/);
  assert.match(answer, /FoodSafety\.gov/);
  assert.match(answer, /36 to 40°F/);
  assert.match(answer, new RegExp(escapeRegExp(FDA_AVOCADO)));
  assert.match(answer, new RegExp(escapeRegExp(FDA_LAB)));
  assert.match(answer, new RegExp(escapeRegExp(FDA_WASH)));
  assert.match(answer, new RegExp(escapeRegExp(UC_DAVIS)));

  const tableAt = markdown.indexOf("| Method | Browning control | Fridge window | Food-safety status |");
  assert.ok(tableAt > markdown.indexOf(AVOCADO_HEADING), "avocado table should follow the question");
  const table = markdown.slice(tableAt).split(/\n\s*\n/)[0];
  for (const row of [
    "Tight wrap pressed onto the flesh, plus lemon or lime juice",
    "Cut onion in an airtight container",
    "Light olive oil brush, plus airtight wrap",
    "Dry whole ripe avocado, refrigerated",
    "Submerging in water (not safe)",
  ]) {
    assert.match(table, new RegExp(escapeRegExp(row)));
  }
  assert.equal(table.split("\n").filter((line) => line.startsWith("|") && !line.includes("---")).length, 6);
  assert.match(table, /3 to 4 days/);
  assert.match(table, /36 to 40°F/);
  assert.match(table, /Not recommended/);
  assert.match(markdown, /64 of 361/);
  assert.match(markdown, /0\.24%/);
  assert.match(markdown, /5\.90 to 7\.19 log CFU\/g/);
  assert.match(markdown, new RegExp(escapeRegExp(FOODKEEPER)));
  assert.match(
    markdown,
    /Table: Cut-avocado browning methods against fridge time and the FDA water warning/,
  );
  assertNewLinksAreCanonical(markdown, AVOCADO);
});

test("freezer page answers the 0°F question with a 6-row zone table", () => {
  const markdown = readArticle(FREEZER);
  assert.equal(field(markdown, "title"), FREEZER_TITLE);
  assert.equal(field(markdown, "excerpt"), FREEZER_EXCERPT);
  assert.equal(field(markdown, "author"), "David Miller");
  assert.equal(field(markdown, "dateModified"), UPDATED);
  assert.equal(field(markdown, "substantiveUpdate"), UPDATED);
  assert.doesNotMatch(markdown, /FAQPage/);
  assert.doesNotMatch(markdown, /\u2014/);

  const answer = answerUnder(markdown, FREEZER_HEADING);
  const count = visibleWords(answer).length;
  assert.ok(count >= 40 && count <= 60, `freezer answer is ${count} words`);
  assert.match(answer, /0°F \(-18°C\)/);
  assert.match(answer, /safe indefinitely/);
  assert.match(answer, /2 to 3 months/);
  assert.match(answer, /3 to 4 months/);
  assert.match(answer, /9 months/);
  assert.match(answer, /8 to 12 months/);
  assert.match(answer, new RegExp(escapeRegExp(FSIS)));
  assert.match(answer, new RegExp(escapeRegExp(NCHFP)));

  const tableAt = markdown.indexOf("| Food | Packaging | Freezer zone | Quality window at 0°F |");
  assert.ok(tableAt > markdown.indexOf(FREEZER_HEADING), "freezer table should follow the question");
  const table = markdown.slice(tableAt).split(/\n\s*\n/)[0];
  for (const row of [
    "Soups, broths, and stews",
    "Cooked casseroles and leftovers",
    "Ground beef or turkey",
    "Raw chicken pieces or a whole bird",
    "Blanched vegetables",
    "Sliced bread and rolls",
  ]) {
    assert.match(table, new RegExp(escapeRegExp(row)));
  }
  assert.equal(table.split("\n").filter((line) => line.startsWith("|") && !line.includes("---")).length, 7);
  assert.match(table, /Pieces 9 months\. Whole bird 12 months/);
  assert.match(table, /2 to 3 months for baked yeast bread and rolls/);
  assert.match(table, /Not on the FSIS chart/);
  assert.match(table, new RegExp(escapeRegExp(COLD_CHART)));
  assert.match(table, new RegExp(escapeRegExp(ILLINOIS)));
  assert.match(
    markdown,
    /Table: USDA FSIS 0°F quality windows by freezer zone, with NCHFP vegetables and Illinois Extension bread/,
  );
  assertNewLinksAreCanonical(markdown, FREEZER);
});

test("freezer organization is the canonical target, not a 301 source", () => {
  const rules = readFileSync(join(ROOT, "public/_redirects"), "utf8")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
  const sources = rules
    .filter((line) => line.endsWith("301"))
    .map((line) => line.split(/\s+/)[0].replace(/^\/+|\/+$/g, ""));
  assert.equal(sources.includes(FREEZER), false);
  assert.equal(sources.includes("freezer-meal-prep-ideas-for-beginners"), true);
  assert.match(
    readFileSync(join(ROOT, "public/_redirects"), "utf8"),
    /\/freezer-meal-prep-ideas-for-beginners\/?\s+\/freezer-organization-tips-large-family-meals\/\s+301/,
  );
  assert.equal(existsSync(join(ROOT, "src/data/articles", `${FREEZER}.md`)), true);
  assert.equal(
    existsSync(join(ROOT, "src/data/articles/freezer-meal-prep-ideas-for-beginners.md")),
    false,
  );
});

test("contextual freezer links do not move source dates or use anchors", () => {
  const plan = readArticle("plan-week-of-dinners-fewer-grocery-runs");
  const casserole = readArticle("cheap-chicken-casserole-meals-large-families");
  const lettuce = readArticle("how-to-revive-wilted-lettuce-and-greens");
  const waste = readArticle("how-to-reduce-food-waste-at-home-easy-tips");

  assert.match(plan, /\]\(\/freezer-organization-tips-large-family-meals\/\)/);
  assert.match(casserole, /\]\(\/freezer-organization-tips-large-family-meals\/\)/);
  assert.match(lettuce, /\]\(\/best-way-to-store-avocados-to-stop-browning\/\)/);
  assert.match(waste, /\]\(\/best-way-to-store-avocados-to-stop-browning\/\)/);

  assert.equal(field(plan, "dateModified"), "2026-07-16");
  assert.equal(field(plan, "substantiveUpdate"), undefined);
  assert.equal(field(casserole, "dateModified"), "2026-11-23");
  assert.equal(field(casserole, "substantiveUpdate"), "2026-11-23");
  assert.equal(field(lettuce, "dateModified"), "2026-08-01");
  assert.equal(field(lettuce, "substantiveUpdate"), undefined);
  assert.equal(field(waste, "dateModified"), "2026-07-20");
  assert.equal(field(waste, "substantiveUpdate"), undefined);

  for (const [slug, markdown] of [
    ["plan-week-of-dinners-fewer-grocery-runs", plan],
    ["cheap-chicken-casserole-meals-large-families", casserole],
  ]) {
    const added = internalLinks(markdown).filter(
      (link) => link === "/freezer-organization-tips-large-family-meals/",
    );
    assert.equal(added.length, 1, slug);
    assertNewLinksAreCanonical(markdown, slug);
  }
});

test("built storage pages publish the answers and no FAQPage", () => {
  const avocadoPath = join(ROOT, `dist/${AVOCADO}/index.html`);
  const freezerPath = join(ROOT, `dist/${FREEZER}/index.html`);
  if (!existsSync(avocadoPath) || !existsSync(freezerPath)) return;

  const avocado = readFileSync(avocadoPath, "utf8");
  const freezer = readFileSync(freezerPath, "utf8");
  assert.match(avocado, new RegExp(`<meta name="description" content="${escapeRegExp(AVOCADO_EXCERPT)}">`));
  assert.match(freezer, new RegExp(`<meta name="description" content="${escapeRegExp(FREEZER_EXCERPT)}">`));
  assert.match(avocado, /Is it safe to store cut avocados in water, and which method stops browning best\?/);
  assert.match(freezer, /How long do bulk freezer meals, raw meats, and soups keep peak quality at 0°F\?/);
  assert.match(
    avocado,
    /<caption class="sr-only">Cut-avocado browning methods against fridge time and the FDA water warning<\/caption>/,
  );
  assert.match(
    freezer,
    /<caption class="sr-only">USDA FSIS 0°F quality windows by freezer zone, with NCHFP vegetables and Illinois Extension bread<\/caption>/,
  );
  assert.match(avocado, /Submerging in water \(not safe\)/);
  assert.match(freezer, /Sliced bread and rolls/);
  assert.doesNotMatch(avocado, /FAQPage/);
  assert.doesNotMatch(freezer, /FAQPage/);
  assert.match(avocado, new RegExp(`"dateModified":"${UPDATED}T00:00:00.000Z"`));
  assert.match(freezer, new RegExp(`"dateModified":"${UPDATED}T00:00:00.000Z"`));
  assert.match(avocado, /"name":"David Miller"/);
  assert.match(freezer, /"name":"David Miller"/);
});
