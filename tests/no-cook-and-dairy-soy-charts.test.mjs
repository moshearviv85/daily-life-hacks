import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import sharp from "sharp";

import { INDEX_PRUNE_SLUGS } from "../src/content/index-prune.js";

const ROOT = join(import.meta.dirname, "..");
const DAY = "2026-11-26";

const NOCOOK = "no-cook-emergency-protein-and-fiber-grocery-list";
const DAIRY = "cheapest-dairy-and-soy-protein-per-dollar";

const PAGES = [
  {
    slug: NOCOOK,
    chart: `${NOCOOK}-chart.jpg`,
    csvNames: [
      "no-cook-protein-per-dollar-2026.csv",
      "fiber-per-dollar-2026.csv",
      "high-fiber-snacks-per-dollar-2026.csv",
    ],
  },
  {
    slug: DAIRY,
    chart: `${DAIRY}-chart.jpg`,
    csvNames: [
      "dairy-protein-per-dollar-ranked-2026.csv",
      "protein-per-dollar-2026.csv",
      "sodium-per-dollar-2026.csv",
      "protein-quality-per-dollar-2026.csv",
    ],
  },
];

const NOCOOK_FOODS = [
  "Peanut butter",
  "Dry roasted peanuts",
  "Sunflower seed kernels",
  "Canned black beans",
  "Whole milk",
  "Greek yogurt (plain, nonfat)",
  "Rotisserie chicken (whole, cooked)",
  "Cottage cheese (4%)",
  "Canned tuna (chunk light, in water)",
  "Carrots (whole, bagged)",
  "Prunes (dried plums)",
  "Apples (gala)",
];

const COLD_CHAIN = new Set([
  "Whole milk",
  "Greek yogurt (plain, nonfat)",
  "Rotisserie chicken (whole, cooked)",
  "Cottage cheese (4%)",
]);

const DAIRY_FOODS = [
  "Eggs (large)",
  "Mozzarella (low-moisture part-skim)",
  "Whole milk",
  "Greek yogurt (plain, nonfat)",
  "Cottage cheese (4%)",
  "Cheddar cheese",
  "Frozen shelled edamame",
  "Tofu (extra firm)",
  "Tempeh",
];

const LINK_SOURCES = [
  ["src/pages/nutrition/index.astro", `/${NOCOOK}/`],
  ["src/pages/tools/dried-beans-to-canned-converter/index.astro", `/${NOCOOK}/`],
  ["src/pages/tips/index.astro", `/${DAIRY}/`],
  ["src/pages/tools/recipe-cost-calculator/index.astro", `/${DAIRY}/`],
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

function orphanSlugs() {
  const source = read("tests/orphan-contextual-inlinks.test.mjs");
  const block = source.match(/const ORPHANS = \[([\s\S]*?)\];/);
  assert.ok(block, "ORPHANS list");
  return [...block[1].matchAll(/"([^"]+)"/g)].map((match) => match[1]);
}

function byFood(name) {
  return new Map(parseCsv(read(`public/data/${name}`)).map((row) => [row.food, row]));
}

test("both chart-hero pages cite the CSVs in plain text and skip FAQPage", () => {
  const redirects = read("public/_redirects");
  const registry = read("tests/substantive-update-datemodified.test.mjs");
  const orphans = new Set(orphanSlugs());

  for (const page of PAGES) {
    const markdown = article(page.slug);
    const excerpt = field(markdown, "excerpt");
    assert.equal(field(markdown, "author"), "David Miller", page.slug);
    assert.equal(field(markdown, "date"), DAY, page.slug);
    assert.equal(field(markdown, "dateModified"), DAY, page.slug);
    assert.equal(field(markdown, "substantiveUpdate"), DAY, page.slug);
    // Tips, not nutrition: /nutrition/ is already at the 120-anchor hub cap,
    // and the required contextual link uses the last slot.
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
      assert.equal(orphans.has(slug), false, `${page.slug} links orphan ${slug}`);
      assert.equal(INDEX_PRUNE_SLUGS.has(slug), false, `${page.slug} links pruned ${slug}`);
      assert.equal(INDEX_PRUNE_SLUGS.has(slug.split("/").pop()), false, `${page.slug} links pruned ${slug}`);
    }
  }
});

test("the no-cook table is the 12-food join of the protein and fiber sheets", () => {
  const protein = byFood("no-cook-protein-per-dollar-2026.csv");
  const fiber = byFood("fiber-per-dollar-2026.csv");
  const snacks = byFood("high-fiber-snacks-per-dollar-2026.csv");
  const markdown = article(NOCOOK);
  const actual = markdownTable(
    markdown,
    "| Food | Protein per dollar | Fiber per dollar | Storage | Record |",
  );
  assert.equal(actual.length, 12);
  assert.match(
    markdown,
    /https:\/\/www\.fsis\.usda\.gov\/food-safety\/safe-food-handling-and-preparation\/food-safety-basics\/danger-zone-40f-140f/,
  );

  NOCOOK_FOODS.forEach((food, index) => {
    const proteinRow = protein.get(food);
    const fiberRow = fiber.get(food);
    const cells = actual[index];
    assert.equal(cells[0], food);
    assert.equal(cells[1], proteinRow ? `${proteinRow.value} g` : "not on the no-cook sheet");
    assert.equal(cells[2], fiberRow ? `${fiberRow.fiber_g_per_dollar} g` : "not on the fiber sheet");
    assert.equal(cells[3], COLD_CHAIN.has(food) ? "Cold chain" : "Pantry");
    const record = proteinRow || fiberRow;
    assert.ok(record, food);
    assert.equal(cells[4], `[FDC ${record.fdc_id}](${record.source_url})`);
    if (fiberRow && snacks.has(food) && snacks.get(food).fdc_id) {
      assert.equal(snacks.get(food).value, fiberRow.fiber_g_per_dollar, food);
    }
  });

  assert.equal(protein.get("Peanut butter").value, "50.7");
  assert.equal(fiber.get("Peanut butter").fiber_g_per_dollar, "11.4");
  assert.equal(fiber.get("Canned black beans").fiber_g_per_dollar, "34.4");
  assert.equal(protein.get("Rotisserie chicken (whole, cooked)").value, "26.7");
  assert.equal(COLD_CHAIN.size, 4);
});

