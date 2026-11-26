import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import sharp from "sharp";

import { INDEX_PRUNE_SLUGS } from "../src/content/index-prune.js";

const ROOT = join(import.meta.dirname, "..");
const DAY = "2026-11-26";
const DAIRY = "cottage-cheese-vs-greek-yogurt-vs-eggs-protein-cost";
const THAW = "how-long-do-thawed-frozen-vegetables-last-in-the-fridge";
const EXISTING_TITLE = "Cottage Cheese vs Greek Yogurt: Which Has More Protein?";

const DAIRY_FOODS = [
  "Eggs (large)",
  "Mozzarella (low-moisture part-skim)",
  "Whole milk",
  "Greek yogurt (plain, nonfat)",
  "Cottage cheese (4%)",
  "Cheddar cheese",
];

const FROZEN_BY_PRICE = [
  "Frozen chopped spinach",
  "Frozen shelled edamame",
  "Frozen green beans",
  "Frozen green peas",
  "Frozen broccoli florets",
];

const PAGES = [
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
  {
    slug: THAW,
    chart: `${THAW}-chart.jpg`,
    csvNames: ["fiber-per-dollar-2026.csv", "protein-per-dollar-2026.csv"],
  },
];

const LINK_SOURCES = [
  ["src/pages/tips/index.astro", `/${DAIRY}/`],
  ["src/pages/tools/recipe-cost-calculator/index.astro", `/${DAIRY}/`],
  ["src/pages/data/produce-and-grain-fiber-index/index.astro", `/${THAW}/`],
  ["src/pages/tools/grocery-unit-price-calculator/index.astro", `/${THAW}/`],
  ["src/data/articles/cheapest-dairy-and-soy-protein-per-dollar.md", `/${DAIRY}/`],
  ["src/data/articles/cheapest-frozen-vegetables-for-fiber-and-protein.md", `/${THAW}/`],
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

function halfUpDivide(numerator, denominatorText, places) {
  const [whole, frac = ""] = denominatorText.split(".");
  const scale = 10n ** BigInt(frac.length);
  const denominator = BigInt(whole) * scale + BigInt(frac || "0");
  const scaled = BigInt(numerator) * scale * 10n ** BigInt(places);
  const quotient = scaled / denominator;
  const remainder = scaled % denominator;
  const rounded = remainder * 2n >= denominator ? quotient + 1n : quotient;
  const digits = rounded.toString().padStart(places + 1, "0");
  return `${digits.slice(0, -places)}.${digits.slice(-places)}`;
}

test("both tips pages are chart heroes with David Miller and no FAQPage", () => {
  const redirects = read("public/_redirects");
  const registry = read("tests/substantive-update-datemodified.test.mjs");
  const orphans = new Set(orphanSlugs());
  const blocked = new Set([
    "eggs-vs-everything-protein-value",
    "frozen-vs-fresh-produce-when-to-buy",
    "methodology",
  ]);

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
    assert.match(body(markdown), /Not a photograph/);
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
      assert.equal(blocked.has(slug), false, `${page.slug} links blocked ${slug}`);
      assert.equal(blocked.has(slug.split("/").pop()), false, `${page.slug} links blocked ${slug}`);
      assert.equal(INDEX_PRUNE_SLUGS.has(slug), false, `${page.slug} links pruned ${slug}`);
      assert.equal(INDEX_PRUNE_SLUGS.has(slug.split("/").pop()), false, `${page.slug} links pruned ${slug}`);
    }
  }

  const dairyTitle = field(article(DAIRY), "title");
  assert.notEqual(dairyTitle, EXISTING_TITLE);
  assert.doesNotMatch(dairyTitle, /Which Has More Protein/);
  assert.match(dairyTitle, /Eggs/);
  assert.match(dairyTitle, /Cost/);
  assert.equal(field(article("cottage-cheese-vs-greek-yogurt-protein-uses"), "title"), EXISTING_TITLE);
});

