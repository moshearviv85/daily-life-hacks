import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

const BERRY_SLUG = "keep-berries-fresh-longer-when-to-wash";
const HERB_SLUG = "how-to-store-fresh-herbs-to-last-longer";
const BERRY_TITLE = "How to Keep Berries Fresh Longer (And When to Wash Them)";
const HERB_TITLE = "How to Store Fresh Herbs So They Last Longer";
const BERRY_EXCERPT =
  "When to wash berries, what the FDA and USDA actually say about rinsing and mold, and why cold matters more than the vinegar hack everyone repeats.";
const HERB_EXCERPT =
  "Store tender herbs in water and woody herbs in a barely damp towel. The right setup keeps parsley, cilantro, rosemary, and thyme useful longer.";
const BERRY_HEADING = "## How long do berries last in the fridge by type?";
const HERB_HEADING = "## How long do fresh herbs last in the fridge?";
const BUSHBERRY = "https://postharvest.ucdavis.edu/produce-facts-sheets/bushberry";
const STRAWBERRY = "https://postharvest.ucdavis.edu/produce-facts-sheets/strawberry";
const HERBS = "https://postharvest.ucdavis.edu/produce-facts-sheets/herbs-fresh-culinary";
const FDA_PRODUCE =
  "https://www.fda.gov/food/buy-store-serve-safe-food/selecting-and-serving-produce-safely";
const UMN_WASH = "https://extension.umn.edu/food-safety-basics/washing-fresh-fruits-and-vegetables";
const FOODKEEPER = "https://www.foodsafety.gov/keep-food-safe/foodkeeper-app";
const COLD_CHART = "https://www.foodsafety.gov/food-safety-charts/cold-food-storage-charts";
const UPDATED = "2026-11-25";

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

function assertCanonicalInternalLinks(markdown, slug) {
  const links = [...markdown.matchAll(/\]\(([^)]+)\)/g)].map((match) => match[1]);
  for (const link of links) {
    if (!link.startsWith("/")) continue;
    assert.equal(link.includes("#"), false, `${slug} internal link has an anchor: ${link}`);
    assert.equal(link.includes("?"), false, `${slug} internal link has a query: ${link}`);
    assert.equal(/\.csv(?:$|\?)/i.test(link), false, `${slug} links a CSV: ${link}`);
    assert.equal(/\.(?:pdf|json|jpe?g|png|webp|gif|svg|txt|md)(?:$|\?)/i.test(link), false, `${slug} links a file: ${link}`);
    assert.ok(link.endsWith("/"), `${slug} internal link is not canonical: ${link}`);
  }
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

test("berry page answers storage life by type with the UC Davis table", () => {
  const markdown = readArticle(BERRY_SLUG);
  assert.equal(field(markdown, "title"), BERRY_TITLE);
  assert.equal(field(markdown, "excerpt"), BERRY_EXCERPT);
  assert.equal(field(markdown, "author"), "David Miller");
  assert.equal(field(markdown, "dateModified"), UPDATED);
  assert.equal(field(markdown, "substantiveUpdate"), UPDATED);
  assert.doesNotMatch(markdown, /FAQPage|photograph|real photo|\bphoto of\b/i);
  assert.doesNotMatch(markdown, /\u2014/);

  const answer = answerUnder(markdown, BERRY_HEADING);
  const count = visibleWords(answer).length;
  assert.ok(count >= 40 && count <= 60, `berry answer is ${count} words`);
  assert.match(answer, /2 to 5 days/);
  assert.match(answer, /1 to 2 weeks/);
  assert.match(answer, /12 ml CO2 per kg per hour/);
  assert.match(answer, /blueberries at 3/);
  assert.match(answer, /32°F/);
  assert.match(answer, /40°F or below/);
  assert.match(answer, /wash right before eating/);
  assert.match(answer, /No strawberry day count/);
  assert.match(answer, new RegExp(escapeRegExp(BUSHBERRY)));
  assert.match(answer, new RegExp(escapeRegExp(STRAWBERRY)));
  assert.match(answer, new RegExp(escapeRegExp(FDA_PRODUCE)));
  assert.match(answer, new RegExp(escapeRegExp(UMN_WASH)));

  const tableAt = markdown.indexOf("| Berry | Life at 32°F (0°C), from harvest |");
  assert.ok(tableAt > markdown.indexOf(BERRY_HEADING), "berry table should follow the question");
  const table = markdown.slice(tableAt).split(/\n\s*\n/)[0];
  for (const row of ["Strawberries", "Raspberries", "Blackberries", "Blueberries"]) {
    assert.match(table, new RegExp(`\\| ${row} \\|`));
  }
  assert.match(table, /6 to 10 ml CO2\/kg\/hr/);
  assert.match(table, /12 ml CO2\/kg\/hr/);
  assert.match(table, /11 ml CO2\/kg\/hr/);
  assert.match(table, /3 ml CO2\/kg\/hr/);
  assert.match(table, /Right before eating/);
  assert.match(table, /40°F or below/);
  assert.match(markdown, /Table: UC Davis Postharvest storage life for four berries at 32°F, plus the home fridge and wash rules/);
  assertCanonicalInternalLinks(markdown, BERRY_SLUG);
});