test("the dairy and soy table keeps sodium and DIAAS only where those files have a row", () => {
  const dairy = byFood("dairy-protein-per-dollar-ranked-2026.csv");
  const protein = byFood("protein-per-dollar-2026.csv");
  const sodium = new Map(
    parseCsv(read("public/data/sodium-per-dollar-2026.csv"))
      .filter((row) => row.fdc_id)
      .map((row) => [row.fdc_id, row]),
  );
  const quality = new Map(
    parseCsv(read("public/data/protein-quality-per-dollar-2026.csv")).map((row) => [row.fdc_id, row]),
  );
  assert.equal(dairy.size, 6);

  const markdown = article(DAIRY);
  const actual = markdownTable(
    markdown,
    "| Food | Protein per dollar | Sodium per 100 g | DIAAS | Record |",
  );
  assert.equal(actual.length, 9);
  assert.match(markdown, /21 CFR 101\.61/);
  assert.match(
    markdown,
    /https:\/\/www\.ecfr\.gov\/current\/title-21\/chapter-I\/subchapter-B\/part-101\/subpart-D\/section-101\.61/,
  );

  DAIRY_FOODS.forEach((food, index) => {
    const dairyRow = dairy.get(food);
    const proteinRow = protein.get(food);
    assert.ok(proteinRow, food);
    const grams = dairyRow ? dairyRow.value : proteinRow.protein_g_per_dollar;
    if (dairyRow) assert.equal(dairyRow.value, proteinRow.protein_g_per_dollar, food);
    const sodiumRow = sodium.get(proteinRow.fdc_id);
    const qualityRow = quality.get(proteinRow.fdc_id);
    const cells = actual[index];
    assert.equal(cells[0], food);
    assert.equal(cells[1], `${grams} g`);
    assert.equal(cells[2], sodiumRow ? `${sodiumRow.sodium_mg_per_100g} mg` : "not on the sodium sheet");
    assert.equal(cells[3], qualityRow ? qualityRow.diaas_score : "not on the quality sheet");
    assert.equal(cells[4], `[FDC ${proteinRow.fdc_id}](${proteinRow.source_url})`);
  });

  assert.equal(protein.get("Eggs (large)").protein_g_per_dollar, "34.4");
  assert.equal(sodium.get("171244").sodium_mg_per_100g, "666");
  assert.equal(sodium.get("173414").sodium_mg_per_100g, "653");
  assert.equal(sodium.get("170894").sodium_mg_per_100g, "36");
  assert.equal(sodium.get("174290").sodium_mg_per_100g, "4");
  assert.equal(quality.get("174290").diaas_score, "0.90");
  assert.equal(quality.get("174290").adjusted_g_per_dollar, "12.2");
  assert.equal(sodium.has("171265"), false);
  assert.equal(sodium.has("172179"), false);
  assert.equal(quality.has("173414"), false);
  assert.equal(quality.has("168410"), false);
  assert.equal(quality.has("174272"), false);
  assert.match(markdown, /94\.6%/);
  assert.match(markdown, /99\.4%/);
  assert.match(markdown, /94\.5%/);
});

test("chart heroes are data JPEGs at the article aspect, not photo filenames", async () => {
  const script = read("scripts/generate-no-cook-and-dairy-soy-charts.py");
  assert.match(script, /no-cook-protein-per-dollar-2026\.csv/);
  assert.match(script, /fiber-per-dollar-2026\.csv/);
  assert.match(script, /dairy-protein-per-dollar-ranked-2026\.csv/);
  assert.match(script, /sodium-per-dollar-2026\.csv/);
  assert.doesNotMatch(script, /-main\.jpg/);

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

test("contextual links are one canonical path on each required source page", () => {
  for (const [path, href] of LINK_SOURCES) {
    const source = read(path);
    const hits = source.match(new RegExp(href.replaceAll("/", "\\/"), "g")) ?? [];
    assert.equal(hits.length, 1, `${path} -> ${href}`);
    assert.equal(href.includes("#"), false, href);
    assert.equal(href.endsWith("/"), true, href);
  }
});

test("built sitemap lists both pages and the HTML does not link a CSV", () => {
  if (!existsSync(join(ROOT, "dist", "index.html"))) return;
  const sitemapFiles = readdirSync(join(ROOT, "dist")).filter(
    (name) => name.startsWith("sitemap") && name.endsWith(".xml"),
  );
  const sitemap = sitemapFiles.map((name) => readFileSync(join(ROOT, "dist", name), "utf8")).join("\n");
  for (const page of PAGES) {
    assert.match(sitemap, new RegExp(`https://www\\.daily-life-hacks\\.com/${page.slug}/`));
    const html = readFileSync(join(ROOT, "dist", page.slug, "index.html"), "utf8");
    assert.equal(html.includes("FAQPage"), false, page.slug);
    assert.doesNotMatch(html, /href="[^"]*\.csv/i, page.slug);
    assert.match(html, new RegExp(`/images/${page.chart.replaceAll(".", "\\.")}`));
    for (const name of page.csvNames) {
      assert.match(html, new RegExp(name.replaceAll(".", "\\.")));
    }
  }
});
