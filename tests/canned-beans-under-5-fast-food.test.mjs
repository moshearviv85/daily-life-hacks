import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import sharp from "sharp";

import { INDEX_PRUNE_SLUGS } from "../src/content/index-prune.js";
import { isAiHeroFilename } from "../scripts/lib/ai-image-iptc.mjs";

const ROOT = join(import.meta.dirname, "..");
const DAY = "2026-11-26";
const BEANS = "canned-vs-dry-beans-cost-and-sodium-per-serving";
const FAST = "cheapest-fast-food-protein-under-5-dollars";
const BEAN_H2 = "How much extra do canned beans cost per serving, and how much sodium do they add vs. dry beans?";
const FAST_H2 = "Which fast-food items under $5 give the most protein per dollar?";
const SODIUM_NOTE = /differ only in sodium, (\d+(?:\.\d+)?) vs (\d+(?:\.\d+)?)/;

function read(path) {
  return readFileSync(join(ROOT, path), "utf8");
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else quoted = false;
      } else cell += char;
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (char !== "\r") cell += char;
  }
  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }
  const [header, ...body] = rows.filter((line) => line.some((value) => value !== ""));
  return body.map((line) => Object.fromEntries(header.map((key, index) => [key, line[index] ?? ""])));
}

function article(slug) {
  return read(`src/data/articles/${slug}.md`);
}

function frontmatter(markdown) {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  assert.ok(match, "missing frontmatter");
  return match[1];
}

function field(markdown, name) {
  const match = frontmatter(markdown).match(new RegExp(`^${name}:\\s*"?([^"\\n]+?)"?\\s*$`, "m"));
  return match ? match[1] : null;
}

function body(markdown) {
  return markdown.split(/\n---\n/).slice(1).join("\n---\n");
}

function words(text) {
  const plain = text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/[#*_]/g, "");
  return plain.split(/\s+/).filter(Boolean);
}

function markdownTable(markdown, header) {
  const lines = markdown.split(/\r?\n/);
  const start = lines.indexOf(header);
  assert.notEqual(start, -1, header);
  const rows = [];
  for (const line of lines.slice(start + 2)) {
    if (!line.startsWith("|")) break;
    rows.push(
      line
        .slice(1, -1)
        .split("|")
        .map((cell) => cell.trim()),
    );
  }
  return rows;
}

function orphanSlugs() {
  const source = read("tests/orphan-contextual-inlinks.test.mjs");
  const block = source.match(/const ORPHANS = \[([\s\S]*?)\];/);
  assert.ok(block, "ORPHANS list");
  return [...block[1].matchAll(/"([^"]+)"/g)].map((match) => match[1]);
}

function assertCanonicalArticleLinks(markdown) {
  const orphans = new Set(orphanSlugs());
  for (const match of body(markdown).matchAll(/\]\((\/[^)\s]+)\)/g)) {
    const href = match[1];
    if (href.startsWith("/images/")) continue;
    assert.equal(href.includes("#"), false, href);
    assert.equal(href.endsWith("/"), true, href);
    assert.equal(href.includes("."), false, href);
    const slug = href.slice(1, -1);
    assert.equal(orphans.has(slug), false, href);
    assert.equal(INDEX_PRUNE_SLUGS.has(slug), false, href);
  }
}

function sodiumByFdc() {
  const sodium = new Map(
    parseCsv(read("public/data/sodium-per-dollar-2026.csv")).map((row) => [row.fdc_id, row.sodium_mg_per_100g]),
  );
  for (const row of parseCsv(read("public/data/protein-per-dollar-2026.csv"))) {
    if (sodium.has(row.fdc_id)) continue;
    const match = SODIUM_NOTE.exec(row.nutrition_source_note || "");
    if (match) sodium.set(row.fdc_id, match[1]);
  }
  return sodium;
}

function moneyFor20(gramsPerDollar) {
  return `$${(20 / Number(gramsPerDollar)).toFixed(2)}`;
}

