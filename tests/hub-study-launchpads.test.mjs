import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const home = readFileSync("src/pages/index.astro", "utf8");
const data = readFileSync("src/pages/data/index.astro", "utf8");

const HOME_SLUGS = [
  "high-protein-breakfast-without-eggs",
  "fast-food-meals-with-protein-and-fiber",
  "low-sodium-high-protein-foods-per-dollar",
  "cheapest-high-fiber-fruits-and-vegetables",
  "cost-of-50g-protein-and-30g-fiber-per-day",
  "protein-per-dollar-2017-to-2026-bls-trends",
  "plant-vs-animal-protein-cost-per-dollar",
  "us-regional-grocery-protein-prices-october-2026",
];

const DATA_SLUGS = [
  "cheapest-canned-fish-and-seafood-protein-per-dollar",
  "how-much-100-grams-of-protein-costs-per-day",
  "no-cook-emergency-protein-and-fiber-grocery-list",
  "cheapest-dairy-and-soy-protein-per-dollar",
  "cheapest-whole-grains-for-fiber-per-dollar",
  "high-protein-grocery-list-50-grams",
  "high-fiber-without-beans",
  "sourdough-discard-hydration-conversion-chart",
];

function slugBlock(source, marker) {
  const start = source.indexOf(marker);
  assert.ok(start >= 0, `missing ${marker}`);
  const end = source.indexOf("] as const;", start);
  assert.ok(end > start, `${marker} should stay a const slug list`);
  return source.slice(start, end);
}

function section(source, heading, nextHeading) {
  const start = source.indexOf(heading);
  assert.ok(start >= 0, `missing heading ${heading}`);
  const end = source.indexOf(nextHeading, start + heading.length);
  assert.ok(end > start, `${heading} should stay before ${nextHeading}`);
  return source.slice(start, end);
}

test("homepage launchpad names the eight 2026 studies and skips missing files", () => {
  assert.match(home, /Latest 2026 Grocery & Nutrition Studies/);
  assert.match(home, /existsSync\(join\(process\.cwd\(\), 'src\/data\/articles'/);
  assert.match(home, /isIndexPruned\(article\.id\)/);
  assert.match(home, /!isReleased\(article\)/);
  assert.match(home, /href: `\/\$\{slug\}\/`/);
  assert.doesNotMatch(home, /FAQPage/);
  const block = slugBlock(home, "LATEST_2026_STUDY_SLUGS");
  for (const slug of HOME_SLUGS) {
    assert.match(block, new RegExp(`'${slug}'`));
  }
  const cards = section(home, "Latest 2026 Grocery & Nutrition Studies", "Mobile-only Category Quick Nav");
  assert.match(cards, /href=\{study\.href\}/);
  assert.doesNotMatch(cards, /href=["'][^"']*#/);
  assert.doesNotMatch(cards, /\.csv/);
  assert.doesNotMatch(cards, /\u2014/);
});

test("data hub launchpad names the eight visual studies without moving the catalog date", () => {
  assert.match(data, /Featured 2026 Visual Studies Built From These Datasets/);
  assert.match(data, /dateModified: DATA_RELEASE_DATE/);
  assert.match(data, /existsSync\(join\(process\.cwd\(\), "src\/data\/articles"/);
  assert.match(data, /isIndexPruned\(article\.id\)/);
  assert.match(data, /!isReleased\(article\)/);
  assert.match(data, /href: `\/\$\{slug\}\/`/);
  assert.doesNotMatch(data, /FAQPage/);
  const block = slugBlock(data, "FEATURED_STUDY_SLUGS");
  for (const slug of DATA_SLUGS) {
    assert.match(block, new RegExp(`"${slug}"`));
  }
  const studies = section(
    data,
    "Featured 2026 Visual Studies Built From These Datasets",
    'id="how-to-cite"',
  );
  assert.match(studies, /href=\{study\.href\}/);
  assert.doesNotMatch(studies, /href=["'][^"']*#/);
  assert.doesNotMatch(studies, /\.csv/);
  assert.doesNotMatch(studies, /\u2014/);
});
