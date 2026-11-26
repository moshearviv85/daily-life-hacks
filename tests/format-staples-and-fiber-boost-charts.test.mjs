import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import sharp from "sharp";

import { INDEX_PRUNE_SLUGS } from "../src/content/index-prune.js";

const ROOT = join(import.meta.dirname, "..");
const DAY = "2026-11-26";
const FORMAT = "how-much-protein-and-fiber-in-canned-vs-frozen-vs-dry-staples";
const FIBER = "cheapest-ways-to-add-10-grams-of-fiber-to-any-meal";
const NOTE = /differ only in sodium, (\d+(?:\.\d+)?) vs (\d+(?:\.\d+)?)/;

const PAGES = [
  {
    slug: FORMAT,
    chart: `${FORMAT}-chart.jpg`,
    csvNames: [
      "protein-per-dollar-2026.csv",
      "fiber-per-dollar-2026.csv",
      "sodium-per-dollar-2026.csv",
    ],
  },
  {
    slug: FIBER,
    chart: `${FIBER}-chart.jpg`,
    csvNames: [
      "fiber-per-dollar-2026.csv",
      "grains-fiber-per-dollar-ranked-2026.csv",
    ],
  },
];

const FORMAT_FOODS = [
  ["172428", "Green split peas", "Dry"],
  ["173734", "Black beans", "Dry"],
  ["170016", "Green peas", "Frozen"],
  ["168410", "Shelled edamame", "Frozen"],
  ["175188", "Black beans", "Canned"],
  ["173741", "Kidney beans", "Canned"],
  ["175206", "Chickpeas", "Canned"],
  ["173709", "Chunk light tuna in water", "Canned"],
  ["173690", "Pink salmon", "Canned"],
];

const FIBER_FOODS = [
  "Green split peas (dry)",
  "Pearled barley (dry)",
  "Pinto beans (dry)",
  "Black beans (dry)",
  "Navy beans (dry)",
  "Old-fashioned rolled oats",
  "Chia seeds",
  "Whole flaxseed",
  "Frozen green peas",
  "Dry roasted peanuts",
  "Sunflower seed kernels",
  "Peanut butter",
  "Avocado",
  "Raspberries",
  "Blueberries",
];

const LINK_SOURCES = [
  ["src/pages/printables/bean-conversion-card/index.astro", `/${FORMAT}/`],
  ["src/pages/printables/weekly-grocery-budget-planner/index.astro", `/${FORMAT}/`],
  ["src/pages/tips/index.astro", `/${FIBER}/`],
  ["src/pages/tools/grocery-trip-savings-calculator/index.astro", `/${FIBER}/`],
];

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

function internalHrefs(markdown) {
  return [...body(markdown).matchAll(/\]\((\/[^)\s]+)\)/g)].map((match) => match[1]);
}