test("canned versus dry beans is a 10-row chart hero with the price and sodium gap", () => {
  const markdown = article(BEANS);
  assert.equal(field(markdown, "author"), "David Miller");
  assert.equal(field(markdown, "date"), DAY);
  assert.equal(field(markdown, "dateModified"), DAY);
  assert.equal(field(markdown, "substantiveUpdate"), DAY);
  assert.equal(field(markdown, "image"), `/images/${BEANS}-chart.jpg`);
  assert.equal(markdown.includes("FAQPage"), false);
  assert.equal(markdown.includes("\u2014"), false);
  assert.match(read("tests/substantive-update-datemodified.test.mjs"), new RegExp(`"${BEANS}": "${DAY}"`));
  assert.equal(INDEX_PRUNE_SLUGS.has(BEANS), false);
  assert.doesNotMatch(read("public/_redirects"), new RegExp(`^/${BEANS}(?:/)?\\s`, "m"));
  assert.equal(existsSync(join(ROOT, "public/images", `${BEANS}-main.jpg`)), false);
  assert.equal(isAiHeroFilename(`${BEANS}-chart.jpg`), false);
  assert.match(markdown, /canned-vs-dry-beans-cost-2026\.csv/);
  assert.match(markdown, /beans-double-win-fiber-protein-2026\.csv/);
  assert.match(markdown, /sodium-per-dollar-2026\.csv/);
  assert.match(markdown, /21 CFR 101\.61/);
  assert.doesNotMatch(markdown, /\[[^\]]*\]\([^)]*\.csv[^)]*\)/);
  assert.ok(body(markdown).includes(`## ${BEAN_H2}\n`));
  const answer = body(markdown).split(`## ${BEAN_H2}`)[1].trim().split(/\n\s*\n/)[0];
  const count = words(answer).length;
  assert.ok(count >= 40 && count <= 60, `bean answer is ${count} words`);
  assert.match(answer, /\$0\.34/);
  assert.match(answer, /\$0\.66/);
  assert.match(answer, /1\.9 times/);
  assert.match(answer, /2\.6 times/);
  assert.match(answer, /384 mg/);

  const fiber = new Map(
    parseCsv(read("public/data/beans-double-win-fiber-protein-2026.csv")).map((row) => [row.fdc_id, row]),
  );
  const sodium = sodiumByFdc();
  const expected = parseCsv(read("public/data/canned-vs-dry-beans-cost-2026.csv"));
  assert.equal(expected.length, 10);
  const actual = markdownTable(
    markdown,
    "| Food | Protein per $ | Fiber per $ | Sodium per 100 g | 20 g protein | Package | FDC |",
  );
  assert.equal(actual.length, 10);
  expected.forEach((row, index) => {
    const matched = fiber.get(row.fdc_id);
    assert.equal(matched.protein_g_per_dollar, row.value, row.food);
    assert.ok(sodium.has(row.fdc_id), row.fdc_id);
    const cells = actual[index];
    assert.equal(cells[0], row.food);
    assert.equal(cells[1], `${row.value} g`);
    assert.equal(cells[2], `${matched.fiber_g_per_dollar} g`);
    assert.equal(cells[3], `${sodium.get(row.fdc_id)} mg`);
    assert.equal(cells[4], moneyFor20(row.value));
    assert.equal(cells[5], `${row.package} for $${row.package_price_usd}`);
    assert.equal(cells[6], `[${row.fdc_id}](${row.source_url})`);
  });
  assertCanonicalArticleLinks(markdown);
});

test("under-$5 fast food is a 10-item chart hero distinct from the fiber meals", () => {
  const markdown = article(FAST);
  assert.equal(field(markdown, "author"), "David Miller");
  assert.equal(field(markdown, "date"), DAY);
  assert.equal(field(markdown, "dateModified"), DAY);
  assert.equal(field(markdown, "substantiveUpdate"), DAY);
  assert.equal(field(markdown, "image"), `/images/${FAST}-chart.jpg`);
  assert.equal(markdown.includes("FAQPage"), false);
  assert.equal(markdown.includes("\u2014"), false);
  assert.match(read("tests/substantive-update-datemodified.test.mjs"), new RegExp(`"${FAST}": "${DAY}"`));
  assert.equal(INDEX_PRUNE_SLUGS.has(FAST), false);
  assert.doesNotMatch(read("public/_redirects"), new RegExp(`^/${FAST}(?:/)?\\s`, "m"));
  assert.equal(existsSync(join(ROOT, "public/images", `${FAST}-main.jpg`)), false);
  assert.equal(isAiHeroFilename(`${FAST}-chart.jpg`), false);
  assert.match(markdown, /fastfood-protein-per-dollar-2026\.csv/);
  assert.match(markdown, /2,300 mg/);
  assert.match(markdown, /Dietary Guidelines for Americans, 2025-2030/);
  assert.doesNotMatch(markdown, /\[[^\]]*\]\([^)]*\.csv[^)]*\)/);
  assert.ok(body(markdown).includes(`## ${FAST_H2}\n`));
  const answer = body(markdown).split(`## ${FAST_H2}`)[1].trim().split(/\n\s*\n/)[0];
  const count = words(answer).length;
  assert.ok(count >= 40 && count <= 60, `fast-food answer is ${count} words`);
  assert.match(answer, /8\.4 g per dollar/);
  assert.match(answer, /\$1\.59/);

  const priced = parseCsv(read("public/data/fastfood-protein-per-dollar-2026.csv"));
  const expected = priced
    .filter((row) => Number(row.price_usd) <= 5)
    .sort((left, right) => Number(right.protein_g_per_dollar) - Number(left.protein_g_per_dollar));
  assert.equal(expected.length, 10);
  const actual = markdownTable(
    markdown,
    "| Chain | Item | Price | Protein | Protein per $ | Chain disclosure | Price basis |",
  );
  assert.equal(actual.length, 10);
  expected.forEach((row, index) => {
    const cells = actual[index];
    assert.equal(cells[0], row.chain);
    assert.equal(cells[1], row.item);
    assert.equal(cells[2], `$${row.price_usd}`);
    assert.equal(cells[3], `${row.protein_g} g`);
    assert.equal(cells[4], `${row.protein_g_per_dollar} g`);
  });
  assert.equal(actual[0][1], "High Protein Cup (4 oz chicken)");
  assert.equal(actual.at(-1)[1], "McChicken");
  assert.match(markdown, /\/fast-food-meals-with-protein-and-fiber\//);
  assert.match(markdown, /\/canned-vs-dry-beans-cost-and-sodium-per-serving\//);
  assertCanonicalArticleLinks(markdown);
});

