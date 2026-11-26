import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { loadProteinPairs } from "../src/content/complete-protein-pairs.mjs";
import { loadFastFoodIndex } from "../src/content/fast-food-protein-fiber-index.mjs";
import { INDEX_NOINDEX_TOOL_PATHS, INDEX_PRUNE_SLUGS } from "../src/content/index-prune.js";

const ROOT = process.cwd();
const FAST_FOOD = "src/pages/data/fast-food-protein-and-fiber-index/index.astro";
const PAIR = "src/pages/tools/complete-protein-pair-builder/index.astro";

function read(path) {
  return readFileSync(join(ROOT, path), "utf8");
}

function orphanSlugs() {
  const source = read("tests/orphan-contextual-inlinks.test.mjs");
  const block = source.match(/const ORPHANS = \[([\s\S]*?)\];/);
  assert.ok(block, "ORPHANS list");
  return new Set([...block[1].matchAll(/"([^"]+)"/g)].map((match) => match[1]));
}

function hrefs(source) {
  return [...source.matchAll(/href="(\/[^"]*)"/g)].map((match) => match[1]);
}

test("the restaurant index and pair builder stay indexable and off the orphan list", () => {
  const orphans = orphanSlugs();
  const pages = [
    {
      file: FAST_FOOD,
      path: "data/fast-food-protein-and-fiber-index",
      links: [
        "/fast-food-protein-per-dollar-ranked/",
        "/fast-food-meals-with-protein-and-fiber/",
        "/cheapest-fast-food-protein-under-5-dollars/",
      ],
    },
    {
      file: PAIR,
      path: "tools/complete-protein-pair-builder",
      links: [
        "/protein-per-dollar-adjusted-for-quality/",
        "/beans-and-rice-complete-protein-meal/",
        "/can-you-eat-rice-and-beans-everyday/",
      ],
    },
  ];

  for (const page of pages) {
    const source = read(page.file);
    assert.match(source, /David Miller/, page.file);
    assert.equal(source.includes("FAQPage"), false, page.file);
    assert.equal(source.includes("\u2014"), false, page.file);
    assert.doesNotMatch(source, /photo/i, page.file);
    assert.equal(INDEX_PRUNE_SLUGS.has(page.path), false, page.path);
    assert.equal(INDEX_PRUNE_SLUGS.has(page.path.split("/").pop()), false, page.path);
    assert.equal(INDEX_NOINDEX_TOOL_PATHS.has(page.path), false, page.path);
    for (const href of hrefs(source)) {
      assert.equal(href.includes("#"), false, href);
      assert.equal(href.includes(".csv"), false, href);
      assert.equal(href.endsWith("/"), true, href);
      const slug = href.slice(1, -1);
      assert.equal(orphans.has(slug), false, `${page.file} links orphan ${slug}`);
      assert.equal(orphans.has(slug.split("/").pop()), false, `${page.file} links orphan ${slug}`);
      assert.equal(INDEX_PRUNE_SLUGS.has(slug), false, href);
      assert.equal(INDEX_PRUNE_SLUGS.has(slug.split("/").pop()), false, href);
    }
    for (const href of page.links) {
      assert.equal(source.includes(`href="${href}"`), true, href);
    }
  }
});

test("both chart heroes are JPEGs built from the published CSVs", () => {
  for (const file of [
    "public/images/fast-food-protein-and-fiber-index-chart.jpg",
    "public/images/complete-protein-pair-builder-chart.jpg",
  ]) {
    const bytes = readFileSync(join(ROOT, file));
    assert.equal(bytes.subarray(0, 3).toString("hex"), "ffd8ff", file);
    assert.ok(bytes.length > 10_000, file);
  }
  const proteinChart = read("scripts/generate-fast-food-protein-and-fiber-index-chart.py");
  const pairChart = read("scripts/generate-complete-protein-pair-builder-chart.py");
  assert.match(proteinChart, /fastfood-protein-per-dollar-2026\.csv/);
  assert.match(proteinChart, /high-fiber-fast-food-2026\.csv/);
  assert.match(pairChart, /cheapest-complete-protein-pairs-2026\.csv/);
  assert.doesNotMatch(proteinChart, /8\.4|18\.7/);
  assert.doesNotMatch(pairChart, /86\.8/);
});

test("the explorers use the published row counts and the locked link sources", () => {
  const food = loadFastFoodIndex();
  const pairs = loadProteinPairs();
  assert.equal(food.rows.length, 59);
  assert.equal(food.rows.filter((row) => row.sheet === "protein").length, 30);
  assert.equal(food.rows.filter((row) => row.sheet === "fiber").length, 29);
  assert.equal(pairs.pairs.length, 20);
  assert.equal(pairs.pairs[0].value, "86.8");
  assert.equal(pairs.pulses.length + pairs.grains.length + pairs.others.length, 25);

  const chipotle = food.summary.find((row) => row.chain === "Chipotle");
  assert.equal(chipotle.proteinMean, 5.3);
  assert.equal(chipotle.fiberMean, 18.7);

  const reuse = read("src/pages/data-reuse.astro");
  assert.match(reuse, /dateModified: "2026-07-29"/);
  assert.match(reuse, /href="\/data\/fast-food-protein-and-fiber-index\/"/);
  assert.match(read("src/pages/api-docs.astro"), /href="\/data\/fast-food-protein-and-fiber-index\/"/);
  assert.match(
    read("src/pages/tools/fiber-per-dollar-calculator.astro"),
    /href="\/tools\/complete-protein-pair-builder\/"/,
  );
  assert.match(
    read("src/pages/tools/shopping-list-builder/index.astro"),
    /href="\/tools\/complete-protein-pair-builder\/"/,
  );
});

test("built explorers are in the sitemap and omit FAQPage", () => {
  const sitemapPath = join(ROOT, "dist/sitemap-0.xml");
  if (!existsSync(sitemapPath)) return;
  const sitemap = readFileSync(sitemapPath, "utf8");
  for (const path of [
    "/data/fast-food-protein-and-fiber-index/",
    "/tools/complete-protein-pair-builder/",
  ]) {
    assert.match(sitemap, new RegExp(`https://www\\.daily-life-hacks\\.com${path}`));
    const html = readFileSync(join(ROOT, "dist", path.slice(1), "index.html"), "utf8");
    assert.equal(html.includes("FAQPage"), false, path);
    assert.match(html, /David Miller/);
    assert.match(html, /<meta name="robots" content="index, follow/);
    assert.doesNotMatch(html, /href="[^"]*\.csv/i);
    assert.doesNotMatch(html, /href="[^"]*#/);
  }
});