test("the dairy cost table is the six-food CSV join, with no invented cottage cheese sodium", () => {
  const protein = byFood("protein-per-dollar-2026.csv");
  const ranked = byFood("dairy-protein-per-dollar-ranked-2026.csv");
  const sodium = new Map(
    parseCsv(read("public/data/sodium-per-dollar-2026.csv"))
      .filter((row) => row.fdc_id)
      .map((row) => [row.fdc_id, row]),
  );
  const quality = new Map(
    parseCsv(read("public/data/protein-quality-per-dollar-2026.csv")).map((row) => [row.fdc_id, row]),
  );
  const markdown = article(DAIRY);
  assert.equal(markdown.includes("364"), false);
  const actual = markdownTable(
    markdown,
    "| Food | Protein per dollar | Cost of 30 g | Sodium per 100 g | DIAAS | Record |",
  );
  assert.equal(actual.length, 6);

  DAIRY_FOODS.forEach((food, index) => {
    const proteinRow = protein.get(food);
    const rankedRow = ranked.get(food);
    assert.equal(rankedRow.value, proteinRow.protein_g_per_dollar, food);
    const sodiumRow = sodium.get(proteinRow.fdc_id);
    const qualityRow = quality.get(proteinRow.fdc_id);
    const cells = actual[index];
    assert.equal(cells[0], food);
    assert.equal(cells[1], `${proteinRow.protein_g_per_dollar} g`);
    assert.equal(cells[2], `$${halfUpDivide(30, proteinRow.protein_g_per_dollar, 2)}`);
    assert.equal(cells[3], sodiumRow ? `${sodiumRow.sodium_mg_per_100g} mg` : "not on the sodium sheet");
    assert.equal(cells[4], qualityRow ? qualityRow.diaas_score : "not on the quality sheet");
    assert.equal(cells[5], `[FDC ${proteinRow.fdc_id}](${proteinRow.source_url})`);
    if (qualityRow) assert.equal(qualityRow.diaas_capped_for_multiplication, "1.00", food);
  });

  assert.equal(halfUpDivide(30, "34.4", 2), "0.87");
  assert.equal(halfUpDivide(30, "27.5", 2), "1.09");
  assert.equal(halfUpDivide(30, "26.3", 2), "1.14");
  assert.equal(halfUpDivide(454, "28.5", 2), "15.93");
  assert.equal(sodium.has("172179"), false);
  assert.equal(sodium.has("171265"), false);
  assert.equal(quality.has("173414"), false);
  assert.match(markdown, /\]\(\/cottage-cheese-vs-greek-yogurt-protein-uses\/\)/);
  assert.match(markdown, /\]\(\/cheapest-dairy-and-soy-protein-per-dollar\/\)/);
  assert.match(markdown, /\]\(\/protein-per-dollar-adjusted-for-quality\/\)/);
  assert.match(markdown, /\]\(\/tools\/recipe-cost-calculator\/\)/);
});