function quotedSet(source, name) {
  const block = source.match(new RegExp(`const ${name} = (?:new Set\\()?\\[([\\s\\S]*?)\\];`));
  assert.ok(block, name);
  return new Set([...block[1].matchAll(/"([^"]+)"/g)].map((match) => match[1]));
}

function byFdc(name) {
  const found = new Map();
  for (const row of parseCsv(read(`public/data/${name}`))) {
    if (row.fdc_id) found.set(row.fdc_id, row);
  }
  return found;
}

function roundHalfUp(value, places) {
  const factor = 10 ** places;
  const shifted = Math.abs(Number(value)) * factor;
  const rounded = Math.floor(shifted + 0.5);
  return rounded / factor;
}

function money(fiberPerDollar) {
  return roundHalfUp(10 / Number(fiberPerDollar), 2);
}

function edibleGrams(fiberPer100g) {
  return roundHalfUp((10 / Number(fiberPer100g)) * 100, 1);
}

test("both chart-hero pages cite the CSVs in plain text and skip FAQPage", () => {
  const redirects = read("public/_redirects");
  const registry = read("tests/substantive-update-datemodified.test.mjs");
  const orphans = quotedSet(read("tests/orphan-contextual-inlinks.test.mjs"), "ORPHANS");
  const prune250 = quotedSet(read("tests/top-impression-contextual-inlinks.test.mjs"), "PRUNE_250");

  for (const page of PAGES) {
    const markdown = article(page.slug);
    const excerpt = field(markdown, "excerpt");
    assert.equal(field(markdown, "author"), "David Miller", page.slug);
    assert.equal(field(markdown, "date"), DAY, page.slug);
    assert.equal(field(markdown, "dateModified"), DAY, page.slug);
    assert.equal(field(markdown, "substantiveUpdate"), DAY, page.slug);
    assert.equal(field(markdown, "category"), "tips", page.slug);
    assert.equal(field(markdown, "image"), `/images/${page.chart}`, page.slug);
    assert.match(field(markdown, "imageAlt"), /chart/i, page.slug);
    assert.doesNotMatch(field(markdown, "imageAlt"), /photo/i, page.slug);
    assert.ok(excerpt.length >= 130 && excerpt.length <= 160, `${page.slug} excerpt ${excerpt.length}`);
    assert.equal(markdown.includes("FAQPage"), false, page.slug);
    assert.equal(markdown.includes("\u2014"), false, page.slug);
    assert.match(registry, new RegExp(`"${page.slug}": "${DAY}"`));
    assert.equal(INDEX_PRUNE_SLUGS.has(page.slug), false, page.slug);
    assert.doesNotMatch(redirects, new RegExp(`^/${page.slug}(?:/)?\\s`, "m"), page.slug);
    assert.equal(existsSync(join(ROOT, "public/images", `${page.slug}-main.jpg`)), false);

    for (const name of page.csvNames) {
      assert.match(markdown, new RegExp(name.replaceAll(".", "\\.")), page.slug);
    }
    assert.doesNotMatch(markdown, /\[[^\]]*\]\([^)]*\.csv[^)]*\)/, page.slug);
    assert.doesNotMatch(markdown, /href=["'][^"']*\.csv/i, page.slug);
    assert.equal(body(markdown).includes(`](/images/${page.chart})`), true, page.slug);

    for (const href of internalHrefs(markdown)) {
      assert.equal(href.includes("#"), false, `${page.slug} ${href}`);
      if (href.startsWith("/images/")) continue;
      assert.equal(href.endsWith("/"), true, href);
      const slug = href.slice(1, -1);
      assert.equal(slug.includes("/"), false, href);
      assert.equal(orphans.has(slug), false, `${page.slug} links orphan ${slug}`);
      assert.equal(prune250.has(slug), false, `${page.slug} links a #250 URL ${slug}`);
      assert.equal(INDEX_PRUNE_SLUGS.has(slug), false, `${page.slug} links pruned ${slug}`);
      assert.equal(existsSync(join(ROOT, "src/data/articles", `${slug}.md`)), true, href);
    }
  }
});

