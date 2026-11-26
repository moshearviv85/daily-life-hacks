import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { isIndexPruned } from "../src/content/index-prune.js";

const ROOT = new URL("..", import.meta.url).pathname;

const CRAWL_BRIDGES = [
  "high-protein-vs-high-fiber-satiety",
  "best-low-cost-protein-sources-large-families",
  "high-fiber-pizza-crust-cauliflower",
  "which-dried-beans-have-the-most-protein",
  "cheapest-canned-fish-and-seafood-protein-per-dollar",
  "how-much-100-grams-of-protein-costs-per-day",
];

const BENCHMARKS = [
  "cost-of-50g-protein-and-30g-fiber-per-day",
  "protein-per-dollar-2017-to-2026-bls-trends",
  "plant-vs-animal-protein-cost-per-dollar",
  "us-regional-grocery-protein-prices-october-2026",
  "one-dollar-of-protein-vs-one-dollar-of-fiber",
  "canned-vs-dry-beans-cost-and-sodium-per-serving",
  "high-protein-vs-high-fiber-satiety",
  "best-low-cost-protein-sources-large-families",
];

function read(path) {
  return readFileSync(join(ROOT, path), "utf8");
}

function field(frontmatter, name) {
  const match = frontmatter.match(
    new RegExp(`^${name}:\\s*["']?([^"'\\n#]+?)["']?\\s*$`, "m"),
  );
  return match ? match[1].trim() : "";
}

function articleMeta(slug) {
  const raw = read(`src/data/articles/${slug}.md`);
  const frontmatter = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? "";
  return {
    author: field(frontmatter, "author"),
    release: field(frontmatter, "publishAt") || field(frontmatter, "date"),
  };
}

test("crawl bridges and benchmark targets exist, are indexable, and are David Miller", () => {
  const orphanTest = read("tests/orphan-contextual-inlinks.test.mjs");
  const orphanBlock = orphanTest.match(/const ORPHANS = \[([\s\S]*?)\];/)?.[1] ?? "";
  const slugs = [...new Set([...CRAWL_BRIDGES, ...BENCHMARKS])];
  for (const slug of slugs) {
    assert.equal(existsSync(join(ROOT, "src/data/articles", `${slug}.md`)), true, slug);
    assert.equal(isIndexPruned(slug), false, `${slug} is pruned`);
    assert.equal(orphanBlock.includes(`"${slug}"`), false, `${slug} locks dateModified as an orphan`);
    const meta = articleMeta(slug);
    assert.equal(meta.author, "David Miller", slug);
    assert.ok(meta.release && Date.parse(meta.release) <= Date.now(), `${slug} is unreleased`);
    assert.equal(slug.includes("#"), false);
    assert.equal(slug.includes("."), false);
  }
});

test("FreshToday server-renders category cards and the six crawl-path bridges", () => {
  const source = read("src/components/FreshToday.astro");
  const scriptAt = source.indexOf("<script");
  const template = source.slice(0, scriptAt);

  assert.match(template, /data-fresh-today-ssr=/);
  assert.match(template, /Crawl-Path Bridges & Recent 2026 Studies/);
  assert.match(template, /existsSync/);
  assert.match(template, /!isIndexPruned/);
  assert.match(template, /!isReleased/);
  assert.match(template, /author !== "David Miller"/);
  assert.match(source, /function articleHref\(slug\)/);
  assert.match(source, /'<a href="' \+/);
  assert.equal(source.includes('href="/${article.slug}'), false);
  assert.doesNotMatch(source, /FAQPage/);
  assert.doesNotMatch(template, /href="[^"]*\.csv/);
  assert.doesNotMatch(template, /href="[^"]*#/);
  assert.doesNotMatch(template, /href=\{`[^`]*#/);
  assert.doesNotMatch(template, /href="\/nutrition\/"/);
  assert.doesNotMatch(template, /\bphoto\b/i);
  assert.doesNotMatch(source, /\u2014/);

  for (const slug of CRAWL_BRIDGES) {
    assert.match(template, new RegExp(`"${slug}"`));
  }
});

test("statistics hub links the recent benchmark studies without new file or hash links", () => {
  const source = read("src/pages/statistics/index.astro");
  const start = source.indexOf("data-recent-benchmarks");
  const end = source.indexOf("Which foods provide the most fiber per dollar?");
  assert.ok(start > 0 && end > start, "benchmark section should sit above the fiber table");
  const section = source.slice(start, end);

  assert.match(source, /Recent Statistical Benchmarks & Cost Studies/);
  assert.match(source, /existsSync/);
  assert.match(source, /!isIndexPruned/);
  assert.match(source, /!isReleased/);
  assert.match(source, /author !== "David Miller"/);
  assert.match(source, /DATA_VERSION/);
  assert.doesNotMatch(source, /FAQPage/);
  assert.doesNotMatch(section, /\.csv/);
  assert.doesNotMatch(section, /#/);
  assert.doesNotMatch(section, /href="\/nutrition\/"/);
  assert.doesNotMatch(section, /\bphoto\b/i);
  assert.doesNotMatch(source, /\u2014/);

  for (const slug of BENCHMARKS) {
    assert.match(source, new RegExp(`"${slug}"`));
  }
});

test("built homepage and statistics include the canonical study paths", () => {
  const homePath = join(ROOT, "dist/index.html");
  const statsPath = join(ROOT, "dist/statistics/index.html");
  const nutritionPath = join(ROOT, "dist/nutrition/index.html");
  if (!existsSync(homePath) || !existsSync(statsPath)) return;

  const home = readFileSync(homePath, "utf8");
  const stats = readFileSync(statsPath, "utf8");
  const bridgeStart = home.indexOf("data-crawl-path-bridges");
  const bridges = home.slice(bridgeStart, home.indexOf("</ul>", bridgeStart));
  const benchmarks = stats.slice(
    stats.indexOf("Recent Statistical Benchmarks"),
    stats.indexOf("Which foods provide the most fiber per dollar?"),
  );

  assert.ok(home.includes("data-fresh-today-ssr"), "homepage should server-render fresh cards");
  assert.equal(home.includes("Loading latest nutrition post"), false);
  for (const slug of CRAWL_BRIDGES) {
    assert.match(bridges, new RegExp(`href="/${slug}/"`));
    assert.equal(bridges.includes(`href="/${slug}#`), false);
    assert.equal(bridges.includes(`${slug}.csv`), false);
  }
  for (const slug of BENCHMARKS) {
    assert.match(benchmarks, new RegExp(`href="/${slug}/"`));
    assert.equal(benchmarks.includes(`href="/${slug}#`), false);
    assert.equal(benchmarks.includes(`${slug}.csv`), false);
  }
  assert.equal(stats.includes("FAQPage"), false);
  assert.equal(benchmarks.includes('href="/nutrition/"'), false);
  assert.equal(bridges.includes('href="/nutrition/"'), false);

  if (existsSync(nutritionPath)) {
    const nutrition = readFileSync(nutritionPath, "utf8");
    const anchors = [...nutrition.matchAll(/<a\b/gi)].length;
    assert.ok(anchors <= 124, `/nutrition/ rendered ${anchors} anchors`);
  }
});