test("thawed-vegetable times match FoodKeeper v128 and bag prices match the fiber file", () => {
  const fiber = byFood("fiber-per-dollar-2026.csv");
  const protein = byFood("protein-per-dollar-2026.csv");
  const markdown = article(THAW);
  assert.doesNotMatch(markdown, /\b8 months\b/);
  assert.doesNotMatch(markdown, /3 to 4 days after thawing/);
  assert.match(markdown, /Recommendation is for storage after cooking\./);
  assert.match(markdown, /10 to 18 months/);
  assert.match(markdown, /Keep frozen\. For safety, cook as directed\./);
  assert.match(markdown, /after-thawing cells are empty/);
  assert.match(markdown, /1 week/);
  assert.match(markdown, /2 years/);
  assert.match(markdown, /1 to 2 months/);
  assert.match(markdown, /2 hours/);
  assert.match(markdown, /1 hour/);
  assert.match(markdown, /40°F/);
  assert.match(markdown, /90°F/);
  assert.match(
    markdown,
    /https:\/\/www\.fsis\.usda\.gov\/food-safety\/safe-food-handling-and-preparation\/food-safety-basics\/freezing-and-food-safety/,
  );
  assert.match(
    markdown,
    /https:\/\/www\.fsis\.usda\.gov\/food-safety\/safe-food-handling-and-preparation\/food-safety-basics\/danger-zone-40f-140f/,
  );
  assert.match(markdown, /https:\/\/www\.foodsafety\.gov\/keep-food-safe\/foodkeeper-app/);

  const actual = markdownTable(
    markdown,
    "| Food | Package price | Fiber per dollar | Package | Record |",
  );
  assert.equal(actual.length, 5);
  FROZEN_BY_PRICE.forEach((food, index) => {
    const row = fiber.get(food);
    const cells = actual[index];
    assert.equal(cells[0], food);
    assert.equal(cells[1], `$${row.package_price_usd}`);
    if (food === "Frozen shelled edamame") {
      assert.equal(row.nutrition_source_status, "unresolved");
      assert.equal(cells[2], "unresolved");
      assert.equal(protein.get(food).package_price_usd, row.package_price_usd);
      assert.equal(cells[4], `protein [FDC ${protein.get(food).fdc_id}](${protein.get(food).source_url})`);
    } else {
      assert.equal(cells[2], `${row.fiber_g_per_dollar} g`);
      assert.equal(cells[4], `[FDC ${row.fdc_id}](${row.source_url})`);
    }
    assert.equal(cells[3], row.package);
  });

  assert.equal(fiber.get("Frozen chopped spinach").package_price_usd, "1.18");
  assert.equal(fiber.get("Frozen broccoli florets").package_price_usd, "2.87");
  assert.equal(protein.get("Frozen green peas").protein_g_per_dollar, "20.4");
  assert.match(markdown, /\]\(\/can-you-refreeze-frozen-vegetables-after-thawing\/\)/);
  assert.match(markdown, /\]\(\/cheapest-frozen-vegetables-for-fiber-and-protein\/\)/);
  assert.match(markdown, /\]\(\/how-long-do-cooked-meat-and-poultry-last-in-the-fridge\/\)/);
  assert.equal(markdown.includes("/frozen-vs-fresh-produce-when-to-buy/"), false);
});

test("chart heroes are data JPEGs, and the new links do not move older dates", async () => {
  const script = read("scripts/generate-dairy-eggs-cost-and-thawed-veg-charts.py");
  assert.match(script, /dairy-protein-per-dollar-ranked-2026\.csv/);
  assert.match(script, /sodium-per-dollar-2026\.csv/);
  assert.match(script, /fiber-per-dollar-2026\.csv/);
  assert.match(script, /Not a photograph/);
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

  for (const [path, href] of LINK_SOURCES) {
    const source = read(path);
    const hits = source.match(new RegExp(href.replaceAll("/", "\\/"), "g")) ?? [];
    assert.equal(hits.length, 1, `${path} -> ${href}`);
    assert.equal(href.includes("#"), false, href);
    assert.equal(href.endsWith("/"), true, href);
  }

  for (const path of [
    "src/data/articles/cheapest-dairy-and-soy-protein-per-dollar.md",
    "src/data/articles/cheapest-frozen-vegetables-for-fiber-and-protein.md",
  ]) {
    const before = execFileSync("git", ["show", `origin/main:${path}`], {
      cwd: ROOT,
      encoding: "utf8",
    });
    const after = read(path);
    assert.equal(field(after, "dateModified"), field(before, "dateModified"), path);
    assert.equal(field(after, "substantiveUpdate"), field(before, "substantiveUpdate"), path);
    assert.equal(field(after, "title"), field(before, "title"), path);
  }
});

test("built sitemap lists both tips pages and the HTML does not emit FAQPage", () => {
  if (!existsSync(join(ROOT, "dist", "sitemap-0.xml"))) return;
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
    assert.match(html, /Not a photograph/);
  }
});