test("the format table is the nine-food join of protein, fiber, and sodium", () => {
  const protein = byFdc("protein-per-dollar-2026.csv");
  const fiber = byFdc("fiber-per-dollar-2026.csv");
  const fiberByName = new Map(
    parseCsv(read("public/data/fiber-per-dollar-2026.csv")).map((row) => [row.food, row]),
  );
  const sodium = byFdc("sodium-per-dollar-2026.csv");
  const markdown = article(FORMAT);
  const rows = markdownTable(
    markdown,
    "| Food | Format | Protein per $ | Fiber per $ | Sodium per 100 g | Package | Record |",
  );
  assert.equal(rows.length, FORMAT_FOODS.length);

  FORMAT_FOODS.forEach(([fdc, food, format], index) => {
    const proteinRow = protein.get(fdc);
    assert.ok(proteinRow, fdc);
    const fiberRow = fiber.get(fdc) || fiberByName.get(proteinRow.food);
    const sodiumRow = sodium.get(fdc);
    let sodiumMg;
    if (sodiumRow) sodiumMg = sodiumRow.sodium_mg_per_100g;
    else {
      const match = NOTE.exec(proteinRow.nutrition_source_note || "");
      assert.ok(match, `${fdc} sodium`);
      sodiumMg = match[1];
    }
    const cells = rows[index];
    assert.equal(cells[0], food, fdc);
    assert.equal(cells[1], format, fdc);
    assert.equal(cells[2], `${proteinRow.protein_g_per_dollar} g`, fdc);
    if (!fiberRow) {
      assert.equal(cells[3], "no row", fdc);
    } else if ((fiberRow.nutrition_source_status || "").toLowerCase() === "unresolved") {
      assert.equal(cells[3], `${fiberRow.fiber_g_per_dollar} g, unresolved`, fdc);
      assert.match(markdown, /unresolved/);
    } else {
      assert.equal(cells[3], `${fiberRow.fiber_g_per_dollar} g`, fdc);
    }
    assert.equal(cells[4], `${Number(sodiumMg)} mg`, fdc);
    assert.match(cells[6], new RegExp(`food-details/${fdc}/nutrients`));
  });
  assert.match(markdown, /\$2\.42/);
  assert.match(markdown, /\/cheapest-ways-to-add-10-grams-of-fiber-to-any-meal\//);
});

test("the 10 gram fiber table prices every named food from the fiber sheet", () => {
  const fiber = new Map(
    parseCsv(read("public/data/fiber-per-dollar-2026.csv")).map((row) => [row.food, row]),
  );
  const grains = new Map(
    parseCsv(read("public/data/grains-fiber-per-dollar-ranked-2026.csv")).map((row) => [row.food, row]),
  );
  for (const name of ["Pearled barley (dry)", "Old-fashioned rolled oats"]) {
    assert.equal(fiber.get(name).fiber_g_per_dollar, grains.get(name).value, name);
  }
  const markdown = article(FIBER);
  const rows = markdownTable(
    markdown,
    "| Food | Fiber per $ | Cost of 10 g | Edible grams | Package | Record |",
  );
  assert.equal(rows.length, FIBER_FOODS.length);
  const underDollar = [];
  FIBER_FOODS.forEach((name, index) => {
    const row = fiber.get(name);
    assert.ok(row, name);
    const cost = money(row.fiber_g_per_dollar);
    const grams = edibleGrams(row.fiber_g_per_100g);
    const cells = rows[index];
    assert.equal(cells[0], name === "Old-fashioned rolled oats" ? "Rolled oats" : name, name);
    assert.equal(cells[1], `${row.fiber_g_per_dollar} g`, name);
    assert.equal(cells[2], `$${cost.toFixed(2)}`, name);
    assert.equal(cells[3], `${grams.toFixed(1)} g`, name);
    assert.match(cells[5], new RegExp(`food-details/${row.fdc_id}/nutrients`));
    if (cost < 1) underDollar.push(name);
  });
  assert.equal(underDollar.length, 13);
  assert.match(markdown, /\/how-much-protein-and-fiber-in-canned-vs-frozen-vs-dry-staples\//);
});

test("chart heroes are 1200 by 675 JPEGs generated from the CSVs", async () => {
  const formatScript = read("scripts/generate-canned-frozen-dry-staples-chart.py");
  const fiberScript = read("scripts/generate-ten-grams-fiber-cost-chart.py");
  assert.match(formatScript, /protein-per-dollar-2026\.csv/);
  assert.match(formatScript, /fiber-per-dollar-2026\.csv/);
  assert.match(formatScript, /sodium-per-dollar-2026\.csv/);
  assert.match(fiberScript, /fiber-per-dollar-2026\.csv/);
  assert.match(fiberScript, /grains-fiber-per-dollar-ranked-2026\.csv/);
  assert.match(fiberScript, /ROUND_HALF_UP/);
  assert.doesNotMatch(formatScript, /-main\.jpg/);
  assert.doesNotMatch(fiberScript, /-main\.jpg/);
  for (const page of PAGES) {
    const path = join(ROOT, "public/images", page.chart);
    const bytes = readFileSync(path);
    assert.equal(bytes[0], 0xff);
    assert.equal(bytes[1], 0xd8);
    const meta = await sharp(bytes).metadata();
    assert.equal(meta.format, "jpeg");
    assert.equal(meta.width, 1200);
    assert.equal(meta.height, 675);
  }
});

test("contextual link sources use one canonical path and no file link", () => {
  for (const [path, href] of LINK_SOURCES) {
    const source = read(path);
    const hits = source.match(new RegExp(href.replaceAll("/", "\\/"), "g")) ?? [];
    assert.equal(hits.length, 1, path);
    assert.equal(source.includes(`${href}#`), false, path);
    assert.doesNotMatch(source, /\[[^\]]*\]\([^)]*\.csv/);
    assert.doesNotMatch(source, new RegExp(`${href.slice(1, -1)}[^\\n]*\\.csv`));
    assert.equal(source.includes("FAQPage"), false, path);
  }
});

test("built sitemap lists both new pages and neither emits FAQPage", () => {
  const sitemapPath = join(ROOT, "dist/sitemap-0.xml");
  if (!existsSync(sitemapPath)) return;
  const sitemap = readFileSync(sitemapPath, "utf8");
  for (const page of PAGES) {
    assert.match(sitemap, new RegExp(`https://www\\.daily-life-hacks\\.com/${page.slug}/`));
    const html = readFileSync(join(ROOT, "dist", page.slug, "index.html"), "utf8");
    assert.equal(html.includes("FAQPage"), false, page.slug);
    assert.match(html, /David Miller/);
    assert.doesNotMatch(html, /href="[^"]*\.csv/i, page.slug);
    assert.doesNotMatch(html, /href="\/[^"]*#[^"]*"/, page.slug);
    assert.match(html, new RegExp(`/images/${page.chart}`));
    assert.doesNotMatch(html, /photo of/i, page.slug);
  }
});
