import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import sharp from "sharp";

import { CATEGORY_HUBS, assembleHub } from "../src/content/category-hubs.ts";
import { INDEX_PRUNE_SLUGS } from "../src/content/index-prune.js";
import { extractFrontmatterField } from "../src/content/modified-date.mjs";

const ROOT = join(import.meta.dirname, "..");
const DAY = "2026-11-26";
const SNACK = "cheapest-high-fiber-snacks-per-dollar";
const SODIUM = "how-to-cut-sodium-in-canned-beans-and-budget-meals";
const NOTE = /differ only in sodium, (\d+(?:\.\d+)?) vs (\d+(?:\.\d+)?)/;

const LINK_SOURCES = [
  ["src/pages/tips/index.astro", `/${SNACK}/`],
  ["src/components/KitchenCalculator.astro", `/${SNACK}/`],
  ["src/pages/printables/bean-conversion-card/index.astro", `/${SODIUM}/`],
  ["src/pages/tools/dried-beans-to-canned-converter/index.astro", `/${SODIUM}/`],
];

const SODIUM_BARS = [
  ["172688", "100% whole wheat bread", "sodium file"],
  ["175188", "Canned black beans", "protein note, regular can"],
  ["173741", "Canned kidney beans", "sodium file"],
  ["175206", "Canned chickpeas", "protein note, regular can"],
  ["173709", "Canned tuna (chunk light, in water)", "sodium file, drained solids"],
  ["172373", "Chicken drumsticks (bone-in)", "sodium file"],
  ["171077", "Chicken breast (boneless, skinless)", "sodium file"],
  ["170894", "Greek yogurt (plain, nonfat)", "sodium file"],
  ["173756", "Chickpeas (dry)", "sodium file"],
  ["175199", "Pinto beans (dry)", "sodium file"],
  ["170562", "Sunflower seed kernels", "sodium file"],
  ["168410", "Frozen shelled edamame", "sodium file"],
  ["173734", "Black beans (dry)", "sodium file"],
  ["173745", "Navy beans (dry)", "sodium file"],
  ["170567", "Almonds", "sodium file"],
];

function read(path) {
  return readFileSync(join(ROOT, path), "utf8");
}

function field(markdown, name) {
  return extractFrontmatterField(markdown, name);
}

function body(markdown) {
  return markdown.split("---").slice(2).join("---");
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
      row.push(cell.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      cell = "";
    } else cell += char;
  }
  if (cell.length || row.length) {
    row.push(cell.replace(/\r$/, ""));
    rows.push(row);
  }
  const [headers, ...data] = rows.filter((line) => line.some((value) => value !== ""));
  return data.map((line) =>
    Object.fromEntries(headers.map((header, index) => [header, line[index] ?? ""])),
  );
}

