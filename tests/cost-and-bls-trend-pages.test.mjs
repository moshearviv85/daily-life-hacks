import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { INDEX_PRUNE_SLUGS } from "../src/content/index-prune.js";
import { parseCsv } from "../src/content/price-basis.mjs";

const ORPHANS = new Set([
  "balanced-breakfast-that-keeps-you-full",
  "best-way-to-store-avocados-to-stop-browning",
  "gut-health-tea-peppermint-ginger",
  "fiber-rich-soup-for-weight-loss-cabbage",
  "high-protein-high-fiber-meals-for-weight-loss",
  "creamy-mushroom-barley-risotto-hands-off",
  "selenium-containing-foods-easy-ways",
  "high-fiber-stir-fry-vegetables",
  "prune-juice-alternatives-for-constipation",
  "natto-japanese-fermented-soybeans-gut-health",
  "water-and-fiber-the-golden-rule",
  "fix-oversalted-soup-sauce-rice",
  "eggs-vs-everything-protein-value",
  "how-to-keep-sandwiches-from-getting-soggy",
  "what-30-grams-of-fiber-costs-per-day",
  "split-pea-soup-recipe-high-fiber",
  "cheapest-complete-protein-pairs",
]);

function read(path) {
  return readFileSync(path, "utf8");
}

function field(markdown, name) {
  const match = markdown.match(new RegExp(`^${name}:\\s*(.*)$`, "m"));
  if (!match) return undefined;
  const rest = match[1].trim();
  if (
    (rest.startsWith('"') && rest.endsWith('"')) ||
    (rest.startsWith("'") && rest.endsWith("'"))
  ) {
    return rest.slice(1, -1);
  }
  return rest;
}

function bodyOf(markdown) {
  return markdown.replace(/^---\r?\n[\s\S]*?\r?\n---/, "");
}

function rowsOf(path) {
  const parsed = parseCsv(read(path));
  const index = Object.fromEntries(parsed.header.map((name, i) => [name, i]));
  return parsed.rows.map((row) =>
    Object.fromEntries(Object.entries(index).map(([name, i]) => [name, row[i]])),
  );
}

function dayTotals(rows, gramKey) {
  const totals = new Map();
  for (const row of rows) {
    const key = row.day;
    const current = totals.get(key) ?? { cost: 0, grams: 0 };
    current.cost += Number(row.cost_usd);
    current.grams += Number(row[gramKey] || 0);
    totals.set(key, current);
  }
  return totals;
}

const costSlug = "cost-of-50g-protein-and-30g-fiber-per-day";
const trendSlug = "protein-per-dollar-2017-to-2026-bls-trends";
const costArticle = read(`src/data/articles/${costSlug}.md`);
const trendArticle = read(`src/data/articles/${trendSlug}.md`);
const later = read("tests/substantive-update-datemodified.test.mjs");
const redirects = read("public/_redirects");