test("herb page answers fridge life with the six-row UC Davis table", () => {
  const markdown = readArticle(HERB_SLUG);
  assert.equal(field(markdown, "title"), HERB_TITLE);
  assert.equal(field(markdown, "excerpt"), HERB_EXCERPT);
  assert.equal(field(markdown, "author"), "David Miller");
  assert.equal(field(markdown, "dateModified"), UPDATED);
  assert.equal(field(markdown, "substantiveUpdate"), UPDATED);
  assert.doesNotMatch(markdown, /FAQPage|photograph|real photo|\bphoto of\b/i);
  assert.doesNotMatch(markdown, /\u2014/);

  const answer = answerUnder(markdown, HERB_HEADING);
  const count = visibleWords(answer).length;
  assert.ok(count >= 40 && count <= 60, `herb answer is ${count} words`);
  assert.match(answer, /3 weeks at 0°C \(32°F\)/);
  assert.match(answer, /2 weeks at 5°C \(41°F\)/);
  assert.match(answer, /above 10°C \(50°F\)/);
  assert.match(answer, /1 to 2 weeks/);
  assert.match(answer, /chilling-sensitive/);
  assert.match(answer, new RegExp(escapeRegExp(HERBS)));

  const tableAt = markdown.indexOf("| Herb | Class | Home setup |");
  assert.ok(tableAt > markdown.indexOf(HERB_HEADING), "herb table should follow the question");
  const table = markdown.slice(tableAt).split(/\n\s*\n/)[0];
  for (const row of [
    "Parsley",
    "Cilantro",
    "Dill and mint",
    "Basil",
    "Rosemary",
    "Thyme, oregano, and sage",
  ]) {
    assert.match(table, new RegExp(escapeRegExp(row)));
  }
  assert.match(table, /Tender/);
  assert.match(table, /Woody/);
  assert.match(table, /chilling-sensitive/);
  assert.match(table, /jar with an inch of water/);
  assert.match(table, /Jar of water on the counter/);
  assert.match(table, /Barely damp towel/);
  assert.match(table, /Above 50°F \(10°C\)/);
  assert.match(table, /Aroma drops after about 10 days/);
  assert.match(table, /21 days/);
  assert.match(table, new RegExp(escapeRegExp(HERBS)));
  assert.match(table, new RegExp(escapeRegExp(COLD_CHART)));
  assert.match(markdown, /7 to 10 days/);
  assert.match(markdown, new RegExp(escapeRegExp(FOODKEEPER)));
  assert.match(
    markdown,
    /Table: Home setup and UC Davis Postharvest shelf life for parsley, cilantro, dill, mint, basil, rosemary, thyme, oregano, and sage/,
  );
  assertCanonicalInternalLinks(markdown, HERB_SLUG);
});

test("built berry and herb pages publish the answers and no FAQPage", () => {
  const berryPath = join(ROOT, `dist/${BERRY_SLUG}/index.html`);
  const herbPath = join(ROOT, `dist/${HERB_SLUG}/index.html`);
  if (!existsSync(berryPath) || !existsSync(herbPath)) return;

  const berry = readFileSync(berryPath, "utf8");
  const herb = readFileSync(herbPath, "utf8");
  assert.match(berry, new RegExp(`<meta name="description" content="${escapeRegExp(BERRY_EXCERPT)}">`));
  assert.match(herb, new RegExp(`<meta name="description" content="${escapeRegExp(HERB_EXCERPT)}">`));
  assert.match(berry, /How long do berries last in the fridge by type\?/);
  assert.match(herb, /How long do fresh herbs last in the fridge\?/);
  assert.match(berry, /<caption class="sr-only">UC Davis Postharvest storage life for four berries at 32°F, plus the home fridge and wash rules<\/caption>/);
  assert.match(herb, /<caption class="sr-only">Home setup and UC Davis Postharvest shelf life for parsley, cilantro, dill, mint, basil, rosemary, thyme, oregano, and sage<\/caption>/);
  assert.match(berry, /Strawberries/);
  assert.match(berry, /Blueberries/);
  assert.match(berry, /11 ml CO2\/kg\/hr/);
  assert.match(berry, new RegExp(escapeRegExp(UMN_WASH)));
  assert.match(berry, new RegExp(escapeRegExp(BUSHBERRY)));
  assert.match(herb, /Thyme, oregano, and sage/);
  assert.match(herb, /Dill and mint/);
  assert.match(herb, new RegExp(escapeRegExp(HERBS)));
  assert.doesNotMatch(berry, /FAQPage/);
  assert.doesNotMatch(herb, /FAQPage/);
  assert.match(berry, new RegExp(`"dateModified":"${UPDATED}T00:00:00.000Z"`));
  assert.match(herb, new RegExp(`"dateModified":"${UPDATED}T00:00:00.000Z"`));
  assert.match(berry, /"name":"David Miller"/);
  assert.match(herb, /"name":"David Miller"/);
  assert.match(berry, /href="\/how-to-store-fresh-herbs-to-last-longer\/"/);
  assert.match(herb, /href="\/keep-berries-fresh-longer-when-to-wash\/"/);
});