function halfUp(value, places) {
  const factor = 10 ** places;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function money(value) {
  return `$${halfUp(value, 2).toFixed(2)}`;
}

function markdownTable(markdown, header) {
  const lines = body(markdown).split("\n");
  const start = lines.findIndex((line) => line.trim() === header);
  assert.ok(start >= 0, header);
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

function assertClean(markdown, slug) {
  const orphans = new Set(orphanSlugs());
  assert.equal(field(markdown, "author"), "David Miller", slug);
  assert.equal(field(markdown, "category"), "tips", slug);
  assert.equal(field(markdown, "date"), DAY, slug);
  assert.equal(field(markdown, "dateModified"), DAY, slug);
  assert.equal(field(markdown, "substantiveUpdate"), DAY, slug);
  assert.equal(field(markdown, "image"), `/images/${slug}-chart.jpg`, slug);
  assert.match(field(markdown, "imageAlt"), /chart/i, slug);
  assert.doesNotMatch(field(markdown, "imageAlt"), /photo/i, slug);
  const excerpt = field(markdown, "excerpt");
  assert.ok(excerpt.length >= 130 && excerpt.length <= 160, `${slug} excerpt ${excerpt.length}`);
  assert.equal(markdown.includes("FAQPage"), false, slug);
  assert.equal(markdown.includes("\u2014"), false, slug);
  assert.match(read("tests/substantive-update-datemodified.test.mjs"), new RegExp(`"${slug}": "${DAY}"`));
  assert.equal(INDEX_PRUNE_SLUGS.has(slug), false, slug);
  assert.equal(existsSync(join(ROOT, "public/images", `${slug}-main.jpg`)), false, slug);
  assert.match(markdown, /Not a photograph, and not an AI illustration/);
  assert.doesNotMatch(markdown, /\]\([^)]*\.csv[^)]*\)/);
  assert.doesNotMatch(markdown, /href=["'][^"']*\.csv/i);
  assert.equal(body(markdown).includes(`](/images/${slug}-chart.jpg)`), true, slug);
  for (const match of body(markdown).matchAll(/\]\((\/[^)\s]+)\)/g)) {
    const href = match[1];
    assert.equal(href.includes("#"), false, href);
    if (href.startsWith("/images/")) continue;
    assert.equal(href.endsWith("/"), true, href);
    const target = href.slice(1, -1);
    assert.equal(orphans.has(target), false, `${slug} links orphan ${target}`);
    assert.equal(INDEX_PRUNE_SLUGS.has(target), false, `${slug} links pruned ${target}`);
    assert.equal(INDEX_PRUNE_SLUGS.has(target.split("/").pop()), false, target);
  }
}

test("fiber snack chart ranks the ten CSV rows, popcorn included", () => {
  const markdown = read(`src/data/articles/${SNACK}.md`);
  assert.equal(field(markdown, "title"), "Cheapest High-Fiber Snacks Ranked per Dollar");
  assertClean(markdown, SNACK);
  assert.match(markdown, /high-fiber-snacks-per-dollar-2026\.csv/);
  assert.match(markdown, /fiber-per-dollar-2026\.csv/);
  assert.match(markdown, /\]\(\/cheapest-high-protein-snacks-and-portable-foods\/\)/);
  assert.match(markdown, /\]\(\/high-fiber-popcorn-toppings-healthy\/\)/);
  assert.match(markdown, /\]\(\/cheapest-nuts-and-seeds-for-protein-and-fiber\/\)/);
  assert.match(markdown, /\]\(\/popcorn-vs-potato-chips-fiber-comparison\/\)/);
  assert.equal(markdown.includes("](/crispy-roasted-chickpeas-high-fiber-snack/)"), false);

  const snacks = parseCsv(read("public/data/high-fiber-snacks-per-dollar-2026.csv"));
  const fiber = new Map(
    parseCsv(read("public/data/fiber-per-dollar-2026.csv")).map((row) => [row.food, row]),
  );
  assert.equal(snacks.length, 10);
  const ranked = [...snacks].sort((left, right) => Number(right.value) - Number(left.value));
  const actual = markdownTable(
    markdown,
    "| Food | Fiber per $1 | Cost of 5 g | Package | Record |",
  );
  assert.equal(actual.length, 10);
  ranked.forEach((row, index) => {
    const match = fiber.get(row.food);
    assert.equal(match.fiber_g_per_dollar, row.value, row.food);
    const cells = actual[index];
    assert.equal(cells[0], row.food);
    assert.equal(cells[1], `${row.value} g`);
    assert.equal(cells[2], money(5 / Number(row.value)));
    assert.equal(cells[3], `${row.package}, $${row.package_price_usd}`);
    if (row.fdc_id) {
      assert.equal(cells[4], `[${row.fdc_id}](${row.source_url})`);
    } else {
      assert.equal(cells[4], "no USDA id");
      assert.equal(row.food, "Popcorn kernels");
    }
  });
});