test("the combined day page uses the two day-cost files and no CSV link", () => {
  const protein = dayTotals(rowsOf("public/data/protein-day-cost-2026.csv"), "protein_g");
  const fiber = dayTotals(rowsOf("public/data/fiber-day-cost-2026.csv"), "fiber_g");
  const rockProtein = protein.get("Day 1: Rock-bottom dry goods");
  const rockFiber = fiber.get("Day 1: Rock-bottom dry goods");
  assert.equal(rockProtein.cost.toFixed(2), "0.82");
  assert.equal(rockProtein.grams.toFixed(1), "52.7");
  assert.equal(rockFiber.cost.toFixed(2), "0.62");
  assert.equal(rockFiber.grams.toFixed(1), "31.9");

  assert.equal(field(costArticle, "author"), "David Miller");
  assert.equal(field(costArticle, "date"), "2026-11-26");
  assert.equal(field(costArticle, "dateModified"), "2026-11-26");
  assert.equal(field(costArticle, "substantiveUpdate"), "2026-11-26");
  assert.equal(field(costArticle, "image"), `/images/${costSlug}-chart.jpg`);
  assert.match(field(costArticle, "imageAlt"), /bar chart/i);
  assert.doesNotMatch(field(costArticle, "imageAlt"), /photo/i);
  assert.ok(field(costArticle, "excerpt").length <= 160);
  assert.match(costArticle, /protein-day-cost-2026\.csv/);
  assert.match(costArticle, /fiber-day-cost-2026\.csv/);
  assert.match(costArticle, /37\.13 g/);
  assert.match(costArticle, /52\.33 g/);
  assert.match(costArticle, /78\.6 g/);
  assert.match(costArticle, /\$1\.63/);
  assert.match(costArticle, /\$1\.44/);
  assert.match(costArticle, /\$27\.65/);
  assert.match(costArticle, /13\.32 g/);
  assert.match(costArticle, /13\.95 g/);
  assert.match(costArticle, /2\.16 g/);
  assert.doesNotMatch(costArticle, /FAQPage/);
  assert.doesNotMatch(costArticle, /\u2014/);
  assert.doesNotMatch(costArticle, /\]\([^)]*\.csv/);
  assert.doesNotMatch(costArticle, /\]\(\/[^)]*#/);
  assert.equal(INDEX_PRUNE_SLUGS.has(costSlug), false);
  assert.doesNotMatch(redirects, new RegExp(`^/${costSlug}/? `, "m"));
  assert.match(later, new RegExp(`"${costSlug}": "2026-11-26"`));
  assert.equal(existsSync(`public/images/${costSlug}-chart.jpg`), true);
  assert.equal(existsSync(`public/images/${costSlug}-main.jpg`), false);
  assert.equal(readFileSync(`public/images/${costSlug}-chart.jpg`).subarray(0, 3).toString("hex"), "ffd8ff");

  const links = [...bodyOf(costArticle).matchAll(/\]\((\/[^)\s]+)\)/g)]
    .map((match) => match[1])
    .filter((href) => !href.startsWith("/images/"));
  assert.ok(links.length >= 4);
  for (const href of links) {
    assert.match(href, /^\/[a-z0-9-]+\/$/, href);
    assert.equal(ORPHANS.has(href.slice(1, -1)), false, href);
    assert.equal(INDEX_PRUNE_SLUGS.has(href.slice(1, -1)), false, href);
  }
});

