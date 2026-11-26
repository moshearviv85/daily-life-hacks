import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { INDEX_PRUNE_SLUGS } from "../src/content/index-prune.js";

const ROOT = new URL("..", import.meta.url).pathname;

function read(path) {
  return readFileSync(join(ROOT, path), "utf8");
}

function field(markdown, name) {
  const front = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? "";
  const line = front.match(new RegExp(`^${name}:\\s*(.+)$`, "m"))?.[1]?.trim() ?? "";
  return line.replace(/^["']|["']$/g, "");
}

function words(text) {
  const visible = text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  return visible.match(/\b[\p{L}\p{N}][\p{L}\p{N}'’.%-]*\b/gu) ?? [];
}

const ANIMAL_TITLE = "Cheapest Animal Protein: Drumsticks, Then Eggs";
const ANIMAL_EXCERPT =
  "Chicken drumsticks top 21 animal proteins at 50.3 g per dollar. Eggs hit 34.4, milk 28.5, and bacon trails at 9.4. July 2026 prices.";
const PORTION_HEADING =
  "## How much does a 30-gram serving of animal protein cost across chicken, eggs, dairy, fish, and beef?";
const FAST_HEADING =
  "## Which fast-food meals actually give you at least 20 grams of protein and 10 grams of fiber?";

test("animal protein page adds the 30 g serving table without a CSV link", () => {
  const slug = "animal-protein-per-dollar-ranked";
  const markdown = read(`src/data/articles/${slug}.md`);
  assert.equal(field(markdown, "title"), ANIMAL_TITLE);
  assert.equal(field(markdown, "excerpt"), ANIMAL_EXCERPT);
  assert.equal(field(markdown, "author"), "David Miller");
  assert.equal(field(markdown, "dateModified"), "2026-11-25");
  assert.equal(field(markdown, "substantiveUpdate"), "2026-11-25");
  assert.match(markdown, new RegExp(`^${PORTION_HEADING.replace("?", "\\?")}$`, "m"));
  const answer = markdown.split(PORTION_HEADING)[1].trim().split(/\n\s*\n/)[0];
  const count = words(answer).length;
  assert.ok(count >= 40 && count <= 60, `portion answer is ${count} words`);
  assert.match(answer, /animal-protein-per-dollar-ranked-2026\.csv/);
  assert.match(answer, /\$0\.60/);
  assert.match(answer, /\$2\.65/);
  assert.doesNotMatch(answer, /\]\([^)]*\.csv/);

  const table = markdown.slice(markdown.indexOf("| Food | FDC |")).split(/\n\s*\n/)[0];
  for (const row of [
    "172373",
    "50.3 g",
    "$0.60",
    "171287",
    "34.4 g",
    "$0.87",
    "171244",
    "30.1 g",
    "$1.00",
    "171265",
    "28.5 g",
    "$1.05",
    "171077",
    "24.6 g",
    "$1.22",
    "173709",
    "22.4 g",
    "$1.34",
    "174036",
    "11.3 g",
    "$2.65",
  ]) {
    assert.match(table, new RegExp(row.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.equal((table.match(/^\|/gm) ?? []).length, 9, "header, separator, and 7 foods");
  assert.doesNotMatch(markdown, /\]\([^)]*\.csv/);
  assert.doesNotMatch(markdown, /FAQPage/);
  assert.match(
    read("tests/substantive-update-datemodified.test.mjs"),
    new RegExp(`"${slug}": "2026-11-25"`),
  );
});

test("fast-food protein and fiber page is a chart-hero article in the sitemap set", () => {
  const slug = "fast-food-meals-with-protein-and-fiber";
  const markdown = read(`src/data/articles/${slug}.md`);
  const redirects = read("public/_redirects");
  assert.equal(INDEX_PRUNE_SLUGS.has(slug), false);
  assert.doesNotMatch(redirects, new RegExp(`^/${slug}(?:/)?\\s`, "m"));
  assert.equal(field(markdown, "author"), "David Miller");
  assert.equal(field(markdown, "date"), "2026-11-25");
  assert.equal(field(markdown, "dateModified"), "2026-11-25");
  assert.equal(field(markdown, "substantiveUpdate"), "2026-11-25");
  assert.equal(
    field(markdown, "image"),
    "/images/fast-food-meals-with-protein-and-fiber-chart.jpg",
  );
  assert.equal(existsSync(join(ROOT, "public/images", `${slug}-chart.jpg`)), true);
  assert.match(markdown, /fast-food-meals-with-protein-and-fiber-chart\.jpg/);
  assert.doesNotMatch(markdown, /FAQPage|photograph|real photo/i);
  assert.doesNotMatch(markdown, /\]\([^)]*\.csv/);
  assert.match(markdown, /high-fiber-fast-food-2026\.csv/);
  assert.match(markdown, /fastfood-protein-per-dollar-2026\.csv/);
  assert.match(markdown, new RegExp(`^${FAST_HEADING.replace("?", "\\?")}$`, "m"));
  const answer = markdown.split(FAST_HEADING)[1].trim().split(/\n\s*\n/)[0];
  const count = words(answer).length;
  assert.ok(count >= 40 && count <= 60, `fast-food answer is ${count} words`);
  for (const pair of ["49 g", "11 g", "43 g", "17 g", "14 g", "26 g", "10 g", "25 g", "18 g", "23 g", "22 g", "19 g"]) {
    assert.match(markdown, new RegExp(pair.replace(" ", "\\s")));
  }
  for (const href of markdown.match(/\]\((\/[^)]+)\)/g) ?? []) {
    assert.equal(href.includes("#"), false, href);
    if (href.includes("/images/")) continue;
    assert.match(href, /\]\(\/[a-z0-9-]+\/\)$/);
  }
  assert.match(
    read("tests/substantive-update-datemodified.test.mjs"),
    new RegExp(`"${slug}": "2026-11-25"`),
  );
});

test("contextual links land on the new pages and leave source dates alone", () => {
  const sources = [
    ["src/data/articles/best-way-to-cook-chicken.md", "/animal-protein-per-dollar-ranked/", "2026-07-20", null],
    ["src/data/articles/costco-rotisserie-chicken-meal-ideas-dinner.md", "/animal-protein-per-dollar-ranked/", "2026-11-25", "2026-11-25"],
    ["src/data/articles/fast-food-protein-per-dollar-ranked.md", "/fast-food-meals-with-protein-and-fiber/", "2026-09-24", null],
    ["src/data/articles/beans-double-win-fiber-protein.md", "/fast-food-meals-with-protein-and-fiber/", "2026-09-24", null],
  ];
  for (const [path, href, modified, substantive] of sources) {
    const markdown = read(path);
    assert.match(markdown, new RegExp(`\\]\\(${href.replaceAll("/", "\\/")}\\)`), path);
    assert.equal(field(markdown, "dateModified"), modified, path);
    assert.equal(field(markdown, "substantiveUpdate"), substantive ?? "", path);
  }
});