test("sodium cut chart uses the sodium file and the two protein-note cans", () => {
  const markdown = read(`src/data/articles/${SODIUM}.md`);
  assert.equal(
    field(markdown, "title"),
    "How to Cut Sodium in Canned Beans and Budget Pantry Meals",
  );
  assertClean(markdown, SODIUM);
  assert.match(markdown, /sodium-per-dollar-2026\.csv/);
  assert.match(markdown, /protein-per-dollar-2026\.csv/);
  assert.match(markdown, /canned-vs-dry-beans-cost-2026\.csv/);
  assert.match(markdown, /21 CFR 101\.61/);
  assert.match(markdown, /Dietary Guidelines for Americans, 2025-2030/);
  assert.match(markdown, /2,300 mg/);
  assert.match(markdown, /Haytowitz, 2011/);
  assert.match(markdown, /36 percent/);
  assert.match(markdown, /41 percent/);
  assert.doesNotMatch(markdown, /364 mg/);
  assert.match(markdown, /\]\(\/canned-vs-dry-beans-cost-and-sodium-per-serving\/\)/);
  assert.match(markdown, /\]\(\/low-sodium-high-protein-foods-per-dollar\/\)/);
  assert.match(markdown, /\]\(\/canned-beans-vs-dried-beans-nutrition\/\)/);
  assert.match(markdown, /\]\(\/how-much-protein-and-fiber-in-canned-vs-frozen-vs-dry-staples\/\)/);

  const sodium = new Map(
    parseCsv(read("public/data/sodium-per-dollar-2026.csv")).map((row) => [row.fdc_id, row]),
  );
  assert.equal(sodium.size, 56);
  assert.equal(sodium.has("172179"), false);
  const notes = new Map();
  for (const row of parseCsv(read("public/data/protein-per-dollar-2026.csv"))) {
    const match = NOTE.exec(row.nutrition_source_note || "");
    if (match) notes.set(row.fdc_id, match[1]);
  }
  const actual = markdownTable(
    markdown,
    "| Food | Sodium per 100 g | Where the milligrams come from | Record |",
  );
  assert.equal(actual.length, SODIUM_BARS.length);
  SODIUM_BARS.forEach(([fdc, food, source], index) => {
    const fromFile = sodium.get(fdc);
    const mg = fromFile ? fromFile.sodium_mg_per_100g : notes.get(fdc);
    assert.ok(mg, fdc);
    if (fromFile) assert.equal(fromFile.food, food);
    const cells = actual[index];
    assert.equal(cells[0], food);
    assert.equal(cells[1], `${mg} mg`);
    assert.equal(cells[2], source);
    assert.match(cells[3], new RegExp(`food-details/${fdc}/nutrients`));
  });

  const packageMg = (row) =>
    Math.round((Number(row.sodium_mg_per_100g) * Number(row.package_weight_g)) / 100);
  const loaf = sodium.get("172688");
  const kidney = sodium.get("173741");
  const tuna = sodium.get("173709");
  const dryBlack = sodium.get("173734");
  assert.equal(packageMg(loaf), 2580);
  assert.equal(packageMg(kidney), 1299);
  assert.equal(packageMg(tuna), 279);
  assert.equal(packageMg(dryBlack), 45);
  assert.match(markdown, /2,580 mg/);
  assert.match(markdown, /1,299 mg/);
  assert.match(markdown, /279 mg/);
  assert.match(markdown, /45 mg in the bag/);
  assert.equal(loaf.sodium_mg_per_100g, "455");
  assert.equal(sodium.get("172373").sodium_mg_per_100g, "106");
  assert.equal(sodium.get("175199").sodium_mg_per_100g, "12");
});