test("the BLS trend page uses the monthly and latest files and no CSV link", () => {
  const monthly = rowsOf("public/data/bls-nutrition-per-dollar-monthly.csv").filter(
    (row) => row.area_name === "U.S. city average",
  );
  const eggs = monthly.filter((row) => row.bls_item_code === "708111");
  const beef = monthly.filter((row) => row.bls_item_code === "703112");
  const eggByDate = new Map(eggs.map((row) => [row.date, row.protein_g_per_dollar]));
  const beefByDate = new Map(beef.map((row) => [row.date, row.protein_g_per_dollar]));
  assert.equal(eggByDate.get("2019-06-01"), "62.64");
  assert.equal(eggByDate.get("2025-03-01"), "12.10");
  assert.equal(eggByDate.get("2026-10-01"), "32.48");
  assert.equal(beefByDate.get("2017-01-01"), "21.92");
  assert.equal(beefByDate.get("2026-10-01"), "11.53");
  assert.equal(eggs[0].fdc_id, "171287");
  assert.equal(beef[0].fdc_id, "174036");

  assert.equal(field(trendArticle, "author"), "David Miller");
  assert.equal(field(trendArticle, "date"), "2026-11-26");
  assert.equal(field(trendArticle, "dateModified"), "2026-11-26");
  assert.equal(field(trendArticle, "substantiveUpdate"), "2026-11-26");
  assert.equal(field(trendArticle, "image"), `/images/${trendSlug}-chart.jpg`);
  assert.match(field(trendArticle, "imageAlt"), /line chart/i);
  assert.doesNotMatch(field(trendArticle, "imageAlt"), /photo/i);
  assert.ok(field(trendArticle, "excerpt").length <= 160);
  assert.match(trendArticle, /bls-nutrition-per-dollar-monthly\.csv/);
  assert.match(trendArticle, /bls-nutrition-per-dollar-latest\.csv/);
  assert.match(trendArticle, /62\.64 g/);
  assert.match(trendArticle, /12\.10 g/);
  assert.match(trendArticle, /32\.48 g/);
  assert.match(trendArticle, /21\.92 g/);
  assert.match(trendArticle, /11\.53 g/);
  assert.match(trendArticle, /708111/);
  assert.match(trendArticle, /709112/);
  assert.match(trendArticle, /706111/);
  assert.match(trendArticle, /FF1101/);
  assert.match(trendArticle, /703112/);
  assert.match(trendArticle, /701322/);
  assert.match(trendArticle, /171287/);
  assert.match(trendArticle, /171265/);
  assert.match(trendArticle, /171447/);
  assert.match(trendArticle, /171077/);
  assert.match(trendArticle, /174036/);
  assert.match(trendArticle, /169736/);
  assert.match(trendArticle, /October 2024/);
  assert.match(trendArticle, /no West row/);
  assert.doesNotMatch(trendArticle, /FAQPage/);
  assert.doesNotMatch(trendArticle, /\u2014/);
  assert.doesNotMatch(trendArticle, /\]\([^)]*\.csv/);
  assert.doesNotMatch(trendArticle, /\]\(\/[^)]*#/);
  assert.equal(INDEX_PRUNE_SLUGS.has(trendSlug), false);
  assert.doesNotMatch(redirects, new RegExp(`^/${trendSlug}/? `, "m"));
  assert.match(later, new RegExp(`"${trendSlug}": "2026-11-26"`));
  assert.equal(existsSync(`public/images/${trendSlug}-chart.jpg`), true);
  assert.equal(existsSync(`public/images/${trendSlug}-main.jpg`), false);
  assert.equal(readFileSync(`public/images/${trendSlug}-chart.jpg`).subarray(0, 3).toString("hex"), "ffd8ff");

  const links = [...bodyOf(trendArticle).matchAll(/\]\((\/[^)\s]+)\)/g)]
    .map((match) => match[1])
    .filter((href) => !href.startsWith("/images/"));
  assert.ok(links.length >= 4);
  for (const href of links) {
    assert.match(href, /^\/[a-z0-9-]+\/$/, href);
    assert.equal(ORPHANS.has(href.slice(1, -1)), false, href);
    assert.equal(INDEX_PRUNE_SLUGS.has(href.slice(1, -1)), false, href);
  }
});

test("contextual links come from stronger pages and do not move their dates", () => {
  const sources = [
    ["src/data/articles/what-50-grams-of-protein-costs-per-day.md", "2026-09-24", undefined, costSlug],
    ["src/data/articles/high-fiber-grocery-list-30-grams.md", "2026-11-25", "2026-11-25", costSlug],
    ["src/data/articles/protein-per-dollar-adjusted-for-quality.md", "2026-11-23", "2026-11-23", trendSlug],
    ["src/data/articles/high-protein-grocery-list-50-grams.md", "2026-11-25", "2026-11-25", trendSlug],
  ];
  for (const [path, dateModified, substantiveUpdate, slug] of sources) {
    const markdown = read(path);
    assert.match(markdown, new RegExp(`\\]\\(/${slug}/\\)`), path);
    assert.doesNotMatch(markdown, new RegExp(`/${slug}/#`), path);
    assert.equal(field(markdown, "dateModified"), dateModified, path);
    assert.equal(field(markdown, "substantiveUpdate"), substantiveUpdate, path);
    assert.equal(field(markdown, "author"), "David Miller", path);
  }
});

test("both new URLs are sitemap candidates once the site is built", () => {
  const dist = "dist";
  if (!existsSync(dist)) return;
  const xml = readdirSync(dist)
    .filter((name) => name.startsWith("sitemap") && name.endsWith(".xml"))
    .map((name) => read(join(dist, name)))
    .join("\n");
  if (!xml.includes("<loc>")) return;
  assert.match(xml, new RegExp(`https://www\\.daily-life-hacks\\.com/${costSlug}/`));
  assert.match(xml, new RegExp(`https://www\\.daily-life-hacks\\.com/${trendSlug}/`));
});