test("chart heroes are 1200 by 675 JPEGs generated from the CSVs", async () => {
  const beanScript = read("scripts/generate-canned-vs-dry-beans-chart.py");
  const fastScript = read("scripts/generate-under-5-fast-food-chart.py");
  assert.match(beanScript, /canned-vs-dry-beans-cost-2026\.csv/);
  assert.match(beanScript, /sodium-per-dollar-2026\.csv/);
  assert.match(fastScript, /fastfood-protein-per-dollar-2026\.csv/);
  assert.match(fastScript, /PRICE_CAP = 5\.0/);
  assert.doesNotMatch(beanScript, /-main\.jpg/);
  assert.doesNotMatch(fastScript, /-main\.jpg/);
  for (const slug of [BEANS, FAST]) {
    const path = join(ROOT, "public/images", `${slug}-chart.jpg`);
    const bytes = readFileSync(path);
    assert.equal(bytes[0], 0xff);
    assert.equal(bytes[1], 0xd8);
    const meta = await sharp(bytes).metadata();
    assert.equal(meta.format, "jpeg");
    assert.equal(meta.width, 1200);
    assert.equal(meta.height, 675);
  }
});

test("printable link sources use one canonical path and no file link", () => {
  const sources = [
    ["src/pages/printables/bean-conversion-card/index.astro", `/${BEANS}/`],
    ["src/pages/printables/weekly-grocery-budget-planner/index.astro", `/${BEANS}/`],
    ["src/pages/printables/fridge-life-card/index.astro", `/${FAST}/`],
    ["src/pages/printables/smoke-point-chart/index.astro", `/${FAST}/`],
  ];
  for (const [path, href] of sources) {
    const source = read(path);
    const hits = source.match(new RegExp(href.replaceAll("/", "\\/"), "g")) ?? [];
    assert.equal(hits.length, 1, path);
    assert.equal(source.includes(`${href}#`), false, path);
    assert.doesNotMatch(source, /\[[^\]]*\]\([^)]*\.csv/);
    assert.equal(source.includes("FAQPage"), false, path);
  }
});

test("built sitemap lists both new pages and neither emits FAQPage", () => {
  const sitemapPath = join(ROOT, "dist/sitemap-0.xml");
  if (!existsSync(sitemapPath)) return;
  const sitemap = readFileSync(sitemapPath, "utf8");
  for (const slug of [BEANS, FAST]) {
    assert.match(sitemap, new RegExp(`https://www\\.daily-life-hacks\\.com/${slug}/`));
    const html = readFileSync(join(ROOT, "dist", slug, "index.html"), "utf8");
    assert.equal(html.includes("FAQPage"), false, slug);
    assert.match(html, /David Miller/);
    assert.doesNotMatch(html, /href="[^"]*\.csv/i, slug);
    assert.doesNotMatch(html, /href="\/[^"]*#[^"]*"/, slug);
    assert.match(html, new RegExp(`/images/${slug}-chart\\.jpg`));
  }
});