test("chart heroes are 1200 by 675 JPEGs read from the CSVs", async () => {
  const snackScript = read("scripts/generate-cheapest-high-fiber-snacks-chart.py");
  const sodiumScript = read("scripts/generate-canned-bean-sodium-cut-chart.py");
  assert.match(snackScript, /high-fiber-snacks-per-dollar-2026\.csv/);
  assert.match(snackScript, /fiber-per-dollar-2026\.csv/);
  assert.match(sodiumScript, /sodium-per-dollar-2026\.csv/);
  assert.match(sodiumScript, /protein-per-dollar-2026\.csv/);
  assert.doesNotMatch(snackScript, /-main\.jpg/);
  assert.doesNotMatch(sodiumScript, /-main\.jpg/);
  for (const slug of [SNACK, SODIUM]) {
    const bytes = readFileSync(join(ROOT, "public/images", `${slug}-chart.jpg`));
    assert.equal(bytes[0], 0xff);
    assert.equal(bytes[1], 0xd8);
    const meta = await sharp(bytes).metadata();
    assert.equal(meta.format, "jpeg");
    assert.equal(meta.width, 1200);
    assert.equal(meta.height, 675);
  }
});

test("contextual links are one canonical path and hubs stay inside the caps", () => {
  for (const [path, href] of LINK_SOURCES) {
    const source = read(path);
    const hits = source.match(new RegExp(href.replaceAll("/", "\\/"), "g")) ?? [];
    assert.equal(hits.length, 1, `${path} -> ${href}`);
    assert.equal(href.includes("#"), false, href);
    assert.equal(href.endsWith("/"), true, href);
    assert.equal(source.includes("FAQPage"), false, path);
    assert.equal(source.includes("\u2014"), false, path);
  }
  const cost = read("src/data/articles/canned-vs-dry-beans-cost-and-sodium-per-serving.md");
  const inbound = cost.match(new RegExp(`/${SODIUM}/`, "g")) ?? [];
  assert.equal(inbound.length, 1);

  const header = read("src/components/Header.astro");
  const footer = read("src/components/Footer.astro");
  const chrome =
    [...header.matchAll(/href:\s*"([^"]+)"/g)].length * 2 +
    (header.includes('href="/"') ? 1 : 0) +
    [...footer.matchAll(/<a\b/g)].length;
  const now = Date.now();
  const articles = readdirSync(join(ROOT, "src/data/articles"))
    .filter((name) => name.endsWith(".md"))
    .map((name) => {
      const raw = read(`src/data/articles/${name}`);
      const release = field(raw, "publishAt") || field(raw, "date");
      return {
        slug: name.replace(/\.md$/, ""),
        title: field(raw, "title"),
        category: field(raw, "category"),
        released: release ? Date.parse(release) <= now : false,
      };
    })
    .filter((article) => article.released);
  const recipes = articles.filter((article) => article.category === "recipes").length;
  assert.equal(recipes, 86);
  for (const hub of CATEGORY_HUBS) {
    const { topics, alphabetical } = assembleHub(hub, articles);
    const topicLinks = topics.reduce((sum, topic) => sum + topic.articles.length, 0);
    const tools = hub.category === "recipes" ? 1 : 0;
    const prose = [...read(`src/pages/${hub.category}/index.astro`).matchAll(/<a\b/g)].length;
    const total = alphabetical.length + topicLinks + tools + chrome + prose;
    assert.ok(total <= 124, `${hub.category} estimate ${total}`);
  }
});

test("built sitemap lists both tips pages without FAQPage", () => {
  const sitemapPath = join(ROOT, "dist/sitemap-0.xml");
  if (!existsSync(sitemapPath)) return;
  const sitemap = readFileSync(sitemapPath, "utf8");
  for (const slug of [SNACK, SODIUM]) {
    assert.match(sitemap, new RegExp(`https://www\\.daily-life-hacks\\.com/${slug}/`));
    const html = readFileSync(join(ROOT, "dist", slug, "index.html"), "utf8");
    assert.equal(html.includes("FAQPage"), false, slug);
    assert.match(html, /David Miller/);
    assert.doesNotMatch(html, /href="[^"]*\.csv/i, slug);
    assert.doesNotMatch(html, /href="\/[^"]*#[^"]*"/, slug);
    assert.match(html, new RegExp(`/images/${slug}-chart\\.jpg`));
  }
});
